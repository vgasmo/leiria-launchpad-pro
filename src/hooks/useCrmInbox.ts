import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import type { FunnelStage } from './useFunnel';

export interface CrmInboxItem {
  id: string;
  contact_name: string | null;
  organization_name: string | null;
  contact_email: string | null;
  stage: FunnelStage;
  owner_consultant_id: string | null;
  program_id: string | null;
  next_action_at: string | null;
  next_action_description: string | null;
  last_activity_at: string | null;
  linked_workspace_id: string | null;
  created_at: string;
  owner?: { id: string; full_name: string | null } | null;
  program?: { id: string; name: string } | null;
}

export interface CrmInboxGroups {
  overdue: CrmInboxItem[];
  today: CrmInboxItem[];
  upcoming: CrmInboxItem[];
  noNextAction: CrmInboxItem[];
}

interface UseCrmInboxFilters {
  programId?: string;
  stage?: FunnelStage;
  assigneeId?: string;
}

export function useCrmInbox(filters?: UseCrmInboxFilters) {
  return useQuery({
    queryKey: ['crm-inbox', filters],
    queryFn: async (): Promise<CrmInboxGroups> => {
      let query = supabase
        .from('funnel_items')
        .select('*')
        .not('stage', 'in', '(rejected,archived)')
        .order('next_action_at', { ascending: true, nullsFirst: false });

      if (filters?.programId) {
        query = query.eq('program_id', filters.programId);
      }
      if (filters?.stage) {
        query = query.eq('stage', filters.stage);
      }
      if (filters?.assigneeId) {
        query = query.eq('owner_consultant_id', filters.assigneeId);
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

      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekEnd = endOfDay(addDays(now, 7));

      const enrichedItems: CrmInboxItem[] = (items || []).map(item => ({
        ...item,
        stage: item.stage as FunnelStage,
        owner: item.owner_consultant_id ? owners[item.owner_consultant_id] || null : null,
        program: item.program_id ? programs[item.program_id] || null : null,
      }));

      const groups: CrmInboxGroups = {
        overdue: [],
        today: [],
        upcoming: [],
        noNextAction: [],
      };

      enrichedItems.forEach(item => {
        if (!item.next_action_at) {
          groups.noNextAction.push(item);
        } else {
          const actionDate = new Date(item.next_action_at);
          if (actionDate < todayStart) {
            groups.overdue.push(item);
          } else if (actionDate >= todayStart && actionDate <= todayEnd) {
            groups.today.push(item);
          } else if (actionDate <= weekEnd) {
            groups.upcoming.push(item);
          } else {
            // Future beyond 7 days - still show in upcoming for now
            groups.upcoming.push(item);
          }
        }
      });

      return groups;
    },
  });
}

export function useCrmTasksDue(filters?: UseCrmInboxFilters) {
  return useQuery({
    queryKey: ['crm-tasks-due', filters],
    queryFn: async () => {
      let query = supabase
        .from('communication_log')
        .select('*')
        .eq('activity_type', 'task')
        .eq('status', 'open')
        .not('due_at', 'is', null)
        .order('due_at', { ascending: true });

      if (filters?.assigneeId) {
        query = query.eq('assigned_to', filters.assigneeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekEnd = endOfDay(addDays(now, 7));

      const groups = {
        overdue: [] as typeof data,
        today: [] as typeof data,
        upcoming: [] as typeof data,
      };

      (data || []).forEach(task => {
        if (!task.due_at) return;
        const dueDate = new Date(task.due_at);
        if (dueDate < todayStart) {
          groups.overdue.push(task);
        } else if (dueDate >= todayStart && dueDate <= todayEnd) {
          groups.today.push(task);
        } else if (dueDate <= weekEnd) {
          groups.upcoming.push(task);
        }
      });

      return groups;
    },
  });
}
