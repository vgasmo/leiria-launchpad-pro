-- =============================================
-- Fix: Consultant Notes Visibility Enforcement
-- Ensures is_private=true always sets visibility='private_staff'
-- =============================================

-- Create trigger function to enforce visibility when is_private changes
CREATE OR REPLACE FUNCTION public.enforce_consultant_notes_visibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  -- If is_private is true, force visibility to 'private_staff'
  IF NEW.is_private = true THEN
    NEW.visibility := 'private_staff';
  END IF;
  
  -- If visibility is 'private_staff', ensure is_private is true
  IF NEW.visibility = 'private_staff' THEN
    NEW.is_private := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER enforce_consultant_notes_visibility_trigger
BEFORE INSERT OR UPDATE ON public.consultant_notes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_consultant_notes_visibility();

-- Fix any existing inconsistent data
UPDATE public.consultant_notes 
SET visibility = 'private_staff' 
WHERE is_private = true AND visibility != 'private_staff';

UPDATE public.consultant_notes 
SET is_private = true 
WHERE visibility = 'private_staff' AND is_private = false;