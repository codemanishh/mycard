-- Migration: convert todos.assigned_to/assigned_by values that reference profiles.id into auth user ids (profiles.user_id)
-- This is safe to run once. It finds todos where assigned_to or assigned_by equals a profiles.id
-- and replaces it with the corresponding profiles.user_id.

BEGIN;

-- 1) Preview how many todos will be updated for assigned_to
SELECT count(*) AS to_update_assigned_to
FROM public.todos t
JOIN public.profiles p ON t.assigned_to = p.id;

-- 2) Update assigned_to (profile.id -> profiles.user_id)
UPDATE public.todos t
SET assigned_to = p.user_id
FROM public.profiles p
WHERE t.assigned_to = p.id
  AND p.user_id IS NOT NULL;

-- 3) Preview how many todos will be updated for assigned_by
SELECT count(*) AS to_update_assigned_by
FROM public.todos t
JOIN public.profiles p ON t.assigned_by = p.id;

-- 4) Update assigned_by (profile.id -> profiles.user_id)
UPDATE public.todos t
SET assigned_by = p.user_id
FROM public.profiles p
WHERE t.assigned_by = p.id
  AND p.user_id IS NOT NULL;

-- 5) Return counts of rows now referencing profile ids (should be 0)
SELECT
  (SELECT count(*) FROM public.todos t JOIN public.profiles p ON t.assigned_to = p.id) AS remaining_assigned_to_profileids,
  (SELECT count(*) FROM public.todos t JOIN public.profiles p ON t.assigned_by = p.id) AS remaining_assigned_by_profileids;

COMMIT;
