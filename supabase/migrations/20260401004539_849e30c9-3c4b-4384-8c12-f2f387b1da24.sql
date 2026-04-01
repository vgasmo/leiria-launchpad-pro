
CREATE OR REPLACE FUNCTION public.staff_create_workspace_for_claim(
  p_claim_id uuid,
  p_startup_name text,
  p_program_id uuid,
  p_stage text DEFAULT 'ideation',
  p_description text DEFAULT NULL
)
RETURNS TABLE(startup_id uuid, workspace_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_staff_id uuid;
  v_claim RECORD;
  v_startup_id uuid;
  v_workspace_id uuid;
BEGIN
  v_staff_id := auth.uid();
  
  -- Only staff can use this
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can create workspaces for claims';
  END IF;
  
  -- Get the pending claim
  SELECT * INTO v_claim 
  FROM startup_claim_requests 
  WHERE id = p_claim_id AND status = 'pending';
  
  IF v_claim IS NULL THEN
    RAISE EXCEPTION 'Claim not found or already resolved';
  END IF;
  
  -- Create startup
  INSERT INTO public.startups (name, description)
  VALUES (p_startup_name, p_description)
  RETURNING id INTO v_startup_id;
  
  -- Create workspace (active immediately since staff is creating it)
  INSERT INTO public.workspaces (startup_id, program_id, stage, status)
  VALUES (v_startup_id, p_program_id, p_stage::public.startup_stage, 'active')
  RETURNING id INTO v_workspace_id;
  
  -- Add founder to workspace
  INSERT INTO public.workspace_users (workspace_id, user_id, role, active)
  VALUES (v_workspace_id, v_claim.user_id, 'founder', true)
  ON CONFLICT DO NOTHING;
  
  -- Ensure founder role
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (v_claim.user_id, 'founder') 
  ON CONFLICT DO NOTHING;
  
  -- Update claim
  UPDATE startup_claim_requests
  SET status = 'approved', 
      workspace_id = v_workspace_id, 
      startup_id = v_startup_id,
      resolved_at = now(), 
      resolved_by = v_staff_id
  WHERE id = p_claim_id;
  
  -- Ensure account is approved
  UPDATE public.profiles
  SET account_status = 'approved'
  WHERE id = v_claim.user_id AND account_status != 'approved';
  
  -- Log activity
  INSERT INTO public.activity_log (user_id, entity_type, entity_id, action, workspace_id, metadata)
  VALUES (v_staff_id, 'workspace', v_workspace_id, 'created_for_claim', v_workspace_id, 
    jsonb_build_object('claim_id', p_claim_id, 'founder_id', v_claim.user_id, 'startup_name', p_startup_name));
  
  startup_id := v_startup_id;
  workspace_id := v_workspace_id;
  RETURN NEXT;
END;
$$;
