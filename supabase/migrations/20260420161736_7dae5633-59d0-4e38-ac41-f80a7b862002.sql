
-- 1) Permitir leitura da linha de profiles para perfis com role mentor_externo
CREATE POLICY "Authenticated can read mentor profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = profiles.id
        AND ur.role = 'mentor_externo'::public.app_role
    )
  );

-- 2) RPC segura para founder obter contacto do consultor atribuído ao seu workspace
CREATE OR REPLACE FUNCTION public.get_assigned_consultant_contact(p_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  linkedin_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_consultor_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  -- Staff bypass OR founder must be a member of the workspace
  IF NOT (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.workspace_users wu
      WHERE wu.workspace_id = p_workspace_id
        AND wu.user_id = v_user
        AND wu.active = true
    )
  ) THEN
    RETURN;
  END IF;

  SELECT w.assigned_consultor_id INTO v_consultor_id
  FROM public.workspaces w
  WHERE w.id = p_workspace_id;

  IF v_consultor_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.avatar_url, p.linkedin_url
  FROM public.profiles p
  WHERE p.id = v_consultor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assigned_consultant_contact(uuid) TO authenticated;
