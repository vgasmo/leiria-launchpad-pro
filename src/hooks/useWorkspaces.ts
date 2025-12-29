import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StartupStage, HealthScore } from '@/types/database';

export type SortOption = 'updated' | 'urgency' | 'meeting' | 'name';

export interface WorkspaceFilters {
  search?: string;
  programId?: string | 'all';
  stage?: StartupStage | 'all';
  health?: HealthScore | 'all';
  missingKpi?: boolean;
  overdueActions?: boolean;
  sortBy?: SortOption;
}

export interface WorkspaceWithDetails {
  id: string;
  startup_id: string;
  program_id: string;
  stage: StartupStage;
  health_score: HealthScore | null;
  health_score_override: HealthScore | null;
  health_notes: string | null;
  created_at: string;
  updated_at: string;
  startup: {
    id: string;
    name: string;
    description: string | null;
    logo_url: string | null;
  } | null;
  program: {
    id: string;
    name: string;
  } | null;
  pendingActionsCount: number;
  overdueActionsCount: number;
  hasCurrentMonthKpi: boolean;
  lastKpiMonth: string | null;
  nextMeetingDate: string | null;
  lastSession: {
    id: string;
    title: string;
    scheduled_at: string;
    notes: string | null;
  } | null;
}

export function useWorkspaces(filters: WorkspaceFilters = {}) {
  return useQuery({
    queryKey: ['workspaces', filters],
    queryFn: async (): Promise<WorkspaceWithDetails[]> => {
      // Fetch workspaces with joined data
      let query = supabase
        .from('workspaces')
        .select(`
          *,
          startup:startups(id, name, description, logo_url),
          program:programs(id, name)
        `)
        .order('updated_at', { ascending: false });

      // Apply stage filter
      if (filters.stage && filters.stage !== 'all') {
        query = query.eq('stage', filters.stage);
      }

      // Apply program filter
      if (filters.programId && filters.programId !== 'all') {
        query = query.eq('program_id', filters.programId);
      }

      // Apply health filter
      if (filters.health && filters.health !== 'all') {
        query = query.or(`health_score.eq.${filters.health},health_score_override.eq.${filters.health}`);
      }

      const { data: workspaces, error } = await query;

      if (error) throw error;
      if (!workspaces) return [];

      // Get current month for KPI check
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      // Fetch action items for counts
      const workspaceIds = workspaces.map(w => w.id);
      
      if (workspaceIds.length === 0) return [];

      const [actionItemsResult, kpiValuesResult, lastKpiResult, meetingsResult, sessionsResult] = await Promise.all([
        // Fetch pending/in-progress action items
        supabase
          .from('action_items')
          .select('workspace_id, status, due_date')
          .in('workspace_id', workspaceIds)
          .in('status', ['pending', 'in_progress']),
        
        // Fetch KPI values for current month
        supabase
          .from('kpi_values')
          .select('workspace_id')
          .in('workspace_id', workspaceIds)
          .eq('period_month', currentMonth),
        
        // Fetch last KPI entry per workspace
        supabase
          .from('kpi_values')
          .select('workspace_id, period_month')
          .in('workspace_id', workspaceIds)
          .order('period_month', { ascending: false }),
        
        // Fetch next meeting per workspace
        supabase
          .from('meetings')
          .select('workspace_id, starts_at')
          .in('workspace_id', workspaceIds)
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true }),

        // Fetch last session per workspace (past sessions only)
        supabase
          .from('sessions')
          .select('id, workspace_id, title, scheduled_at, notes')
          .in('workspace_id', workspaceIds)
          .lt('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: false })
      ]);

      const { data: actionItems } = actionItemsResult;
      const { data: kpiValues } = kpiValuesResult;
      const { data: lastKpiData } = lastKpiResult;
      const { data: meetings } = meetingsResult;
      const { data: sessions } = sessionsResult;

      // Build lookup maps
      const lastKpiMap = new Map<string, string>();
      lastKpiData?.forEach(k => {
        if (!lastKpiMap.has(k.workspace_id)) {
          lastKpiMap.set(k.workspace_id, k.period_month);
        }
      });

      const nextMeetingMap = new Map<string, string>();
      meetings?.forEach(m => {
        if (!nextMeetingMap.has(m.workspace_id)) {
          nextMeetingMap.set(m.workspace_id, m.starts_at);
        }
      });

      const lastSessionMap = new Map<string, { id: string; title: string; scheduled_at: string; notes: string | null }>();
      sessions?.forEach(s => {
        if (!lastSessionMap.has(s.workspace_id)) {
          lastSessionMap.set(s.workspace_id, { id: s.id, title: s.title, scheduled_at: s.scheduled_at, notes: s.notes });
        }
      });

      // Build result with counts
      const today = new Date().toISOString().split('T')[0];
      
      const result = workspaces.map(w => {
        const wsActionItems = actionItems?.filter(a => a.workspace_id === w.id) || [];
        const pendingActionsCount = wsActionItems.length;
        const overdueActionsCount = wsActionItems.filter(
          a => a.due_date && a.due_date < today
        ).length;
        const hasCurrentMonthKpi = kpiValues?.some(k => k.workspace_id === w.id) || false;
        const lastKpiMonth = lastKpiMap.get(w.id) || null;
        const nextMeetingDate = nextMeetingMap.get(w.id) || null;
        const lastSession = lastSessionMap.get(w.id) || null;

        return {
          ...w,
          startup: w.startup as WorkspaceWithDetails['startup'],
          program: w.program as WorkspaceWithDetails['program'],
          pendingActionsCount,
          overdueActionsCount,
          hasCurrentMonthKpi,
          lastKpiMonth,
          nextMeetingDate,
          lastSession,
        };
      });

      // Apply search filter (client-side for startup name)
      let filtered = result;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(w => 
          w.startup?.name.toLowerCase().includes(searchLower)
        );
      }

      // Apply missing KPI filter
      if (filters.missingKpi) {
        filtered = filtered.filter(w => !w.hasCurrentMonthKpi);
      }

      // Apply overdue actions filter
      if (filters.overdueActions) {
        filtered = filtered.filter(w => w.overdueActionsCount > 0);
      }

      // Apply sorting
      const healthPriority: Record<string, number> = {
        critical: 0,
        at_risk: 1,
        stable: 2,
        healthy: 3,
        thriving: 4,
      };

      const sortBy = filters.sortBy || 'updated';
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'urgency': {
            // Sort by health (critical first), then overdue count
            const aHealth = a.health_score_override || a.health_score || 'stable';
            const bHealth = b.health_score_override || b.health_score || 'stable';
            const healthDiff = healthPriority[aHealth] - healthPriority[bHealth];
            if (healthDiff !== 0) return healthDiff;
            return b.overdueActionsCount - a.overdueActionsCount;
          }
          case 'meeting': {
            // Sort by next meeting (soonest first, null last)
            if (!a.nextMeetingDate && !b.nextMeetingDate) return 0;
            if (!a.nextMeetingDate) return 1;
            if (!b.nextMeetingDate) return -1;
            return new Date(a.nextMeetingDate).getTime() - new Date(b.nextMeetingDate).getTime();
          }
          case 'name':
            return (a.startup?.name || '').localeCompare(b.startup?.name || '');
          case 'updated':
          default:
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
      });

      return filtered;
    },
  });
}

export function useWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: ['workspace', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          *,
          startup:startups(*),
          program:programs(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function usePrograms() {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
}
