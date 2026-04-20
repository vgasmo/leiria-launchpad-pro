
-- 1) Create private storage bucket for support materials (PowerPoints, PDFs, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-materials', 'support-materials', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Storage policies: consultors/admins upload & manage; founders read program materials
CREATE POLICY "Staff can upload support materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-materials' AND public.is_staff()
);

CREATE POLICY "Staff can update support materials"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'support-materials' AND public.is_staff());

CREATE POLICY "Staff can delete support materials"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'support-materials' AND public.is_staff());

-- Read: staff always; founders/mentors if any of their workspaces match the file's program folder
-- File path convention: <program_id>/<material_id>/<filename>
CREATE POLICY "Members can read program support materials"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-materials'
  AND (
    public.is_staff()
    OR EXISTS (
      SELECT 1
      FROM public.workspace_users wu
      JOIN public.workspaces w ON w.id = wu.workspace_id
      WHERE wu.user_id = auth.uid()
        AND wu.active = true
        AND w.program_id::text = (storage.foldername(name))[1]
    )
  )
);

-- 3) Update support_materials RLS: allow consultors to insert/update/delete their own
-- Existing "Staff can manage" already covers admin+consultor via is_staff(); ensure ownership for safety
DROP POLICY IF EXISTS "Staff can manage support materials" ON public.support_materials;
DROP POLICY IF EXISTS "Staff can manage support_materials" ON public.support_materials;
DROP POLICY IF EXISTS "Staff can read all support_materials" ON public.support_materials;

CREATE POLICY "Staff can manage support materials"
ON public.support_materials
FOR ALL
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- 4) Founders/mentors can read approved materials for their workspace's program
DROP POLICY IF EXISTS "Anyone can view approved support materials" ON public.support_materials;

CREATE POLICY "Members can view approved program materials"
ON public.support_materials
FOR SELECT
TO authenticated
USING (
  status = 'approved'
  AND (
    public.is_staff()
    OR program_id IS NULL  -- global materials remain visible to everyone
    OR EXISTS (
      SELECT 1
      FROM public.workspace_users wu
      JOIN public.workspaces w ON w.id = wu.workspace_id
      WHERE wu.user_id = auth.uid()
        AND wu.active = true
        AND w.program_id = support_materials.program_id
    )
  )
);
