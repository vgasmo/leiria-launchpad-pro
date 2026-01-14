import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { VisibilityType, TaskStatus, TaskPriority } from './useActivityTimeline';

export type { TaskStatus, TaskPriority } from './useActivityTimeline';

export interface TaskEntry {
  id: string;
  workspace_id: string | null;
  funnel_item_id: string | null;
  activity_type: 'task';
  subject: string | null;
  preview: string | null;
  due_at: string | null;
  status: TaskStatus;
  completed_at: string | null;
  assigned_to: string | null;
  priority: TaskPriority | null;
  visibility: VisibilityType;
  occurred_at: string;
  created_at: string;
}

export function useAddTask() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      workspace_id?: string;
      funnel_item_id?: string;
      subject: string;
      preview?: string;
      due_at?: string;
      assigned_to?: string;
      priority?: TaskPriority;
      visibility?: VisibilityType;
    }) => {
      // Resolve workspace_id from funnel_item if needed
      let workspaceId = params.workspace_id;
      if (!workspaceId && params.funnel_item_id) {
        const { data: funnelItem } = await supabase
          .from('funnel_items')
          .select('linked_workspace_id')
          .eq('id', params.funnel_item_id)
          .single();
        workspaceId = funnelItem?.linked_workspace_id || undefined;
      }

      if (!workspaceId) {
        throw new Error('workspace_id is required for task entries');
      }

      const { data, error } = await supabase
        .from('communication_log')
        .insert({
          workspace_id: workspaceId,
          funnel_item_id: params.funnel_item_id,
          activity_type: 'task',
          subject: params.subject,
          preview: params.preview,
          due_at: params.due_at,
          assigned_to: params.assigned_to,
          priority: params.priority,
          visibility: params.visibility || 'staff',
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Update funnel_items.next_action_at if task has due_at
      if (params.funnel_item_id && params.due_at) {
        await supabase
          .from('funnel_items')
          .update({ 
            next_action_at: params.due_at,
            next_action_description: params.subject 
          })
          .eq('id', params.funnel_item_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-items'] });
      toast.success(t('crm.taskAdded'));
    },
    onError: () => toast.error(t('crm.taskError')),
  });
}

export function useCompleteTask() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase
        .from('communication_log')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
      toast.success(t('crm.taskCompleted'));
    },
    onError: () => toast.error(t('crm.taskCompleteError')),
  });
}

export function useReopenTask() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase
        .from('communication_log')
        .update({
          status: 'open',
          completed_at: null,
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
      toast.success(t('crm.taskReopened'));
    },
    onError: () => toast.error(t('crm.taskReopenError')),
  });
}

export function useUpdateTask() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      subject?: string;
      preview?: string;
      due_at?: string | null;
      assigned_to?: string | null;
      priority?: TaskPriority | null;
      visibility?: VisibilityType;
    }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from('communication_log')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
      toast.success(t('crm.taskUpdated'));
    },
    onError: () => toast.error(t('crm.taskUpdateError')),
  });
}
