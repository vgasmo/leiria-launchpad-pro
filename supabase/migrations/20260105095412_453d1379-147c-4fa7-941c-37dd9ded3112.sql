-- Fix SECURITY DEFINER view warning by recreating team_members_safe with SECURITY INVOKER
DROP VIEW IF EXISTS public.team_members_safe;

CREATE VIEW public.team_members_safe
WITH (security_invoker = true)
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
FROM public.team_members;

-- Grant select on the safe view
GRANT SELECT ON public.team_members_safe TO authenticated;