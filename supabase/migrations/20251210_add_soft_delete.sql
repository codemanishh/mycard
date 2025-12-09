-- Add soft-delete support to todos
ALTER TABLE public.todos
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for soft-delete queries
CREATE INDEX IF NOT EXISTS idx_todos_is_deleted ON public.todos (is_deleted);
