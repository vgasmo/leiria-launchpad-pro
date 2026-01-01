import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SessionFeedback {
  id: string;
  session_id: string;
  user_id: string;
  rating: number;
  feedback: string | null;
  is_public: boolean;
  created_at: string;
  user?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useSessionFeedback(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-feedback', sessionId],
    queryFn: async (): Promise<SessionFeedback[]> => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('session_feedback')
        .select('*')
        .eq('session_id', sessionId);
      if (error) throw error;
      
      if (!data?.length) return [];
      
      const userIds = [...new Set(data.map(f => f.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(f => ({
        ...f,
        user: profileMap.get(f.user_id),
      }));
    },
    enabled: !!sessionId,
  });
}

export function useMySessionFeedback(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-feedback', 'mine', sessionId],
    queryFn: async (): Promise<SessionFeedback | null> => {
      if (!sessionId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('session_feedback')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feedback: { session_id: string; rating: number; feedback?: string; is_public?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('session_feedback')
        .upsert([{ ...feedback, user_id: user.id }], { onConflict: 'session_id,user_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-feedback', variables.session_id] });
      queryClient.invalidateQueries({ queryKey: ['session-feedback', 'mine', variables.session_id] });
    },
  });
}

export function useMentorAverageRating(mentorId: string | undefined) {
  return useQuery({
    queryKey: ['mentor-rating', mentorId],
    queryFn: async () => {
      if (!mentorId) return null;
      
      // Get sessions created by this mentor
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('created_by', mentorId);
      
      if (!sessions?.length) return { average: 0, count: 0 };
      
      const sessionIds = sessions.map(s => s.id);
      const { data: feedback } = await supabase
        .from('session_feedback')
        .select('rating')
        .in('session_id', sessionIds);
      
      if (!feedback?.length) return { average: 0, count: 0 };
      
      const average = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
      return { average: Math.round(average * 10) / 10, count: feedback.length };
    },
    enabled: !!mentorId,
  });
}
