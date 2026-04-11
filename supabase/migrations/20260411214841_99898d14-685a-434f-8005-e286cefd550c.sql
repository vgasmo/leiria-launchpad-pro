-- Fix ecosystem_snapshots RLS: allow backoffice (not just admin) since archive/backup is a governance operation
-- and the UI tab + server auth already allow backoffice role

DROP POLICY IF EXISTS "Admins can manage snapshots" ON public.ecosystem_snapshots;

CREATE POLICY "Governance roles can manage snapshots"
  ON public.ecosystem_snapshots
  FOR ALL
  TO authenticated
  USING (public.is_admin() OR public.is_backoffice());

-- Fix storage policy for ecosystem-backups: allow backoffice reads too
DROP POLICY IF EXISTS "Admins can read ecosystem backups" ON storage.objects;

CREATE POLICY "Governance roles can read ecosystem backups"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'ecosystem-backups' AND (public.is_admin() OR public.is_backoffice()));

-- Fix storage write policy similarly
DROP POLICY IF EXISTS "Service role can write ecosystem backups" ON storage.objects;

CREATE POLICY "Governance roles can write ecosystem backups"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ecosystem-backups' AND (public.is_admin() OR public.is_backoffice()));