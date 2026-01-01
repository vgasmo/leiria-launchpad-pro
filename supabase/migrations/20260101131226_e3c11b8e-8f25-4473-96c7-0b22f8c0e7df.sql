-- Create trigger function to auto-assign roles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  selected_role TEXT;
BEGIN
  user_email := NEW.email;
  selected_role := NEW.raw_user_meta_data ->> 'selected_role';
  
  -- Auto-assign consultor role for @startupleiria.com emails
  IF user_email LIKE '%@startupleiria.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'consultor')
    ON CONFLICT DO NOTHING;
  -- Assign the selected role (founder or mentor_externo) if provided
  ELSIF selected_role IS NOT NULL AND selected_role IN ('founder', 'mentor_externo') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, selected_role::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();