-- Create storage bucket for startup logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('startup-logos', 'startup-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view logos (public bucket)
CREATE POLICY "Startup logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'startup-logos');

-- Allow workspace members to upload/update logos for their startup
CREATE POLICY "Workspace members can upload startup logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'startup-logos' AND
  EXISTS (
    SELECT 1 FROM workspaces w
    JOIN workspace_users wu ON w.id = wu.workspace_id
    WHERE wu.user_id = auth.uid()
    AND wu.active = true
    AND wu.role IN ('admin', 'consultor', 'founder')
    AND (storage.foldername(name))[1] = w.startup_id::text
  )
);

CREATE POLICY "Workspace members can update startup logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'startup-logos' AND
  EXISTS (
    SELECT 1 FROM workspaces w
    JOIN workspace_users wu ON w.id = wu.workspace_id
    WHERE wu.user_id = auth.uid()
    AND wu.active = true
    AND wu.role IN ('admin', 'consultor', 'founder')
    AND (storage.foldername(name))[1] = w.startup_id::text
  )
);

CREATE POLICY "Workspace members can delete startup logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'startup-logos' AND
  EXISTS (
    SELECT 1 FROM workspaces w
    JOIN workspace_users wu ON w.id = wu.workspace_id
    WHERE wu.user_id = auth.uid()
    AND wu.active = true
    AND wu.role IN ('admin', 'consultor', 'founder')
    AND (storage.foldername(name))[1] = w.startup_id::text
  )
);