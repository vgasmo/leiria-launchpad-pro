-- Validation trigger: prevent workspaces from becoming 'active' without active members.
-- This guards against the HubSpot import class of error where bulk-imported records
-- were silently set to 'active' without any workspace_users entries.

CREATE OR REPLACE FUNCTION public.validate_workspace_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only enforce when transitioning TO 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
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
$$;

-- Attach the trigger to workspaces table
CREATE TRIGGER trg_validate_workspace_activation
  BEFORE INSERT OR UPDATE OF status ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_workspace_status_transition();