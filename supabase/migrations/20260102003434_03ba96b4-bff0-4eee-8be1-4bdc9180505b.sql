-- ============================================
-- FEATURE 3.1: Unit Economics persistence table
CREATE TABLE public.unit_economics_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  marketing_costs NUMERIC DEFAULT 0,
  sales_costs NUMERIC DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  arpu NUMERIC DEFAULT 0,
  gross_margin NUMERIC DEFAULT 70,
  monthly_churn_rate NUMERIC DEFAULT 5,
  -- Calculated values (stored for historical tracking)
  cac NUMERIC,
  ltv NUMERIC,
  ltv_cac_ratio NUMERIC,
  payback_months NUMERIC,
  customer_lifetime_months NUMERIC,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, period_month)
);

ALTER TABLE public.unit_economics_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view unit economics for their workspaces"
ON public.unit_economics_values
FOR SELECT
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Users with write access can manage unit economics"
ON public.unit_economics_values
FOR ALL
USING (public.can_write_workspace(workspace_id));

CREATE TRIGGER update_unit_economics_updated_at
  BEFORE UPDATE ON public.unit_economics_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for unit_economics_values
ALTER PUBLICATION supabase_realtime ADD TABLE public.unit_economics_values;

-- ============================================
-- P1 2.2: Document deprecated stage_id column
COMMENT ON COLUMN public.workspaces.stage_id IS 'DEPRECATED: Use stage enum column instead. This FK is not used by the application.';