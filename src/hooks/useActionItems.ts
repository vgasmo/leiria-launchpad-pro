import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ActionStatus = Database['public']['Enums']['action_status'];

export interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  status: ActionStatus;
  priority: string | null;
  due_date: string | null;
  owner_user_id: string | null;
  session_id: string | null;
  milestone_id: string | null;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  owner: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useActionItems(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['action-items', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('action_items')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      // Fetch owner profiles separately
      const ownerIds = [...new Set(data?.filter(a => a.owner_user_id).map(a => a.owner_user_id) || [])];
      let profiles: { id: string; full_name: string | null; avatar_url: string | null }[] = [];
      
      if (ownerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', ownerIds as string[]);
        profiles = profilesData || [];
      }

      return (data || []).map(item => ({
        ...item,
        owner: item.owner_user_id 
          ? profiles.find(p => p.id === item.owner_user_id) || null 
          : null,
      })) as ActionItem[];
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateActionItem(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: { 
      id: string; 
      status?: ActionStatus;
      due_date?: string | null;
      owner_user_id?: string | null;
      title?: string;
      description?: string | null;
      priority?: string;
    }) => {
      const updateData: Record<string, unknown> = { ...updates };
      
      // Set completed_at when marking as completed
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (updates.status) {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from('action_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-actions', workspaceId] });
    },
  });
}

export function useDeleteActionItem(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('action_items')
        .delete()
        .eq('id', actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-actions', workspaceId] });
    },
  });
}

export function useCreateActionItemFull(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionItem: {
      title: string;
      description?: string;
      due_date?: string | null;
      priority?: string;
      owner_user_id?: string | null;
      milestone_id: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('action_items')
        .insert({
          workspace_id: workspaceId,
          title: actionItem.title,
          description: actionItem.description || null,
          due_date: actionItem.due_date || null,
          priority: actionItem.priority || 'medium',
          owner_user_id: actionItem.owner_user_id || null,
          milestone_id: actionItem.milestone_id,
          created_by: user?.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['action-items', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-actions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['milestone-actions', variables.milestone_id] });
      queryClient.invalidateQueries({ queryKey: ['milestones', workspaceId] });
    },
  });
}

export function useActionItemsByMilestone(milestoneId: string | undefined) {
  return useQuery({
    queryKey: ['milestone-actions', milestoneId],
    queryFn: async () => {
      if (!milestoneId) return [];
      
      const { data, error } = await supabase
        .from('action_items')
        .select('*')
        .eq('milestone_id', milestoneId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      // Fetch owner profiles separately
      const ownerIds = [...new Set(data?.filter(a => a.owner_user_id).map(a => a.owner_user_id) || [])];
      let profiles: { id: string; full_name: string | null; avatar_url: string | null }[] = [];
      
      if (ownerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', ownerIds as string[]);
        profiles = profilesData || [];
      }

      return (data || []).map(item => ({
        ...item,
        owner: item.owner_user_id 
          ? profiles.find(p => p.id === item.owner_user_id) || null 
          : null,
      })) as ActionItem[];
    },
    enabled: !!milestoneId,
  });
}
