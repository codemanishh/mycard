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

export const computeDeterministicCode = (identifier: string, seed: number = 0): string => {
  const str = (identifier || '').toLowerCase().trim() + `_salt_v3_${seed}`;
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
  let seed = 0;
  let allowed_assigners: AllowedAssigner[] = [];
  let customCode = '';

  // Try loading from localStorage cache first
  try {
    const cachedSeed = localStorage.getItem(getCacheKey(userId, 'seed'));
    const cachedCode = localStorage.getItem(getCacheKey(userId, 'code'));
    const cachedName = localStorage.getItem(getCacheKey(userId, 'name'));
    const cachedAssigners = localStorage.getItem(getCacheKey(userId, 'assigners'));

    if (cachedSeed !== null) seed = parseInt(cachedSeed, 10) || 0;
    if (cachedCode) customCode = cachedCode;
    if (cachedName) full_name = cachedName;
    if (cachedAssigners) allowed_assigners = JSON.parse(cachedAssigners);
  } catch (e) {
    console.warn('Failed reading permission cache', e);
  }

  // Fetch from Supabase profiles / metadata
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .or(`user_id.eq.${userId},email.ilike.${userEmail}`)
      .maybeSingle();

    if (profile) {
      const p = profile as any;
      if (p.full_name) full_name = p.full_name;
      if (p.assignment_code) customCode = p.assignment_code;
      if (p.allowed_assigners && Array.isArray(p.allowed_assigners)) {
        allowed_assigners = p.allowed_assigners;
      }
    }

    // Check auth metadata if available
    const { data: { user } } = await supabase.auth.getUser();
    if (user && (user.id === userId || user.email?.toLowerCase() === userEmail.toLowerCase())) {
      if (!full_name && user.user_metadata?.full_name) full_name = user.user_metadata.full_name;
      if (!customCode && user.user_metadata?.assignment_code) customCode = user.user_metadata.assignment_code;
      if (user.user_metadata?.code_seed !== undefined) seed = user.user_metadata.code_seed;
      if (allowed_assigners.length === 0 && user.user_metadata?.allowed_assigners) {
        allowed_assigners = user.user_metadata.allowed_assigners;
      }
    }
  } catch (err) {
    console.warn('Error fetching assignment profile from Supabase:', err);
  }

  // Always derive deterministic code based on email / userId and seed
  const assignment_code = customCode || computeDeterministicCode(userEmail || userId, seed);

  // Update local cache
  try {
    localStorage.setItem(getCacheKey(userId, 'code'), assignment_code);
    localStorage.setItem(getCacheKey(userId, 'seed'), seed.toString());
    localStorage.setItem(getCacheKey(userId, 'name'), full_name);
    localStorage.setItem(getCacheKey(userId, 'assigners'), JSON.stringify(allowed_assigners));
  } catch (e) {}

  return {
    user_id: userId,
    email: userEmail,
    full_name: full_name || userEmail.split('@')[0],
    assignment_code,
    code_seed: seed,
    allowed_assigners,
  };
};

export const updateAssignmentProfile = async (
  userId: string,
  updates: {
    full_name?: string;
    assignment_code?: string;
    code_seed?: number;
    allowed_assigners?: AllowedAssigner[];
    phone_number?: string;
  }
) => {
  // Update local cache first
  try {
    if (updates.assignment_code) localStorage.setItem(getCacheKey(userId, 'code'), updates.assignment_code);
    if (updates.code_seed !== undefined) localStorage.setItem(getCacheKey(userId, 'seed'), updates.code_seed.toString());
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

  // Update user metadata if current auth user
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === userId) {
      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          ...updates,
        }
      });
    }
  } catch (err) {}
};

export const refreshAssignmentCode = async (userId: string): Promise<string> => {
  const profile = await getAssignmentProfile(userId, '');
  const newSeed = (profile.code_seed || 0) + 1;
  const newCode = computeDeterministicCode(profile.email || userId, newSeed);
  await updateAssignmentProfile(userId, { code_seed: newSeed, assignment_code: newCode });
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

  // Self assignment is always allowed!
  if (normalizedAssigner === normalizedTarget) return true;
  if (assignerUserId && targetUserId && assignerUserId === targetUserId) return true;

  // Check 1: Allowed assigners list in profile / cache
  const profile = await getAssignmentProfile(targetUserId, targetEmail);
  const isExplicitlyAllowed = profile.allowed_assigners.some(
    a => a.email.toLowerCase().trim() === normalizedAssigner || (assignerUserId && a.user_id === assignerUserId)
  );

  if (isExplicitlyAllowed) return true;

  // Check 2: Check if ANY task in Supabase todos table already exists between assigner and target
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
  const targetProfile = await getAssignmentProfile(targetUserId, targetEmail);
  const cleanEntered = enteredCode.trim();

  // Deterministically verify against all valid code derivations for targetEmail and targetUserId
  const expectedDefaultByEmail = computeDeterministicCode(targetEmail, 0);
  const expectedDefaultById = computeDeterministicCode(targetUserId, 0);
  const expectedCurrentBySeed = computeDeterministicCode(targetEmail, targetProfile.code_seed || 0);

  const isValidCode = (
    cleanEntered === targetProfile.assignment_code.trim() ||
    cleanEntered === expectedDefaultByEmail ||
    cleanEntered === expectedDefaultById ||
    cleanEntered === expectedCurrentBySeed
  );

  if (!isValidCode) {
    return {
      success: false,
      error: `Invalid 3-digit code! Please ask ${targetProfile.full_name || targetEmail} for their profile passcode.`,
    };
  }

  // Code is valid! Add assigner to target's allowed list
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
