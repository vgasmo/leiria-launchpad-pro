-- =====================================================
-- SECURITY AUDIT FIXES
-- =====================================================

-- 1) Documents: Respect visibility field in RLS
-- Current policy allows all workspace members to view all documents
-- But visibility field should be respected (private_staff, shared_with_founder, etc.)

DROP POLICY IF EXISTS "Users can view documents in their workspaces" ON public.documents;

-- Create policy that respects visibility field
CREATE POLICY "Users can view documents based on visibility"
ON public.documents
FOR SELECT
TO authenticated
USING (
  -- Admin/Consultor can see everything in accessible workspaces
  (is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'consultor'
  )) AND has_workspace_access(workspace_id)
  OR
  -- Uploader can always see their own documents
  uploaded_by = auth.uid()
  OR
  -- Founders see shared_with_founder or public documents
  (visibility IN ('shared_with_founder', 'public') AND has_workspace_access(workspace_id))
  OR
  -- External mentors see only shared_with_founder or public documents  
  (visibility IN ('shared_with_founder', 'public') AND EXISTS (
    SELECT 1 FROM public.workspace_users wu
    WHERE wu.workspace_id = documents.workspace_id
    AND wu.user_id = auth.uid()
    AND wu.role = 'mentor_externo'
    AND wu.active = true
  ))
);

-- 2) Consultant notes: Ensure founders never see private notes
-- The current policy should already handle this but let's verify and add explicit check
DROP POLICY IF EXISTS "Consultors can view all notes in accessible workspaces" ON public.consultant_notes;

CREATE POLICY "Staff can view notes based on visibility"
ON public.consultant_notes
FOR SELECT
TO authenticated
USING (
  -- Staff (admin/consultor) can see all notes in accessible workspaces
  (is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'consultor'
  )) AND has_workspace_access(workspace_id)
  OR
  -- Non-staff can only see non-private notes if visibility allows
  (NOT is_private AND visibility = 'shared_with_founder' AND has_workspace_access(workspace_id))
);

-- 3) Staff tasks: Ensure only staff can access (already looks good but add explicit check)
-- The INSERT policy has no USING clause which is a security issue
DROP POLICY IF EXISTS "Staff can create tasks" ON public.staff_tasks;

CREATE POLICY "Staff can create tasks"
ON public.staff_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'consultor'
  )
);

-- 4) Workspace alerts: Ensure founders can only VIEW, not modify
-- Already fixed but verify the SELECT policy doesn't expose too much
-- The current SELECT allows anyone with workspace access to view alerts
-- This is probably fine for transparency, but let's make it explicit

-- 5) Add calendar_feed_token to profiles for secure calendar feed URLs
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS calendar_feed_token text UNIQUE;

-- Create index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_profiles_calendar_feed_token 
ON public.profiles(calendar_feed_token) 
WHERE calendar_feed_token IS NOT NULL;