import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type StartupStage = Database['public']['Enums']['startup_stage'];

export interface PlaybookItem {
  id: string;
  playbook_id: string;
  item_type: 'milestone' | 'action';
  title: string;
  description: string | null;
  relative_due_days: number | null;
  priority: string | null;
  order_index: number;
  default_owner_role: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface Playbook {
  id: string;
  program_id: string | null;
  stage: StartupStage;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items?: PlaybookItem[];
}

export interface WorkspacePlaybookInstance {
  id: string;
  workspace_id: string;
  playbook_id: string;
  status: 'suggested' | 'instantiated' | 'dismissed';
  instantiated_by: string | null;
  instantiated_at: string | null;
  created_at: string;
  playbook?: Playbook;
}

// Get all playbooks
export function usePlaybooks() {
  return useQuery({
    queryKey: ['playbooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .order('stage')
        .order('title');

      if (error) throw error;
      return data as Playbook[];
    },
  });
}

// Get playbooks for a specific stage
export function usePlaybooksForStage(stage: StartupStage | undefined, programId?: string) {
  return useQuery({
    queryKey: ['playbooks', 'stage', stage, programId],
    queryFn: async () => {
      let query = supabase
        .from('playbooks')
        .select(`
          *,
          items:playbook_items(*)
        `)
        .eq('stage', stage!)
        .eq('is_active', true)
        .order('title');

      // If programId specified, filter by it or null (global)
      if (programId) {
        query = query.or(`program_id.eq.${programId},program_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(p => ({
        ...p,
        items: ((p.items || []) as unknown as PlaybookItem[]).sort((a, b) => a.order_index - b.order_index),
      })) as Playbook[];
    },
    enabled: !!stage,
  });
}

// Get playbook items
export function usePlaybookItems(playbookId: string | undefined) {
  return useQuery({
    queryKey: ['playbook-items', playbookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playbook_items')
        .select('*')
        .eq('playbook_id', playbookId!)
        .order('order_index');

      if (error) throw error;
      return data as PlaybookItem[];
    },
    enabled: !!playbookId,
  });
}

// Get workspace playbook instances
export function useWorkspacePlaybookInstances(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-playbook-instances', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_playbook_instances')
        .select(`
          *,
          playbook:playbooks(*)
        `)
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkspacePlaybookInstance[];
    },
    enabled: !!workspaceId,
  });
}

// Instantiate a playbook (create milestones and actions)
export function useInstantiatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, playbookId }: { workspaceId: string; playbookId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if already instantiated
      const { data: existing } = await supabase
        .from('workspace_playbook_instances')
        .select('id, status')
        .eq('workspace_id', workspaceId)
        .eq('playbook_id', playbookId)
        .single();

      if (existing?.status === 'instantiated') {
        throw new Error('Playbook já foi instanciado neste workspace');
      }

      // Get playbook items
      const { data: items, error: itemsError } = await supabase
        .from('playbook_items')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('order_index');

      if (itemsError) throw itemsError;
      if (!items || items.length === 0) {
        throw new Error('Playbook não tem itens');
      }

      // Create or update instance
      let instanceId: string;
      if (existing) {
        const { error } = await supabase
          .from('workspace_playbook_instances')
          .update({
            status: 'instantiated',
            instantiated_by: user.id,
            instantiated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
        instanceId = existing.id;
      } else {
        const { data: instance, error } = await supabase
          .from('workspace_playbook_instances')
          .insert({
            workspace_id: workspaceId,
            playbook_id: playbookId,
            status: 'instantiated',
            instantiated_by: user.id,
            instantiated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        instanceId = instance.id;
      }

      // Separate milestones and actions
      const milestoneItems = items.filter(i => i.item_type === 'milestone');
      const actionItems = items.filter(i => i.item_type === 'action');

      // Create milestones first
      const milestoneMap: Record<string, string> = {}; // ref -> id
      let position = 0;

      for (const item of milestoneItems) {
        const { data: milestone, error } = await supabase
          .from('milestones')
          .insert({
            workspace_id: workspaceId,
            title: item.title,
            description: item.description,
            target_date: item.relative_due_days 
              ? format(addDays(new Date(), item.relative_due_days), 'yyyy-MM-dd')
              : null,
            status: 'not_started',
            position: position++,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Store ref for actions to link
        const metadata = item.metadata_json as Record<string, unknown>;
        if (metadata?.ref) {
          milestoneMap[metadata.ref as string] = milestone.id;
        }

        // Create link
        await supabase.from('workspace_playbook_links').insert({
          workspace_playbook_instance_id: instanceId,
          milestone_id: milestone.id,
          playbook_item_id: item.id,
        });
      }

      // Create actions and link to milestones
      for (const item of actionItems) {
        const metadata = item.metadata_json as Record<string, unknown>;
        const milestoneRef = metadata?.milestone_ref as string | undefined;
        const milestoneId = milestoneRef ? milestoneMap[milestoneRef] : null;

        const { data: action, error } = await supabase
          .from('action_items')
          .insert({
            workspace_id: workspaceId,
            milestone_id: milestoneId,
            title: item.title,
            description: item.description,
            due_date: item.relative_due_days 
              ? format(addDays(new Date(), item.relative_due_days), 'yyyy-MM-dd')
              : null,
            priority: item.priority || 'medium',
            status: 'pending',
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Create link
        await supabase.from('workspace_playbook_links').insert({
          workspace_playbook_instance_id: instanceId,
          action_item_id: action.id,
          playbook_item_id: item.id,
        });
      }

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        workspace_id: workspaceId,
        entity_type: 'playbook',
        entity_id: playbookId,
        action: 'instantiated',
        metadata: {
          playbook_id: playbookId,
          milestones_created: milestoneItems.length,
          actions_created: actionItems.length,
        },
      });

      return { instanceId, milestonesCreated: milestoneItems.length, actionsCreated: actionItems.length };
    },
    onSuccess: (result, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-playbook-instances', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-milestones', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-actions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['milestones', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['action-items', workspaceId] });
      toast.success(`Playbook instanciado: ${result.milestonesCreated} milestones e ${result.actionsCreated} ações criadas`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Dismiss a playbook suggestion
export function useDismissPlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, playbookId }: { workspaceId: string; playbookId: string }) => {
      const { data: existing } = await supabase
        .from('workspace_playbook_instances')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('playbook_id', playbookId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('workspace_playbook_instances')
          .update({ status: 'dismissed' })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workspace_playbook_instances')
          .insert({
            workspace_id: workspaceId,
            playbook_id: playbookId,
            status: 'dismissed',
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-playbook-instances', workspaceId] });
      toast.success('Playbook descartado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Admin: Create playbook
export function useCreatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playbook: Omit<Playbook, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('playbooks')
        .insert(playbook)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      toast.success('Playbook criado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Admin: Update playbook
export function useUpdatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Playbook> & { id: string }) => {
      const { data, error } = await supabase
        .from('playbooks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      toast.success('Playbook atualizado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Admin: Create playbook item
export function useCreatePlaybookItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<PlaybookItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('playbook_items')
        .insert(item as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playbook-items', variables.playbook_id] });
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      toast.success('Item adicionado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Admin: Delete playbook item
export function useDeletePlaybookItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, playbookId }: { id: string; playbookId: string }) => {
      const { error } = await supabase
        .from('playbook_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return playbookId;
    },
    onSuccess: (playbookId) => {
      queryClient.invalidateQueries({ queryKey: ['playbook-items', playbookId] });
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      toast.success('Item removido');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
