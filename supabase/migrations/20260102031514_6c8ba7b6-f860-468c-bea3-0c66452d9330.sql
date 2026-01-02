-- ============================================
-- HEALTH 2.0 MIGRATIONS
-- ============================================

-- 1. workspace_health_history: stores daily snapshots of health scores
CREATE TABLE public.workspace_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  score_numeric INTEGER NOT NULL CHECK (score_numeric >= 0 AND score_numeric <= 100),
  label TEXT NOT NULL CHECK (label IN ('thriving', 'healthy', 'stable', 'at_risk', 'critical')),
  components_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanation_json JSONB,
  model_version_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_history_workspace_computed ON public.workspace_health_history(workspace_id, computed_at DESC);
CREATE INDEX idx_health_history_computed_at ON public.workspace_health_history(computed_at DESC);

ALTER TABLE public.workspace_health_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view health history for accessible workspaces"
ON public.workspace_health_history FOR SELECT
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Service role can insert health history"
ON public.workspace_health_history FOR INSERT
WITH CHECK (true);

-- 2. workspace_health_alerts: stores drop alerts with acknowledge/snooze
CREATE TABLE public.workspace_health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('drop_to_at_risk', 'drop_to_critical', 'drop_points', 'component_drop')),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')) DEFAULT 'warning',
  reason TEXT NOT NULL,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('active', 'acknowledged', 'snoozed', 'resolved')) DEFAULT 'active',
  ack_by UUID,
  ack_at TIMESTAMP WITH TIME ZONE,
  snoozed_until TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_alerts_workspace_status ON public.workspace_health_alerts(workspace_id, status);
CREATE INDEX idx_health_alerts_status ON public.workspace_health_alerts(status);

ALTER TABLE public.workspace_health_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view health alerts for accessible workspaces"
ON public.workspace_health_alerts FOR SELECT
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Staff can manage health alerts"
ON public.workspace_health_alerts FOR ALL
USING (public.is_admin() OR EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
));

CREATE POLICY "Founders can acknowledge alerts on their workspaces"
ON public.workspace_health_alerts FOR UPDATE
USING (public.is_founder(workspace_id))
WITH CHECK (public.is_founder(workspace_id));

-- 3. health_model_templates: reusable health model configurations
CREATE TABLE public.health_model_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  weights_json JSONB NOT NULL DEFAULT '{"actions": 30, "sessions": 20, "kpis": 30, "checkins": 20}'::jsonb,
  thresholds_json JSONB NOT NULL DEFAULT '{"thriving": 85, "healthy": 70, "stable": 50, "at_risk": 30}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.health_model_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view health model templates"
ON public.health_model_templates FOR SELECT
USING (true);

CREATE POLICY "Admin and consultors can manage templates"
ON public.health_model_templates FOR ALL
USING (public.is_admin() OR EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
));

-- 4. program_health_model_versions: audit trail for model changes
CREATE TABLE public.program_health_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  weights_json JSONB NOT NULL,
  thresholds_json JSONB NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  note TEXT
);

CREATE INDEX idx_model_versions_program ON public.program_health_model_versions(program_id, changed_at DESC);

ALTER TABLE public.program_health_model_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view model versions for accessible programs"
ON public.program_health_model_versions FOR SELECT
USING (public.has_program_access(program_id));

CREATE POLICY "Admin and consultors can manage model versions"
ON public.program_health_model_versions FOR ALL
USING (public.is_admin() OR EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
));

-- 5. Add model_version_id FK to workspace_health_history
ALTER TABLE public.workspace_health_history
ADD CONSTRAINT fk_health_history_model_version
FOREIGN KEY (model_version_id) REFERENCES public.program_health_model_versions(id) ON DELETE SET NULL;

-- 6. Add notification preferences columns if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'email_on_health_drop') THEN
    ALTER TABLE public.notification_preferences ADD COLUMN email_on_health_drop BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'weekly_health_digest') THEN
    ALTER TABLE public.notification_preferences ADD COLUMN weekly_health_digest BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 7. Insert default template
INSERT INTO public.health_model_templates (name, description, weights_json, thresholds_json, is_default)
VALUES (
  'Standard Startup',
  'Balanced health model for typical startup acceleration programs',
  '{"actions": 30, "sessions": 20, "kpis": 30, "checkins": 20}'::jsonb,
  '{"thriving": 85, "healthy": 70, "stable": 50, "at_risk": 30}'::jsonb,
  true
);