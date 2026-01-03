-- ============================================
-- MICROSOFT 365 INTEGRATION SCHEMA
-- Teams notifications + Outlook calendar sync
-- ============================================

-- 1) Teams Integration Settings (per workspace/program)
CREATE TABLE IF NOT EXISTS public.teams_integration_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
    enabled boolean NOT NULL DEFAULT false,
    webhook_url text, -- Securely stored Teams webhook URL
    default_channel_name text DEFAULT 'Operations',
    -- Event toggles
    notify_checkin_submitted boolean NOT NULL DEFAULT true,
    notify_action_assigned boolean NOT NULL DEFAULT true,
    notify_action_overdue boolean NOT NULL DEFAULT true,
    notify_session_created boolean NOT NULL DEFAULT true,
    notify_session_rescheduled boolean NOT NULL DEFAULT true,
    notify_health_alert boolean NOT NULL DEFAULT true,
    -- Metadata
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    -- Either workspace_id OR program_id must be set (not both, not neither)
    CONSTRAINT teams_settings_scope CHECK (
        (workspace_id IS NOT NULL AND program_id IS NULL) OR
        (workspace_id IS NULL AND program_id IS NOT NULL)
    ),
    CONSTRAINT teams_settings_workspace_unique UNIQUE (workspace_id),
    CONSTRAINT teams_settings_program_unique UNIQUE (program_id)
);

-- 2) Outlook Calendar Sync Settings
CREATE TABLE IF NOT EXISTS public.outlook_calendar_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
    enabled boolean NOT NULL DEFAULT false,
    sync_mode text NOT NULL DEFAULT 'webhook', -- 'webhook' or 'graph'
    -- For webhook mode (Power Automate)
    webhook_url text,
    -- For Graph mode (direct API)
    graph_tenant_id text,
    graph_client_id text,
    -- Encrypted in secrets, referenced by key
    graph_secret_key text,
    -- Metadata
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3) Session Calendar Sync Status
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS outlook_event_id text,
ADD COLUMN IF NOT EXISTS outlook_sync_status text DEFAULT 'pending', -- pending, synced, error
ADD COLUMN IF NOT EXISTS outlook_sync_error text,
ADD COLUMN IF NOT EXISTS outlook_synced_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS teams_meeting_url text;

-- 4) Action Items - add Planner task ID for future sync
ALTER TABLE public.action_items
ADD COLUMN IF NOT EXISTS planner_task_id text,
ADD COLUMN IF NOT EXISTS planner_sync_status text DEFAULT 'pending';

-- Enable RLS
ALTER TABLE public.teams_integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlook_calendar_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Teams Integration Settings
CREATE POLICY "teams_settings_workspace_select" ON public.teams_integration_settings
FOR SELECT TO authenticated
USING (
    public.is_admin() OR 
    (workspace_id IS NOT NULL AND public.has_workspace_access(workspace_id)) OR
    (program_id IS NOT NULL AND public.has_program_access(program_id))
);

CREATE POLICY "teams_settings_workspace_manage" ON public.teams_integration_settings
FOR ALL TO authenticated
USING (
    public.is_admin() OR 
    (workspace_id IS NOT NULL AND public.can_write_workspace(workspace_id)) OR
    (program_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'consultor')
    ))
);

-- RLS Policies for Outlook Calendar Settings
CREATE POLICY "outlook_settings_select" ON public.outlook_calendar_settings
FOR SELECT TO authenticated
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "outlook_settings_manage" ON public.outlook_calendar_settings
FOR ALL TO authenticated
USING (public.can_write_workspace(workspace_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_settings_workspace ON public.teams_integration_settings(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_settings_program ON public.teams_integration_settings(program_id) WHERE program_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outlook_settings_workspace ON public.outlook_calendar_settings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_outlook_sync ON public.sessions(outlook_sync_status) WHERE outlook_sync_status != 'synced';

-- Triggers for updated_at
CREATE TRIGGER update_teams_settings_updated_at
    BEFORE UPDATE ON public.teams_integration_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outlook_settings_updated_at
    BEFORE UPDATE ON public.outlook_calendar_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();