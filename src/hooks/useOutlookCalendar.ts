import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OutlookCalendarSettings {
  id: string;
  workspace_id: string;
  enabled: boolean;
  sync_mode: 'webhook' | 'graph';
  webhook_url: string | null;
  graph_tenant_id: string | null;
  graph_client_id: string | null;
  graph_secret_key: string | null;
  calendar_user_email: string | null;
  use_custom_calendar_email: boolean;
  created_at: string;
  updated_at: string;
}

export function useOutlookSettings(workspaceId?: string) {
  return useQuery({
    queryKey: ['outlook-settings', workspaceId],
    queryFn: async (): Promise<OutlookCalendarSettings | null> => {
      if (!workspaceId) return null;
      
      const { data, error } = await supabase
        .from('outlook_calendar_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      
      if (error) throw error;
      return data as OutlookCalendarSettings | null;
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateOutlookSettings(workspaceId?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<OutlookCalendarSettings>) => {
      if (!workspaceId) throw new Error('Workspace ID required');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const upsertData = {
        ...settings,
        workspace_id: workspaceId,
        created_by: user.id,
      };
      
      delete upsertData.id;
      
      const { data, error } = await supabase
        .from('outlook_calendar_settings')
        .upsert(upsertData, { onConflict: 'workspace_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlook-settings', workspaceId] });
    },
  });
}

export function useSyncSessionToOutlook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, action }: { sessionId: string; action: 'create' | 'update' | 'delete' }) => {
      const { data, error } = await supabase.functions.invoke('sync-outlook-calendar', {
        body: { session_id: sessionId, action },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Session synced to Outlook calendar');
      } else if (data.reason === 'not_configured') {
        toast.info('Outlook sync not configured for this workspace');
      } else {
        toast.warning(data.message || 'Sync completed with warnings');
      }
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (error: Error) => {
      toast.error(`Outlook sync failed: ${error.message}`);
    },
  });
}
