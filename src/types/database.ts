// Application types derived from database schema

export type AppRole = 'admin' | 'consultor' | 'mentor_externo' | 'founder' | 'team_member';
export type StartupStage = 'ideation' | 'validation' | 'mvp' | 'growth' | 'scale';
export type HealthScore = 'critical' | 'at_risk' | 'stable' | 'healthy' | 'thriving';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Program {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Startup {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  founded_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  startup_id: string;
  program_id: string;
  stage: StartupStage;
  health_score: HealthScore | null;
  health_score_override: HealthScore | null;
  health_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  startup?: Startup;
  program?: Program;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  // Joined
  profile?: Profile;
}

export interface Session {
  id: string;
  workspace_id: string;
  title: string;
  notes: string | null;
  session_date: string;
  duration_minutes: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  workspace_id: string;
  session_id: string | null;
  title: string;
  description: string | null;
  status: ActionStatus;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_profile?: Profile;
}

export interface Milestone {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  target_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KpiDefinition {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  is_global: boolean;
  program_id: string | null;
  created_at: string;
}

export interface KpiEntry {
  id: string;
  workspace_id: string;
  kpi_definition_id: string;
  value: number | null;
  target_value: number | null;
  month: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  kpi_definition?: KpiDefinition;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  content: Record<string, unknown> | null;
  is_global: boolean;
  program_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  document_type: 'file' | 'link';
  file_path: string | null;
  external_url: string | null;
  category: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Extended workspace with counts for list view
export interface WorkspaceWithStats extends Workspace {
  pending_actions_count?: number;
  overdue_actions_count?: number;
  has_current_month_kpi?: boolean;
}
