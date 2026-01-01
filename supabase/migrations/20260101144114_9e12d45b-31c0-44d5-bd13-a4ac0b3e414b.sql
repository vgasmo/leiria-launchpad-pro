-- 1. Create/replace function public.can_manage_startup
CREATE OR REPLACE FUNCTION public.can_manage_startup(_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 
    FROM public.workspace_users wu
    JOIN public.workspaces w ON w.id = wu.workspace_id
    WHERE w.startup_id = _startup_id
      AND wu.user_id = auth.uid()
      AND wu.active = true
      AND wu.role IN ('consultor', 'mentor_externo', 'founder')
  )
$$;

-- 2. Create/replace function public.has_program_access
CREATE OR REPLACE FUNCTION public.has_program_access(_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 
    FROM public.workspace_users wu
    JOIN public.workspaces w ON w.id = wu.workspace_id
    WHERE w.program_id = _program_id
      AND wu.user_id = auth.uid()
      AND wu.active = true
  )
$$;

-- 3. Storage RLS policies for workspace-documents bucket
DROP POLICY IF EXISTS "Workspace members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to workspace-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload workspace documents" ON storage.objects;

CREATE POLICY "Workspace members can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-documents' 
  AND public.has_workspace_access((storage.foldername(name))[1]::uuid)
);

-- 4. Storage RLS policies for startup-logos bucket
DROP POLICY IF EXISTS "Authenticated users can upload startup logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload startup logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update startup logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update startup logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete startup logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete startup logos" ON storage.objects;

CREATE POLICY "Startup managers can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'startup-logos'
  AND public.can_manage_startup((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Startup managers can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'startup-logos'
  AND public.can_manage_startup((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Startup managers can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'startup-logos'
  AND public.can_manage_startup((storage.foldername(name))[1]::uuid)
);

-- 5. Storage RLS policies for profile-avatars bucket
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Documents schema: add mime_type column and backfill
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS mime_type text;

UPDATE public.documents
SET mime_type = document_type, document_type = 'file'
WHERE document_type NOT IN ('file', 'link') 
  AND document_type LIKE '%/%';

-- 7. user_roles: policy for authenticated users to view mentor roles (already exists but ensure it's correct)
DROP POLICY IF EXISTS "Authenticated users can view mentor roles" ON public.user_roles;

CREATE POLICY "Authenticated users can view mentor roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role = 'mentor_externo'::app_role);

-- 8. Workspaces: drop consultor manage policy, add update policy for assigned staff
DROP POLICY IF EXISTS "Consultors can manage workspaces" ON public.workspaces;

CREATE POLICY "Assigned staff can update workspaces"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (public.can_edit_workspace(auth.uid(), id))
WITH CHECK (public.can_edit_workspace(auth.uid(), id));

-- 9. Startups: add update policy for assigned consultor/mentor_externo
DROP POLICY IF EXISTS "Assigned staff can update startup" ON public.startups;

CREATE POLICY "Assigned staff can update startup"
ON public.startups
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspaces w
    JOIN public.workspace_users wu ON wu.workspace_id = w.id
    WHERE w.startup_id = startups.id
      AND wu.user_id = auth.uid()
      AND wu.active = true
      AND wu.role IN ('consultor', 'mentor_externo')
  )
);

-- 10. Templates: drop everyone can view, add restricted select policy
DROP POLICY IF EXISTS "Everyone can view templates" ON public.templates;

CREATE POLICY "Users can view accessible templates"
ON public.templates
FOR SELECT
TO authenticated
USING (
  is_global = true 
  OR public.is_admin() 
  OR (program_id IS NOT NULL AND public.has_program_access(program_id))
);