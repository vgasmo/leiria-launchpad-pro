
-- =============================================================================
-- Security Fix: Harden public_profiles view to require authentication
-- =============================================================================

-- Drop and recreate public_profiles with authentication requirement
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true, security_barrier = true)
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
FROM public.profiles p
WHERE auth.uid() IS NOT NULL;  -- CRITICAL: Require authentication

-- Grant access to authenticated users only
GRANT SELECT ON public.public_profiles TO authenticated;
REVOKE ALL ON public.public_profiles FROM anon;
REVOKE ALL ON public.public_profiles FROM public;

COMMENT ON VIEW public.public_profiles IS 'Safe view of profiles showing only non-PII fields. Requires authentication.';


-- =============================================================================
-- Security Fix: Harden team_members_safe view with authentication requirement
-- =============================================================================

-- Drop and recreate team_members_safe with authentication requirement
DROP VIEW IF EXISTS public.team_members_safe;

CREATE VIEW public.team_members_safe
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  id,
  startup_id,
  user_id,
  full_name,
  role,
  title,
  is_founder,
  joined_at,
  left_at,
  created_at,
  -- Mask PII fields for non-privileged users
  CASE WHEN can_see_team_member_pii(startup_id) THEN email ELSE NULL END AS email,
  CASE WHEN can_see_team_member_pii(startup_id) THEN phone ELSE NULL END AS phone,
  CASE WHEN can_see_team_member_pii(startup_id) THEN linkedin_url ELSE NULL END AS linkedin_url
FROM public.team_members
WHERE auth.uid() IS NOT NULL;  -- CRITICAL: Require authentication

-- Grant access to authenticated users only
GRANT SELECT ON public.team_members_safe TO authenticated;
REVOKE ALL ON public.team_members_safe FROM anon;
REVOKE ALL ON public.team_members_safe FROM public;

COMMENT ON VIEW public.team_members_safe IS 'Safe view of team members with PII masking. Requires authentication.';


-- =============================================================================
-- Verify: Ensure base tables cannot be read by anonymous users
-- =============================================================================

-- Revoke any residual anonymous access from base tables
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.team_members FROM anon;
