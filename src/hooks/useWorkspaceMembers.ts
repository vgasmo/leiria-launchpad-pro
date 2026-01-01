import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // First get workspace users
      const { data: workspaceUsers, error: wsError } = await supabase
        .from('workspace_users')
        .select('id, user_id, role')
        .eq('workspace_id', workspaceId)
        .eq('active', true);

      if (wsError) throw wsError;
      if (!workspaceUsers || workspaceUsers.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(workspaceUsers.map(wu => wu.user_id))];

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = (profiles || []).reduce((acc, p) => ({
        ...acc,
        [p.id]: p,
      }), {} as Record<string, typeof profiles[0]>);

      // Combine data
      return workspaceUsers.map(wu => ({
        id: wu.id,
        user_id: wu.user_id,
        role: wu.role,
        profile: profilesMap[wu.user_id] || null,
      })) as WorkspaceMember[];
    },
    enabled: !!workspaceId,
  });
}
