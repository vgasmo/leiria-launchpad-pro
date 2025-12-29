-- Create storage bucket for workspace documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-documents', 'workspace-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Users can view files in workspaces they belong to
CREATE POLICY "Users can view documents in their workspaces"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'workspace-documents' 
  AND public.has_workspace_access((storage.foldername(name))[1]::uuid)
);

-- RLS policy: Users with write access can upload files
CREATE POLICY "Users can upload documents to their workspaces"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'workspace-documents' 
  AND public.can_write_workspace((storage.foldername(name))[1]::uuid)
);

-- RLS policy: Users with write access can update files
CREATE POLICY "Users can update documents in their workspaces"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'workspace-documents' 
  AND public.can_write_workspace((storage.foldername(name))[1]::uuid)
);

-- RLS policy: Users with write access can delete files
CREATE POLICY "Users can delete documents in their workspaces"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'workspace-documents' 
  AND public.can_write_workspace((storage.foldername(name))[1]::uuid)
);