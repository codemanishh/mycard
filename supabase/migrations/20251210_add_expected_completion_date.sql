-- Add expected_completion_date column to todos table for smart task prioritization
ALTER TABLE public.todos 
ADD COLUMN expected_completion_date timestamp with time zone;

-- Create index for faster filtering and sorting
CREATE INDEX IF NOT EXISTS idx_todos_priority_expected_completion ON public.todos(priority, expected_completion_date);
