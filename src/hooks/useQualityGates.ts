import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface QualityCheckConfig {
  id: string;
  entity_type: 'session' | 'proposal' | 'followup';
  criteria_key: string;
  label: string;
  description: string | null;
  weight: number;
  is_required: boolean;
  check_function: string | null;
  program_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface QualityCheckResult {
  id: string;
  entity_type: 'session' | 'proposal' | 'followup';
  entity_id: string;
  score: number;
  missing_items: Array<{ key: string; label: string; hint: string }>;
  passed_items: Array<{ key: string; label: string }>;
  coach_hints: string[];
  computed_at: string;
  computed_by: string | null;
}

export function useQualityChecksConfig(entityType?: string) {
  return useQuery({
    queryKey: ['quality-checks-config', entityType],
    queryFn: async () => {
      let query = supabase
        .from('quality_checks_config')
        .select('*')
        .eq('is_active', true)
        .order('weight', { ascending: false });

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QualityCheckConfig[];
    },
  });
}

export function useQualityCheckResult(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ['quality-check-result', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return null;
      const { data, error } = await supabase
        .from('quality_check_results')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .maybeSingle();
      if (error) throw error;
      return data as QualityCheckResult | null;
    },
    enabled: !!entityId,
  });
}

export function useComputeQualityScore() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      entityData,
    }: {
      entityType: 'session' | 'proposal' | 'followup';
      entityId: string;
      entityData: Record<string, unknown>;
    }) => {
      // Get config for this entity type
      const { data: config } = await supabase
        .from('quality_checks_config')
        .select('*')
        .eq('entity_type', entityType)
        .eq('is_active', true);

      if (!config || config.length === 0) {
        throw new Error('No quality checks configured for this entity type');
      }

      const passed: Array<{ key: string; label: string }> = [];
      const missing: Array<{ key: string; label: string; hint: string }> = [];
      const hints: string[] = [];
      let totalWeight = 0;
      let earnedWeight = 0;

      for (const check of config) {
        totalWeight += check.weight;
        const passes = evaluateCheck(check.check_function, entityData);

        if (passes) {
          passed.push({ key: check.criteria_key, label: check.label });
          earnedWeight += check.weight;
        } else {
          missing.push({
            key: check.criteria_key,
            label: check.label,
            hint: getHintForCheck(check.criteria_key, entityType),
          });
          const hint = getCoachHint(check.criteria_key, entityType);
          if (hint) hints.push(hint);
        }
      }

      const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

      // Upsert result
      const { data, error } = await supabase
        .from('quality_check_results')
        .upsert(
          {
            entity_type: entityType,
            entity_id: entityId,
            score,
            missing_items: missing,
            passed_items: passed,
            coach_hints: hints,
            computed_at: new Date().toISOString(),
            computed_by: user?.id,
          },
          { onConflict: 'entity_type,entity_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as QualityCheckResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['quality-check-result', data.entity_type, data.entity_id],
      });
    },
  });
}

// Simple check evaluator
function evaluateCheck(checkFunction: string | null, data: Record<string, unknown>): boolean {
  if (!checkFunction) return true;

  switch (checkFunction) {
    case 'has_title':
      return !!data.title && String(data.title).trim().length > 0;
    case 'has_agenda':
      return !!data.agenda && String(data.agenda).trim().length > 10;
    case 'has_scheduled_time':
      return !!data.scheduled_at;
    case 'has_duration':
      return !!data.duration && Number(data.duration) > 0;
    case 'has_outputs':
      return !!data.decisions || !!data.expected_outputs;
    case 'has_next_steps':
      return !!data.next_steps || (Array.isArray(data.action_items) && data.action_items.length > 0);
    case 'has_notes':
      return !!data.notes || !!data.ai_summary;
    case 'has_problem':
      return !!data.problem && String(data.problem).trim().length > 10;
    case 'has_solution':
      return !!data.solution && String(data.solution).trim().length > 10;
    case 'has_value_prop':
      return !!data.value_proposition && String(data.value_proposition).trim().length > 10;
    case 'has_timeline':
      return !!data.timeline;
    case 'has_metrics':
      return !!data.success_metrics || !!data.kpis;
    case 'has_summary':
      return !!data.summary || !!data.meeting_summary;
    case 'has_decisions':
      return !!data.decisions && String(data.decisions).trim().length > 5;
    case 'has_action_items':
      return Array.isArray(data.action_items) && data.action_items.length > 0;
    case 'has_next_meeting':
      return !!data.next_meeting_date;
    case 'sent_timely':
      // Check if sent within 24h of session
      if (!data.sent_at || !data.session_date) return false;
      const sentAt = new Date(data.sent_at as string);
      const sessionDate = new Date(data.session_date as string);
      const hoursDiff = (sentAt.getTime() - sessionDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    default:
      return true;
  }
}

// Get hint for missing check
function getHintForCheck(key: string, entityType: string): string {
  const hints: Record<string, string> = {
    has_title: 'Add a clear, descriptive title',
    has_agenda: 'Define the agenda or objectives for this session',
    has_scheduled_time: 'Set a specific date and time',
    has_duration: 'Specify the expected duration',
    has_outputs: 'Define what outcomes or deliverables are expected',
    has_next_steps: 'Add at least one action item or next step',
    has_notes: 'Add notes or generate an AI summary after the session',
    has_problem: 'Clearly describe the problem being solved',
    has_solution: 'Describe the proposed solution',
    has_value_prop: 'Include a clear value proposition statement',
    has_timeline: 'Add an implementation timeline',
    has_metrics: 'Define success metrics or KPIs',
    has_summary: 'Include a summary of the meeting',
    has_decisions: 'Document key decisions made',
    has_action_items: 'List action items with owners',
    has_next_meeting: 'Schedule the next meeting',
    sent_timely: 'Send follow-up within 24 hours of the meeting',
  };
  return hints[key] || 'Complete this item';
}

// Get coach hint for missing check
function getCoachHint(key: string, entityType: string): string | null {
  const coachHints: Record<string, string> = {
    has_agenda:
      '💡 Tip: A clear agenda helps keep sessions focused and ensures all important topics are covered.',
    has_outputs:
      '💡 Tip: Defining expected outputs upfront increases meeting productivity by 40%.',
    has_next_steps:
      '💡 Tip: Sessions without clear next steps often lose momentum. Always end with at least one action item.',
    has_notes:
      "💡 Tip: Documented notes create accountability and help track progress across sessions.",
    has_value_prop:
      "💡 Tip: A strong value proposition is the foundation of your pitch. Make sure it's clear and compelling.",
    has_decisions:
      '💡 Tip: Documenting decisions prevents confusion and helps maintain alignment.',
    sent_timely:
      '💡 Tip: Follow-ups sent within 24 hours are 3x more likely to drive action.',
  };
  return coachHints[key] || null;
}

// Hook to get workspace quality mode
export function useWorkspaceQualityMode(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-quality-mode', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return 'advisory';
      const { data, error } = await supabase
        .from('workspaces')
        .select('quality_mode')
        .eq('id', workspaceId)
        .maybeSingle();
      if (error) throw error;
      return (data?.quality_mode as 'advisory' | 'strict') || 'advisory';
    },
    enabled: !!workspaceId,
  });
}
