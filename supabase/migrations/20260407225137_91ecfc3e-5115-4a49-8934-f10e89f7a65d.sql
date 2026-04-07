
-- Trigger function to auto-log contract status changes
CREATE OR REPLACE FUNCTION public.log_contract_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.contract_lifecycle_events (
      contract_id,
      event_type,
      event_date,
      performed_by,
      details
    ) VALUES (
      NEW.id,
      'status_change',
      CURRENT_DATE,
      auth.uid(),
      jsonb_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trg_log_contract_status_change
AFTER UPDATE ON public.startup_contracts
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.log_contract_status_change();
