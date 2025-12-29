import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useWorkspaceActions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-actions', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('action_items')
        .select(`
          *,
          owner:profiles!action_items_owner_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq('workspace_id', workspaceId)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useWorkspaceKpis(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-kpis', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { current: [], previous: [] };
      
      // Get the last 2 months of KPI data
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`;

      const [currentResult, previousResult] = await Promise.all([
        supabase
          .from('kpi_values')
          .select(`
            *,
            kpi_definition:kpi_definitions(id, name, unit, direction, category)
          `)
          .eq('workspace_id', workspaceId)
          .eq('period_month', currentMonth),
        supabase
          .from('kpi_values')
          .select(`
            *,
            kpi_definition:kpi_definitions(id, name, unit, direction, category)
          `)
          .eq('workspace_id', workspaceId)
          .eq('period_month', previousMonth)
      ]);

      return {
        current: currentResult.data || [],
        previous: previousResult.data || [],
        currentMonth,
        previousMonth
      };
    },
    enabled: !!workspaceId,
  });
}

export function useWorkspaceMilestones(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-milestones', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useWorkspaceMeetings(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-meetings', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}

export function useWorkspaceSessions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-sessions', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('scheduled_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useStages(programId: string | undefined) {
  return useQuery({
    queryKey: ['stages', programId],
    queryFn: async () => {
      if (!programId) return [];
      
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .eq('program_id', programId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });
}
