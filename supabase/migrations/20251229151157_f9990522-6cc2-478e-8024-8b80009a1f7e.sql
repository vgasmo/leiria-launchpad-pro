
-- Create simplified helper functions that use auth.uid() internally

-- is_admin() - checks if current authenticated user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- has_workspace_access(workspace_id) - checks if current user has access to workspace
CREATE OR REPLACE FUNCTION public.has_workspace_access(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = auth.uid() 
    AND workspace_id = _workspace_id
    AND active = true
  )
$$;

-- can_write_workspace(workspace_id) - checks if current user can write to workspace (mentors + founders)
CREATE OR REPLACE FUNCTION public.can_write_workspace(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = auth.uid() 
    AND workspace_id = _workspace_id
    AND active = true
    AND role IN ('admin', 'consultor', 'mentor_externo', 'founder')
  )
$$;

-- is_founder(workspace_id) - checks if current user is founder in specific workspace
CREATE OR REPLACE FUNCTION public.is_founder(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = auth.uid() 
    AND workspace_id = _workspace_id
    AND active = true
    AND role = 'founder'
  )
$$;

-- Drop existing policies and recreate with new logic

-- PROFILES
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Admin can do everything on profiles" ON public.profiles
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Admin can manage all roles" ON public.user_roles
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- PROGRAMS
DROP POLICY IF EXISTS "Admins can manage programs" ON public.programs;
DROP POLICY IF EXISTS "Everyone can view active programs" ON public.programs;

CREATE POLICY "Admin can manage programs" ON public.programs
  FOR ALL USING (public.is_admin());

CREATE POLICY "Everyone can view active programs" ON public.programs
  FOR SELECT USING (is_active = true OR public.is_admin());

-- STAGES
DROP POLICY IF EXISTS "Everyone can view stages" ON public.stages;
DROP POLICY IF EXISTS "Admins can manage stages" ON public.stages;

CREATE POLICY "Admin can manage stages" ON public.stages
  FOR ALL USING (public.is_admin());

CREATE POLICY "Everyone can view stages" ON public.stages
  FOR SELECT USING (true);

-- STARTUPS
DROP POLICY IF EXISTS "Admins can manage startups" ON public.startups;
DROP POLICY IF EXISTS "Users can view startups they have workspace access to" ON public.startups;

CREATE POLICY "Admin can manage startups" ON public.startups
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view startups in their workspaces" ON public.startups
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.workspaces w
      JOIN public.workspace_users wu ON w.id = wu.workspace_id
      WHERE w.startup_id = startups.id 
      AND wu.user_id = auth.uid()
      AND wu.active = true
    )
  );

-- WORKSPACES
DROP POLICY IF EXISTS "Admins and consultors can manage workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;

CREATE POLICY "Admin can manage all workspaces" ON public.workspaces
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view workspaces they belong to" ON public.workspaces
  FOR SELECT USING (public.has_workspace_access(id));

CREATE POLICY "Consultors can manage workspaces" ON public.workspaces
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'consultor'
    )
  );

-- WORKSPACE_USERS
DROP POLICY IF EXISTS "Admins can manage workspace users" ON public.workspace_users;
DROP POLICY IF EXISTS "Users can view workspace users they have access to" ON public.workspace_users;

CREATE POLICY "Admin can manage all workspace users" ON public.workspace_users
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view workspace users in their workspaces" ON public.workspace_users
  FOR SELECT USING (public.has_workspace_access(workspace_id));

-- SESSIONS
DROP POLICY IF EXISTS "Mentors can manage sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can view sessions of their workspaces" ON public.sessions;

CREATE POLICY "Admin can manage all sessions" ON public.sessions
  FOR ALL USING (public.is_admin());

CREATE POLICY "Mentors and founders can manage sessions" ON public.sessions
  FOR ALL USING (public.can_write_workspace(workspace_id));

CREATE POLICY "Users can view sessions in their workspaces" ON public.sessions
  FOR SELECT USING (public.has_workspace_access(workspace_id));

-- ACTION_ITEMS
DROP POLICY IF EXISTS "Mentors can manage action items" ON public.action_items;
DROP POLICY IF EXISTS "Users can view action items of their workspaces" ON public.action_items;

CREATE POLICY "Admin can manage all action items" ON public.action_items
  FOR ALL USING (public.is_admin());

CREATE POLICY "Mentors and founders can manage action items" ON public.action_items
  FOR ALL USING (public.can_write_workspace(workspace_id));

CREATE POLICY "Users can view action items in their workspaces" ON public.action_items
  FOR SELECT USING (public.has_workspace_access(workspace_id));

-- MILESTONES
DROP POLICY IF EXISTS "Mentors can manage milestones" ON public.milestones;
DROP POLICY IF EXISTS "Users can view milestones of their workspaces" ON public.milestones;

CREATE POLICY "Admin can manage all milestones" ON public.milestones
  FOR ALL USING (public.is_admin());

CREATE POLICY "Mentors and founders can manage milestones" ON public.milestones
  FOR ALL USING (public.can_write_workspace(workspace_id));

CREATE POLICY "Users can view milestones in their workspaces" ON public.milestones
  FOR SELECT USING (public.has_workspace_access(workspace_id));

-- KPI_DEFINITIONS
DROP POLICY IF EXISTS "Admins and consultors can manage KPI definitions" ON public.kpi_definitions;
DROP POLICY IF EXISTS "Everyone can view KPI definitions" ON public.kpi_definitions;

CREATE POLICY "Admin can manage KPI definitions" ON public.kpi_definitions
  FOR ALL USING (public.is_admin());

CREATE POLICY "Consultors can manage KPI definitions" ON public.kpi_definitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'consultor'
    )
  );

CREATE POLICY "Everyone can view KPI definitions" ON public.kpi_definitions
  FOR SELECT USING (true);

-- WORKSPACE_KPIS
DROP POLICY IF EXISTS "Users can view workspace KPIs they have access to" ON public.workspace_kpis;
DROP POLICY IF EXISTS "Mentors can manage workspace KPIs" ON public.workspace_kpis;

CREATE POLICY "Admin can manage all workspace KPIs" ON public.workspace_kpis
  FOR ALL USING (public.is_admin());

CREATE POLICY "Mentors can manage workspace KPIs" ON public.workspace_kpis
  FOR ALL USING (public.can_write_workspace(workspace_id));

CREATE POLICY "Users can view workspace KPIs in their workspaces" ON public.workspace_kpis
  FOR SELECT USING (public.has_workspace_access(workspace_id));

-- KPI_VALUES (only admin and founders can write)
DROP POLICY IF EXISTS "Users can view KPI values in their workspaces" ON public.kpi_values;
DROP POLICY IF EXISTS "Founders and mentors can manage KPI values" ON public.kpi_values;

CREATE POLICY "Admin can manage all KPI values" ON public.kpi_values
  FOR ALL USING (public.is_admin());

CREATE POLICY "Founders can manage KPI values" ON public.kpi_values
  FOR INSERT WITH CHECK (public.is_founder(workspace_id));

CREATE POLICY "Founders can update KPI values" ON public.kpi_values
  FOR UPDATE USING (public.is_founder(workspace_id));

CREATE POLICY "Founders can delete KPI values" ON public.kpi_values
  FOR DELETE USING (public.is_founder(workspace_id));

CREATE POLICY "Users can view KPI values in their workspaces" ON public.kpi_values
  FOR SELECT USING (public.has_workspace_access(workspace_id));

-- TEMPLATES
DROP POLICY IF EXISTS "Admins and consultors can manage templates" ON public.templates;
DROP POLICY IF EXISTS "Everyone can view global templates" ON public.templates;

CREATE POLICY "Admin can manage all templates" ON public.templates
  FOR ALL USING (public.is_admin());

CREATE POLICY "Consultors can manage templates" ON public.templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'consultor'
    )
  );

CREATE POLICY "Everyone can view templates" ON public.templates
  FOR SELECT USING (is_global = true OR public.is_admin());

-- TEMPLATE_INSTANCES
DROP POLICY IF EXISTS "Users can view template instances in their workspaces" ON public.template_instances;
DROP POLICY IF EXISTS "Workspace members can manage template instances" ON public.template_instances;

CREATE POLICY "Admin can manage all template instances" ON public.template_instances
  FOR ALL USING (public.is_admin());

CREATE POLICY "Mentors and founders can manage template instances" ON public.template_instances
  FOR ALL USING (public.can_write_workspace(workspace_id));

CREATE POLICY "Users can view template instances in their workspaces" ON public.template_instances
  FOR SELECT USING (public.has_workspace_access(workspace_id));

-- DOCUMENTS
DROP POLICY IF EXISTS "Users can view documents of their workspaces" ON public.documents;
DROP POLICY IF EXISTS "Workspace members can manage documents" ON public.documents;

CREATE POLICY "Admin can manage all documents" ON public.documents
  FOR ALL USING (public.is_admin());

CREATE POLICY "Workspace members can manage documents" ON public.documents
  FOR ALL USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Users can view documents in their workspaces" ON public.documents
  FOR SELECT USING (public.has_workspace_access(workspace_id));

-- MEETINGS
DROP POLICY IF EXISTS "Users can view meetings in their workspaces" ON public.meetings;
DROP POLICY IF EXISTS "Mentors can manage meetings" ON public.meetings;

CREATE POLICY "Admin can manage all meetings" ON public.meetings
  FOR ALL USING (public.is_admin());

CREATE POLICY "Mentors and founders can manage meetings" ON public.meetings
  FOR ALL USING (public.can_write_workspace(workspace_id));

CREATE POLICY "Users can view meetings in their workspaces" ON public.meetings
  FOR SELECT USING (public.has_workspace_access(workspace_id));
