-- Allow authenticated users with no roles yet to self-assign 'founder' once (prevents onboarding dead-ends)
-- Uses SECURITY DEFINER helper to avoid RLS recursion on user_roles.

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- Policy: a user can insert exactly one founder role for themselves only if they currently have no roles.
-- This prevents privilege escalation (cannot self-assign admin/consultor/mentor_externo).
DROP POLICY IF EXISTS "Users can self assign founder role" ON public.user_roles;

CREATE POLICY "Users can self assign founder role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND role = 'founder'::public.app_role
  AND NOT public.has_any_role(auth.uid())
);

-- Ensure startups/workspaces creation isn't blocked for role-less users if they already got founder via the policy above.
-- (No changes needed here as the app will insert the founder role before creating records.)