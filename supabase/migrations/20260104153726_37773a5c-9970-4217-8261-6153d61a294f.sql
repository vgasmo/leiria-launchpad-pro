-- P1.3: Improve mentor access - Create function to check if user is connected mentor
CREATE OR REPLACE FUNCTION public.is_connected_mentor(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND role = 'mentor_externo'
      AND active = true
  )
  OR public.is_staff();
$$;