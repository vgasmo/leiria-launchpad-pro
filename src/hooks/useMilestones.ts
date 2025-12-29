import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type MilestoneStatus = Database['public']['Enums']['milestone_status'];

export interface Milestone {
  id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  position: number;
  target_date: string | null;
  completed_at: string | null;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useMilestones(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['milestones', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data || []) as Milestone[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateMilestone(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestone: {
      title: string;
      description?: string;
      target_date?: string | null;
      position?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get max position if not provided
      let position = milestone.position;
      if (position === undefined) {
        const { data: existing } = await supabase
          .from('milestones')
          .select('position')
          .eq('workspace_id', workspaceId)
          .order('position', { ascending: false })
          .limit(1);
        position = (existing?.[0]?.position ?? -1) + 1;
      }
      
      const { data, error } = await supabase
        .from('milestones')
        .insert({
          workspace_id: workspaceId,
          title: milestone.title,
          description: milestone.description || null,
          target_date: milestone.target_date || null,
          position,
          created_by: user?.id,
          status: 'not_started',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-milestones', workspaceId] });
    },
  });
}

export function useUpdateMilestone(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: { 
      id: string; 
      title?: string;
      description?: string | null;
      status?: MilestoneStatus;
      target_date?: string | null;
      position?: number;
    }) => {
      const updateData: Record<string, unknown> = { ...updates };
      
      // Set completed_at when marking as completed
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (updates.status) {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from('milestones')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-milestones', workspaceId] });
    },
  });
}

export function useDeleteMilestone(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestoneId: string) => {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-milestones', workspaceId] });
    },
  });
}

export function useReorderMilestones(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestones: { id: string; position: number }[]) => {
      // Update positions one by one (could be optimized with a batch update)
      for (const m of milestones) {
        const { error } = await supabase
          .from('milestones')
          .update({ position: m.position })
          .eq('id', m.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', workspaceId] });
    },
  });
}
