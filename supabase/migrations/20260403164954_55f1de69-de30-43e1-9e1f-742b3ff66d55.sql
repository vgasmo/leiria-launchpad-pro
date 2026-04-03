
-- CRITICAL #1: Notifications - restrict INSERT
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Staff can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_staff() OR is_admin());

CREATE POLICY "System can insert self-notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- CRITICAL #2: Communication log - restrict INSERT to staff
DROP POLICY IF EXISTS "communication_log_workspace_insert" ON public.communication_log;

CREATE POLICY "Staff can insert communication log"
  ON public.communication_log FOR INSERT
  TO authenticated
  WITH CHECK (is_staff());

-- WARN #1: Outlook settings - admin only
DROP POLICY IF EXISTS "outlook_settings_staff_manage" ON public.outlook_calendar_settings;

CREATE POLICY "outlook_settings_admin_manage"
  ON public.outlook_calendar_settings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- WARN #2: Email sync status - scoped access
DROP POLICY IF EXISTS "Staff can manage email_sync_status" ON public.email_sync_status;
DROP POLICY IF EXISTS "Consultants can see own sync status" ON public.email_sync_status;

CREATE POLICY "Admins can manage all email_sync_status"
  ON public.email_sync_status FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Consultors can manage own email_sync_status"
  ON public.email_sync_status FOR ALL
  TO authenticated
  USING (
    consultant_user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'consultor')
  )
  WITH CHECK (
    consultant_user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'consultor')
  );
