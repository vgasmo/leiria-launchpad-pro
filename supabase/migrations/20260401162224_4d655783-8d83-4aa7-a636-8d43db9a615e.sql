-- Staff (admin + consultor) can update any workspace
CREATE POLICY "Staff can update any workspace"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());
