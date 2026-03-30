ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS startup_category text DEFAULT NULL;

COMMENT ON COLUMN public.workspaces.startup_category IS 'Startup classification: A (high potential), B (medium), C (low). Set by consultors/admins.';