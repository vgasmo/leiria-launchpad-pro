-- ==========================================
-- Stream A: Add archive columns to startup_contracts
-- ==========================================
ALTER TABLE public.startup_contracts
  ADD COLUMN IF NOT EXISTS archive_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_location_url TEXT,
  ADD COLUMN IF NOT EXISTS archive_checksum TEXT,
  ADD COLUMN IF NOT EXISTS archive_filename TEXT,
  ADD COLUMN IF NOT EXISTS archive_attempt_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_archive_error TEXT,
  ADD COLUMN IF NOT EXISTS archive_provider TEXT DEFAULT 'sharepoint';

-- Index for archive eligibility queries
CREATE INDEX IF NOT EXISTS idx_startup_contracts_archive_eligible
  ON public.startup_contracts (signed_at, archive_status, archive_attempt_count)
  WHERE signed_at IS NOT NULL;

-- ==========================================
-- Stream B: Create ecosystem_snapshots table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ecosystem_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type TEXT NOT NULL DEFAULT 'full',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  storage_path TEXT,
  checksum TEXT,
  record_counts JSONB,
  last_error TEXT,
  initiated_by UUID,
  is_scheduled BOOLEAN DEFAULT true,
  retention_class TEXT DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecosystem_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage snapshots"
  ON public.ecosystem_snapshots
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ==========================================
-- Storage bucket for ecosystem backups
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ecosystem-backups', 'ecosystem-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admin-only
CREATE POLICY "Admins can read ecosystem backups"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'ecosystem-backups' AND public.is_admin());

CREATE POLICY "Service role can write ecosystem backups"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ecosystem-backups' AND public.is_admin());