
-- Create stages table (replaces enum)
CREATE TABLE public.stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(program_id, name)
);

-- Enable RLS on stages
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view stages" ON public.stages
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage stages" ON public.stages
  FOR ALL USING (is_admin(auth.uid()));

-- Create index for ordering
CREATE INDEX idx_stages_program_position ON public.stages(program_id, position);

-- Add stage_id to workspaces (keep old stage column temporarily for migration)
ALTER TABLE public.workspaces ADD COLUMN stage_id UUID REFERENCES public.stages(id);
ALTER TABLE public.workspaces ADD COLUMN health_status TEXT DEFAULT 'stable';
ALTER TABLE public.workspaces ADD COLUMN last_checkin_at TIMESTAMP WITH TIME ZONE;

-- Add unique constraint for startup + program combination
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_startup_program_unique UNIQUE(startup_id, program_id);

-- Rename workspace_members to workspace_users and add active column
ALTER TABLE public.workspace_members RENAME TO workspace_users;
ALTER TABLE public.workspace_users ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

-- Create index for active users
CREATE INDEX idx_workspace_users_active ON public.workspace_users(workspace_id, active) WHERE active = true;

-- Update sessions table with additional columns
ALTER TABLE public.sessions ADD COLUMN agenda TEXT;
ALTER TABLE public.sessions ADD COLUMN decisions TEXT;
ALTER TABLE public.sessions RENAME COLUMN session_date TO scheduled_at;
ALTER TABLE public.sessions RENAME COLUMN duration_minutes TO duration;

-- Update action_items table
ALTER TABLE public.action_items RENAME COLUMN assigned_to TO owner_user_id;
ALTER TABLE public.action_items ADD COLUMN priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Create index for action items queries
CREATE INDEX idx_action_items_workspace_status ON public.action_items(workspace_id, status);
CREATE INDEX idx_action_items_owner_due ON public.action_items(owner_user_id, due_date) WHERE status != 'completed';

-- Update milestones table
ALTER TABLE public.milestones ADD COLUMN position INTEGER DEFAULT 0;

-- Update kpi_definitions table
ALTER TABLE public.kpi_definitions ADD COLUMN direction TEXT DEFAULT 'up' CHECK (direction IN ('up', 'down', 'neutral'));
ALTER TABLE public.kpi_definitions ADD COLUMN category TEXT;

-- Create workspace_kpis table (links KPIs to workspaces with targets)
CREATE TABLE public.workspace_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kpi_definition_id UUID NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
  required BOOLEAN NOT NULL DEFAULT false,
  target_value NUMERIC,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, kpi_definition_id)
);

ALTER TABLE public.workspace_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace KPIs they have access to" ON public.workspace_kpis
  FOR SELECT USING (has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Mentors can manage workspace KPIs" ON public.workspace_kpis
  FOR ALL USING (can_edit_workspace(auth.uid(), workspace_id));

CREATE INDEX idx_workspace_kpis_active ON public.workspace_kpis(workspace_id, active) WHERE active = true;

-- Rename kpi_entries to kpi_values and update columns
ALTER TABLE public.kpi_entries RENAME TO kpi_values;
ALTER TABLE public.kpi_values RENAME COLUMN month TO period_month;

-- Create index for monthly KPI queries
CREATE INDEX idx_kpi_values_workspace_period ON public.kpi_values(workspace_id, period_month DESC);
CREATE INDEX idx_kpi_values_period_month ON public.kpi_values(period_month);

-- Update templates table
ALTER TABLE public.templates RENAME COLUMN content TO schema_json;

-- Create template_instances table
CREATE TABLE public.template_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  data_json JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.template_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template instances in their workspaces" ON public.template_instances
  FOR SELECT USING (has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage template instances" ON public.template_instances
  FOR ALL USING (has_workspace_access(auth.uid(), workspace_id));

CREATE INDEX idx_template_instances_workspace ON public.template_instances(workspace_id);

-- Rename calendar_events to meetings and add provider columns
ALTER TABLE public.calendar_events RENAME TO meetings;
ALTER TABLE public.meetings RENAME COLUMN start_time TO starts_at;
ALTER TABLE public.meetings RENAME COLUMN end_time TO ends_at;
ALTER TABLE public.meetings RENAME COLUMN google_event_id TO provider_event_id;
ALTER TABLE public.meetings ADD COLUMN provider TEXT DEFAULT 'google';
ALTER TABLE public.meetings ADD COLUMN join_url TEXT;
ALTER TABLE public.meetings DROP COLUMN google_calendar_id;

-- Create index for upcoming meetings
CREATE INDEX idx_meetings_workspace_starts ON public.meetings(workspace_id, starts_at);

-- Create index for workspaces list page
CREATE INDEX idx_workspaces_health ON public.workspaces(health_score);
CREATE INDEX idx_workspaces_stage ON public.workspaces(stage_id);
CREATE INDEX idx_workspaces_program ON public.workspaces(program_id);

-- Update RLS policies for renamed tables
DROP POLICY IF EXISTS "Users can view workspace members of their workspaces" ON public.workspace_users;
DROP POLICY IF EXISTS "Admins can manage workspace members" ON public.workspace_users;

CREATE POLICY "Users can view workspace users they have access to" ON public.workspace_users
  FOR SELECT USING (has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage workspace users" ON public.workspace_users
  FOR ALL USING (is_admin(auth.uid()));

-- Update RLS for meetings (renamed from calendar_events)
DROP POLICY IF EXISTS "Users can view calendar events of their workspaces" ON public.meetings;
DROP POLICY IF EXISTS "Mentors can manage calendar events" ON public.meetings;

CREATE POLICY "Users can view meetings in their workspaces" ON public.meetings
  FOR SELECT USING (has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Mentors can manage meetings" ON public.meetings
  FOR ALL USING (can_edit_workspace(auth.uid(), workspace_id));

-- Update RLS for kpi_values (renamed from kpi_entries)
DROP POLICY IF EXISTS "Users can view KPI entries of their workspaces" ON public.kpi_values;
DROP POLICY IF EXISTS "Founders and mentors can manage KPI entries" ON public.kpi_values;

CREATE POLICY "Users can view KPI values in their workspaces" ON public.kpi_values
  FOR SELECT USING (has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Founders and mentors can manage KPI values" ON public.kpi_values
  FOR ALL USING (
    is_admin(auth.uid()) OR 
    can_edit_workspace(auth.uid(), workspace_id) OR
    EXISTS (
      SELECT 1 FROM public.workspace_users
      WHERE user_id = auth.uid() 
      AND workspace_id = kpi_values.workspace_id 
      AND role IN ('founder', 'team_member')
      AND active = true
    )
  );

-- Update has_workspace_access function to check active status
CREATE OR REPLACE FUNCTION public.has_workspace_access(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = _user_id 
    AND workspace_id = _workspace_id
    AND active = true
  ) OR public.is_admin(_user_id)
$$;

-- Update can_edit_workspace function for renamed table
CREATE OR REPLACE FUNCTION public.can_edit_workspace(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = _user_id 
    AND workspace_id = _workspace_id
    AND role IN ('admin', 'consultor', 'mentor_externo')
    AND active = true
  )
$$;

-- Update get_workspace_role function for renamed table
CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id uuid, _workspace_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.workspace_users
  WHERE user_id = _user_id 
  AND workspace_id = _workspace_id
  AND active = true
  LIMIT 1
$$;

-- Add trigger for workspace_kpis updated_at
CREATE TRIGGER update_workspace_kpis_updated_at
  BEFORE UPDATE ON public.workspace_kpis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for template_instances updated_at
CREATE TRIGGER update_template_instances_updated_at
  BEFORE UPDATE ON public.template_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- SEED DATA

-- Insert programs
INSERT INTO public.programs (id, name, description, is_active) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Incubation', 'Early-stage startup incubation program', true),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Acceleration', 'Growth-focused acceleration program', true)
ON CONFLICT DO NOTHING;

-- Insert stages for Incubation program
INSERT INTO public.stages (program_id, name, position) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Ideation', 1),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'MVP', 2),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Traction', 3),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Scale', 4);

-- Insert stages for Acceleration program
INSERT INTO public.stages (program_id, name, position) VALUES
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Ideation', 1),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'MVP', 2),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Traction', 3),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Scale', 4);

-- Insert KPI definitions
INSERT INTO public.kpi_definitions (name, description, unit, direction, category, is_global) VALUES
  ('MRR', 'Monthly Recurring Revenue', '€', 'up', 'Financial', true),
  ('Burn', 'Monthly Burn Rate', '€', 'down', 'Financial', true),
  ('Runway', 'Months of runway remaining', 'months', 'up', 'Financial', true),
  ('Customers', 'Total active customers', 'count', 'up', 'Growth', true),
  ('Leads', 'New leads generated', 'count', 'up', 'Growth', true),
  ('Conversion Rate', 'Lead to customer conversion', '%', 'up', 'Growth', true);
