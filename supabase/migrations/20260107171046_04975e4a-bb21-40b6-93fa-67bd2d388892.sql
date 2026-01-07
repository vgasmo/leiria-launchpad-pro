-- Ensure founders can always self-assign 'founder' role safely (no privilege escalation)
-- This bypasses RLS on user_roles via SECURITY DEFINER but only ever inserts auth.uid() + founder.

CREATE OR REPLACE FUNCTION public.ensure_founder_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'founder'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_founder_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_founder_role() TO authenticated;
