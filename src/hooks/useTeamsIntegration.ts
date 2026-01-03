import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeamsIntegrationSettings {
  id: string;
  workspace_id: string | null;
  program_id: string | null;
  enabled: boolean;
  webhook_url: string | null;
  default_channel_name: string | null;
  notify_checkin_submitted: boolean;
  notify_action_assigned: boolean;
  notify_action_overdue: boolean;
  notify_session_created: boolean;
  notify_session_rescheduled: boolean;
  notify_health_alert: boolean;
  created_at: string;
  updated_at: string;
}

export function useTeamsSettings(workspaceId?: string, programId?: string) {
  return useQuery({
    queryKey: ['teams-settings', workspaceId, programId],
    queryFn: async (): Promise<TeamsIntegrationSettings | null> => {
      if (!workspaceId && !programId) return null;
      
      let query = supabase
        .from('teams_integration_settings')
        .select('*');
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      } else if (programId) {
        query = query.eq('program_id', programId);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) throw error;
      return data as TeamsIntegrationSettings | null;
    },
    enabled: !!(workspaceId || programId),
  });
}

export function useUpdateTeamsSettings(workspaceId?: string, programId?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<TeamsIntegrationSettings>) => {
      if (!workspaceId && !programId) throw new Error('Workspace or program ID required');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const upsertData = {
        ...settings,
        ...(workspaceId ? { workspace_id: workspaceId } : { program_id: programId }),
        created_by: user.id,
      };
      
      // Remove id from upsert data if present (let DB generate it)
      delete upsertData.id;
      
      const { data, error } = await supabase
        .from('teams_integration_settings')
        .upsert(upsertData, { 
          onConflict: workspaceId ? 'workspace_id' : 'program_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams-settings', workspaceId, programId] });
    },
  });
}

export function useTestTeamsWebhook() {
  return useMutation({
    mutationFn: async (webhookUrl: string) => {
      const testCard = {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: {
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              type: 'AdaptiveCard',
              version: '1.4',
              body: [
                {
                  type: 'TextBlock',
                  size: 'Medium',
                  weight: 'Bolder',
                  text: '✅ Startup Leiria Integration Test',
                  wrap: true,
                },
                {
                  type: 'TextBlock',
                  text: 'Your Microsoft Teams integration is working! You will receive notifications here.',
                  wrap: true,
                  spacing: 'Small',
                },
              ],
            },
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors', // Teams webhooks don't return CORS headers
        body: JSON.stringify(testCard),
      });

      // With no-cors, we can't read the response, but if no error thrown, assume success
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Test message sent to Teams!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send test: ${error.message}`);
    },
  });
}
