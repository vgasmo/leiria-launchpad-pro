import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';

/**
 * Automatically materializes acceleration deliverables (gates→milestones, week deliverables→actions)
 * when a workspace belongs to an acceleration program.
 *
 * The backend function is incremental and idempotent, so we sync once per mounted workspace/program pair
 * to ensure already-active workspaces also receive newly-added gates and deliverables.
 */
export function useAutoMaterializeDeliverables(
  workspaceId: string | undefined,
  programId: string | undefined,
  programType: string | undefined,
) {
  const queryClient = useQueryClient();
  const syncedRef = useRef<string | null>(null);
  const pendingRef = useRef(false);

  const isAcceleration = programType === 'acceleration';
  const enabled = !!workspaceId && !!programId && isAcceleration;
  const syncKey = enabled ? `${workspaceId}:${programId}` : null;

  const doSync = useCallback(async (wsId: string, progId: string) => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    console.log('[materialize] calling RPC', { wsId, progId });

    try {
      const { data, error } = await supabase.rpc('materialize_acceleration_deliverables', {
        p_workspace_id: wsId,
        p_program_id: progId,
      });

      if (error) {
        console.error('[materialize] RPC error', error);
        logger.warn('materialize_deliverables_failed', { workspaceId: wsId, programId: progId, error: error.message });
        // Reset so it can retry next mount
        syncedRef.current = null;
        return;
      }

      const result = data as { milestones_created: number; actions_created: number } | null;
      console.log('[materialize] success', result);
      logger.info('materialize_deliverables_success', { workspaceId: wsId, programId: progId, result });

      // Invalidate relevant queries so UI updates
      queryClient.invalidateQueries({ queryKey: ['workspace-milestones', wsId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-actions', wsId] });
      queryClient.invalidateQueries({ queryKey: ['milestones', wsId] });
      queryClient.invalidateQueries({ queryKey: ['action-items', wsId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-tab-badges', wsId] });
    } catch (err) {
      console.error('[materialize] unexpected error', err);
      syncedRef.current = null;
    } finally {
      pendingRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    if (!syncKey || !workspaceId || !programId) return;
    if (syncedRef.current === syncKey) return;

    console.log('[materialize] triggering sync', { syncKey, programType });
    syncedRef.current = syncKey;
    doSync(workspaceId, programId);
  }, [syncKey, workspaceId, programId, programType, doSync]);
}
