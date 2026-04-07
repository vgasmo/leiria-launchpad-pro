-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "Staff can manage lifecycle events" ON public.contract_lifecycle_events;

-- SELECT: staff, admin, backoffice can read
CREATE POLICY "Staff can read lifecycle events"
  ON public.contract_lifecycle_events
  FOR SELECT
  USING (public.is_staff() OR public.is_backoffice());

-- INSERT: staff, admin, backoffice can manually insert
CREATE POLICY "Staff can insert lifecycle events"
  ON public.contract_lifecycle_events
  FOR INSERT
  WITH CHECK (public.is_staff() OR public.is_backoffice());