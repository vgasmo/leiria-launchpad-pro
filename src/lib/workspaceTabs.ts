import { 
  LayoutDashboard, CheckSquare, Calendar, FileText, BarChart3, 
  Flag, BookOpen, Users, MessageSquare,
  DollarSign, StickyNote, Clock, Shield, Settings, LucideIcon 
} from 'lucide-react';

export interface WorkspaceTab {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  /** Show in primary tab bar (max 5) vs overflow "More" menu */
  primary: boolean;
  /** Permission gate: which roles can see this tab */
  visibleTo: ('all' | 'founder' | 'admin' | 'consultor' | 'mentor' | 'backoffice')[];
  /** If true, requires startup data to render */
  requiresStartup?: boolean;
  /** Minimum stage required to show this tab (progressive disclosure) */
  minStage?: string;
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
  { id: 'agenda',     labelKey: 'workspace.agenda',      icon: Calendar,        primary: true,  visibleTo: ['all'] },

  // ── Overflow tabs (inside "More" dropdown) ──
  { id: 'chat',       labelKey: 'workspace.chat',        icon: MessageSquare,   primary: false, visibleTo: ['all'] },
  { id: 'documents',  labelKey: 'workspace.documents',   icon: FileText,        primary: false, visibleTo: ['all'] },
  { id: 'playbooks',  labelKey: 'workspace.playbooks',   icon: BookOpen,        primary: false, visibleTo: ['all'] },
  // templates absorbed into documents tab as "Ferramentas para Empreendedores" sub-tab
  // dataroom absorbed into documents tab as sub-tab
  { id: 'governance', labelKey: 'workspace.governance',   icon: Shield,          primary: false, visibleTo: ['all'], minStage: 'validation' },
  { id: 'team',       labelKey: 'workspace.team',         icon: Users,           primary: false, visibleTo: ['founder'], requiresStartup: true },
  { id: 'funding',    labelKey: 'workspace.funding',      icon: DollarSign,      primary: false, visibleTo: ['founder'], requiresStartup: true, minStage: 'mvp' },
  { id: 'notes',      labelKey: 'workspace.notesAndTasks', icon: StickyNote,     primary: false, visibleTo: ['admin', 'consultor', 'mentor', 'backoffice'] },
  { id: 'time',       labelKey: 'workspace.time',         icon: Clock,           primary: false, visibleTo: ['admin', 'consultor'] },
  { id: 'settings',   labelKey: 'workspace.settings',     icon: Settings,        primary: false, visibleTo: ['all'] },
];

/**
 * Stage progression order for progressive disclosure.
 */
const STAGE_ORDER = ['ideation', 'validation', 'mvp', 'growth', 'scale'];

function meetsStageRequirement(currentStage: string, minStage?: string): boolean {
  if (!minStage) return true;
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const minIdx = STAGE_ORDER.indexOf(minStage);
  if (currentIdx === -1 || minIdx === -1) return true; // unknown stage → show
  return currentIdx >= minIdx;
}

/**
 * Filter tabs based on user roles, available data, and startup stage.
 */
export function getVisibleTabs(
  roles: { isAdmin: boolean; isConsultor: boolean; isMentor: boolean; isFounder: boolean; isBackoffice?: boolean },
  hasStartup: boolean,
  currentStage?: string
): { primaryTabs: WorkspaceTab[]; overflowTabs: WorkspaceTab[] } {
  const visible = WORKSPACE_TABS.filter(tab => {
    // Check startup requirement
    if (tab.requiresStartup && !hasStartup) return false;
    
    // Progressive disclosure: hide advanced tabs for early-stage startups (founders only)
    if (tab.minStage && roles.isFounder && !roles.isAdmin && !roles.isConsultor && currentStage) {
      if (!meetsStageRequirement(currentStage, tab.minStage)) return false;
    }
    
    // Check role visibility
    if (tab.visibleTo.includes('all')) return true;
    if (tab.visibleTo.includes('founder') && roles.isFounder) return true;
    if (tab.visibleTo.includes('admin') && roles.isAdmin) return true;
    if (tab.visibleTo.includes('consultor') && roles.isConsultor) return true;
    if (tab.visibleTo.includes('mentor') && roles.isMentor) return true;
    if (tab.visibleTo.includes('backoffice') && roles.isBackoffice) return true;
    
    return false;
  });

  return {
    primaryTabs: visible.filter(t => t.primary),
    overflowTabs: visible.filter(t => !t.primary),
  };
}
