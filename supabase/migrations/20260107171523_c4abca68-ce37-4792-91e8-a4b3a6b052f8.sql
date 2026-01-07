-- Fix migration error: parameters with defaults must come after required ones.

CREATE OR REPLACE FUNCTION public.create_startup_application(
  p_name text,
  p_stage text,
  p_program_id uuid,
  p_description text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_nif text DEFAULT NULL,
  p_main_contact_name text DEFAULT NULL,
  p_main_contact_email text DEFAULT NULL,
  p_main_contact_phone text DEFAULT NULL,
  p_has_startup_portugal_status boolean DEFAULT false
)
RETURNS TABLE(startup_id uuid, workspace_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_startup_id uuid;
  v_workspace_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure the caller has a founder role (safe: only ever inserts their own founder role)
  PERFORM public.ensure_founder_role();

  -- Defense in depth
  IF NOT public.is_founder_user() THEN
    RAISE EXCEPTION 'Founder role required';
  END IF;

  INSERT INTO public.startups (
    name,
    description,
    website,
    nif,
    main_contact_name,
    main_contact_email,
    main_contact_phone,
    has_startup_portugal_status
  ) VALUES (
    p_name,
    p_description,
    p_website,
    p_nif,
    p_main_contact_name,
    p_main_contact_email,
    p_main_contact_phone,
    COALESCE(p_has_startup_portugal_status, false)
  )
  RETURNING id INTO v_startup_id;

  INSERT INTO public.workspaces (
    startup_id,
    program_id,
    stage,
    status
  ) VALUES (
    v_startup_id,
    p_program_id,
    p_stage::public.startup_stage,
    'pending'
  )
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.workspace_users (
    workspace_id,
    user_id,
    role,
    active
  ) VALUES (
    v_workspace_id,
    v_user_id,
    'founder'::public.app_role,
    true
  );

  startup_id := v_startup_id;
  workspace_id := v_workspace_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_startup_application(text, text, uuid, text, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_startup_application(text, text, uuid, text, text, text, text, text, text, boolean) TO authenticated;
