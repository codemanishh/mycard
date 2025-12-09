-- Create a safe view for public profile info used by client-side autocomplete
-- This view exposes only non-sensitive fields: id, email, full_name, avatar_url
-- Grant SELECT on the view to the `authenticated` role so logged-in users can search it.

CREATE OR REPLACE VIEW public.public_profiles_view AS
SELECT id, email, full_name, avatar_url
FROM public.profiles;

GRANT SELECT ON public.public_profiles_view TO authenticated;

-- Note: keep RLS on `profiles` and use this view to expose only safe fields to clients.
