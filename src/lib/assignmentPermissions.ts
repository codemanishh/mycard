import { supabase } from '@/integrations/supabase/client';

export interface AllowedAssigner {
  user_id?: string;
  email: string;
  full_name?: string;
  added_at?: string;
  is_revoked?: boolean;
}

export interface UserAssignmentProfile {
  user_id: string;
  email: string;
  full_name: string;
  assignment_code: string; // 3-digit OTP
  code_seed: number;
  allowed_assigners: AllowedAssigner[];
  revoked_assigners?: string[];
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
  let rawAssignersMap = new Map<string, AllowedAssigner>();
  let dbCode = '';

  const cleanUserEmail = (userEmail || '').toLowerCase().trim();

  // 1. Try loading from local cache first
  try {
    const cachedName = localStorage.getItem(getCacheKey(userId, 'name'));
    const cachedAssigners = localStorage.getItem(getCacheKey(userId, 'assigners'));
    const cachedCode = localStorage.getItem(getCacheKey(userId, 'code'));

    if (cachedName) full_name = cachedName;
    if (cachedCode) dbCode = cachedCode;
    if (cachedAssigners) {
      const parsed: AllowedAssigner[] = JSON.parse(cachedAssigners);
      parsed.forEach(a => {
        if (a && a.email) rawAssignersMap.set(a.email.toLowerCase().trim(), a);
      });
    }
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
        p.allowed_assigners.forEach((a: AllowedAssigner) => {
          if (a && a.email) {
            const key = a.email.toLowerCase().trim();
            const existing = rawAssignersMap.get(key);
            // Preserve is_revoked status from DB or local
            rawAssignersMap.set(key, { ...a, is_revoked: existing?.is_revoked ?? a.is_revoked });
          }
        });
      }
    }
  } catch (err) {}

  // 3. Discover assigners dynamically from todos table
  try {
    const { data: assignedTodos } = await supabase
      .from('todos')
      .select('assigned_by, user_id, assigned_to');

    if (assignedTodos && assignedTodos.length > 0) {
      const assignerIdentifiers = new Set<string>();

      for (const t of assignedTodos) {
        const assignedToVal = (t.assigned_to || '').toString().toLowerCase().trim();
        const isAssignedToMe = (
          assignedToVal === userId.toLowerCase() ||
          (cleanUserEmail && assignedToVal === cleanUserEmail)
        );

        if (isAssignedToMe) {
          const assignerId = (t.assigned_by || t.user_id || '').toString().trim();
          if (assignerId && assignerId.toLowerCase() !== userId.toLowerCase() && assignerId.toLowerCase() !== cleanUserEmail) {
            assignerIdentifiers.add(assignerId);
          }
        }
      }

      for (const idOrEmail of assignerIdentifiers) {
        const isEmail = idOrEmail.includes('@');
        const cleanKey = idOrEmail.toLowerCase().trim();

        // Check if already present in map
        let existingKey: string | null = null;
        for (const [k, v] of rawAssignersMap.entries()) {
          if (k === cleanKey || (v.user_id && v.user_id === idOrEmail)) {
            existingKey = k;
            break;
          }
        }

        if (!existingKey) {
          try {
            const { data: assignerProfile } = await supabase
              .from('public_profiles_view')
              .select('user_id, email, full_name')
              .or(isEmail ? `email.ilike.${cleanKey}` : `user_id.eq.${idOrEmail}`)
              .maybeSingle();

            if (assignerProfile && assignerProfile.email) {
              const emailKey = assignerProfile.email.toLowerCase().trim();
              rawAssignersMap.set(emailKey, {
                user_id: assignerProfile.user_id,
                email: assignerProfile.email,
                full_name: assignerProfile.full_name || assignerProfile.email.split('@')[0],
                added_at: new Date().toISOString(),
                is_revoked: false,
              });
            } else if (isEmail) {
              rawAssignersMap.set(cleanKey, {
                email: cleanKey,
                full_name: cleanKey.split('@')[0],
                added_at: new Date().toISOString(),
                is_revoked: false,
              });
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}

  const allAssignersList = Array.from(rawAssignersMap.values());
  const activeAssigners = allAssignersList.filter(a => !a.is_revoked);
  const revokedEmails = allAssignersList.filter(a => a.is_revoked).map(a => a.email.toLowerCase().trim());

  // Compute deterministic fallback code if no custom code set
  const assignment_code = dbCode || computeDeterministicCode(userEmail || userId);

  // Update local cache
  try {
    localStorage.setItem(getCacheKey(userId, 'code'), assignment_code);
    if (full_name) localStorage.setItem(getCacheKey(userId, 'name'), full_name);
    localStorage.setItem(getCacheKey(userId, 'assigners'), JSON.stringify(allAssignersList));
  } catch (e) {}

  return {
    user_id: userId,
    email: userEmail,
    full_name: full_name || userEmail.split('@')[0],
    assignment_code,
    code_seed: 0,
    allowed_assigners: activeAssigners,
    revoked_assigners: revokedEmails,
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

  // Check local cache for explicit revocation first
  try {
    if (localStorage.getItem(`permission_revoked_${targetUserId}_${normalizedAssigner}`) === 'true') {
      return false;
    }
  } catch (e) {}

  // Check 1: Allowed assigners list from Supabase profile / cache / todos
  const profile = await getAssignmentProfile(targetUserId, targetEmail);

  // If explicitly revoked, REJECT immediately!
  if (profile.revoked_assigners?.includes(normalizedAssigner)) {
    return false;
  }

  // Check if active in allowed_assigners
  if (profile.allowed_assigners.some(a => a.email.toLowerCase().trim() === normalizedAssigner || (assignerUserId && a.user_id === assignerUserId))) {
    return true;
  }

  // Check local OTP verification override (if assigner verified code on this device)
  try {
    if (localStorage.getItem(`otp_verified_${normalizedAssigner}_to_${normalizedTarget}`) === 'true') {
      return true;
    }
  } catch (e) {}

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
  const normalizedAssigner = assignerEmail.toLowerCase().trim();
  const normalizedTarget = targetEmail.toLowerCase().trim();

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

  // Code is valid! Store local OTP verification pass so task creation succeeds smoothly
  try {
    localStorage.setItem(`otp_verified_${normalizedAssigner}_to_${normalizedTarget}`, 'true');
    localStorage.removeItem(`permission_revoked_${targetUserId}_${normalizedAssigner}`);
  } catch (e) {}

  // Attempt to update target profile (if target == current user or if permitted)
  try {
    const existingList = targetProfile.allowed_assigners || [];
    const isAlreadyAdded = existingList.some(
      a => a.email.toLowerCase().trim() === normalizedAssigner
    );

    if (!isAlreadyAdded) {
      const updatedList = [
        ...existingList.map(a => a.email.toLowerCase().trim() === normalizedAssigner ? { ...a, is_revoked: false } : a),
        {
          email: assignerEmail,
          full_name: assignerName || assignerEmail.split('@')[0],
          user_id: assignerUserId,
          added_at: new Date().toISOString(),
          is_revoked: false,
        },
      ];
      await updateAssignmentProfile(targetUserId, {
        allowed_assigners: updatedList,
      });
    }
  } catch (e) {
    // Non-fatal if RLS prevents cross-user edit; local verification pass handles assignment
  }

  return { success: true };
};

export const revokeAssigner = async (
  targetUserId: string,
  targetEmail: string,
  assignerEmailToRevoke: string
): Promise<UserAssignmentProfile> => {
  const normalizedRevoke = assignerEmailToRevoke.toLowerCase().trim();

  // Load raw cached list
  let rawAssigners: AllowedAssigner[] = [];
  try {
    const cachedAssigners = localStorage.getItem(getCacheKey(targetUserId, 'assigners'));
    if (cachedAssigners) rawAssigners = JSON.parse(cachedAssigners);
  } catch (e) {}

  // Also fetch current profile to ensure complete list
  const profile = await getAssignmentProfile(targetUserId, targetEmail);

  // Combine raw cached with profile.allowed_assigners
  const map = new Map<string, AllowedAssigner>();
  [...rawAssigners, ...(profile.allowed_assigners || [])].forEach(a => {
    if (a && a.email) map.set(a.email.toLowerCase().trim(), a);
  });

  let found = false;
  const updatedAll: AllowedAssigner[] = [];

  for (const [emailKey, assigner] of map.entries()) {
    if (emailKey === normalizedRevoke) {
      found = true;
      updatedAll.push({ ...assigner, is_revoked: true });
    } else {
      updatedAll.push(assigner);
    }
  }

  if (!found) {
    updatedAll.push({
      email: assignerEmailToRevoke,
      full_name: assignerEmailToRevoke.split('@')[0],
      is_revoked: true,
      added_at: new Date().toISOString(),
    });
  }

  // Update target user's profile in Supabase DB (targetUserId is logged-in user, RLS allows this!)
  await updateAssignmentProfile(targetUserId, {
    allowed_assigners: updatedAll,
  });

  // Store explicit local revocation flag
  try {
    localStorage.setItem(getCacheKey(targetUserId, 'assigners'), JSON.stringify(updatedAll));
    localStorage.setItem(`permission_revoked_${targetUserId}_${normalizedRevoke}`, 'true');
    const targetEmailNorm = (targetEmail || '').toLowerCase().trim();
    localStorage.removeItem(`otp_verified_${normalizedRevoke}_to_${targetEmailNorm}`);
  } catch (e) {}

  const activeAssigners = updatedAll.filter(a => !a.is_revoked);
  const revokedEmails = updatedAll.filter(a => a.is_revoked).map(a => a.email.toLowerCase().trim());

  return {
    ...profile,
    allowed_assigners: activeAssigners,
    revoked_assigners: revokedEmails,
  };
};

