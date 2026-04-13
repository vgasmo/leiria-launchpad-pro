-- Remove overly permissive startup-logos policies that bypass ownership checks
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;

-- Add DELETE policy for ecosystem-backups (admin only)
CREATE POLICY "Admins can delete ecosystem backups"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ecosystem-backups' 
  AND public.is_admin()
);

-- Add UPDATE policy for ecosystem-backups (admin only)
CREATE POLICY "Admins can update ecosystem backups"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ecosystem-backups' 
  AND public.is_admin()
);