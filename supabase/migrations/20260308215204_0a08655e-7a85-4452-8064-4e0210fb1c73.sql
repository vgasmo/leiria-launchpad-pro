CREATE OR REPLACE FUNCTION public.validate_workspace_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only enforce on UPDATE (not INSERT), when transitioning TO 'active'
  IF TG_OP = 'UPDATE' AND NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Require at least one active member in workspace_users
    IF NOT EXISTS (
      SELECT 1 FROM public.workspace_users
      WHERE workspace_id = NEW.id AND active = true
    ) THEN
      RAISE EXCEPTION 'Cannot set workspace to active: no active members found. Workspace ID: %', NEW.id
        USING HINT = 'Add at least one active workspace_user before activating.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;