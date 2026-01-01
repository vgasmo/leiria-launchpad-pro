-- Add RLS policies for storage buckets

-- Policy for workspace-documents: only workspace members can access
CREATE POLICY "Workspace members can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'workspace-documents' AND
  public.has_workspace_access((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Workspace members can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workspace-documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Workspace members can update documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'workspace-documents' AND
  public.has_workspace_access((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Workspace members can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'workspace-documents' AND
  public.has_workspace_access((storage.foldername(name))[1]::uuid)
);

-- Policy for startup-logos: authenticated users can view, upload, update, delete
CREATE POLICY "Authenticated users can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'startup-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'startup-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'startup-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'startup-logos' AND auth.role() = 'authenticated');

-- Policy for profile-avatars: authenticated users can view, upload, update, delete
CREATE POLICY "Authenticated users can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-avatars' AND auth.role() = 'authenticated');