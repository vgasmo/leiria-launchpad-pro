-- Fix: Change view to use security_invoker instead of security_definer
-- This ensures the view respects the querying user's permissions

DROP VIEW IF EXISTS public.public_profiles;

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
  ) AS role_display
FROM public.profiles p;

GRANT SELECT ON public.public_profiles TO authenticated;