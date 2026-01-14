import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export type ActivityType = 'note' | 'email' | 'call' | 'task' | 'meeting' | 'system';
export type VisibilityType = 'staff' | 'shared';

export interface ActivityEntry {
  id: string;
  workspace_id: string | null;
  funnel_item_id: string | null;
  activity_type: ActivityType;
  channel: string | null;
  direction: string | null;
  from_address: string | null;
  subject: string | null;
  preview: string | null;
  body: string | null;
  occurred_at: string;
  visibility: VisibilityType;
  external_source: string | null;
  external_id: string | null;
  metadata_json: Json;
  created_at: string;
}

export interface RelationshipRecap {
  id: string;
  workspace_id: string | null;
  funnel_item_id: string | null;
  language: string;
  summary: string;
  key_points: string[];
  open_loops: string[];
  risks: string[];
  next_best_actions: string[];
  items_analyzed: number;
  generated_at: string;
  generated_by: string | null;
}

interface TimelineFilters {
  workspaceId?: string;
  funnelItemId?: string;
  visibility?: VisibilityType;
  limit?: number;
  activityTypes?: ActivityType[];
}

export function useActivityTimeline(filters: TimelineFilters) {
  const { workspaceId, funnelItemId, visibility, limit = 50, activityTypes } = filters;
  
  return useQuery({
    queryKey: ['activity-timeline', workspaceId, funnelItemId, visibility, limit, activityTypes],
    queryFn: async (): Promise<ActivityEntry[]> => {
      if (!workspaceId && !funnelItemId) return [];
      
      let query = supabase
        .from('communication_log')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(limit);
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
      if (funnelItemId) {
        query = query.eq('funnel_item_id', funnelItemId);
      }
      if (visibility) {
        query = query.eq('visibility', visibility);
      }
      if (activityTypes?.length) {
        query = query.in('activity_type', activityTypes);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []) as ActivityEntry[];
    },
    enabled: !!(workspaceId || funnelItemId),
  });
}

export function useRelationshipRecap(params: { workspaceId?: string; funnelItemId?: string; language?: string }) {
  const { workspaceId, funnelItemId, language = 'pt' } = params;
  
  return useQuery({
    queryKey: ['relationship-recap', workspaceId, funnelItemId, language],
    queryFn: async (): Promise<RelationshipRecap | null> => {
      if (!workspaceId && !funnelItemId) return null;
      
      let query = supabase
        .from('relationship_recaps')
        .select('*')
        .eq('language', language);
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      } else if (funnelItemId) {
        query = query.eq('funnel_item_id', funnelItemId);
      }
      
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      
      return data as RelationshipRecap | null;
    },
    enabled: !!(workspaceId || funnelItemId),
  });
}

export function useGenerateRecap() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { workspaceId?: string; funnelItemId?: string; language?: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-relationship-recap', {
        body: {
          workspace_id: params.workspaceId,
          funnel_item_id: params.funnelItemId,
          language: params.language || 'pt',
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['relationship-recap', params.workspaceId, params.funnelItemId] });
      toast.success('Resumo gerado');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSyncEmails() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { workspaceId?: string; funnelItemId?: string; consultantUserId?: string }) => {
      const { data, error } = await supabase.functions.invoke('sync-graph-email-history', {
        body: {
          workspace_id: params.workspaceId,
          funnel_item_id: params.funnelItemId,
          consultant_user_id: params.consultantUserId,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, params) => {
      queryClient.invalidateQueries({ queryKey: ['activity-timeline', params.workspaceId, params.funnelItemId] });
      toast.success(`Sincronizados ${data.inserted} emails`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entry: {
      workspace_id?: string;
      funnel_item_id?: string;
      activity_type: ActivityType;
      subject?: string;
      preview?: string;
      body?: string;
      direction?: string;
      visibility?: VisibilityType;
      metadata_json?: Json;
    }) => {
      const { data, error } = await supabase
        .from('communication_log')
        .insert({
          ...entry,
          occurred_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activity-timeline', variables.workspace_id, variables.funnel_item_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
