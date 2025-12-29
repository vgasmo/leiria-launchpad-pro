import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, format, isPast, isToday, parseISO } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type HealthScore = Database['public']['Enums']['health_score'];

export interface HealthComputationResult {
  score: number;
  healthScore: HealthScore;
  healthStatus: 'green' | 'yellow' | 'red';
  reasons: string[];
}

export async function computeWorkspaceHealth(workspaceId: string): Promise<HealthComputationResult> {
  const reasons: string[] = [];
  let score = 100;
  let forceRed = false;

  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const previousMonth = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');

  // 1. Check required KPIs
  const { data: workspaceKpis } = await supabase
    .from('workspace_kpis')
    .select('kpi_definition_id')
    .eq('workspace_id', workspaceId)
    .eq('required', true)
    .eq('active', true);

  if (workspaceKpis && workspaceKpis.length > 0) {
    const requiredKpiIds = workspaceKpis.map(wk => wk.kpi_definition_id);

    // Check current month KPI values
    const { data: currentMonthValues } = await supabase
      .from('kpi_values')
      .select('kpi_definition_id')
      .eq('workspace_id', workspaceId)
      .eq('period_month', currentMonth)
      .in('kpi_definition_id', requiredKpiIds)
      .not('value', 'is', null);

    const currentMonthFilledIds = new Set(currentMonthValues?.map(v => v.kpi_definition_id) || []);
    const missingCurrentMonth = requiredKpiIds.filter(id => !currentMonthFilledIds.has(id));

    if (missingCurrentMonth.length > 0) {
      score -= 30;
      reasons.push(`Missing ${missingCurrentMonth.length} required KPI(s) for current month`);

      // Check previous month too
      const { data: previousMonthValues } = await supabase
        .from('kpi_values')
        .select('kpi_definition_id')
        .eq('workspace_id', workspaceId)
        .eq('period_month', previousMonth)
        .in('kpi_definition_id', requiredKpiIds)
        .not('value', 'is', null);

      const previousMonthFilledIds = new Set(previousMonthValues?.map(v => v.kpi_definition_id) || []);
      const missingPreviousMonth = requiredKpiIds.filter(id => !previousMonthFilledIds.has(id));

      if (missingPreviousMonth.length > 0) {
        forceRed = true;
        reasons.push(`Missing required KPIs for 2+ consecutive months`);
      }
    }
  }

  // 2. Check overdue action items
  const { data: actionItems } = await supabase
    .from('action_items')
    .select('id, due_date, status')
    .eq('workspace_id', workspaceId)
    .in('status', ['pending', 'in_progress']);

  const overdueItems = actionItems?.filter(item => {
    if (!item.due_date) return false;
    const dueDate = parseISO(item.due_date);
    return isPast(dueDate) && !isToday(dueDate);
  }) || [];

  const overdueCount = overdueItems.length;

  if (overdueCount >= 10) {
    forceRed = true;
    reasons.push(`${overdueCount} overdue action items (critical)`);
  } else if (overdueCount >= 5) {
    score -= 20;
    reasons.push(`${overdueCount} overdue action items`);
  } else if (overdueCount > 0) {
    score -= 5;
    reasons.push(`${overdueCount} overdue action item(s)`);
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine health status
  let healthStatus: 'green' | 'yellow' | 'red';
  if (forceRed) {
    healthStatus = 'red';
  } else if (score >= 80) {
    healthStatus = 'green';
  } else if (score >= 50) {
    healthStatus = 'yellow';
  } else {
    healthStatus = 'red';
  }

  // Map score to health_score enum
  let healthScore: HealthScore;
  if (score >= 90) {
    healthScore = 'thriving';
  } else if (score >= 75) {
    healthScore = 'healthy';
  } else if (score >= 50) {
    healthScore = 'stable';
  } else if (score >= 25) {
    healthScore = 'at_risk';
  } else {
    healthScore = 'critical';
  }

  // Override based on forceRed
  if (forceRed && healthScore !== 'critical' && healthScore !== 'at_risk') {
    healthScore = 'at_risk';
  }

  if (reasons.length === 0) {
    reasons.push('All health checks passed');
  }

  return {
    score,
    healthScore,
    healthStatus,
    reasons,
  };
}

export function useRecomputeHealth(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await computeWorkspaceHealth(workspaceId);

      const { data, error } = await supabase
        .from('workspaces')
        .update({
          health_score: result.healthScore,
          health_status: result.healthStatus,
        })
        .eq('id', workspaceId)
        .select()
        .single();

      if (error) throw error;
      return { workspace: data, computation: result };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useUpdateHealthNotes(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (healthNotes: string | null) => {
      const { data, error } = await supabase
        .from('workspaces')
        .update({ health_notes: healthNotes })
        .eq('id', workspaceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    },
  });
}
