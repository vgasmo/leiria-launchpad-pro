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
  const isGlobal = !workspaceId && !programId;
  
  return useQuery({
    queryKey: ['teams-settings', workspaceId ?? 'global', programId],
    queryFn: async (): Promise<TeamsIntegrationSettings | null> => {
      let query = supabase
        .from('teams_integration_settings')
        .select('*');
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      } else if (programId) {
        query = query.eq('program_id', programId);
      } else {
        // Global settings: no workspace_id and no program_id
        query = query.is('workspace_id', null).is('program_id', null);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) throw error;
      return data as TeamsIntegrationSettings | null;
    },
  });
}

export function useUpdateTeamsSettings(workspaceId?: string, programId?: string) {
  const queryClient = useQueryClient();
  const isGlobal = !workspaceId && !programId;
  
  return useMutation({
    mutationFn: async (settings: Partial<TeamsIntegrationSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const upsertData: Record<string, any> = {
        ...settings,
        created_by: user.id,
      };
      
      // Set workspace_id or program_id, or keep both null for global
      if (workspaceId) {
        upsertData.workspace_id = workspaceId;
      } else if (programId) {
        upsertData.program_id = programId;
      }
      // For global settings, both remain null
      
      // Remove id from upsert data if present (let DB generate it)
      delete upsertData.id;
      
      // For global settings, we need a different approach since there's no unique constraint on null values
      if (isGlobal) {
        // Check if global settings already exist
        const { data: existing } = await supabase
          .from('teams_integration_settings')
          .select('id')
          .is('workspace_id', null)
          .is('program_id', null)
          .maybeSingle();
        
        if (existing) {
          // Update existing global settings
          const { data, error } = await supabase
            .from('teams_integration_settings')
            .update(upsertData)
            .eq('id', existing.id)
            .select()
            .single();
          
          if (error) throw error;
          return data;
        } else {
          // Insert new global settings
          const { data, error } = await supabase
            .from('teams_integration_settings')
            .insert(upsertData)
            .select()
            .single();
          
          if (error) throw error;
          return data;
        }
      }
      
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
      queryClient.invalidateQueries({ queryKey: ['teams-settings', workspaceId ?? 'global', programId] });
    },
  });
}

export function useTestTeamsWebhook() {
  return useMutation({
    mutationFn: async (webhookUrl: string) => {
      // Power Automate / Teams Workflows expect a simpler JSON structure
      // We'll try a simple format that works with most webhook types
      const isPowerAutomate = webhookUrl.includes('powerplatform.com') || webhookUrl.includes('flow.microsoft.com');
      
      let payload;
      if (isPowerAutomate) {
        // Simple JSON for Power Automate triggers
        payload = {
          title: '✅ Startup Leiria Integration Test',
          message: 'Your Microsoft Teams integration is working! You will receive notifications here.',
          timestamp: new Date().toISOString(),
        };
      } else {
        // Adaptive Card format for Office 365 Connectors
        payload = {
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
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors', // Teams webhooks don't return CORS headers
        body: JSON.stringify(payload),
      });

      // With no-cors, we can't read the response, but if no error thrown, assume success
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Test message sent to Teams! Check your Power Automate flow execution history.');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send test: ${error.message}`);
    },
  });
}
