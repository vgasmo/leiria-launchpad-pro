
-- Allow staff members (admin + consultor) to see admin/consultor roles
-- This fixes the consultant selector only showing the current user
CREATE POLICY "Staff can view staff roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  role IN ('admin', 'consultor') AND public.is_staff()
);
