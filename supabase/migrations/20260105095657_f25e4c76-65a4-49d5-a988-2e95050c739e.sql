-- =====================================================
-- Security Fix: Harden profiles, startups, and consultant_notes access
-- =====================================================

-- 1. PROFILES: Drop the policy that allows staff to see full profiles of workspace members
-- The profiles_safe view should be used instead for non-owner access
DROP POLICY IF EXISTS "Users can view profiles with proper access" ON public.profiles;

-- Recreate with stricter access: only own profile or admin can see full PII
-- Other users should use profiles_safe view which masks email/phone
CREATE POLICY "Users can view own profile or admin access"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR is_admin()
);

-- 2. STARTUPS: The startups table allows any workspace member to SELECT full data including NIF
-- We need to restrict direct table access and force use of startups_safe view
-- However, founders and staff NEED to see NIF for legitimate business purposes
-- The issue is external mentors can see NIF through workspace access

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view startups in their workspaces" ON public.startups;

-- Create a stricter policy: only founders, consultors, and admins can view startups directly
-- External mentors should use startups_safe view
CREATE POLICY "Founders and staff can view startups with full details"
ON public.startups
FOR SELECT
USING (
  is_admin() OR 
  -- Founders can see their own startup
  EXISTS (
    SELECT 1 
    FROM workspaces w
    JOIN workspace_users wu ON w.id = wu.workspace_id
    WHERE w.startup_id = startups.id 
      AND wu.user_id = auth.uid() 
      AND wu.role = 'founder'
      AND wu.active = true
  ) OR
  -- Consultors can see startups they're assigned to
  EXISTS (
    SELECT 1 
    FROM workspaces w
    JOIN workspace_users wu ON w.id = wu.workspace_id
    WHERE w.startup_id = startups.id 
      AND wu.user_id = auth.uid() 
      AND wu.role = 'consultor'
      AND wu.active = true
  ) OR
  -- Staff (consultors) have global access
  is_staff()
);

-- 3. CONSULTANT_NOTES: Fix the visibility flaw
-- The issue: is_private could be false but visibility = 'shared_with_founder' exposes notes
-- OR is_private could be true but visibility incorrectly set to 'shared_with_founder'
-- Fix: Ensure is_private=true ALWAYS blocks non-staff access, regardless of visibility field

-- Drop the existing select policy
DROP POLICY IF EXISTS "Staff can view notes based on visibility" ON public.consultant_notes;

-- Create stricter policy: if is_private=true, ONLY staff can see it, period.
-- visibility='shared_with_founder' only works when is_private=false
CREATE POLICY "Staff can view all notes, founders only non-private shared notes"
ON public.consultant_notes
FOR SELECT
USING (
  -- Staff (admin/consultor) can see all notes in accessible workspaces
  (
    (is_admin() OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'consultor'
    ))
    AND has_workspace_access(workspace_id)
  )
  OR
  -- Non-staff can ONLY see notes that are:
  -- 1. NOT private (is_private = false)
  -- 2. AND explicitly shared with founder
  -- 3. AND they have workspace access
  (
    is_private = false 
    AND visibility = 'shared_with_founder'
    AND has_workspace_access(workspace_id)
  )
);

-- Update the trigger to be more explicit about the relationship
CREATE OR REPLACE FUNCTION public.enforce_consultant_notes_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If is_private is true, FORCE visibility to 'private_staff' regardless of input
  IF NEW.is_private = true THEN
    NEW.visibility := 'private_staff';
  END IF;
  
  -- If visibility is 'private_staff', FORCE is_private to true
  IF NEW.visibility = 'private_staff' THEN
    NEW.is_private := true;
  END IF;
  
  -- Validate: shared_with_founder is only valid when is_private=false
  IF NEW.visibility = 'shared_with_founder' AND NEW.is_private = true THEN
    NEW.visibility := 'private_staff';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS enforce_consultant_notes_visibility_trigger ON public.consultant_notes;
CREATE TRIGGER enforce_consultant_notes_visibility_trigger
BEFORE INSERT OR UPDATE ON public.consultant_notes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_consultant_notes_visibility();

-- Fix any existing data that has inconsistent state
UPDATE public.consultant_notes 
SET visibility = 'private_staff' 
WHERE is_private = true AND visibility != 'private_staff';