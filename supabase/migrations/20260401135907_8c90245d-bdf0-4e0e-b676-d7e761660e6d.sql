-- Fix 1: Recreate profiles_safe with SECURITY INVOKER
-- This ensures the view respects the caller's RLS context
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  full_name,
  avatar_url,
  bio,
  expertise,
  CASE
    WHEN (auth.uid() IS NOT NULL AND (auth.uid() = id OR is_staff())) THEN email
    ELSE NULL::text
  END AS email,
  CASE
    WHEN (auth.uid() IS NOT NULL AND (auth.uid() = id OR is_staff())) THEN phone
    ELSE NULL::text
  END AS phone,
  CASE
    WHEN (auth.uid() IS NOT NULL AND (auth.uid() = id OR is_staff())) THEN linkedin_url
    ELSE NULL::text
  END AS linkedin_url,
  created_at,
  updated_at
FROM profiles
WHERE auth.uid() IS NOT NULL;

-- Fix 2: Replace the overbroad communication_log SELECT policy
DROP POLICY IF EXISTS communication_log_workspace_select ON public.communication_log;

CREATE POLICY "communication_log_workspace_select"
ON public.communication_log
FOR SELECT TO authenticated
USING (
  is_staff()
  OR (
    visibility = 'shared'
    AND has_workspace_access(workspace_id)
  )
);

-- Also drop the now-redundant founder-specific policy since the new policy covers both cases
DROP POLICY IF EXISTS "Founders can view shared workspace communications" ON public.communication_log;