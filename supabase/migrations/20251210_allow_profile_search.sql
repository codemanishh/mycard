-- Allow authenticated users to search profiles for assignment autocomplete
-- This policy permits SELECT on limited profile fields for any authenticated user.

-- IMPORTANT: Review data exposure before applying in production.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to select profiles for assignment" ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Optionally restrict to only return non-sensitive fields via a view or select statements in the app.
