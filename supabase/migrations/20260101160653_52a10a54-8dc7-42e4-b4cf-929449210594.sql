-- Create staff_tasks table for consultant/mentor tasks
CREATE TABLE public.staff_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'general', -- general, connect_startup, contact_investor, follow_up, review
  assignee_id UUID NOT NULL,
  created_by UUID,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  related_startup_id UUID REFERENCES public.startups(id) ON DELETE SET NULL,
  related_user_id UUID, -- for connect tasks (mentor/investor to connect with)
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER update_staff_tasks_updated_at
  BEFORE UPDATE ON public.staff_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_tasks
CREATE POLICY "Staff can view their assigned tasks"
  ON public.staff_tasks FOR SELECT
  USING (auth.uid() = assignee_id OR auth.uid() = created_by OR is_admin());

CREATE POLICY "Staff can create tasks"
  ON public.staff_tasks FOR INSERT
  WITH CHECK (
    is_admin() OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('consultor', 'mentor_externo'))
  );

CREATE POLICY "Staff can update their tasks"
  ON public.staff_tasks FOR UPDATE
  USING (auth.uid() = assignee_id OR auth.uid() = created_by OR is_admin());

CREATE POLICY "Staff can delete their tasks"
  ON public.staff_tasks FOR DELETE
  USING (auth.uid() = created_by OR is_admin());

-- Add review_status and reviewer columns to template_instances for review workflow
ALTER TABLE public.template_instances 
  ADD COLUMN review_status TEXT DEFAULT 'draft', -- draft, pending_review, reviewed, approved, needs_changes
  ADD COLUMN reviewer_id UUID,
  ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN review_notes TEXT;

-- Index for quick staff task lookup
CREATE INDEX idx_staff_tasks_assignee ON public.staff_tasks(assignee_id);
CREATE INDEX idx_staff_tasks_status ON public.staff_tasks(status);
CREATE INDEX idx_staff_tasks_due_date ON public.staff_tasks(due_date);