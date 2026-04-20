
-- 1) Backfill: sync existing assigned_consultor_id into workspace_users
INSERT INTO public.workspace_users (workspace_id, user_id, role, active)
SELECT w.id, w.assigned_consultor_id, 'consultor', true
FROM public.workspaces w
WHERE w.assigned_consultor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_users wu
    WHERE wu.workspace_id = w.id
      AND wu.user_id = w.assigned_consultor_id
      AND wu.role = 'consultor'
  )
ON CONFLICT DO NOTHING;

-- Reactivate any consultor membership that was deactivated but is the assigned one
UPDATE public.workspace_users wu
SET active = true
FROM public.workspaces w
WHERE wu.workspace_id = w.id
  AND wu.user_id = w.assigned_consultor_id
  AND wu.role = 'consultor'
  AND wu.active = false;

-- 2) Trigger: keep workspace_users in sync when assigned_consultor_id changes
CREATE OR REPLACE FUNCTION public.sync_assigned_consultor_to_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If consultor changed and there's a previous one, deactivate the old membership
  IF TG_OP = 'UPDATE' AND OLD.assigned_consultor_id IS DISTINCT FROM NEW.assigned_consultor_id THEN
    IF OLD.assigned_consultor_id IS NOT NULL THEN
      UPDATE public.workspace_users
      SET active = false
      WHERE workspace_id = NEW.id
        AND user_id = OLD.assigned_consultor_id
        AND role = 'consultor';
    END IF;
  END IF;

  -- Upsert new consultor membership
  IF NEW.assigned_consultor_id IS NOT NULL THEN
    INSERT INTO public.workspace_users (workspace_id, user_id, role, active)
    VALUES (NEW.id, NEW.assigned_consultor_id, 'consultor', true)
    ON CONFLICT (workspace_id, user_id, role)
    DO UPDATE SET active = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_assigned_consultor ON public.workspaces;
CREATE TRIGGER trg_sync_assigned_consultor
AFTER INSERT OR UPDATE OF assigned_consultor_id ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.sync_assigned_consultor_to_members();
