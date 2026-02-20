import { 
  LayoutDashboard, CheckSquare, Calendar, FileText, BarChart3, 
  Flag, BookOpen, CalendarDays, Users, FolderLock, 
  DollarSign, StickyNote, Clock, Shield, Settings, LucideIcon 
} from 'lucide-react';

export interface WorkspaceTab {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  /** Show in primary tab bar (max 5) vs overflow "More" menu */
  primary: boolean;
  /** Permission gate: which roles can see this tab */
  visibleTo: ('all' | 'founder' | 'admin' | 'consultor' | 'mentor')[];
  /** If true, requires startup data to render */
  requiresStartup?: boolean;
}

/**
 * Centralized workspace tab definitions.
 * Order matters: primary tabs appear first, then overflow.
 * Max 5 primary tabs visible at once.
 */
export const WORKSPACE_TABS: WorkspaceTab[] = [
  // ── Primary tabs (visible in tab bar) ──
  // Order: Overview → Milestones → Actions → KPIs → Sessions
  // Milestones first execution tab (per role-emphasis strategy)
  { id: 'overview',   labelKey: 'workspace.overview',   icon: LayoutDashboard, primary: true,  visibleTo: ['all'] },
  { id: 'milestones', labelKey: 'workspace.milestones',  icon: Flag,            primary: true,  visibleTo: ['all'] },
  { id: 'actions',    labelKey: 'workspace.actions',     icon: CheckSquare,     primary: true,  visibleTo: ['all'] },
  { id: 'kpis',       labelKey: 'workspace.kpis',        icon: BarChart3,       primary: true,  visibleTo: ['all'] },
  { id: 'sessions',   labelKey: 'workspace.sessions',    icon: Calendar,        primary: true,  visibleTo: ['all'] },

  // ── Overflow tabs (inside "More" dropdown) ──
  { id: 'documents',  labelKey: 'workspace.documents',   icon: FileText,        primary: false, visibleTo: ['all'] },
  { id: 'playbooks',  labelKey: 'workspace.playbooks',   icon: BookOpen,        primary: false, visibleTo: ['all'] },
  // templates absorbed into documents tab as "Ferramentas para Empreendedores" sub-tab
  { id: 'calendar',   labelKey: 'workspace.calendar',    icon: CalendarDays,    primary: false, visibleTo: ['all'] },
  { id: 'dataroom',   labelKey: 'dataroom.title',        icon: FolderLock,      primary: false, visibleTo: ['all'] },
  { id: 'governance', labelKey: 'workspace.governance',   icon: Shield,          primary: false, visibleTo: ['all'] },
  { id: 'team',       labelKey: 'workspace.team',         icon: Users,           primary: false, visibleTo: ['founder'], requiresStartup: true },
  { id: 'funding',    labelKey: 'workspace.funding',      icon: DollarSign,      primary: false, visibleTo: ['founder'], requiresStartup: true },
  { id: 'notes',      labelKey: 'workspace.notesAndTasks', icon: StickyNote,     primary: false, visibleTo: ['admin', 'consultor', 'mentor'] },
  { id: 'time',       labelKey: 'workspace.time',         icon: Clock,           primary: false, visibleTo: ['admin', 'consultor'] },
  { id: 'settings',   labelKey: 'workspace.settings',     icon: Settings,        primary: false, visibleTo: ['all'] },
];

/**
 * Filter tabs based on user roles and available data.
 */
export function getVisibleTabs(
  roles: { isAdmin: boolean; isConsultor: boolean; isMentor: boolean; isFounder: boolean },
  hasStartup: boolean
): { primaryTabs: WorkspaceTab[]; overflowTabs: WorkspaceTab[] } {
  const visible = WORKSPACE_TABS.filter(tab => {
    // Check startup requirement
    if (tab.requiresStartup && !hasStartup) return false;
    
    // Check role visibility
    if (tab.visibleTo.includes('all')) return true;
    if (tab.visibleTo.includes('founder') && roles.isFounder) return true;
    if (tab.visibleTo.includes('admin') && roles.isAdmin) return true;
    if (tab.visibleTo.includes('consultor') && roles.isConsultor) return true;
    if (tab.visibleTo.includes('mentor') && roles.isMentor) return true;
    
    return false;
  });

  return {
    primaryTabs: visible.filter(t => t.primary),
    overflowTabs: visible.filter(t => !t.primary),
  };
}
