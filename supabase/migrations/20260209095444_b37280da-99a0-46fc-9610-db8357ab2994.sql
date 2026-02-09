
-- =============================================================
-- Security Fix: Profiles PII, Team Members, Financial Models
-- =============================================================

-- 1. PROFILES: Recreate profiles_safe WITHOUT security_invoker
DROP VIEW IF EXISTS public.profiles_safe CASCADE;

CREATE VIEW public.profiles_safe
WITH (security_barrier=true) AS
SELECT 
  id, full_name, avatar_url, bio, expertise,
  CASE WHEN (auth.uid() IS NOT NULL) AND (auth.uid() = id OR public.is_staff()) THEN email ELSE NULL::text END AS email,
  CASE WHEN (auth.uid() IS NOT NULL) AND (auth.uid() = id OR public.is_staff()) THEN phone ELSE NULL::text END AS phone,
  CASE WHEN (auth.uid() IS NOT NULL) AND (auth.uid() = id OR public.is_staff()) THEN linkedin_url ELSE NULL::text END AS linkedin_url,
  created_at, updated_at
FROM public.profiles
WHERE auth.uid() IS NOT NULL;

-- Drop overly broad workspace member policy
DROP POLICY IF EXISTS "Workspace members can view member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admin access" ON public.profiles;

-- 2. TEAM MEMBERS: Recreate safe view and tighten base table
DROP VIEW IF EXISTS public.team_members_safe CASCADE;

CREATE VIEW public.team_members_safe
WITH (security_barrier=true) AS
SELECT
  id, startup_id, user_id, full_name, role, title, is_founder, joined_at, left_at, created_at, updated_at,
  CASE WHEN public.is_staff() OR public.is_startup_founder(startup_id) THEN email ELSE NULL::text END AS email,
  CASE WHEN public.is_staff() OR public.is_startup_founder(startup_id) THEN phone ELSE NULL::text END AS phone,
  CASE WHEN public.is_staff() OR public.is_startup_founder(startup_id) THEN linkedin_url ELSE NULL::text END AS linkedin_url
FROM public.team_members
WHERE auth.uid() IS NOT NULL;

DROP POLICY IF EXISTS "Founders and staff can view full team member details" ON public.team_members;

CREATE POLICY "Team visible to own startup founders and assigned staff"
ON public.team_members FOR SELECT
USING (
  public.is_admin()
  OR public.is_startup_founder(startup_id)
  OR (public.is_staff() AND EXISTS (
    SELECT 1 FROM public.workspace_assignments wa
    JOIN public.workspaces w ON w.id = wa.workspace_id
    WHERE w.startup_id = team_members.startup_id AND wa.assigned_user_id = auth.uid()
  ))
);

-- 3. FINANCIAL MODEL VERSIONS: Restrict to founders + staff
DROP POLICY IF EXISTS "Users can view versions in their workspaces" ON public.financial_model_versions;

CREATE POLICY "Founders and staff can view financial models"
ON public.financial_model_versions FOR SELECT
USING (
  public.is_admin() OR public.is_staff()
  OR EXISTS (
    SELECT 1 FROM public.workspace_users wu
    WHERE wu.workspace_id = financial_model_versions.workspace_id
      AND wu.user_id = auth.uid() AND wu.active = true AND wu.role = 'founder'
  )
);
