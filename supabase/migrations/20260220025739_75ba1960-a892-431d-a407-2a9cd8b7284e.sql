
-- Fix: Make startup-documents bucket private to prevent unauthenticated access
UPDATE storage.buckets 
SET public = false 
WHERE id = 'startup-documents';

-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view startup documents" ON storage.objects;

-- Add scoped SELECT: staff + workspace members of the startup
CREATE POLICY "Users can view own startup documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'startup-documents' 
  AND (
    public.is_admin() 
    OR public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.workspace_users wu ON w.id = wu.workspace_id
      WHERE w.startup_id::text = (storage.foldername(name))[1]
        AND wu.user_id = auth.uid()
        AND wu.active = true
    )
  )
);
