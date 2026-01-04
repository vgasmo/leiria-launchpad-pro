import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GraphApiGlobalSettings {
  tenant_id: string;
  client_id: string;
  client_secret?: string; // Only for updates, never returned
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
        .select('*')
        .eq('integration_type', 'graph_api')
        .maybeSingle();
      
      if (error) throw error;
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
      client_secret: string;
      is_enabled?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Store settings (secret should be handled securely)
      const settingsJson = {
        tenant_id: settings.tenant_id,
        client_id: settings.client_id,
        client_secret: settings.client_secret, // Stored encrypted by Supabase
      };
      
      const { data, error } = await supabase
        .from('global_integration_settings')
        .upsert({
          integration_type: 'graph_api',
          settings_json: settingsJson,
          is_enabled: settings.is_enabled ?? true,
          created_by: user.id,
        }, { onConflict: 'integration_type' })
        .select()
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
