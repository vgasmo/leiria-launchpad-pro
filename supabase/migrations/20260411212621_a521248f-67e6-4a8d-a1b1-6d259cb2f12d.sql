
-- A3: Neutralize test-data drift — reset archive columns on the test UUID
-- Previous migrations hardcoded test writes to this contract; this restores clean state
UPDATE public.startup_contracts
SET archive_status = NULL,
    archive_attempt_count = 0,
    last_archive_error = NULL,
    archived_at = NULL,
    archive_location_url = NULL,
    archive_checksum = NULL,
    archive_filename = NULL
WHERE id = '7d754944-e1d3-4da9-81bc-c3a767ac0c3f';

-- A5: Fix contract_active → activated in validation trigger
CREATE OR REPLACE FUNCTION public.validate_intake_contract_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Critical states that MUST have a contract_id
  IF NEW.status IN ('approved_for_signature', 'signature_sent', 'signed', 'activated') THEN
    IF NEW.contract_id IS NULL THEN
      RAISE EXCEPTION 'Cannot transition intake to "%" without a linked contract (contract_id is NULL). Create or link a contract first.', NEW.status
        USING HINT = 'Ensure a startup_contracts record is created and linked before approving for signature.';
    END IF;
    
    -- Also verify the linked contract actually exists
    IF NOT EXISTS (SELECT 1 FROM public.startup_contracts WHERE id = NEW.contract_id) THEN
      RAISE EXCEPTION 'contract_id "%" references a non-existent contract record.', NEW.contract_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
