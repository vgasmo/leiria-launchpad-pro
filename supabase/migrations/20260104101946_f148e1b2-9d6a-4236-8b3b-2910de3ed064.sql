
-- Fix the public_profiles view to use SECURITY INVOKER (default)
-- This is safer as it respects the querying user's RLS policies
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate with explicit SECURITY INVOKER
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.expertise,
  COALESCE(
    (SELECT string_agg(ur.role::text, ', ') FROM public.user_roles ur WHERE ur.user_id = p.id),
    'member'
  ) AS role_display,
  p.created_at
FROM public.profiles p;

-- Grant access to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

COMMENT ON VIEW public.public_profiles IS 'Safe view of profiles showing only non-PII fields. Uses SECURITY INVOKER so RLS on profiles table is respected.';
