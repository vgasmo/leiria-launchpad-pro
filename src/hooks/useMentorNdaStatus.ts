import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CURRENT_NDA_VERSION = 'PT-NDA-2026-01';

/**
 * Checks if the current user (mentor_externo) has accepted the NDA.
 * Returns { needsNda, isLoading } — only relevant for mentor_externo users who are NOT staff.
 */
export function useMentorNdaStatus() {
  const { user, roles, isStaff } = useAuth();
  const isMentorExterno = roles.includes('mentor_externo');
  const shouldCheck = !!user && isMentorExterno && !isStaff;

  const { data: hasAccepted, isLoading } = useQuery({
    queryKey: ['mentor-nda-gate', user?.id],
    queryFn: async () => {
      if (!user) return true;
      const { data, error } = await supabase
        .from('mentor_nda_acceptances')
        .select('id')
        .eq('user_id', user.id)
        .eq('nda_version', CURRENT_NDA_VERSION)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: shouldCheck,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  return {
    needsNda: shouldCheck && hasAccepted === false,
    isLoading: shouldCheck && isLoading,
  };
}
