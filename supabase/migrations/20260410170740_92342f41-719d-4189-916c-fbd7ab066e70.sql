-- Stream B: Add workspace_id column to mentor_connections for semantic correctness
-- The existing founder_id column stores workspace_id values (legacy naming).
-- We add a proper workspace_id column, backfill from founder_id, and keep founder_id for compatibility.

ALTER TABLE public.mentor_connections ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Backfill workspace_id from founder_id (which has always stored workspace IDs)
UPDATE public.mentor_connections SET workspace_id = founder_id WHERE workspace_id IS NULL;

-- Add a comment to clarify the legacy column
COMMENT ON COLUMN public.mentor_connections.founder_id IS 'LEGACY: This column historically stored workspace_id values. Use workspace_id column instead for new code.';
COMMENT ON COLUMN public.mentor_connections.workspace_id IS 'The workspace this mentor connection is associated with.';

-- Stream D: Neutralize public.contracts as explicit legacy inert/read-only
-- Revoke write access from all roles except postgres (owner)
REVOKE INSERT, UPDATE, DELETE ON public.contracts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.contracts FROM anon;

-- Add table comment marking it as legacy
COMMENT ON TABLE public.contracts IS 'LEGACY INERT — This table is no longer used for operational contract truth. All active contract operations use startup_contracts. Retained for historical compatibility only. Read-only access preserved for audit queries.';