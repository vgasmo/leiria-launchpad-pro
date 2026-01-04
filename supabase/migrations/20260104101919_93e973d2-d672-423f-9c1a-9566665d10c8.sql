
-- =====================================================
-- SECURITY HARDENING: Fix sensitive data exposure
-- =====================================================

-- 1. PROFILES TABLE: Restrict PII access
-- Drop overly permissive staff policy
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;

-- Create a function to check if user is admin only (not consultor)
CREATE OR REPLACE FUNCTION public.is_admin_only()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Create a function to check if users share a workspace
CREATE OR REPLACE FUNCTION public.shares_workspace_with(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.workspace_users wu1
    JOIN public.workspace_users wu2 ON wu1.workspace_id = wu2.workspace_id
    WHERE wu1.user_id = auth.uid()
      AND wu2.user_id = _target_user_id
      AND wu1.active = true
      AND wu2.active = true
  )
$$;

-- Staff can only see non-PII fields (name, avatar, bio, expertise)
-- PII (email, phone, linkedin) is restricted to: owner, admin, or workspace members
CREATE POLICY "Staff can read non-PII profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Full row access requires: own profile, admin, or shared workspace
  auth.uid() = id 
  OR is_admin_only()
  OR shares_workspace_with(id)
);

-- 2. CAP TABLE: Restrict to founders and admins only
-- Create a stricter function for cap table access
CREATE OR REPLACE FUNCTION public.is_startup_founder(_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 
    FROM public.workspace_users wu
    JOIN public.workspaces w ON w.id = wu.workspace_id
    WHERE w.startup_id = _startup_id
      AND wu.user_id = auth.uid()
      AND wu.active = true
      AND wu.role = 'founder'
  )
$$;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can manage cap table for their startups" ON public.cap_table_entries;
DROP POLICY IF EXISTS "Users can view cap table for their startups" ON public.cap_table_entries;

-- Create stricter policies for cap table (founders and admins only)
CREATE POLICY "Founders and admins can view cap table"
ON public.cap_table_entries
FOR SELECT
TO authenticated
USING (is_startup_founder(startup_id));

CREATE POLICY "Founders and admins can manage cap table"
ON public.cap_table_entries
FOR ALL
TO authenticated
USING (is_startup_founder(startup_id))
WITH CHECK (is_startup_founder(startup_id));

-- 3. TEAM MEMBERS: Create tiered access
-- Create function to check if user is founder of this startup
CREATE OR REPLACE FUNCTION public.is_team_member_of_startup(_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.workspace_users wu
    JOIN public.workspaces w ON w.id = wu.workspace_id
    WHERE w.startup_id = _startup_id
      AND wu.user_id = auth.uid()
      AND wu.active = true
      AND wu.role IN ('founder', 'consultor')
  ) OR public.is_admin()
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage team members for their startups" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members for accessible startups" ON public.team_members;

-- Founders, consultors and admins can see full team info including contact details
CREATE POLICY "Founders and staff can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (is_team_member_of_startup(startup_id));

-- Only founders and admins can manage team members
CREATE POLICY "Founders and admins can manage team members"
ON public.team_members
FOR ALL
TO authenticated
USING (is_startup_founder(startup_id))
WITH CHECK (is_startup_founder(startup_id));

-- 4. Update PUBLIC_PROFILES view for safe browsing (no PII)
-- First drop the existing view, then recreate
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
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

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;

-- Add comments explaining the security model
COMMENT ON VIEW public.public_profiles IS 'Safe view of profiles without PII (email, phone, linkedin). Use this for general user browsing.';
COMMENT ON FUNCTION public.is_startup_founder IS 'Checks if current user is a founder of the startup or admin. Use for sensitive data like cap table.';
COMMENT ON FUNCTION public.is_team_member_of_startup IS 'Checks if current user is a founder, consultor, or admin for this startup.';
COMMENT ON FUNCTION public.shares_workspace_with IS 'Checks if current user shares any workspace with the target user.';
