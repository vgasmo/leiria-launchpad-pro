import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvestorUpdate {
  id: string;
  workspace_id: string;
  month: string;
  content_json: {
    startup_name: string;
    highlights: string[];
    lowlights: string[];
    kpis: Array<{
      name: string;
      value: number | null;
      target: number | null;
      unit: string;
      delta: number | null;
    }>;
    milestones_achieved: string[];
    next_milestones: Array<{ title: string; target_date: string }>;
    risks: string[];
    asks: string[];
    next_month_priorities: string[];
    health_score: number | null;
    stage: string;
  };
  generated_by: string | null;
  sent_at: string | null;
  sent_to: any;
  created_at: string;
}

export function useInvestorUpdates(workspaceId: string) {
  return useQuery({
    queryKey: ['investor-updates', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investor_updates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('month', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as InvestorUpdate[];
    },
    enabled: !!workspaceId,
  });
}

export function useGenerateInvestorUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, month }: { workspaceId: string; month: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-investor-update', {
        body: { workspace_id: workspaceId, month },
      });

      if (error) throw error;
      return data.update as InvestorUpdate;
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['investor-updates', workspaceId] });
    },
  });
}

export function useUpdateInvestorUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: Partial<InvestorUpdate['content_json']> }) => {
      const { data: existing, error: fetchError } = await supabase
        .from('investor_updates')
        .select('content_json, workspace_id')
        .eq('id', id)
        .single();

      const existingContent = existing.content_json as Record<string, unknown> || {};
      const mergedContent = { ...existingContent, ...content };

      const { error } = await supabase
        .from('investor_updates')
        .update({ content_json: mergedContent })
        .eq('id', id);

      if (error) throw error;
      return { id, workspace_id: existing.workspace_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['investor-updates', data.workspace_id] });
    },
  });
}

export function useShareLinks(workspaceId: string) {
  return useQuery({
    queryKey: ['share-links', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('share_links')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}

export function useCreateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      scope, 
      expiresInDays 
    }: { 
      workspaceId: string; 
      scope: string; 
      expiresInDays: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase
        .from('share_links')
        .insert({
          workspace_id: workspaceId,
          scope,
          expires_at: expiresAt.toISOString(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('activity_log').insert({
        workspace_id: workspaceId,
        user_id: user?.id,
        entity_type: 'share_link',
        entity_id: data.id,
        action: 'created',
        metadata: { scope, expires_at: expiresAt.toISOString() },
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['share-links', data.workspace_id] });
    },
  });
}

export function useRevokeShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('share_links')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_log').insert({
        workspace_id: workspaceId,
        user_id: user?.id,
        entity_type: 'share_link',
        entity_id: id,
        action: 'revoked',
      });
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['share-links', workspaceId] });
    },
  });
}
