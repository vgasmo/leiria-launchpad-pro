
-- Fix workspaces SELECT RLS policy: wu.workspace_id = wu.id was comparing two columns
-- from the same table (workspace_users) instead of referencing the outer workspaces table.
-- This made the fallback condition always false.
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;

CREATE POLICY "Users can view their workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  has_workspace_access(id)
  OR EXISTS (
    SELECT 1 FROM public.workspace_users wu
    WHERE wu.workspace_id = workspaces.id
    AND wu.user_id = auth.uid()
  )
);
