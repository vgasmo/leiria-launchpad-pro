import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StartupStage, HealthScore } from '@/types/database';

interface WorkspaceFilters {
  search?: string;
  stage?: StartupStage | 'all';
  health?: HealthScore | 'all';
  missingKpi?: boolean;
  overdueActions?: boolean;
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
      
      const { data: actionItems } = await supabase
        .from('action_items')
        .select('workspace_id, status, due_date')
        .in('workspace_id', workspaceIds)
        .in('status', ['pending', 'in_progress']);

      // Fetch KPI values for current month
      const { data: kpiValues } = await supabase
        .from('kpi_values')
        .select('workspace_id')
        .in('workspace_id', workspaceIds)
        .eq('period_month', currentMonth);

      // Build result with counts
      const today = new Date().toISOString().split('T')[0];
      
      const result = workspaces.map(w => {
        const wsActionItems = actionItems?.filter(a => a.workspace_id === w.id) || [];
        const pendingActionsCount = wsActionItems.length;
        const overdueActionsCount = wsActionItems.filter(
          a => a.due_date && a.due_date < today
        ).length;
        const hasCurrentMonthKpi = kpiValues?.some(k => k.workspace_id === w.id) || false;

        return {
          ...w,
          startup: w.startup as WorkspaceWithDetails['startup'],
          program: w.program as WorkspaceWithDetails['program'],
          pendingActionsCount,
          overdueActionsCount,
          hasCurrentMonthKpi,
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
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
