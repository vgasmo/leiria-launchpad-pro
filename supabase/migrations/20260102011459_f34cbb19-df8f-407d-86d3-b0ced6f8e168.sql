-- ============================================
-- WEEKLY CHECK-IN MODULE: Database Schema
-- ============================================

-- Compliance status enum
CREATE TYPE public.compliance_status AS ENUM ('on_track', 'needs_update', 'overdue');

-- ============================================
-- Table: checkin_definitions
-- Defines weekly check-in templates per workspace
-- ============================================
CREATE TABLE public.checkin_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Weekly Check-in',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {id, question, type: 'text'|'number'|'scale'}
  kpi_definition_ids UUID[] DEFAULT '{}', -- Which KPIs to collect this week
  day_of_week INTEGER NOT NULL DEFAULT 1, -- 1=Monday, 7=Sunday
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Table: checkin_instances
-- Weekly instances of check-ins
-- ============================================
CREATE TABLE public.checkin_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID NOT NULL REFERENCES public.checkin_definitions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Monday of the week
  due_date DATE NOT NULL, -- When the check-in is due
  status TEXT NOT NULL DEFAULT 'pending', -- pending, submitted, skipped
  compliance_status public.compliance_status NOT NULL DEFAULT 'needs_update',
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(definition_id, week_start)
);

-- ============================================
-- Table: checkin_responses
-- Founder responses to check-in questions
-- ============================================
CREATE TABLE public.checkin_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.checkin_instances(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL, -- References questions[].id in definition
  response_value TEXT, -- Text response
  response_number NUMERIC, -- Numeric response (for KPIs/scales)
  kpi_definition_id UUID REFERENCES public.kpi_definitions(id), -- If this is a KPI response
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_checkin_definitions_workspace ON public.checkin_definitions(workspace_id);
CREATE INDEX idx_checkin_instances_workspace ON public.checkin_instances(workspace_id);
CREATE INDEX idx_checkin_instances_status ON public.checkin_instances(status);
CREATE INDEX idx_checkin_instances_due_date ON public.checkin_instances(due_date);
CREATE INDEX idx_checkin_instances_compliance ON public.checkin_instances(compliance_status);
CREATE INDEX idx_checkin_responses_instance ON public.checkin_responses(instance_id);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.checkin_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_responses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies: checkin_definitions
-- ============================================
CREATE POLICY "Users can view checkin definitions for their workspaces"
  ON public.checkin_definitions FOR SELECT
  USING (has_workspace_access(workspace_id));

CREATE POLICY "Admins and consultors can manage checkin definitions"
  ON public.checkin_definitions FOR ALL
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'consultor'
  ));

-- ============================================
-- RLS Policies: checkin_instances
-- ============================================
CREATE POLICY "Users can view checkin instances for their workspaces"
  ON public.checkin_instances FOR SELECT
  USING (has_workspace_access(workspace_id));

CREATE POLICY "Founders can update their own checkin instances"
  ON public.checkin_instances FOR UPDATE
  USING (is_founder(workspace_id));

CREATE POLICY "Admins and consultors can manage all checkin instances"
  ON public.checkin_instances FOR ALL
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'consultor'
  ));

-- ============================================
-- RLS Policies: checkin_responses
-- ============================================
CREATE POLICY "Users can view responses for their workspaces"
  ON public.checkin_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.checkin_instances ci
    WHERE ci.id = checkin_responses.instance_id
    AND has_workspace_access(ci.workspace_id)
  ));

CREATE POLICY "Founders can create responses for their workspaces"
  ON public.checkin_responses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.checkin_instances ci
    WHERE ci.id = checkin_responses.instance_id
    AND is_founder(ci.workspace_id)
  ));

CREATE POLICY "Founders can update their own responses"
  ON public.checkin_responses FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.checkin_instances ci
    WHERE ci.id = checkin_responses.instance_id
    AND is_founder(ci.workspace_id)
  ));

CREATE POLICY "Admins can manage all responses"
  ON public.checkin_responses FOR ALL
  USING (is_admin());

-- ============================================
-- Trigger: Auto-update updated_at
-- ============================================
CREATE TRIGGER update_checkin_definitions_updated_at
  BEFORE UPDATE ON public.checkin_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checkin_instances_updated_at
  BEFORE UPDATE ON public.checkin_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checkin_responses_updated_at
  BEFORE UPDATE ON public.checkin_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Function: Create weekly check-in instances
-- Called by cron to generate new instances
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_weekly_checkins()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_week_start DATE;
  v_def RECORD;
BEGIN
  -- Calculate current week's Monday
  v_week_start := date_trunc('week', CURRENT_DATE)::date;
  
  -- Create instances for all active definitions that don't have one for this week
  FOR v_def IN 
    SELECT cd.id, cd.workspace_id, cd.day_of_week
    FROM public.checkin_definitions cd
    JOIN public.workspaces w ON w.id = cd.workspace_id
    WHERE cd.is_active = true
    AND w.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.checkin_instances ci
      WHERE ci.definition_id = cd.id
      AND ci.week_start = v_week_start
    )
  LOOP
    INSERT INTO public.checkin_instances (
      definition_id,
      workspace_id,
      week_start,
      due_date,
      status,
      compliance_status
    ) VALUES (
      v_def.id,
      v_def.workspace_id,
      v_week_start,
      v_week_start + (v_def.day_of_week - 1), -- Due on configured day
      'pending',
      'needs_update'
    );
    v_count := v_count + 1;
  END LOOP;
  
  -- Update compliance status for overdue check-ins
  UPDATE public.checkin_instances
  SET compliance_status = 'overdue'
  WHERE status = 'pending'
  AND due_date < CURRENT_DATE
  AND compliance_status != 'overdue';
  
  RETURN v_count;
END;
$$;

-- Grant execute to authenticated users (for edge function with service role)
GRANT EXECUTE ON FUNCTION public.generate_weekly_checkins() TO service_role;

-- ============================================
-- Function: Submit check-in with responses
-- ============================================
CREATE OR REPLACE FUNCTION public.submit_checkin(
  p_instance_id UUID,
  p_responses JSONB -- Array of {question_id, response_value?, response_number?, kpi_definition_id?}
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_user_id UUID;
  v_response JSONB;
  v_kpi_def_id UUID;
  v_period_month DATE;
BEGIN
  v_user_id := auth.uid();
  
  -- Get workspace and verify access
  SELECT workspace_id INTO v_workspace_id
  FROM public.checkin_instances
  WHERE id = p_instance_id;
  
  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Check-in instance not found';
  END IF;
  
  IF NOT public.is_founder(v_workspace_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Delete existing responses for this instance
  DELETE FROM public.checkin_responses WHERE instance_id = p_instance_id;
  
  -- Insert new responses
  FOR v_response IN SELECT * FROM jsonb_array_elements(p_responses)
  LOOP
    INSERT INTO public.checkin_responses (
      instance_id,
      question_id,
      response_value,
      response_number,
      kpi_definition_id
    ) VALUES (
      p_instance_id,
      v_response->>'question_id',
      v_response->>'response_value',
      CASE WHEN v_response->>'response_number' IS NOT NULL 
        THEN (v_response->>'response_number')::numeric ELSE NULL END,
      CASE WHEN v_response->>'kpi_definition_id' IS NOT NULL 
        THEN (v_response->>'kpi_definition_id')::uuid ELSE NULL END
    );
    
    -- If this is a KPI response, also update kpi_values
    v_kpi_def_id := CASE WHEN v_response->>'kpi_definition_id' IS NOT NULL 
      THEN (v_response->>'kpi_definition_id')::uuid ELSE NULL END;
      
    IF v_kpi_def_id IS NOT NULL AND v_response->>'response_number' IS NOT NULL THEN
      v_period_month := date_trunc('month', CURRENT_DATE)::date;
      
      INSERT INTO public.kpi_values (
        workspace_id,
        kpi_definition_id,
        period_month,
        value,
        created_by
      ) VALUES (
        v_workspace_id,
        v_kpi_def_id,
        v_period_month,
        (v_response->>'response_number')::numeric,
        v_user_id
      )
      ON CONFLICT (workspace_id, kpi_definition_id, period_month) 
      DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = now();
    END IF;
  END LOOP;
  
  -- Update instance status
  UPDATE public.checkin_instances
  SET 
    status = 'submitted',
    compliance_status = 'on_track',
    submitted_at = now(),
    submitted_by = v_user_id
  WHERE id = p_instance_id;
  
  -- Log activity
  INSERT INTO public.activity_log (
    workspace_id,
    user_id,
    entity_type,
    entity_id,
    action,
    metadata
  ) VALUES (
    v_workspace_id,
    v_user_id,
    'checkin',
    p_instance_id,
    'submitted',
    jsonb_build_object('responses_count', jsonb_array_length(p_responses))
  );
  
  RETURN p_instance_id;
END;
$$;

-- Add unique constraint for kpi_values to support ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'kpi_values_workspace_kpi_period_unique'
  ) THEN
    ALTER TABLE public.kpi_values
    ADD CONSTRAINT kpi_values_workspace_kpi_period_unique 
    UNIQUE (workspace_id, kpi_definition_id, period_month);
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.submit_checkin(UUID, JSONB) TO authenticated;