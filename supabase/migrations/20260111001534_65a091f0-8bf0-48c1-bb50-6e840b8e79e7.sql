-- Playbook Governance: Only staff can instantiate playbooks
-- Founders can only set status='dismissed' for their workspace

-- Drop existing overly-permissive policy
DROP POLICY IF EXISTS "Users with write access can manage instances" ON public.workspace_playbook_instances;

-- Create separate policies for different operations

-- SELECT: Users with workspace access can read instances
-- (This policy already exists, keeping it)

-- INSERT: Only staff (admin/consultor) can create instances
CREATE POLICY "Staff can create playbook instances"
ON public.workspace_playbook_instances
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'consultor'::app_role
  )
);

-- UPDATE: Staff can update any field; founders can only set status='dismissed'
CREATE POLICY "Staff can update playbook instances"
ON public.workspace_playbook_instances
FOR UPDATE
TO authenticated
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'consultor'::app_role
  )
);

CREATE POLICY "Founders can dismiss playbooks"
ON public.workspace_playbook_instances
FOR UPDATE
TO authenticated
USING (
  can_write_workspace(workspace_id)
  AND status = 'dismissed'
);

-- DELETE: Only staff can delete instances  
CREATE POLICY "Staff can delete playbook instances"
ON public.workspace_playbook_instances
FOR DELETE
TO authenticated
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'consultor'::app_role
  )
);