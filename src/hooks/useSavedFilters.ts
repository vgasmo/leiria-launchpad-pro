import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { WorkspaceFilters } from './useWorkspaces';
import { Json } from '@/integrations/supabase/types';

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  filters: WorkspaceFilters;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useSavedFilters() {
  return useQuery({
    queryKey: ['saved-filters'],
    queryFn: async (): Promise<SavedFilter[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(f => ({
        ...f,
        filters: f.filters as WorkspaceFilters,
      }));
    },
  });
}

export function useSaveFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; filters: WorkspaceFilters; isDefault?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // If setting as default, unset other defaults first
      if (params.isDefault) {
        await supabase
          .from('saved_filters')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('saved_filters')
        .insert([{
          user_id: user.id,
          name: params.name,
          filters: params.filters as unknown as Json,
          is_default: params.isDefault || false,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
    },
  });
}

export function useDeleteSavedFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filterId: string) => {
      const { error } = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', filterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
    },
  });
}

export function useSetDefaultFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filterId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Unset all defaults first
      await supabase
        .from('saved_filters')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set the new default
      const { error } = await supabase
        .from('saved_filters')
        .update({ is_default: true })
        .eq('id', filterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
    },
  });
}
