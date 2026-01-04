-- =====================================================
-- FIX REMAINING SECURITY ISSUES
-- =====================================================

-- 1) PROFILES: Remove overly permissive mentor/connected profiles policies
-- These policies expose PII (email, phone) to any authenticated user
DROP POLICY IF EXISTS "Users can read mentor profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read connected profiles" ON public.profiles;

-- Create a function to check if user is staff (admin or consultor)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'consultor')
  )
$$;

-- Create a function to check if target user is an external mentor (for directory listing)
CREATE OR REPLACE FUNCTION public.is_external_mentor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'mentor_externo'
  )
$$;

-- Allow authenticated users to read ONLY external mentor profiles (for mentor directory)
-- This is necessary for the mentor booking feature
CREATE POLICY "Authenticated users can read external mentor profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_external_mentor(id));

-- 2) WORKSPACE HEALTH ALERTS: Remove founder UPDATE ability
-- Founders should only be able to VIEW alerts, not modify them
DROP POLICY IF EXISTS "Founders can acknowledge alerts on their workspaces" ON public.workspace_health_alerts;

-- Create staff-only acknowledge policy
-- Staff (admin/consultor) can acknowledge alerts, founders cannot
-- The existing "Staff can manage health alerts" policy already covers this