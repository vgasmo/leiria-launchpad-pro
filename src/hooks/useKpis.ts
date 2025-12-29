import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, format } from 'date-fns';

export interface KpiDefinition {
  id: string;
  name: string;
  unit: string | null;
  direction: string | null;
  category: string | null;
  description: string | null;
  is_global: boolean;
  program_id: string | null;
}

export interface KpiValue {
  id: string;
  workspace_id: string;
  kpi_definition_id: string;
  period_month: string;
  value: number | null;
  target_value: number | null;
  notes: string | null;
  created_at: string;
}

export interface WorkspaceKpi {
  id: string;
  workspace_id: string;
  kpi_definition_id: string;
  active: boolean;
  required: boolean;
  target_value: number | null;
  definition?: KpiDefinition;
}

export function useWorkspaceKpiDefinitions(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-kpi-definitions', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      // Get workspace KPIs with their definitions
      const { data: workspaceKpis, error: wkError } = await supabase
        .from('workspace_kpis')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('active', true);

      if (wkError) throw wkError;
      if (!workspaceKpis?.length) return [];

      // Get definitions
      const defIds = workspaceKpis.map(wk => wk.kpi_definition_id);
      const { data: definitions, error: defError } = await supabase
        .from('kpi_definitions')
        .select('*')
        .in('id', defIds);

      if (defError) throw defError;

      return workspaceKpis.map(wk => ({
        ...wk,
        definition: definitions?.find(d => d.id === wk.kpi_definition_id),
      })) as WorkspaceKpi[];
    },
    enabled: !!workspaceId,
  });
}

export function useKpiValues(workspaceId: string | undefined, months: number = 12) {
  return useQuery({
    queryKey: ['kpi-values', workspaceId, months],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const startDate = format(startOfMonth(subMonths(new Date(), months - 1)), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('kpi_values')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('period_month', startDate)
        .order('period_month', { ascending: true });

      if (error) throw error;
      return (data || []) as KpiValue[];
    },
    enabled: !!workspaceId,
  });
}

export function useUserWorkspaceRole(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['user-workspace-role', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('workspace_users')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;
      return data?.role || null;
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertKpiValue(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      kpi_definition_id,
      period_month,
      value,
      target_value,
      notes,
      existingId,
    }: {
      kpi_definition_id: string;
      period_month: string;
      value: number | null;
      target_value?: number | null;
      notes?: string | null;
      existingId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Ensure period_month is first day of month
      const normalizedMonth = format(startOfMonth(new Date(period_month)), 'yyyy-MM-dd');

      if (existingId) {
        // Update existing
        const { data, error } = await supabase
          .from('kpi_values')
          .update({
            value,
            target_value,
            notes,
          })
          .eq('id', existingId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new - check for duplicates first
        const { data: existing } = await supabase
          .from('kpi_values')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('kpi_definition_id', kpi_definition_id)
          .eq('period_month', normalizedMonth)
          .maybeSingle();

        if (existing) {
          // Update instead
          const { data, error } = await supabase
            .from('kpi_values')
            .update({ value, target_value, notes })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          return data;
        }

        const { data, error } = await supabase
          .from('kpi_values')
          .insert({
            workspace_id: workspaceId,
            kpi_definition_id,
            period_month: normalizedMonth,
            value,
            target_value,
            notes,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-values', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-kpis', workspaceId] });
    },
  });
}

export function useMarkCheckinComplete(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .update({ last_checkin_at: new Date().toISOString() })
        .eq('id', workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
