
-- Change default account_status to 'pending' so new users require staff approval
ALTER TABLE public.profiles ALTER COLUMN account_status SET DEFAULT 'pending';

-- Create trigger to auto-approve staff accounts (@startupleiria.com)
CREATE OR REPLACE FUNCTION public.auto_approve_staff_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-approve staff emails
  IF NEW.email LIKE '%@startupleiria.com' THEN
    NEW.account_status := 'approved';
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to profiles on insert (runs after handle_new_user creates the profile)
DROP TRIGGER IF EXISTS trg_auto_approve_staff ON public.profiles;
CREATE TRIGGER trg_auto_approve_staff
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_staff_account();
