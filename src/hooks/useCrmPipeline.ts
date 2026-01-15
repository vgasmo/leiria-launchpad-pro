import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FunnelStage } from './useFunnel';
import type { CrmInboxItem } from './useCrmInbox';

export interface CrmPipelineGroups {
  [key: string]: CrmInboxItem[];
}

interface UseCrmPipelineFilters {
  programId?: string;
  assigneeId?: string;
  search?: string;
  myItemsOnly?: boolean;
  currentUserId?: string;
}

export const PIPELINE_STAGES: FunnelStage[] = [
  'new',
  'first_contact_booked',
  'met',
  'qualified',
  'proposal_sent',
  'negotiating',
  'contracted',
];

export function useCrmPipeline(filters?: UseCrmPipelineFilters) {
  return useQuery({
    queryKey: ['crm-pipeline', filters],
    queryFn: async (): Promise<CrmPipelineGroups> => {
      let query = supabase
        .from('funnel_items')
        .select('*')
        .in('stage', PIPELINE_STAGES)
        .order('next_action_at', { ascending: true, nullsFirst: false });

      if (filters?.programId) {
        query = query.eq('program_id', filters.programId);
      }
      if (filters?.assigneeId) {
        query = query.eq('owner_consultant_id', filters.assigneeId);
      }
      if (filters?.myItemsOnly && filters?.currentUserId) {
        query = query.eq('owner_consultant_id', filters.currentUserId);
      }
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`organization_name.ilike.${searchTerm},contact_name.ilike.${searchTerm},contact_email.ilike.${searchTerm}`);
      }

      const { data: items, error } = await query;
      if (error) throw error;

      // Fetch owners
      const ownerIds = [...new Set((items || []).filter(i => i.owner_consultant_id).map(i => i.owner_consultant_id))];
      let owners: Record<string, { id: string; full_name: string | null }> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ownerIds as string[]);
        profiles?.forEach(p => { owners[p.id] = p; });
      }

      // Fetch programs
      const programIds = [...new Set((items || []).filter(i => i.program_id).map(i => i.program_id))];
      let programs: Record<string, { id: string; name: string }> = {};
      if (programIds.length > 0) {
        const { data: progs } = await supabase
          .from('programs')
          .select('id, name')
          .in('id', programIds as string[]);
        progs?.forEach(p => { programs[p.id] = p; });
      }

      const enrichedItems: CrmInboxItem[] = (items || []).map(item => ({
        ...item,
        stage: item.stage as FunnelStage,
        owner: item.owner_consultant_id ? owners[item.owner_consultant_id] || null : null,
        program: item.program_id ? programs[item.program_id] || null : null,
      }));

      // Group by stage
      const groups: CrmPipelineGroups = {};
      PIPELINE_STAGES.forEach(stage => {
        groups[stage] = [];
      });

      enrichedItems.forEach(item => {
        if (groups[item.stage]) {
          groups[item.stage].push(item);
        }
      });

      return groups;
    },
  });
}
