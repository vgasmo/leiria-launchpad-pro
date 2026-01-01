-- Allow mentors to insert themselves into workspaces when connection is accepted
CREATE POLICY "Mentors can add themselves to workspaces via accepted connection"
ON public.workspace_users
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'mentor_externo'
  AND EXISTS (
    SELECT 1 FROM mentor_connections mc
    JOIN workspace_users wu ON wu.user_id = mc.founder_id AND wu.role = 'founder'
    WHERE mc.mentor_id = auth.uid()
    AND mc.status = 'accepted'
    AND wu.workspace_id = workspace_users.workspace_id
  )
);