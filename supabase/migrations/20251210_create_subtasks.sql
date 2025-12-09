-- Create subtasks table for task checklists
CREATE TABLE IF NOT EXISTS public.subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id uuid NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON public.subtasks (todo_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_order ON public.subtasks (todo_id, order_index);

-- Enable RLS
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view subtasks of their own todos
CREATE POLICY "Users can view their todo subtasks" ON public.subtasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.todos
      WHERE public.todos.id = subtasks.todo_id
      AND public.todos.user_id = auth.uid()
    )
  );

-- RLS policy: Users can insert subtasks for their own todos
CREATE POLICY "Users can insert subtasks for their todos" ON public.subtasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todos
      WHERE public.todos.id = subtasks.todo_id
      AND public.todos.user_id = auth.uid()
    )
  );

-- RLS policy: Users can update subtasks of their own todos
CREATE POLICY "Users can update their todo subtasks" ON public.subtasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.todos
      WHERE public.todos.id = subtasks.todo_id
      AND public.todos.user_id = auth.uid()
    )
  );

-- RLS policy: Users can delete subtasks of their own todos
CREATE POLICY "Users can delete their todo subtasks" ON public.subtasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.todos
      WHERE public.todos.id = subtasks.todo_id
      AND public.todos.user_id = auth.uid()
    )
  );
