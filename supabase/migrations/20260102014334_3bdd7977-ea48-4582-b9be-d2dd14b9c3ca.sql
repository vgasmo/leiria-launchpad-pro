-- =====================================================
-- NEEDS ATTENTION ENGINE 2.0 + HEALTH SCORE AUTOMÁTICO
-- =====================================================

-- 1) Program Alert Rules (configuração de thresholds por programa)
CREATE TABLE public.program_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  threshold NUMERIC NOT NULL DEFAULT 7,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_id, rule_type)
);

-- Valid rule types
COMMENT ON TABLE public.program_alert_rules IS 'Valid rule_type values: no_session_days, overdue_actions_count, missing_kpis_current_month, checkin_overdue_days, milestone_overdue_count';

-- 2) Workspace Alerts (alertas calculados)
CREATE TABLE public.workspace_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  reason TEXT NOT NULL,
  evidence_json JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  UNIQUE(workspace_id, rule_type, status) -- Only one active alert per type per workspace
);

-- 3) Program Health Model (pesos e thresholds por programa)
CREATE TABLE public.program_health_model (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE UNIQUE,
  weights_json JSONB NOT NULL DEFAULT '{"actions": 30, "sessions": 20, "kpis": 30, "checkins": 20}'::jsonb,
  thresholds_json JSONB NOT NULL DEFAULT '{"thriving": 85, "healthy": 70, "stable": 50, "at_risk": 30}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Add health score columns to workspaces
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS health_score_calculated TEXT,
  ADD COLUMN IF NOT EXISTS health_score_numeric NUMERIC,
  ADD COLUMN IF NOT EXISTS health_score_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS health_score_explanation JSONB DEFAULT '[]'::jsonb;

-- 5) Indexes for performance
CREATE INDEX idx_program_alert_rules_program ON public.program_alert_rules(program_id);
CREATE INDEX idx_workspace_alerts_workspace ON public.workspace_alerts(workspace_id);
CREATE INDEX idx_workspace_alerts_status ON public.workspace_alerts(status);
CREATE INDEX idx_workspace_alerts_severity ON public.workspace_alerts(severity);

-- 6) Updated_at triggers
CREATE TRIGGER update_program_alert_rules_updated_at
  BEFORE UPDATE ON public.program_alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_program_health_model_updated_at
  BEFORE UPDATE ON public.program_health_model
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Enable RLS
ALTER TABLE public.program_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_health_model ENABLE ROW LEVEL SECURITY;

-- 8) RLS Policies for program_alert_rules
CREATE POLICY "Admin and consultors can manage alert rules"
  ON public.program_alert_rules FOR ALL
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
  ));

CREATE POLICY "Users can view alert rules for their programs"
  ON public.program_alert_rules FOR SELECT
  USING (public.has_program_access(program_id));

-- 9) RLS Policies for workspace_alerts
CREATE POLICY "Users can view alerts for their workspaces"
  ON public.workspace_alerts FOR SELECT
  USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Staff can manage workspace alerts"
  ON public.workspace_alerts FOR ALL
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_users 
    WHERE workspace_id = workspace_alerts.workspace_id 
    AND user_id = auth.uid() 
    AND role = 'mentor_externo'
    AND active = true
  ));

-- 10) RLS Policies for program_health_model
CREATE POLICY "Admin and consultors can manage health models"
  ON public.program_health_model FOR ALL
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
  ));

CREATE POLICY "Users can view health models for their programs"
  ON public.program_health_model FOR SELECT
  USING (public.has_program_access(program_id));

-- 11) Insert default alert rules for existing programs
INSERT INTO public.program_alert_rules (program_id, rule_type, threshold, severity)
SELECT p.id, rules.rule_type, rules.threshold, rules.severity
FROM public.programs p
CROSS JOIN (VALUES
  ('no_session_days', 14, 'warning'),
  ('no_session_days', 21, 'critical'),
  ('overdue_actions_count', 3, 'warning'),
  ('overdue_actions_count', 5, 'critical'),
  ('missing_kpis_current_month', 1, 'info'),
  ('checkin_overdue_days', 3, 'warning'),
  ('checkin_overdue_days', 7, 'critical'),
  ('milestone_overdue_count', 1, 'warning'),
  ('milestone_overdue_count', 3, 'critical')
) AS rules(rule_type, threshold, severity)
ON CONFLICT (program_id, rule_type) DO NOTHING;

-- 12) Insert default health models for existing programs
INSERT INTO public.program_health_model (program_id)
SELECT id FROM public.programs
ON CONFLICT (program_id) DO NOTHING;