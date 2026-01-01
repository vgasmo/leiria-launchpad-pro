-- Team members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'team_member',
  title TEXT,
  linkedin_url TEXT,
  phone TEXT,
  is_founder BOOLEAN DEFAULT false,
  joined_at DATE,
  left_at DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team members for accessible startups"
ON public.team_members FOR SELECT
USING (can_manage_startup(startup_id));

CREATE POLICY "Users can manage team members for their startups"
ON public.team_members FOR ALL
USING (can_manage_startup(startup_id));

-- Objectives (OKRs)
CREATE TABLE public.objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT, -- e.g., "2026-Q1"
  status TEXT NOT NULL DEFAULT 'active',
  progress NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view objectives in their workspaces"
ON public.objectives FOR SELECT
USING (has_workspace_access(workspace_id));

CREATE POLICY "Users with write access can manage objectives"
ON public.objectives FOR ALL
USING (can_write_workspace(workspace_id));

-- Key Results
CREATE TABLE public.key_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'on_track',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view key results for accessible objectives"
ON public.key_results FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.objectives o 
  WHERE o.id = key_results.objective_id 
  AND has_workspace_access(o.workspace_id)
));

CREATE POLICY "Users can manage key results for writable objectives"
ON public.key_results FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.objectives o 
  WHERE o.id = key_results.objective_id 
  AND can_write_workspace(o.workspace_id)
));

-- Time entries for consultant tracking
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'mentoring',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time entries"
ON public.time_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all time entries"
ON public.time_entries FOR SELECT
USING (is_admin());

CREATE POLICY "Users can manage their own time entries"
ON public.time_entries FOR ALL
USING (auth.uid() = user_id);

-- Session feedback
CREATE TABLE public.session_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback for accessible sessions"
ON public.session_feedback FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.sessions s 
  WHERE s.id = session_feedback.session_id 
  AND has_workspace_access(s.workspace_id)
) OR auth.uid() = user_id);

CREATE POLICY "Users can create feedback for sessions they attended"
ON public.session_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.sessions s 
  WHERE s.id = session_feedback.session_id 
  AND has_workspace_access(s.workspace_id)
));

CREATE POLICY "Users can update their own feedback"
ON public.session_feedback FOR UPDATE
USING (auth.uid() = user_id);

-- Resources library
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  file_path TEXT,
  category TEXT,
  tags TEXT[],
  is_global BOOLEAN DEFAULT false,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view global resources"
ON public.resources FOR SELECT
USING (is_global = true);

CREATE POLICY "Users can view program resources"
ON public.resources FOR SELECT
USING (program_id IS NOT NULL AND has_program_access(program_id));

CREATE POLICY "Admins and consultors can manage resources"
ON public.resources FOR ALL
USING (is_admin() OR EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'consultor'
));

CREATE POLICY "Mentors can manage their own resources"
ON public.resources FOR ALL
USING (created_by = auth.uid());

-- Email digest preferences
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_digest_enabled BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'weekly',
  digest_day INTEGER DEFAULT 1,
  last_digest_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification preferences"
ON public.notification_preferences FOR ALL
USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_team_members_startup ON public.team_members(startup_id);
CREATE INDEX idx_objectives_workspace ON public.objectives(workspace_id);
CREATE INDEX idx_key_results_objective ON public.key_results(objective_id);
CREATE INDEX idx_time_entries_user ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_workspace ON public.time_entries(workspace_id);
CREATE INDEX idx_session_feedback_session ON public.session_feedback(session_id);
CREATE INDEX idx_resources_program ON public.resources(program_id);

-- Triggers for updated_at
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_objectives_updated_at BEFORE UPDATE ON public.objectives
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_key_results_updated_at BEFORE UPDATE ON public.key_results
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();