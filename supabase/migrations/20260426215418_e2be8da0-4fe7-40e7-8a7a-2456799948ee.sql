-- 1. Founder welcome wizard flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_seen_welcome_wizard boolean NOT NULL DEFAULT false;

-- 2. Workspace celebrations (idempotency for confetti / toast events)
CREATE TABLE IF NOT EXISTS public.workspace_celebrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  metadata jsonb,
  fired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_workspace_celebrations_ws
  ON public.workspace_celebrations(workspace_id);

ALTER TABLE public.workspace_celebrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can view celebrations" ON public.workspace_celebrations;
CREATE POLICY "members can view celebrations"
  ON public.workspace_celebrations
  FOR SELECT
  TO authenticated
  USING (public.has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "members can insert celebrations" ON public.workspace_celebrations;
CREATE POLICY "members can insert celebrations"
  ON public.workspace_celebrations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_workspace_access(workspace_id));

-- 3. Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'workspace_celebrations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_celebrations';
  END IF;
END$$;