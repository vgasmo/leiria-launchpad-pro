-- Financial Model Versioning Tables

-- 1. Main versions table
CREATE TABLE public.financial_model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  scenario_name text NOT NULL DEFAULT 'Base',
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'parsing', 'parsed', 'failed')),
  parse_error text NULL,
  key_metrics_json jsonb NULL,
  snapshot_json jsonb NULL,
  ai_review_json jsonb NULL,
  ai_review_generated_at timestamptz NULL,
  ai_review_generated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_financial_model_versions_workspace ON public.financial_model_versions(workspace_id, uploaded_at DESC);
CREATE INDEX idx_financial_model_versions_scenario ON public.financial_model_versions(workspace_id, scenario_name);

-- Enable RLS
ALTER TABLE public.financial_model_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view versions in their workspaces"
  ON public.financial_model_versions FOR SELECT
  USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Staff can manage versions in their workspaces"
  ON public.financial_model_versions FOR ALL
  USING (public.can_write_workspace(workspace_id));

-- Updated_at trigger
CREATE TRIGGER update_financial_model_versions_updated_at
  BEFORE UPDATE ON public.financial_model_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Metric mapping table (program-level or global)
CREATE TABLE public.financial_model_metric_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  kpi_definition_id uuid NULL REFERENCES public.kpi_definitions(id) ON DELETE SET NULL,
  unit text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, metric_key)
);

-- Enable RLS
ALTER TABLE public.financial_model_metric_map ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view metric mappings"
  ON public.financial_model_metric_map FOR SELECT
  USING (true);

CREATE POLICY "Admin and consultors can manage metric mappings"
  ON public.financial_model_metric_map FOR ALL
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
  ));

-- Updated_at trigger
CREATE TRIGGER update_financial_model_metric_map_updated_at
  BEFORE UPDATE ON public.financial_model_metric_map
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add active_financial_model_version_id to workspaces (optional but useful)
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS active_financial_model_version_id uuid REFERENCES public.financial_model_versions(id) ON DELETE SET NULL;

-- Insert default metric mappings (global)
INSERT INTO public.financial_model_metric_map (program_id, metric_key, unit) VALUES
  (NULL, 'runway_months', 'months'),
  (NULL, 'burn_rate_monthly', '€'),
  (NULL, 'gross_margin_pct', '%'),
  (NULL, 'cac', '€'),
  (NULL, 'churn_monthly_pct', '%'),
  (NULL, 'ltv', '€'),
  (NULL, 'ltv_cac', 'ratio'),
  (NULL, 'payback_months', 'months'),
  (NULL, 'cash_end', '€'),
  (NULL, 'treasury_need', '€')
ON CONFLICT DO NOTHING;