import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays } from 'date-fns';

export interface UpcomingSession {
  id: string;
  title: string;
  scheduled_at: string;
  duration: number | null;
  location: string | null;
  join_url: string | null;
  agenda: string | null;
  workspace_id: string;
  startup_name: string;
}

export function useUpcomingSessions() {
  return useQuery({
    queryKey: ['upcoming-sessions'],
    queryFn: async (): Promise<UpcomingSession[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const now = new Date().toISOString();
      const weekFromNow = addDays(new Date(), 7).toISOString();

      // Get workspaces the user has access to
      const { data: workspaceIds } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', user.id)
        .eq('active', true);

      if (!workspaceIds || workspaceIds.length === 0) {
        // Check if user is admin/consultor who can see all
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const isStaff = roles?.some(r => r.role === 'admin' || r.role === 'consultor');
        
        if (!isStaff) return [];

        // Get all sessions for staff
        const { data, error } = await supabase
          .from('sessions')
          .select(`
            id,
            title,
            scheduled_at,
            duration,
            location,
            join_url,
            agenda,
            workspace_id,
            workspace:workspaces(
              startup:startups(name)
            )
          `)
          .gte('scheduled_at', now)
          .lte('scheduled_at', weekFromNow)
          .order('scheduled_at', { ascending: true })
          .limit(20);

        if (error) throw error;

        return (data || []).map(session => ({
          id: session.id,
          title: session.title,
          scheduled_at: session.scheduled_at,
          duration: session.duration,
          location: session.location,
          join_url: session.join_url,
          agenda: session.agenda,
          workspace_id: session.workspace_id,
          startup_name: (session.workspace as any)?.startup?.name || 'Unknown',
        }));
      }

      const ids = workspaceIds.map(w => w.workspace_id);

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          scheduled_at,
          duration,
          location,
          join_url,
          agenda,
          workspace_id,
          workspace:workspaces(
            startup:startups(name)
          )
        `)
        .in('workspace_id', ids)
        .gte('scheduled_at', now)
        .lte('scheduled_at', weekFromNow)
        .order('scheduled_at', { ascending: true })
        .limit(20);

      if (error) throw error;

      return (data || []).map(session => ({
        id: session.id,
        title: session.title,
        scheduled_at: session.scheduled_at,
        duration: session.duration,
        location: session.location,
        join_url: session.join_url,
        agenda: session.agenda,
        workspace_id: session.workspace_id,
        startup_name: (session.workspace as any)?.startup?.name || 'Unknown',
      }));
    },
  });
}
