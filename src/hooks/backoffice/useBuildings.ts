/**
 * Backoffice hooks - Buildings domain
 * Split from useBackoffice.ts for maintainability
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export interface Building {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string;
  total_area_sqm: number | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export function useBuildings() {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Building[];
    },
  });
}

export function useCreateBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('buildings')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success('Edifício criado');
    },
    onError: () => toast.error('Erro ao criar edifício'),
  });
}

export function useUpdateBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await supabase
        .from('buildings')
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success('Edifício atualizado');
    },
    onError: () => toast.error('Erro ao atualizar edifício'),
  });
}
