-- Survey definitions (templates with questions)
CREATE TABLE public.survey_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  questions_json JSONB NOT NULL DEFAULT '[]',
  auto_fill_mappings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Survey campaigns (launched instances of surveys)
CREATE TABLE public.survey_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_definition_id UUID NOT NULL REFERENCES public.survey_definitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_days INTEGER[] DEFAULT '{7, 3, 1}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  program_id UUID REFERENCES public.programs(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Survey instances (one per workspace per campaign)
CREATE TABLE public.survey_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.survey_campaigns(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted')),
  auto_filled_data JSONB DEFAULT '{}',
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by UUID REFERENCES auth.users(id),
  last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, workspace_id)
);

-- Survey responses (individual question answers)
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.survey_instances(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  response_value TEXT,
  response_json JSONB,
  is_auto_filled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instance_id, question_id)
);

-- Enable RLS
ALTER TABLE public.survey_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Survey definitions: admins can manage, staff can view
CREATE POLICY "Admins can manage survey definitions"
  ON public.survey_definitions FOR ALL
  USING (public.is_admin());

CREATE POLICY "Staff can view active survey definitions"
  ON public.survey_definitions FOR SELECT
  USING (public.is_staff() AND is_active = true);

-- Survey campaigns: admins manage, staff view, founders view active
CREATE POLICY "Admins can manage survey campaigns"
  ON public.survey_campaigns FOR ALL
  USING (public.is_admin());

CREATE POLICY "Staff can view survey campaigns"
  ON public.survey_campaigns FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Founders can view active campaigns for their workspaces"
  ON public.survey_campaigns FOR SELECT
  USING (
    status = 'active' AND 
    EXISTS (
      SELECT 1 FROM public.survey_instances si
      JOIN public.workspace_users wu ON wu.workspace_id = si.workspace_id
      WHERE si.campaign_id = survey_campaigns.id
        AND wu.user_id = auth.uid()
        AND wu.active = true
    )
  );

-- Survey instances: workspace access
CREATE POLICY "Users can view their workspace survey instances"
  ON public.survey_instances FOR SELECT
  USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Admins can manage all survey instances"
  ON public.survey_instances FOR ALL
  USING (public.is_admin());

CREATE POLICY "Founders can update their workspace survey instances"
  ON public.survey_instances FOR UPDATE
  USING (public.is_founder(workspace_id));

-- Survey responses: workspace access
CREATE POLICY "Users can view their workspace survey responses"
  ON public.survey_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.survey_instances si
      WHERE si.id = survey_responses.instance_id
        AND public.has_workspace_access(si.workspace_id)
    )
  );

CREATE POLICY "Admins can manage all survey responses"
  ON public.survey_responses FOR ALL
  USING (public.is_admin());

CREATE POLICY "Founders can manage their workspace survey responses"
  ON public.survey_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.survey_instances si
      WHERE si.id = survey_responses.instance_id
        AND public.is_founder(si.workspace_id)
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_survey_definitions_updated_at
  BEFORE UPDATE ON public.survey_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_survey_campaigns_updated_at
  BEFORE UPDATE ON public.survey_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_survey_instances_updated_at
  BEFORE UPDATE ON public.survey_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_survey_responses_updated_at
  BEFORE UPDATE ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_survey_instances_campaign ON public.survey_instances(campaign_id);
CREATE INDEX idx_survey_instances_workspace ON public.survey_instances(workspace_id);
CREATE INDEX idx_survey_instances_status ON public.survey_instances(status);
CREATE INDEX idx_survey_responses_instance ON public.survey_responses(instance_id);
CREATE INDEX idx_survey_campaigns_status ON public.survey_campaigns(status);