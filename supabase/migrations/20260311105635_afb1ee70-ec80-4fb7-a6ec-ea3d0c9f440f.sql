
-- 1. Fix outlook_calendar_settings: restrict SELECT to admin/staff only
DROP POLICY IF EXISTS "outlook_settings_select" ON public.outlook_calendar_settings;
CREATE POLICY "outlook_settings_select"
  ON public.outlook_calendar_settings
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.is_staff());

-- 2. Fix workflow_rules: change public SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can view enabled workflow rules" ON public.workflow_rules;
CREATE POLICY "Authenticated can view enabled workflow rules"
  ON public.workflow_rules
  FOR SELECT
  TO authenticated
  USING (enabled = true);

-- 3. Fix teams_integration_settings: restrict SELECT to admin/staff only
DROP POLICY IF EXISTS "teams_settings_workspace_select" ON public.teams_integration_settings;
CREATE POLICY "teams_settings_workspace_select"
  ON public.teams_integration_settings
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.is_staff());
