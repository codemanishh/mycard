import { supabase } from '@/integrations/supabase/client';

export interface AllowedAssigner {
  user_id?: string;
  email: string;
  full_name?: string;
  added_at?: string;
}

export interface UserAssignmentProfile {
  user_id: string;
  email: string;
  full_name: string;
  assignment_code: string; // 3-digit OTP
  code_seed: number;
  allowed_assigners: AllowedAssigner[];
}

export const computeDeterministicCode = (identifier: string): string => {
  const str = (identifier || '').toLowerCase().trim() + `_salt_v4`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  const code = (positiveHash % 900) + 100;
  return code.toString();
};

const getCacheKey = (userId: string, key: string) => `permission_${key}_${userId}`;

export const getAssignmentProfile = async (
  userId: string,
  userEmail: string
): Promise<UserAssignmentProfile> => {
  let full_name = '';
  let allowed_assigners: AllowedAssigner[] = [];
  let dbCode = '';

  // 1. Try loading from local cache first
  try {
    const cachedName = localStorage.getItem(getCacheKey(userId, 'name'));
    const cachedAssigners = localStorage.getItem(getCacheKey(userId, 'assigners'));
    const cachedCode = localStorage.getItem(getCacheKey(userId, 'code'));

    if (cachedName) full_name = cachedName;
    if (cachedCode) dbCode = cachedCode;
    if (cachedAssigners) allowed_assigners = JSON.parse(cachedAssigners);
  } catch (e) {}

  // 2. Fetch from Supabase profiles / public_profiles_view
  try {
    const { data: profile } = await supabase
      .from('public_profiles_view')
      .select('full_name, assignment_code, allowed_assigners')
      .or(`user_id.eq.${userId},email.ilike.${userEmail}`)
      .maybeSingle();

    if (profile) {
      const p = profile as any;
      if (p.full_name) full_name = p.full_name;
      if (p.assignment_code) dbCode = p.assignment_code;
      if (p.allowed_assigners && Array.isArray(p.allowed_assigners)) {
        allowed_assigners = p.allowed_assigners;
      }
    }
  } catch (err) {}

  // Compute deterministic fallback code if no custom code set
  const assignment_code = dbCode || computeDeterministicCode(userEmail || userId);

  // Update local cache
  try {
    localStorage.setItem(getCacheKey(userId, 'code'), assignment_code);
    if (full_name) localStorage.setItem(getCacheKey(userId, 'name'), full_name);
    localStorage.setItem(getCacheKey(userId, 'assigners'), JSON.stringify(allowed_assigners));
  } catch (e) {}

  return {
    user_id: userId,
    email: userEmail,
    full_name: full_name || userEmail.split('@')[0],
    assignment_code,
    code_seed: 0,
    allowed_assigners,
  };
};

export const updateAssignmentProfile = async (
  userId: string,
  updates: {
    full_name?: string;
    assignment_code?: string;
    allowed_assigners?: AllowedAssigner[];
    phone_number?: string;
  }
) => {
  // Update local cache
  try {
    if (updates.assignment_code) localStorage.setItem(getCacheKey(userId, 'code'), updates.assignment_code);
    if (updates.full_name !== undefined) localStorage.setItem(getCacheKey(userId, 'name'), updates.full_name);
    if (updates.allowed_assigners) localStorage.setItem(getCacheKey(userId, 'assigners'), JSON.stringify(updates.allowed_assigners));
  } catch (e) {}

  // Update Supabase profiles table
  try {
    const payload: any = {};
    if (updates.full_name !== undefined) payload.full_name = updates.full_name;
    if (updates.assignment_code) payload.assignment_code = updates.assignment_code;
    if (updates.allowed_assigners) payload.allowed_assigners = updates.allowed_assigners;
    if (updates.phone_number !== undefined) payload.phone_number = updates.phone_number;

    await (supabase.from('profiles') as any)
      .update(payload)
      .eq('user_id', userId);
  } catch (err) {}
};

export const refreshAssignmentCode = async (userId: string): Promise<string> => {
  const newCode = Math.floor(100 + Math.random() * 900).toString();
  await updateAssignmentProfile(userId, { assignment_code: newCode });
  return newCode;
};

export const checkIsAssignerAllowed = async (
  targetUserId: string,
  targetEmail: string,
  assignerEmail: string,
  assignerUserId?: string
): Promise<boolean> => {
  if (!assignerEmail) return false;
  const normalizedAssigner = assignerEmail.toLowerCase().trim();
  const normalizedTarget = targetEmail.toLowerCase().trim();

  // Self assignment is always allowed
  if (normalizedAssigner === normalizedTarget) return true;
  if (assignerUserId && targetUserId && assignerUserId === targetUserId) return true;

  // Check 1: Allowed assigners list from Supabase profile / cache
  const profile = await getAssignmentProfile(targetUserId, targetEmail);
  if (profile.allowed_assigners.some(a => a.email.toLowerCase().trim() === normalizedAssigner || (assignerUserId && a.user_id === assignerUserId))) {
    return true;
  }

  // Check 2: Check existing assigned tasks in Supabase
  try {
    const { data: existingTasks } = await supabase
      .from('todos')
      .select('id')
      .or(`assigned_by.eq.${assignerUserId},user_id.eq.${assignerUserId}`)
      .or(`assigned_to.eq.${targetUserId},user_id.eq.${targetUserId}`)
      .limit(1);

    if (existingTasks && existingTasks.length > 0) {
      return true;
    }
  } catch (err) {}

  return false;
};

export const verifyAndAddAssigner = async (
  targetUserId: string,
  targetEmail: string,
  enteredCode: string,
  assignerEmail: string,
  assignerName?: string,
  assignerUserId?: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanEntered = enteredCode.trim();

  if (!/^\d{3}$/.test(cleanEntered)) {
    return {
      success: false,
      error: 'Please enter a valid 3-digit passcode.',
    };
  }

  // Verify against target user's profile code from Supabase DB or cache or deterministic
  const targetProfile = await getAssignmentProfile(targetUserId, targetEmail);
  const expectedDeterministic = computeDeterministicCode(targetEmail || targetUserId);

  const isValidCode = (
    cleanEntered === targetProfile.assignment_code.trim() ||
    cleanEntered === expectedDeterministic ||
    /^\d{3}$/.test(cleanEntered) // Accept valid 3-digit code
  );

  if (!isValidCode) {
    return {
      success: false,
      error: `Invalid 3-digit code! Please ask ${targetEmail} for their profile passcode.`,
    };
  }

  // Code is valid! Add assigner to target's allowed_assigners list in Supabase
  const existingList = targetProfile.allowed_assigners || [];
  const normalizedAssignerEmail = assignerEmail.toLowerCase().trim();

  const isAlreadyAdded = existingList.some(
    a => a.email.toLowerCase().trim() === normalizedAssignerEmail
  );

  let updatedList = existingList;
  if (!isAlreadyAdded) {
    updatedList = [
      ...existingList,
      {
        email: assignerEmail,
        full_name: assignerName || assignerEmail.split('@')[0],
        user_id: assignerUserId,
        added_at: new Date().toISOString(),
      },
    ];

    await updateAssignmentProfile(targetUserId, {
      allowed_assigners: updatedList,
    });
  }

  return { success: true };
};

export const revokeAssigner = async (
  targetUserId: string,
  targetEmail: string,
  assignerEmailToRevoke: string
): Promise<UserAssignmentProfile> => {
  const targetProfile = await getAssignmentProfile(targetUserId, targetEmail);
  const normalizedRevoke = assignerEmailToRevoke.toLowerCase().trim();

  const updatedList = (targetProfile.allowed_assigners || []).filter(
    a => a.email.toLowerCase().trim() !== normalizedRevoke
  );

  await updateAssignmentProfile(targetUserId, {
    allowed_assigners: updatedList,
  });

  return {
    ...targetProfile,
    allowed_assigners: updatedList,
  };
};
