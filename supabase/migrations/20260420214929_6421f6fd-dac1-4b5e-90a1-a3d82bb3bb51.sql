CREATE OR REPLACE FUNCTION public.sync_assigned_consultor_to_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Upsert new consultor membership using the actual unique constraint (workspace_id, user_id)
  IF NEW.assigned_consultor_id IS NOT NULL THEN
    INSERT INTO public.workspace_users (workspace_id, user_id, role, active)
    VALUES (NEW.id, NEW.assigned_consultor_id, 'consultor', true)
    ON CONFLICT (workspace_id, user_id)
    DO UPDATE SET active = true, role = 'consultor';
  END IF;

  RETURN NEW;
END;
$function$;