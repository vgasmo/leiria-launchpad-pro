-- Drop legacy unique constraint that blocks same founder+mentor across multiple workspaces
ALTER TABLE public.mentor_connections
  DROP CONSTRAINT IF EXISTS mentor_connections_founder_id_mentor_id_key;

-- Ensure canonical uniqueness: one mentor connection per (mentor, workspace)
CREATE UNIQUE INDEX IF NOT EXISTS mentor_connections_mentor_workspace_key
  ON public.mentor_connections (mentor_id, workspace_id)
  WHERE workspace_id IS NOT NULL;

-- Legacy fallback: keep uniqueness for legacy rows that have no workspace_id
CREATE UNIQUE INDEX IF NOT EXISTS mentor_connections_legacy_founder_mentor_key
  ON public.mentor_connections (founder_id, mentor_id)
  WHERE workspace_id IS NULL;