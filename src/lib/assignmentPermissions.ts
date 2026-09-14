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
  allowed_assigners: AllowedAssigner[];
}

export const generate3DigitCode = (): string => {
  return Math.floor(100 + Math.random() * 900).toString();
};

const getCacheKey = (userId: string, key: string) => `permission_${key}_${userId}`;

export const getAssignmentProfile = async (
  userId: string,
  userEmail: string
): Promise<UserAssignmentProfile> => {
  let full_name = '';
  let assignment_code = '';
  let allowed_assigners: AllowedAssigner[] = [];

  // Try loading from localStorage cache first for immediate responsiveness
  try {
    const cachedCode = localStorage.getItem(getCacheKey(userId, 'code'));
    const cachedName = localStorage.getItem(getCacheKey(userId, 'name'));
    const cachedAssigners = localStorage.getItem(getCacheKey(userId, 'assigners'));

    if (cachedCode) assignment_code = cachedCode;
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
      .eq('user_id', userId)
      .maybeSingle();

    if (profile) {
      const p = profile as any;
      if (p.full_name) full_name = p.full_name;
      if (p.assignment_code) assignment_code = p.assignment_code;
      if (p.allowed_assigners && Array.isArray(p.allowed_assigners)) {
        allowed_assigners = p.allowed_assigners;
      }
    }

    // Also check auth metadata
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === userId) {
      if (!full_name && user.user_metadata?.full_name) full_name = user.user_metadata.full_name;
      if (!assignment_code && user.user_metadata?.assignment_code) assignment_code = user.user_metadata.assignment_code;
      if (allowed_assigners.length === 0 && user.user_metadata?.allowed_assigners) {
        allowed_assigners = user.user_metadata.allowed_assigners;
      }
    }
  } catch (err) {
    console.warn('Error fetching assignment profile from Supabase:', err);
  }

  // If no assignment code yet, generate one and save it
  if (!assignment_code || assignment_code.length !== 3) {
    assignment_code = generate3DigitCode();
    await updateAssignmentProfile(userId, { assignment_code });
  }

  // Update local cache
  try {
    localStorage.setItem(getCacheKey(userId, 'code'), assignment_code);
    localStorage.setItem(getCacheKey(userId, 'name'), full_name);
    localStorage.setItem(getCacheKey(userId, 'assigners'), JSON.stringify(allowed_assigners));
  } catch (e) {}

  return {
    user_id: userId,
    email: userEmail,
    full_name: full_name || userEmail.split('@')[0],
    assignment_code,
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
  // Update local cache first
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
  } catch (err) {
    console.warn('Could not update profiles table directly, updating metadata', err);
  }

  // Also update user metadata if current user
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
  const newCode = generate3DigitCode();
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
  // User can always assign tasks to themselves!
  if (assignerEmail.toLowerCase().trim() === targetEmail.toLowerCase().trim()) return true;
  if (assignerUserId && targetUserId && assignerUserId === targetUserId) return true;

  const profile = await getAssignmentProfile(targetUserId, targetEmail);
  const normalizedAssignerEmail = assignerEmail.toLowerCase().trim();

  return profile.allowed_assigners.some(
    a => a.email.toLowerCase().trim() === normalizedAssignerEmail || (assignerUserId && a.user_id === assignerUserId)
  );
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

  if (targetProfile.assignment_code.trim() !== enteredCode.trim()) {
    return {
      success: false,
      error: `Invalid 3-digit code! Please ask ${targetProfile.full_name || targetEmail} for their profile code.`,
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
