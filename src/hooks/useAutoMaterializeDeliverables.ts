import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';

/**
 * Automatically materializes acceleration deliverables (gates→milestones, week deliverables→actions)
 * when a workspace belongs to an acceleration program and hasn't been materialized yet.
 */
export function useAutoMaterializeDeliverables(
  workspaceId: string | undefined,
  programId: string | undefined,
  programType: string | undefined,
) {
  const queryClient = useQueryClient();

  const isAcceleration = programType === 'acceleration';
  const enabled = !!workspaceId && !!programId && isAcceleration;

  // Check if milestones already exist from this program
  const { data: hasMaterialized } = useQuery({
    queryKey: ['acceleration-materialized', workspaceId],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      if (!workspaceId) return true;
      const { count } = await supabase
        .from('milestones')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .not('source_gate_id', 'is', null);
      return (count ?? 0) > 0;
    },
  });

  const materializeMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !programId) throw new Error('Missing workspace or program');
      const { data, error } = await supabase.rpc('materialize_acceleration_deliverables', {
        p_workspace_id: workspaceId,
        p_program_id: programId,
      });
      if (error) throw error;
      return data as { milestones_created: number; actions_created: number };
    },
    onSuccess: (result) => {
      logger.info('materialize_deliverables_success', { workspaceId, programId, result });
      queryClient.invalidateQueries({ queryKey: ['workspace-milestones', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-actions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-tab-badges', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['acceleration-materialized', workspaceId] });
    },
    onError: (err: unknown) => {
      logger.warn('materialize_deliverables_failed', {
        workspaceId,
        programId,
        error: err instanceof Error ? err.message : String(err),
      });
    },
  });

  const didAutoMaterialize = useRef(false);
  useEffect(() => {
    if (
      enabled &&
      hasMaterialized === false &&
      !materializeMutation.isPending &&
      !didAutoMaterialize.current
    ) {
      didAutoMaterialize.current = true;
      materializeMutation.mutate();
    }
  }, [enabled, hasMaterialized, materializeMutation.isPending]);

  return { hasMaterialized, isPending: materializeMutation.isPending };
}
