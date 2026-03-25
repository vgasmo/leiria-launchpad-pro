-- Fix: Restrict outlook_calendar_settings to admin/staff only
-- The current ALL policy via can_write_workspace() lets founders read graph_secret_key

-- Drop the overly permissive manage policy
DROP POLICY IF EXISTS "outlook_settings_manage" ON public.outlook_calendar_settings;

-- Create separate policies: staff-only for full access
CREATE POLICY "outlook_settings_staff_manage"
  ON public.outlook_calendar_settings
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());