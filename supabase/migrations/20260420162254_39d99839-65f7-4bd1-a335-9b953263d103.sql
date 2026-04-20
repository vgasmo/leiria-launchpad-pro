-- Restrict deletion of materialized acceleration gates/deliverables to staff only.
-- Founders and external mentors must NOT be able to delete gates (milestones with source_gate_id)
-- nor deliverables (action_items with source_deliverable_key), since those are program-driven.

-- 1) Replace the permissive "manage" policy on milestones with separate write policies.
DROP POLICY IF EXISTS "Mentors and founders can manage milestones" ON public.milestones;

CREATE POLICY "Write milestones in workspace"
  ON public.milestones
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_workspace(workspace_id));

CREATE POLICY "Update milestones in workspace"
  ON public.milestones
  FOR UPDATE TO authenticated
  USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- Non-gate milestones: any workspace writer can delete.
-- Gate milestones (source_gate_id IS NOT NULL): only staff (admin/consultor) can delete.
CREATE POLICY "Delete milestones (gates restricted to staff)"
  ON public.milestones
  FOR DELETE TO authenticated
  USING (
    public.can_write_workspace(workspace_id)
    AND (source_gate_id IS NULL OR public.is_staff())
  );

-- 2) Replace the permissive "manage" policy on action_items with separate write policies.
DROP POLICY IF EXISTS "Mentors and founders can manage action items" ON public.action_items;

CREATE POLICY "Write action items in workspace"
  ON public.action_items
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_workspace(workspace_id));

CREATE POLICY "Update action items in workspace"
  ON public.action_items
  FOR UPDATE TO authenticated
  USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

-- Non-materialized actions: any workspace writer can delete.
-- Materialized deliverables (source_deliverable_key IS NOT NULL): only staff can delete.
CREATE POLICY "Delete action items (deliverables restricted to staff)"
  ON public.action_items
  FOR DELETE TO authenticated
  USING (
    public.can_write_workspace(workspace_id)
    AND (source_deliverable_key IS NULL OR public.is_staff())
  );

-- 3) Restrict deliverable completion (validation) to staff only.
-- Founders cannot mark a deliverable as completed/validated; only staff can.
DROP POLICY IF EXISTS "Workspace members can update action deliverables" ON public.action_deliverables;
DROP POLICY IF EXISTS "Users can update deliverables in their workspace" ON public.action_deliverables;
DROP POLICY IF EXISTS "Update action deliverables" ON public.action_deliverables;

CREATE POLICY "Only staff can validate deliverables"
  ON public.action_deliverables
  FOR UPDATE TO authenticated
  USING (
    public.is_staff()
    AND EXISTS (
      SELECT 1 FROM public.action_items ai
      WHERE ai.id = action_deliverables.action_id
    )
  )
  WITH CHECK (public.is_staff());