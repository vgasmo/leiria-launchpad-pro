import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GraphApiGlobalSettings {
  tenant_id: string;
  client_id: string;
  // Note: client_secret is NEVER returned to the frontend for security
  // It is only written, never read back
}

export interface GlobalIntegrationSettings {
  id: string;
  integration_type: string;
  settings_json: GraphApiGlobalSettings | Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useGlobalGraphSettings() {
  return useQuery({
    queryKey: ['global-integration-settings', 'graph_api'],
    queryFn: async (): Promise<GlobalIntegrationSettings | null> => {
      const { data, error } = await supabase
        .from('global_integration_settings')
        .select('id, integration_type, is_enabled, created_at, updated_at, settings_json')
        .eq('integration_type', 'graph_api')
        .maybeSingle();
      
      if (error) throw error;
      
      // Sanitize: Never expose client_secret to frontend even if accidentally returned
      if (data?.settings_json && typeof data.settings_json === 'object') {
        const sanitized = { ...data.settings_json } as Record<string, unknown>;
        delete sanitized.client_secret;
        return { ...data, settings_json: sanitized } as GlobalIntegrationSettings;
      }
      
      return data as GlobalIntegrationSettings | null;
    },
  });
}

export function useUpdateGlobalGraphSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: {
      tenant_id: string;
      client_id: string;
      client_secret?: string; // Optional for updates
      is_enabled?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Build settings object - only include secret if provided
      const settingsJson: Record<string, string> = {
        tenant_id: settings.tenant_id,
        client_id: settings.client_id,
      };
      
      // Only include secret if provided (for updates, it's optional)
      if (settings.client_secret) {
        settingsJson.client_secret = settings.client_secret;
      }
      
      // If no secret provided, we need to preserve the existing one
      if (!settings.client_secret) {
        // Fetch existing settings to preserve the secret
        const { data: existing } = await supabase
          .from('global_integration_settings')
          .select('settings_json')
          .eq('integration_type', 'graph_api')
          .maybeSingle();
        
        if (existing?.settings_json && typeof existing.settings_json === 'object') {
          const existingJson = existing.settings_json as Record<string, unknown>;
          if (existingJson.client_secret) {
            settingsJson.client_secret = existingJson.client_secret as string;
          }
        }
      }
      
      const { data, error } = await supabase
        .from('global_integration_settings')
        .upsert({
          integration_type: 'graph_api',
          settings_json: settingsJson,
          is_enabled: settings.is_enabled ?? true,
          created_by: user.id,
        }, { onConflict: 'integration_type' })
        .select('id, integration_type, is_enabled, created_at, updated_at')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-integration-settings', 'graph_api'] });
      toast.success('Global Graph API settings saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}

export function useToggleGlobalGraph() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data, error } = await supabase
        .from('global_integration_settings')
        .update({ is_enabled: enabled })
        .eq('integration_type', 'graph_api')
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['global-integration-settings', 'graph_api'] });
      toast.success(enabled ? 'Graph API enabled globally' : 'Graph API disabled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}
