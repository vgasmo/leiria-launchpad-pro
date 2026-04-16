import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface ActionDeliverable {
  id: string;
  action_id: string;
  title: string;
  type: string; // 'file' | 'link' | 'platform_document'
  file_path: string | null;
  external_url: string | null;
  document_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

export function useActionDeliverables(actionId: string | undefined) {
  return useQuery({
    queryKey: ['action-deliverables', actionId],
    queryFn: async () => {
      if (!actionId) return [];
      const { data, error } = await supabase
        .from('action_deliverables')
        .select('*')
        .eq('action_id', actionId)
        .order('created_at');
      if (error) throw error;
      return (data || []) as ActionDeliverable[];
    },
    enabled: !!actionId,
  });
}

/** Fetch deliverables for multiple actions at once (batch) */
export function useActionDeliverablesBatch(actionIds: string[]) {
  return useQuery({
    queryKey: ['action-deliverables-batch', actionIds.sort().join(',')],
    queryFn: async () => {
      if (actionIds.length === 0) return {};
      const { data, error } = await supabase
        .from('action_deliverables')
        .select('*')
        .in('action_id', actionIds)
        .order('created_at');
      if (error) throw error;
      const grouped: Record<string, ActionDeliverable[]> = {};
      for (const d of (data || []) as ActionDeliverable[]) {
        (grouped[d.action_id] ||= []).push(d);
      }
      return grouped;
    },
    enabled: actionIds.length > 0,
  });
}

export function useCreateActionDeliverable(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deliverable: {
      action_id: string;
      title: string;
      type: string;
      file_path?: string | null;
      external_url?: string | null;
      document_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('action_deliverables')
        .insert(deliverable)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['action-deliverables', data.action_id] });
      queryClient.invalidateQueries({ queryKey: ['action-deliverables-batch'] });
      queryClient.invalidateQueries({ queryKey: ['action-items', workspaceId] });
    },
  });
}

export function useCompleteActionDeliverable(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actionId }: { id: string; actionId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('action_deliverables')
        .update({ completed_at: new Date().toISOString(), completed_by: user?.id || null })
        .eq('id', id);
      if (error) throw error;
      return { id, actionId };
    },
    onSuccess: ({ actionId }) => {
      queryClient.invalidateQueries({ queryKey: ['action-deliverables', actionId] });
      queryClient.invalidateQueries({ queryKey: ['action-deliverables-batch'] });
      queryClient.invalidateQueries({ queryKey: ['action-items', workspaceId] });
    },
  });
}

export function useDeleteActionDeliverable(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actionId }: { id: string; actionId: string }) => {
      const { error } = await supabase
        .from('action_deliverables')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, actionId };
    },
    onSuccess: ({ actionId }) => {
      queryClient.invalidateQueries({ queryKey: ['action-deliverables', actionId] });
      queryClient.invalidateQueries({ queryKey: ['action-deliverables-batch'] });
      queryClient.invalidateQueries({ queryKey: ['action-items', workspaceId] });
    },
  });
}
