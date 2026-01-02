import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HealthHistoryEntry {
  id: string;
  workspace_id: string;
  computed_at: string;
  score_numeric: number;
  label: string;
  components_json: {
    actions: number;
    sessions: number;
    kpis: number;
    checkins: number;
  };
  explanation_json: any[];
  model_version_id: string | null;
}

export interface HealthAlert {
  id: string;
  workspace_id: string;
  alert_type: string;
  severity: string;
  reason: string;
  evidence_json: any;
  status: string;
  ack_by: string | null;
  ack_at: string | null;
  snoozed_until: string | null;
  created_at: string;
}

export function useHealthHistory(workspaceId: string, days = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['health-history', workspaceId, days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_health_history')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('computed_at', startDate.toISOString())
        .order('computed_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as HealthHistoryEntry[];
    },
    enabled: !!workspaceId,
  });
}

export function useHealthAlerts(workspaceId: string) {
  return useQuery({
    queryKey: ['health-alerts', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_health_alerts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as HealthAlert[];
    },
    enabled: !!workspaceId,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, workspaceId }: { alertId: string; workspaceId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('workspace_health_alerts')
        .update({
          status: 'acknowledged',
          ack_by: user?.id,
          ack_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['health-alerts', workspaceId] });
    },
  });
}

export function useSnoozeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, workspaceId, days }: { alertId: string; workspaceId: string; days: number }) => {
      const snoozedUntil = new Date();
      snoozedUntil.setDate(snoozedUntil.getDate() + days);

      const { error } = await supabase
        .from('workspace_health_alerts')
        .update({
          status: 'snoozed',
          snoozed_until: snoozedUntil.toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['health-alerts', workspaceId] });
    },
  });
}

export function useHealthTrends(workspaceId: string) {
  const { data: history } = useHealthHistory(workspaceId, 30);

  if (!history || history.length < 2) {
    return { delta7d: null, delta30d: null, componentTrends: null };
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const current = history[history.length - 1];
  const weekAgoEntry = history.find(h => new Date(h.computed_at) <= weekAgo) || history[0];
  const monthAgoEntry = history[0];

  const delta7d = current.score_numeric - weekAgoEntry.score_numeric;
  const delta30d = current.score_numeric - monthAgoEntry.score_numeric;

  // Component trends
  const prevComponents = weekAgoEntry.components_json;
  const currComponents = current.components_json;

  const componentTrends = {
    actions: currComponents.actions - (prevComponents?.actions || 0),
    sessions: currComponents.sessions - (prevComponents?.sessions || 0),
    kpis: currComponents.kpis - (prevComponents?.kpis || 0),
    checkins: currComponents.checkins - (prevComponents?.checkins || 0),
  };

  return { delta7d, delta30d, componentTrends, current, previous: weekAgoEntry };
}

export function useHealthModelTemplates() {
  return useQuery({
    queryKey: ['health-model-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_model_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateHealthModelTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: {
      name: string;
      description?: string;
      weights_json: any;
      thresholds_json: any;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('health_model_templates')
        .insert({
          ...template,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-model-templates'] });
    },
  });
}

export function useApplyHealthModelTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, programId }: { templateId: string; programId: string }) => {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('health_model_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const { data: { user } } = await supabase.auth.getUser();

      // Upsert program health model
      const { error: upsertError } = await supabase
        .from('program_health_model')
        .upsert({
          program_id: programId,
          weights_json: template.weights_json,
          thresholds_json: template.thresholds_json,
          is_enabled: true,
        }, { onConflict: 'program_id' });

      if (upsertError) throw upsertError;

      // Create version record
      await supabase.from('program_health_model_versions').insert({
        program_id: programId,
        weights_json: template.weights_json,
        thresholds_json: template.thresholds_json,
        changed_by: user?.id,
        note: `Applied template: ${template.name}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-health-models'] });
    },
  });
}

export function useRecomputeHealth() {
  return useMutation({
    mutationFn: async (params?: { program_id?: string; workspace_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('recompute-health-scores', {
        body: params || {},
      });

      if (error) throw error;
      return data;
    },
  });
}
