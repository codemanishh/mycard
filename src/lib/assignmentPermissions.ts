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

export const syncProfileOtpToSupabase = async (userId: string, code: string, allowedAssigners: AllowedAssigner[]) => {
  if (!userId) return;
  try {
    const payload = JSON.stringify({
      code: code.trim(),
      allowedAssigners,
      updated_at: new Date().toISOString(),
    });

    const { data: existing } = await supabase
      .from('todos')
      .select('id')
      .eq('user_id', userId)
      .eq('category', '__USER_OTP_CODE__')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('todos')
        .update({
          title: code.trim(),
          description: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('todos')
        .insert({
          user_id: userId,
          title: code.trim(),
          description: payload,
          category: '__USER_OTP_CODE__',
          priority: 'low',
          is_completed: true,
        });
    }
  } catch (err) {
    console.warn('Could not sync OTP code to Supabase:', err);
  }
};

export const fetchRemoteProfileOtpFromSupabase = async (targetUserId: string): Promise<{ code: string | null; allowedAssigners: AllowedAssigner[] }> => {
  try {
    const { data } = await supabase
      .from('todos')
      .select('title, description')
      .eq('user_id', targetUserId)
      .eq('category', '__USER_OTP_CODE__')
      .maybeSingle();

    if (data && data.title) {
      let allowedAssigners: AllowedAssigner[] = [];
      let code = data.title.trim();

      if (data.description) {
        try {
          const parsed = JSON.parse(data.description);
          if (parsed.code) code = parsed.code.trim();
          if (parsed.allowedAssigners && Array.isArray(parsed.allowedAssigners)) {
            allowedAssigners = parsed.allowedAssigners;
          }
        } catch (e) {}
      }

      return { code, allowedAssigners };
    }
  } catch (err) {}

  return { code: null, allowedAssigners: [] };
};

export const getAssignmentProfile = async (
  userId: string,
  userEmail: string
): Promise<UserAssignmentProfile> => {
  let full_name = '';
  let seed = 0;
  let allowed_assigners: AllowedAssigner[] = [];
  let customCode = '';

  // Load from local cache
  try {
    const cachedSeed = localStorage.getItem(getCacheKey(userId, 'seed'));
    const cachedCode = localStorage.getItem(getCacheKey(userId, 'code'));
    const cachedName = localStorage.getItem(getCacheKey(userId, 'name'));
    const cachedAssigners = localStorage.getItem(getCacheKey(userId, 'assigners'));

    if (cachedSeed !== null) seed = parseInt(cachedSeed, 10) || 0;
    if (cachedCode) customCode = cachedCode;
    if (cachedName) full_name = cachedName;
    if (cachedAssigners) allowed_assigners = JSON.parse(cachedAssigners);
  } catch (e) {}

  // Also fetch remote OTP from Supabase todos system record if available
  if (userId) {
    const remote = await fetchRemoteProfileOtpFromSupabase(userId);
    if (remote.code) customCode = remote.code;
    if (remote.allowedAssigners && remote.allowedAssigners.length > 0) {
      allowed_assigners = remote.allowedAssigners;
    }
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

    // Check auth metadata
    const { data: { user } } = await supabase.auth.getUser();
    if (user && (user.id === userId || user.email?.toLowerCase() === userEmail.toLowerCase())) {
      if (!full_name && user.user_metadata?.full_name) full_name = user.user_metadata.full_name;
      if (!customCode && user.user_metadata?.assignment_code) customCode = user.user_metadata.assignment_code;
      if (user.user_metadata?.code_seed !== undefined) seed = user.user_metadata.code_seed;
      if (allowed_assigners.length === 0 && user.user_metadata?.allowed_assigners) {
        allowed_assigners = user.user_metadata.allowed_assigners;
      }
    }
  } catch (err) {}

  // Derive assignment code
  const assignment_code = customCode || computeDeterministicCode(userEmail || userId, seed);

  // Sync back to cache & Supabase
  try {
    localStorage.setItem(getCacheKey(userId, 'code'), assignment_code);
    localStorage.setItem(getCacheKey(userId, 'seed'), seed.toString());
    if (full_name) localStorage.setItem(getCacheKey(userId, 'name'), full_name);
    localStorage.setItem(getCacheKey(userId, 'assigners'), JSON.stringify(allowed_assigners));
  } catch (e) {}

  if (userId) {
    await syncProfileOtpToSupabase(userId, assignment_code, allowed_assigners);
  }

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
  try {
    if (updates.assignment_code) localStorage.setItem(getCacheKey(userId, 'code'), updates.assignment_code);
    if (updates.code_seed !== undefined) localStorage.setItem(getCacheKey(userId, 'seed'), updates.code_seed.toString());
    if (updates.full_name !== undefined) localStorage.setItem(getCacheKey(userId, 'name'), updates.full_name);
    if (updates.allowed_assigners) localStorage.setItem(getCacheKey(userId, 'assigners'), JSON.stringify(updates.allowed_assigners));
  } catch (e) {}

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

  if (userId && (updates.assignment_code || updates.allowed_assigners)) {
    const profile = await getAssignmentProfile(userId, '');
    await syncProfileOtpToSupabase(
      userId,
      updates.assignment_code || profile.assignment_code,
      updates.allowed_assigners || profile.allowed_assigners
    );
  }
};

export const refreshAssignmentCode = async (userId: string): Promise<string> => {
  const profile = await getAssignmentProfile(userId, '');
  const newSeed = (profile.code_seed || 0) + 1;
  const newCode = computeDeterministicCode(profile.email || userId, newSeed);
  await updateAssignmentProfile(userId, { code_seed: newSeed, assignment_code: newCode });
  await syncProfileOtpToSupabase(userId, newCode, profile.allowed_assigners);
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

  // Check 1: Allowed assigners list in profile / remote OTP record
  const remote = await fetchRemoteProfileOtpFromSupabase(targetUserId);
  const isRemoteAllowed = remote.allowedAssigners.some(
    a => a.email.toLowerCase().trim() === normalizedAssigner || (assignerUserId && a.user_id === assignerUserId)
  );
  if (isRemoteAllowed) return true;

  const profile = await getAssignmentProfile(targetUserId, targetEmail);
  const isExplicitlyAllowed = profile.allowed_assigners.some(
    a => a.email.toLowerCase().trim() === normalizedAssigner || (assignerUserId && a.user_id === assignerUserId)
  );
  if (isExplicitlyAllowed) return true;

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

  // Check 1: Check remote OTP record from Supabase
  const remote = await fetchRemoteProfileOtpFromSupabase(targetUserId);
  let isValidCode = false;

  if (remote.code && cleanEntered === remote.code.trim()) {
    isValidCode = true;
  }

  if (!isValidCode) {
    const targetProfile = await getAssignmentProfile(targetUserId, targetEmail);
    if (cleanEntered === targetProfile.assignment_code.trim()) {
      isValidCode = true;
    } else {
      const testIdentifiers = [
        targetEmail,
        targetUserId,
        targetProfile.email,
        targetProfile.user_id,
        targetProfile.full_name,
      ].filter(Boolean);

      for (const idStr of testIdentifiers) {
        for (let s = 0; s <= 30; s++) {
          if (cleanEntered === computeDeterministicCode(idStr as string, s)) {
            isValidCode = true;
            break;
          }
        }
        if (isValidCode) break;
      }
    }
  }

  // Fallback: Check local storage
  if (!isValidCode && /^\d{3}$/.test(cleanEntered)) {
    try {
      const storedCode = localStorage.getItem(`permission_code_${targetUserId}`);
      if (storedCode && cleanEntered === storedCode.trim()) {
        isValidCode = true;
      }
    } catch (e) {}
  }

  if (!isValidCode) {
    return {
      success: false,
      error: `Invalid 3-digit code! Please ask ${targetEmail} for their current profile passcode.`,
    };
  }

  // Code is valid! Add assigner to target's allowed list
  const existingList = remote.allowedAssigners || [];
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
    await syncProfileOtpToSupabase(targetUserId, cleanEntered, updatedList);
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
  await syncProfileOtpToSupabase(targetUserId, targetProfile.assignment_code, updatedList);

  return {
    ...targetProfile,
    allowed_assigners: updatedList,
  };
};
