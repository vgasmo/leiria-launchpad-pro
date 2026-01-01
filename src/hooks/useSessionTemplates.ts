import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SessionTemplate {
  id: string;
  name: string;
  description: string | null;
  agenda_template: string | null;
  notes_template: string | null;
  is_global: boolean;
  created_by: string | null;
  program_id: string | null;
  created_at: string;
}

export function useSessionTemplates() {
  return useQuery({
    queryKey: ['session-templates'],
    queryFn: async (): Promise<SessionTemplate[]> => {
      const { data, error } = await supabase
        .from('session_templates')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateSessionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<SessionTemplate, 'id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('session_templates')
        .insert([{ ...template, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-templates'] });
    },
  });
}
