-- ============================================
-- WORKFLOW ENGINE TABLES
-- ============================================

-- workflow_rules: Define automation rules per program
CREATE TABLE IF NOT EXISTS public.workflow_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
    enabled boolean DEFAULT true,
    trigger_type text NOT NULL,
    conditions_json jsonb DEFAULT '{}',
    actions_json jsonb DEFAULT '{}',
    name text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- workflow_executions: Track rule executions
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id uuid REFERENCES public.workflow_rules(id) ON DELETE CASCADE NOT NULL,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    trigger_event_id text NOT NULL,
    status text DEFAULT 'completed',
    result_json jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- Idempotency index to prevent duplicate executions
CREATE UNIQUE INDEX IF NOT EXISTS workflow_executions_idempotent 
ON public.workflow_executions(rule_id, workspace_id, trigger_event_id);

-- ============================================
-- EMAIL/COMMUNICATION CAPTURE TABLES
-- ============================================

-- workspace_email_aliases: Unique inbound email per workspace
CREATE TABLE IF NOT EXISTS public.workspace_email_aliases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
    alias text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now()
);

-- communication_log: Store captured emails/communications
CREATE TABLE IF NOT EXISTS public.communication_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    channel text DEFAULT 'email',
    from_address text,
    subject text,
    body text,
    metadata_json jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- session_transcripts: Store meeting transcripts
CREATE TABLE IF NOT EXISTS public.session_transcripts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
    transcript_text text,
    source text DEFAULT 'manual',
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- INVESTOR READINESS TRACKING
-- ============================================

-- workspace_readiness_status: Track checklist completion per workspace
CREATE TABLE IF NOT EXISTS public.workspace_readiness_status (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    item_id uuid REFERENCES public.investor_readiness_items(id) ON DELETE CASCADE NOT NULL,
    is_complete boolean DEFAULT false,
    completed_at timestamp with time zone,
    completed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(workspace_id, item_id)
);

-- Add source_rule_id to staff_tasks if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'staff_tasks' 
        AND column_name = 'source_rule_id'
    ) THEN
        ALTER TABLE public.staff_tasks ADD COLUMN source_rule_id uuid REFERENCES public.workflow_rules(id);
    END IF;
END $$;

-- Add external_id to workspaces for webhook integrations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workspaces' 
        AND column_name = 'external_id'
    ) THEN
        ALTER TABLE public.workspaces ADD COLUMN external_id text;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_external_id ON public.workspaces(external_id) WHERE external_id IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_email_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_readiness_status ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- workflow_rules: Only admins/consultors can manage
CREATE POLICY "workflow_rules_admin_select" ON public.workflow_rules
FOR SELECT TO authenticated
USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
));

CREATE POLICY "workflow_rules_admin_manage" ON public.workflow_rules
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- workflow_executions: Viewable by workspace members
CREATE POLICY "workflow_executions_workspace_select" ON public.workflow_executions
FOR SELECT TO authenticated
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "workflow_executions_system_insert" ON public.workflow_executions
FOR INSERT TO authenticated
WITH CHECK (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
));

-- workspace_email_aliases: Workspace members can view
CREATE POLICY "email_aliases_workspace_select" ON public.workspace_email_aliases
FOR SELECT TO authenticated
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "email_aliases_admin_manage" ON public.workspace_email_aliases
FOR ALL TO authenticated
USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
));

-- communication_log: Workspace members can view
CREATE POLICY "communication_log_workspace_select" ON public.communication_log
FOR SELECT TO authenticated
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "communication_log_workspace_insert" ON public.communication_log
FOR INSERT TO authenticated
WITH CHECK (public.has_workspace_access(workspace_id));

-- session_transcripts: Workspace members can view/manage
CREATE POLICY "session_transcripts_workspace_select" ON public.session_transcripts
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.sessions s 
    WHERE s.id = session_id AND public.has_workspace_access(s.workspace_id)
));

CREATE POLICY "session_transcripts_workspace_insert" ON public.session_transcripts
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.sessions s 
    WHERE s.id = session_id AND public.can_write_workspace(s.workspace_id)
));

-- workspace_readiness_status: Workspace members can view/manage
CREATE POLICY "readiness_status_workspace_select" ON public.workspace_readiness_status
FOR SELECT TO authenticated
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "readiness_status_workspace_manage" ON public.workspace_readiness_status
FOR ALL TO authenticated
USING (public.can_write_workspace(workspace_id))
WITH CHECK (public.can_write_workspace(workspace_id));

-- ============================================
-- SEED DEFAULT WORKFLOW RULES
-- ============================================

INSERT INTO public.workflow_rules (name, trigger_type, conditions_json, actions_json, description) VALUES
('KPI Missing Nudge', 'kpi_missing_by_day', '{"days_threshold": 5}', '{"action": "send_inapp_message", "message_template": "kpi_reminder"}', 'Nudge founder when KPIs are missing by day 5 of month'),
('Overdue Action Follow-up', 'action_overdue_by_days', '{"days_threshold": 7}', '{"action": "create_staff_task", "task_template": "follow_up_overdue_action"}', 'Create staff task when action is overdue by 7 days'),
('No Session Alert', 'no_activity_for_days', '{"days_threshold": 30, "activity_type": "session"}', '{"action": "escalate_to_consultant", "create_task": true}', 'Flag in triage when no session in 30 days'),
('Health Drop Alert', 'health_dropped_to_risk', '{"health_status": ["at_risk", "critical"]}', '{"action": "send_email_digest_item", "notify_consultant": true}', 'Notify consultant when health becomes at-risk or critical')
ON CONFLICT DO NOTHING;

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_log;