-- Add assignment fields to todos for task assignment and status tracking
ALTER TABLE public.todos
ADD COLUMN IF NOT EXISTS assigned_to uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS assigned_by uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS assignment_status text DEFAULT 'open',
ADD COLUMN IF NOT EXISTS assigned_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS accepted_at timestamptz DEFAULT NULL;

-- Indexes to speed up queries by assignee/assigner
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to ON public.todos (assigned_to);
CREATE INDEX IF NOT EXISTS idx_todos_assigned_by ON public.todos (assigned_by);
