-- Add recurrence support to todos
ALTER TABLE public.todos
ADD COLUMN IF NOT EXISTS recurrence_pattern text DEFAULT NULL, -- 'daily' | 'weekly' | 'monthly' | 'yearly' | null (none)
ADD COLUMN IF NOT EXISTS recurrence_end_date timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_todo_id uuid DEFAULT NULL REFERENCES public.todos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

-- Indexes for recurrence queries
CREATE INDEX IF NOT EXISTS idx_todos_recurrence_pattern ON public.todos (recurrence_pattern);
CREATE INDEX IF NOT EXISTS idx_todos_is_template ON public.todos (is_template);
CREATE INDEX IF NOT EXISTS idx_todos_parent_todo_id ON public.todos (parent_todo_id);
