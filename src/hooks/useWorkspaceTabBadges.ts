import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

/**
 * Fetches lightweight counts for workspace tab badges:
 * - actions: pending action items count
 * - kpis: missing KPI entries this month
 */
export function useWorkspaceTabBadges(workspaceId: string | undefined) {
  const { data } = useQuery({
    queryKey: ['workspace-tab-badges', workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      if (!workspaceId) return { pendingActions: 0 };

      const { count } = await supabase
        .from('action_items')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .in('status', ['pending', 'in_progress']);

      return { pendingActions: count ?? 0 };
    },
  });

  return useMemo(() => {
    const badges: Record<string, number> = {};
    if (data?.pendingActions && data.pendingActions > 0) {
      badges['actions'] = data.pendingActions;
    }
    return badges;
  }, [data]);
}
