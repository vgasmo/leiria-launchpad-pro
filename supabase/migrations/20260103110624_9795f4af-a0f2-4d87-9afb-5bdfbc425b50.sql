-- Allow users to read profiles of external mentors (for browsing and connections)
CREATE POLICY "Users can read mentor profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = profiles.id
    AND user_roles.role = 'mentor_externo'
  )
);

-- Allow users to read profiles of people they have connections with
CREATE POLICY "Users can read connected profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM mentor_connections mc
    WHERE (
      (mc.founder_id = auth.uid() AND mc.mentor_id = profiles.id)
      OR 
      (mc.mentor_id = auth.uid() AND mc.founder_id = profiles.id)
    )
  )
);