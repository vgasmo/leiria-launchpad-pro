-- Fix overly permissive RLS policies that use WITH CHECK (true)
-- These policies should only allow service role (edge functions) or staff to insert

-- 1. Fix milestone_reminders: Only service role or staff should insert
DROP POLICY IF EXISTS "System can insert reminders" ON public.milestone_reminders;

CREATE POLICY "Staff and service can insert reminders" 
ON public.milestone_reminders 
FOR INSERT 
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'consultor'
  )
);

-- 2. Fix workflow_executions: Remove duplicate permissive policy
DROP POLICY IF EXISTS "System can insert executions" ON public.workflow_executions;
-- Note: workflow_executions_system_insert already has proper check for admin/consultor

-- 3. Fix workspace_health_history: Only service role or staff should insert
DROP POLICY IF EXISTS "Service role can insert health history" ON public.workspace_health_history;

CREATE POLICY "Staff can insert health history" 
ON public.workspace_health_history 
FOR INSERT 
WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'consultor'
  )
);