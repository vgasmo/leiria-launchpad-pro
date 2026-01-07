-- Relax founder self-assignment to unblock startup creation for accounts that already have a non-staff role.
-- Founder role is not a privileged/staff role; it only grants access to the user's own workspaces.

BEGIN;

-- Replace the overly restrictive policy that required users to have *no roles*.
DROP POLICY IF EXISTS "Users can self assign founder role" ON public.user_roles;

CREATE POLICY "Users can self assign founder role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'founder'::public.app_role
);

COMMIT;