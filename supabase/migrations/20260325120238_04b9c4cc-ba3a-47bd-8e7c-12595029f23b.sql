-- Add organization_name for contracts without workspace (CRM leads)
ALTER TABLE public.startup_contracts ADD COLUMN IF NOT EXISTS organization_name text;

-- Create a function to auto-generate contract numbers
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year text;
  v_seq int;
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    v_year := to_char(CURRENT_DATE, 'YYYY');
    SELECT COALESCE(MAX(
      CASE 
        WHEN contract_number ~ ('^INC-' || v_year || '-\d+$')
        THEN CAST(split_part(contract_number, '-', 3) AS int)
        ELSE 0
      END
    ), 0) + 1 INTO v_seq
    FROM startup_contracts;
    NEW.contract_number := 'INC-' || v_year || '-' || LPAD(v_seq::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_auto_contract_number ON public.startup_contracts;
CREATE TRIGGER trg_auto_contract_number
  BEFORE INSERT ON public.startup_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_contract_number();