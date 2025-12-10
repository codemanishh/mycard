-- Add RLS policy to allow users to view todos assigned to them
-- This allows assignees to see tasks in their "Assigned to me" tab

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Allow a user to SELECT todos where:
-- 1) They created the todo (user_id = auth.uid()), OR
-- 2) The todo is assigned to them (assigned_to = auth.uid())
CREATE POLICY "Users can view todos they created or are assigned to" ON public.todos
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = assigned_to);

-- Verify policy was created
SELECT policyname, cmd, permissive, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'todos' AND policyname = 'Users can view todos they created or are assigned to';
