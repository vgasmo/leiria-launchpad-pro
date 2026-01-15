-- SECURITY FIX: Add RLS policies to 15 tables that were publicly readable
-- These tables contain business-critical information that should only be accessible to authenticated users

-- 1. kpi_definitions - Business strategy/metrics
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read kpi_definitions"
ON public.kpi_definitions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage kpi_definitions"
ON public.kpi_definitions FOR ALL
TO authenticated
USING (public.is_staff());

-- 2. financial_model_metric_map - Financial tracking methodology
ALTER TABLE public.financial_model_metric_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read financial_model_metric_map"
ON public.financial_model_metric_map FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage financial_model_metric_map"
ON public.financial_model_metric_map FOR ALL
TO authenticated
USING (public.is_staff());

-- 3. feature_flags - Product roadmap (staff only for full visibility)
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read enabled feature_flags"
ON public.feature_flags FOR SELECT
TO authenticated
USING (enabled = true OR public.is_staff());

CREATE POLICY "Staff can manage feature_flags"
ON public.feature_flags FOR ALL
TO authenticated
USING (public.is_staff());

-- 4. investor_update_templates - Investor communication templates
ALTER TABLE public.investor_update_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read investor_update_templates"
ON public.investor_update_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage investor_update_templates"
ON public.investor_update_templates FOR ALL
TO authenticated
USING (public.is_staff());

-- 5. playbooks - Startup acceleration methodology
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with program access can read playbooks"
ON public.playbooks FOR SELECT
TO authenticated
USING (
  public.is_staff() OR
  program_id IS NULL OR
  public.has_program_access(program_id)
);

CREATE POLICY "Staff can manage playbooks"
ON public.playbooks FOR ALL
TO authenticated
USING (public.is_staff());

-- 6. playbook_items - Program curriculum details
ALTER TABLE public.playbook_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with playbook access can read playbook_items"
ON public.playbook_items FOR SELECT
TO authenticated
USING (
  public.is_staff() OR
  EXISTS (
    SELECT 1 FROM public.playbooks p
    WHERE p.id = playbook_id
    AND (p.program_id IS NULL OR public.has_program_access(p.program_id))
  )
);

CREATE POLICY "Staff can manage playbook_items"
ON public.playbook_items FOR ALL
TO authenticated
USING (public.is_staff());

-- 7. investor_readiness_items - Investment criteria
ALTER TABLE public.investor_readiness_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with program access can read investor_readiness_items"
ON public.investor_readiness_items FOR SELECT
TO authenticated
USING (
  public.is_staff() OR
  program_id IS NULL OR
  public.has_program_access(program_id)
);

CREATE POLICY "Staff can manage investor_readiness_items"
ON public.investor_readiness_items FOR ALL
TO authenticated
USING (public.is_staff());

-- 8. session_templates - Consulting templates
ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read session_templates"
ON public.session_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage session_templates"
ON public.session_templates FOR ALL
TO authenticated
USING (public.is_staff());

-- 9. support_materials - Premium content
ALTER TABLE public.support_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read support_materials"
ON public.support_materials FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage support_materials"
ON public.support_materials FOR ALL
TO authenticated
USING (public.is_staff());

-- 10. programs - Program structure
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with program access can read programs"
ON public.programs FOR SELECT
TO authenticated
USING (
  public.is_staff() OR
  public.has_program_access(id)
);

CREATE POLICY "Staff can manage programs"
ON public.programs FOR ALL
TO authenticated
USING (public.is_staff());

-- 11. stages - Stage progression model
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stages"
ON public.stages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage stages"
ON public.stages FOR ALL
TO authenticated
USING (public.is_staff());

-- 12. stage_kpi_defaults - Stage requirements/KPIs
ALTER TABLE public.stage_kpi_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stage_kpi_defaults"
ON public.stage_kpi_defaults FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage stage_kpi_defaults"
ON public.stage_kpi_defaults FOR ALL
TO authenticated
USING (public.is_staff());

-- 13. quality_checks_config - Quality assurance methodology
ALTER TABLE public.quality_checks_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quality_checks_config"
ON public.quality_checks_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage quality_checks_config"
ON public.quality_checks_config FOR ALL
TO authenticated
USING (public.is_staff());

-- 14. workflow_rules - Automation rules (staff only)
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read workflow_rules"
ON public.workflow_rules FOR SELECT
TO authenticated
USING (public.is_staff());

CREATE POLICY "Staff can manage workflow_rules"
ON public.workflow_rules FOR ALL
TO authenticated
USING (public.is_staff());

-- 15. health_model_templates - Health scoring methodology
ALTER TABLE public.health_model_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read health_model_templates"
ON public.health_model_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage health_model_templates"
ON public.health_model_templates FOR ALL
TO authenticated
USING (public.is_staff());