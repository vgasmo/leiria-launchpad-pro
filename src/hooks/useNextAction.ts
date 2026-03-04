import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useUpdateNextAction() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      funnelItemId: string;
      next_action_at: string | null;
      next_action_description: string | null;
    }) => {
      const { data, error } = await supabase
        .from('funnel_items')
        .update({
          next_action_at: params.next_action_at,
          next_action_description: params.next_action_description,
        })
        .eq('id', params.funnelItemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-items'] });
      queryClient.invalidateQueries({ queryKey: ['crm-inbox'] });
      toast.success(t('crm.nextActionUpdated'));
    },
    onError: (e: Error) => toast.error(t('crm.nextActionError')),
  });
}

export function useClearNextAction() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (funnelItemId: string) => {
      const { data, error } = await supabase
        .from('funnel_items')
        .update({
          next_action_at: null,
          next_action_description: null,
        })
        .eq('id', funnelItemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-items'] });
      queryClient.invalidateQueries({ queryKey: ['crm-inbox'] });
      toast.success(t('crm.nextActionCleared'));
    },
    onError: (e: Error) => toast.error(t('crm.nextActionClearError')),
  });
}
