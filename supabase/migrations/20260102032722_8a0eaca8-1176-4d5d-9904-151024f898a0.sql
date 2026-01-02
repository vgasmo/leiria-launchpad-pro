-- ============================================
-- OPERATING SYSTEM LAYER MIGRATIONS
-- ============================================

-- A1) STAFF WORK QUEUE ITEMS
CREATE TABLE public.staff_work_queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('triage', 'outreach', 'schedule_session', 'post_session_followup', 'overdue_actions', 'missing_kpis', 'stage_gate_review', 'escalation', 'monthly_review', 'quarterly_review')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  due_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'done', 'snoozed')) DEFAULT 'open',
  assigned_to UUID,
  created_by UUID,
  evidence_json JSONB DEFAULT '{}'::jsonb,
  related_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  related_action_id UUID REFERENCES public.action_items(id) ON DELETE SET NULL,
  related_milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  snoozed_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_queue_assigned_status ON public.staff_work_queue_items(assigned_to, status, due_at);
CREATE INDEX idx_work_queue_workspace_status ON public.staff_work_queue_items(workspace_id, status);
CREATE UNIQUE INDEX idx_work_queue_unique_active ON public.staff_work_queue_items(workspace_id, type) WHERE status IN ('open', 'in_progress');

ALTER TABLE public.staff_work_queue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view work queue items for accessible workspaces"
ON public.staff_work_queue_items FOR SELECT
USING (
  public.has_workspace_access(workspace_id) AND (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('consultor', 'mentor_externo'))
  )
);

CREATE POLICY "Staff can manage work queue items"
ON public.staff_work_queue_items FOR ALL
USING (
  public.is_admin() OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor')
);

-- A2) WORKSPACE ASSIGNMENTS
CREATE TABLE public.workspace_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  assigned_user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('lead_consultant', 'co_consultant', 'mentor')) DEFAULT 'lead_consultant',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, assigned_user_id, role)
);

CREATE INDEX idx_workspace_assignments_user ON public.workspace_assignments(assigned_user_id);

ALTER TABLE public.workspace_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments for accessible workspaces"
ON public.workspace_assignments FOR SELECT
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Staff can manage assignments"
ON public.workspace_assignments FOR ALL
USING (
  public.is_admin() OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor')
);

-- A3) SESSION WORKFLOW STATE
CREATE TABLE public.session_workflow_state (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  decisions_done BOOLEAN DEFAULT false,
  actions_done BOOLEAN DEFAULT false,
  followup_sent BOOLEAN DEFAULT false,
  next_session_planned BOOLEAN DEFAULT false,
  risks_done BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.session_workflow_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow state for accessible sessions"
ON public.session_workflow_state FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND public.has_workspace_access(s.workspace_id))
);

CREATE POLICY "Staff can manage workflow state"
ON public.session_workflow_state FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND public.can_write_workspace(s.workspace_id))
);

-- A4) STAGE GATE CRITERIA
CREATE TABLE public.stage_gate_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('ideation', 'validation', 'mvp', 'growth', 'scale')),
  criteria_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(program_id, stage)
);

ALTER TABLE public.stage_gate_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stage gate criteria for accessible programs"
ON public.stage_gate_criteria FOR SELECT
USING (public.has_program_access(program_id));

CREATE POLICY "Staff can manage stage gate criteria"
ON public.stage_gate_criteria FOR ALL
USING (
  public.is_admin() OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor')
);

-- A4) STAGE GATE REVIEWS
CREATE TABLE public.stage_gate_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_stage TEXT NOT NULL CHECK (from_stage IN ('ideation', 'validation', 'mvp', 'growth', 'scale')),
  to_stage TEXT NOT NULL CHECK (to_stage IN ('ideation', 'validation', 'mvp', 'growth', 'scale')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'conditional', 'rejected')) DEFAULT 'pending',
  conditions TEXT,
  evidence_json JSONB DEFAULT '{}'::jsonb,
  requested_by UUID,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_stage_gate_reviews_workspace ON public.stage_gate_reviews(workspace_id, status);

ALTER TABLE public.stage_gate_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stage gate reviews for accessible workspaces"
ON public.stage_gate_reviews FOR SELECT
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Founders can request reviews"
ON public.stage_gate_reviews FOR INSERT
WITH CHECK (public.is_founder(workspace_id));

CREATE POLICY "Staff can manage reviews"
ON public.stage_gate_reviews FOR ALL
USING (
  public.is_admin() OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor')
);

-- A5) RITUAL INSTANCES
CREATE TABLE public.ritual_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ritual_type TEXT NOT NULL CHECK (ritual_type IN ('monthly_review', 'quarterly_review', 'escalation_review')),
  due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'completed')) DEFAULT 'open',
  summary TEXT,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ritual_instances_due ON public.ritual_instances(status, due_at);

ALTER TABLE public.ritual_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view ritual instances"
ON public.ritual_instances FOR SELECT
USING (
  public.is_admin() OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('consultor', 'mentor_externo')) OR
  (workspace_id IS NOT NULL AND public.has_workspace_access(workspace_id))
);

CREATE POLICY "Staff can manage ritual instances"
ON public.ritual_instances FOR ALL
USING (
  public.is_admin() OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor')
);

-- B2) INVESTOR UPDATES
CREATE TABLE public.investor_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID,
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_to JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, month)
);

ALTER TABLE public.investor_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view investor updates for accessible workspaces"
ON public.investor_updates FOR SELECT
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Founders and staff can manage investor updates"
ON public.investor_updates FOR ALL
USING (public.can_write_workspace(workspace_id));

-- B3) SHARE LINKS
CREATE TABLE public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('report_only', 'kpis_only', 'full_readonly')) DEFAULT 'report_only',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  views_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_links_token ON public.share_links(token) WHERE revoked_at IS NULL;

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders and staff can manage share links"
ON public.share_links FOR ALL
USING (public.can_write_workspace(workspace_id));

-- D1) ADD VISIBILITY TO NOTES AND DOCUMENTS
ALTER TABLE public.consultant_notes 
ADD COLUMN IF NOT EXISTS visibility TEXT CHECK (visibility IN ('private_staff', 'shared_with_founder', 'shared_with_mentor')) DEFAULT 'private_staff';

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS visibility TEXT CHECK (visibility IN ('private_staff', 'shared_with_founder', 'shared_with_mentor')) DEFAULT 'shared_with_founder';

-- D2) ADD HEALTH CONFIDENCE TO WORKSPACES
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS health_confidence TEXT CHECK (health_confidence IN ('high', 'medium', 'low')) DEFAULT 'low';

ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS health_confidence_reason TEXT;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_work_queue_updated_at BEFORE UPDATE ON public.staff_work_queue_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_workflow_updated_at BEFORE UPDATE ON public.session_workflow_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_investor_updates_updated_at BEFORE UPDATE ON public.investor_updates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();