import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export function useRealtimeWorkspaces() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to workspace changes
    const workspacesChannel = supabase
      .channel('workspaces-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspaces' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'action_items' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kpi_values' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(workspacesChannel);
    };
  }, [queryClient]);
}
