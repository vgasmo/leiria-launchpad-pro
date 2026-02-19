-- Fix Playbook Dismiss RLS: founders need to UPDATE *to* dismissed and INSERT dismissed instances

-- Drop the broken founder dismiss policy
DROP POLICY IF EXISTS "Founders can dismiss playbooks" ON public.workspace_playbook_instances;

-- Recreate: founders with workspace write access can UPDATE status to 'dismissed'
-- The WITH CHECK ensures the new value is 'dismissed'; USING allows the row to be in any state
CREATE POLICY "Founders can dismiss playbooks"
ON public.workspace_playbook_instances
FOR UPDATE
TO authenticated
USING (
  can_write_workspace(workspace_id)
)
WITH CHECK (
  can_write_workspace(workspace_id)
  AND status = 'dismissed'
);

-- Allow founders to INSERT instances with status='dismissed' (for playbooks not yet instantiated)
CREATE POLICY "Founders can insert dismissed playbook instances"
ON public.workspace_playbook_instances
FOR INSERT
TO authenticated
WITH CHECK (
  can_write_workspace(workspace_id)
  AND status = 'dismissed'
);

-- Allow founders to DELETE their own dismissed instances (for restore/undo)
CREATE POLICY "Founders can delete dismissed playbook instances"
ON public.workspace_playbook_instances
FOR DELETE
TO authenticated
USING (
  can_write_workspace(workspace_id)
  AND status = 'dismissed'
);