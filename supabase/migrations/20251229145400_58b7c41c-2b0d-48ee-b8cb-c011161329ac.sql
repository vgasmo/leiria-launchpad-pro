-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'consultor', 'mentor_externo', 'founder', 'team_member');

-- Create stage enum for startups
CREATE TYPE public.startup_stage AS ENUM ('ideation', 'validation', 'mvp', 'growth', 'scale');

-- Create health score enum
CREATE TYPE public.health_score AS ENUM ('critical', 'at_risk', 'stable', 'healthy', 'thriving');

-- Create action item status enum
CREATE TYPE public.action_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Create milestone status enum
CREATE TYPE public.milestone_status AS ENUM ('not_started', 'in_progress', 'completed', 'delayed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create programs table
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create startups table
CREATE TABLE public.startups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  founded_date DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create workspaces table (junction between startup and program with extra fields)
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  stage startup_stage DEFAULT 'ideation' NOT NULL,
  health_score health_score DEFAULT 'stable',
  health_score_override health_score,
  health_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(startup_id, program_id)
);

-- Create workspace_members table for access control
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(workspace_id, user_id)
);

-- Create sessions table (mentoring sessions)
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  session_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create action_items table
CREATE TABLE public.action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status action_status DEFAULT 'pending' NOT NULL,
  due_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create milestones table
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status milestone_status DEFAULT 'not_started' NOT NULL,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create kpi_definitions table (template for KPIs)
CREATE TABLE public.kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  is_global BOOLEAN DEFAULT false NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create kpi_entries table (monthly KPI check-ins)
CREATE TABLE public.kpi_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kpi_definition_id UUID NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
  value NUMERIC,
  target_value NUMERIC,
  month DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(workspace_id, kpi_definition_id, month)
);

-- Create templates table
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  content JSONB,
  is_global BOOLEAN DEFAULT false NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create documents table (files and links)
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('file', 'link')),
  file_path TEXT,
  external_url TEXT,
  category TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  google_event_id TEXT,
  google_calendar_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Create function to check if user has workspace access
CREATE OR REPLACE FUNCTION public.has_workspace_access(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  ) OR public.is_admin(_user_id)
$$;

-- Create function to get user role in workspace
CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id UUID, _workspace_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.workspace_members
  WHERE user_id = _user_id AND workspace_id = _workspace_id
  LIMIT 1
$$;

-- Create function to check if user can edit workspace (mentor or above)
CREATE OR REPLACE FUNCTION public.can_edit_workspace(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id 
    AND workspace_id = _workspace_id
    AND role IN ('admin', 'consultor', 'mentor_externo')
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies (only admins can manage)
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- Programs policies
CREATE POLICY "Everyone can view active programs" ON public.programs FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage programs" ON public.programs FOR ALL USING (public.is_admin(auth.uid()));

-- Startups policies
CREATE POLICY "Users can view startups they have workspace access to" ON public.startups FOR SELECT USING (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.workspaces w
    JOIN public.workspace_members wm ON w.id = wm.workspace_id
    WHERE w.startup_id = startups.id AND wm.user_id = auth.uid()
  )
);
CREATE POLICY "Admins can manage startups" ON public.startups FOR ALL USING (public.is_admin(auth.uid()));

-- Workspaces policies
CREATE POLICY "Users can view workspaces they belong to" ON public.workspaces FOR SELECT USING (public.has_workspace_access(auth.uid(), id));
CREATE POLICY "Admins and consultors can manage workspaces" ON public.workspaces FOR ALL USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'consultor')
);

-- Workspace members policies
CREATE POLICY "Users can view workspace members of their workspaces" ON public.workspace_members FOR SELECT USING (
  public.has_workspace_access(auth.uid(), workspace_id)
);
CREATE POLICY "Admins can manage workspace members" ON public.workspace_members FOR ALL USING (public.is_admin(auth.uid()));

-- Sessions policies
CREATE POLICY "Users can view sessions of their workspaces" ON public.sessions FOR SELECT USING (public.has_workspace_access(auth.uid(), workspace_id));
CREATE POLICY "Mentors can manage sessions" ON public.sessions FOR ALL USING (public.can_edit_workspace(auth.uid(), workspace_id));

-- Action items policies
CREATE POLICY "Users can view action items of their workspaces" ON public.action_items FOR SELECT USING (public.has_workspace_access(auth.uid(), workspace_id));
CREATE POLICY "Mentors can manage action items" ON public.action_items FOR ALL USING (public.can_edit_workspace(auth.uid(), workspace_id));

-- Milestones policies
CREATE POLICY "Users can view milestones of their workspaces" ON public.milestones FOR SELECT USING (public.has_workspace_access(auth.uid(), workspace_id));
CREATE POLICY "Mentors can manage milestones" ON public.milestones FOR ALL USING (public.can_edit_workspace(auth.uid(), workspace_id));

-- KPI definitions policies
CREATE POLICY "Everyone can view KPI definitions" ON public.kpi_definitions FOR SELECT USING (true);
CREATE POLICY "Admins and consultors can manage KPI definitions" ON public.kpi_definitions FOR ALL USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'consultor')
);

-- KPI entries policies
CREATE POLICY "Users can view KPI entries of their workspaces" ON public.kpi_entries FOR SELECT USING (public.has_workspace_access(auth.uid(), workspace_id));
CREATE POLICY "Founders and mentors can manage KPI entries" ON public.kpi_entries FOR ALL USING (
  public.is_admin(auth.uid()) OR 
  public.can_edit_workspace(auth.uid(), workspace_id) OR
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = auth.uid() 
    AND workspace_id = kpi_entries.workspace_id
    AND role IN ('founder', 'team_member')
  )
);

-- Templates policies
CREATE POLICY "Everyone can view global templates" ON public.templates FOR SELECT USING (
  is_global = true OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'consultor')
);
CREATE POLICY "Admins and consultors can manage templates" ON public.templates FOR ALL USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'consultor')
);

-- Documents policies
CREATE POLICY "Users can view documents of their workspaces" ON public.documents FOR SELECT USING (public.has_workspace_access(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can manage documents" ON public.documents FOR ALL USING (public.has_workspace_access(auth.uid(), workspace_id));

-- Calendar events policies
CREATE POLICY "Users can view calendar events of their workspaces" ON public.calendar_events FOR SELECT USING (public.has_workspace_access(auth.uid(), workspace_id));
CREATE POLICY "Mentors can manage calendar events" ON public.calendar_events FOR ALL USING (public.can_edit_workspace(auth.uid(), workspace_id));

-- Create trigger for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_startups_updated_at BEFORE UPDATE ON public.startups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_action_items_updated_at BEFORE UPDATE ON public.action_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kpi_entries_updated_at BEFORE UPDATE ON public.kpi_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();