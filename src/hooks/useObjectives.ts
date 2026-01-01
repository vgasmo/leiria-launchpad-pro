import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KeyResult {
  id: string;
  objective_id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string | null;
  status: string;
  created_at: string;
}

export interface Objective {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  quarter: string | null;
  status: string;
  progress: number;
  created_by: string | null;
  created_at: string;
  key_results?: KeyResult[];
}

export function useObjectives(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['objectives', workspaceId],
    queryFn: async (): Promise<Objective[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('objectives')
        .select('*, key_results(*)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(obj => ({
        ...obj,
        progress: obj.progress || 0,
        key_results: obj.key_results || [],
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useCreateObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (objective: { workspace_id: string; title: string; description?: string; quarter?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('objectives')
        .insert([{ ...objective, created_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['objectives', variables.workspace_id] });
    },
  });
}

export function useUpdateObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Objective> & { id: string }) => {
      const { error } = await supabase
        .from('objectives')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });
}

export function useDeleteObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('objectives')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });
}

export function useCreateKeyResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kr: { objective_id: string; title: string; target_value: number; unit?: string }) => {
      const { data, error } = await supabase
        .from('key_results')
        .insert([kr])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });
}

export function useUpdateKeyResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KeyResult> & { id: string }) => {
      const { error } = await supabase
        .from('key_results')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      
      // Recalculate objective progress
      if (updates.current_value !== undefined || updates.target_value !== undefined) {
        const { data: kr } = await supabase
          .from('key_results')
          .select('objective_id')
          .eq('id', id)
          .single();
        
        if (kr) {
          const { data: allKrs } = await supabase
            .from('key_results')
            .select('current_value, target_value')
            .eq('objective_id', kr.objective_id);
          
          if (allKrs && allKrs.length > 0) {
            const progress = allKrs.reduce((sum, k) => 
              sum + (k.target_value > 0 ? Math.min(100, (k.current_value / k.target_value) * 100) : 0), 0
            ) / allKrs.length;
            
            await supabase
              .from('objectives')
              .update({ progress: Math.round(progress) })
              .eq('id', kr.objective_id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });
}

export function useDeleteKeyResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('key_results')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });
}
