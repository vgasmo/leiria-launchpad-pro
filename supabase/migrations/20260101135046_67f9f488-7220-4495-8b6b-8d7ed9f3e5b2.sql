-- Allow authenticated users to see mentor_externo roles (needed for Find Mentors page)
CREATE POLICY "Authenticated users can view mentor roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role = 'mentor_externo');