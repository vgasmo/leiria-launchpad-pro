-- ============================================
-- STREAM C: Make public.contracts legacy inert
-- ============================================
DROP POLICY IF EXISTS "Staff can manage all contracts" ON public.contracts;

-- Re-add a SELECT-only policy for staff (audit access)
DROP POLICY IF EXISTS "Staff can view legacy contracts (audit)" ON public.contracts;
CREATE POLICY "Staff can view legacy contracts (audit)"
ON public.contracts
FOR SELECT
TO authenticated
USING (public.is_staff());

COMMENT ON TABLE public.contracts IS
'LEGACY INERT (v4.0) — superseded by public.startup_contracts. Read-only for audit purposes only. No application code paths write to this table. Do not re-enable write policies without architectural review.';

-- ============================================
-- STREAM B-DB: mentor_connections semantics
-- ============================================
-- Add unique index on (mentor_id, workspace_id) where workspace_id is set
CREATE UNIQUE INDEX IF NOT EXISTS mentor_connections_mentor_workspace_unique
ON public.mentor_connections (mentor_id, workspace_id)
WHERE workspace_id IS NOT NULL;

COMMENT ON COLUMN public.mentor_connections.founder_id IS
'Should reference a founder auth.users.id. LEGACY rows (pre-v4.0) may incorrectly contain a workspace_id — read paths must prefer workspace_id and fall back to founder_id only when workspace_id IS NULL. New writes must store the real founder user id and populate workspace_id.';

COMMENT ON COLUMN public.mentor_connections.workspace_id IS
'Canonical workspace reference for the mentor↔startup relationship (v4.0+). Always populated by current write paths.';