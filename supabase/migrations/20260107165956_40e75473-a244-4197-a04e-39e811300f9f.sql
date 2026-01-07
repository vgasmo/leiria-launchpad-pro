-- Make email_log immutable (audit integrity): prevent UPDATE/DELETE even for admins.

BEGIN;

-- Replace overly broad admin policy (FOR ALL) with read-only.
DROP POLICY IF EXISTS "Admin can manage all email logs" ON public.email_log;

CREATE POLICY "Admin can view all email logs"
ON public.email_log
FOR SELECT
TO authenticated
USING (is_admin());

COMMIT;