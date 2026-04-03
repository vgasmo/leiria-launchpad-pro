
-- 1. Fix can_write_workspace to check account status
CREATE OR REPLACE FUNCTION public.can_write_workspace(_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'consultor'::public.app_role
    )
    OR (
      public.is_account_active()
      AND EXISTS (
        SELECT 1
        FROM public.workspace_users wu
        WHERE wu.workspace_id = _workspace_id
          AND wu.user_id = auth.uid()
          AND wu.active = true
          AND wu.role IN ('founder'::public.app_role, 'mentor_externo'::public.app_role, 'consultor'::public.app_role)
      )
    );
$function$;

-- 2. Restrict Outlook credentials to admin-only
DROP POLICY IF EXISTS "outlook_settings_select" ON public.outlook_calendar_settings;
CREATE POLICY "outlook_settings_select" ON public.outlook_calendar_settings
  FOR SELECT USING (is_admin());

-- 3. Remove sensitive tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_log;
ALTER PUBLICATION supabase_realtime DROP TABLE public.workflow_executions;

-- 4. Restrict startup_contracts: replace broad SELECT with scoped policies
DROP POLICY IF EXISTS "View contracts" ON public.startup_contracts;

-- Staff and backoffice see everything
CREATE POLICY "Staff can view all contracts" ON public.startup_contracts
  FOR SELECT USING (is_staff() OR is_backoffice());

-- Founders see their workspace contracts (full access)
CREATE POLICY "Founders can view own contracts" ON public.startup_contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_users wu
      WHERE wu.workspace_id = startup_contracts.workspace_id
        AND wu.user_id = auth.uid()
        AND wu.active = true
        AND wu.role = 'founder'
    )
  );
