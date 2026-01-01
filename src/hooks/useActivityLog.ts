import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  workspace_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function useActivityLog(workspaceId?: string) {
  return useQuery({
    queryKey: ['activity-log', workspaceId],
    queryFn: async (): Promise<ActivityLogEntry[]> => {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data?.length) return [];

      // Fetch profiles separately
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(item => ({
        ...item,
        metadata: item.metadata as Record<string, unknown>,
        profile: profileMap.get(item.user_id) as ActivityLogEntry['profile'],
      }));
    },
    enabled: true,
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      action: string;
      entityType: string;
      entityId?: string;
      workspaceId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('activity_log')
        .insert([{
          user_id: user.id,
          workspace_id: params.workspaceId || null,
          action: params.action,
          entity_type: params.entityType,
          entity_id: params.entityId || null,
          metadata: (params.metadata || {}) as Json,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
    },
  });
}
