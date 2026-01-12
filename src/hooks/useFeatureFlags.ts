import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type FeatureFlagKey =
  | 'public_first_contact_booking'
  | 'funnel_ui'
  | 'strict_calendar_validation'
  | 'founder_gamification'
  | 'traction_stage';

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  scope: 'global' | 'program';
  program_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to check if a feature flag is enabled.
 * Optionally scoped to a program.
 */
export function useFeatureFlag(key: FeatureFlagKey, programId?: string): boolean {
  const { data: flags } = useFeatureFlags();
  
  if (!flags) return false;
  
  // Check program-scoped flag first if programId provided
  if (programId) {
    const programFlag = flags.find(f => f.key === key && f.scope === 'program' && f.program_id === programId);
    if (programFlag) return programFlag.enabled;
  }
  
  // Fall back to global flag
  const globalFlag = flags.find(f => f.key === key && f.scope === 'global');
  return globalFlag?.enabled ?? false;
}

/**
 * Hook to get all feature flags.
 */
export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: async (): Promise<FeatureFlag[]> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('key');
      
      if (error) {
        console.error('[useFeatureFlags] Error fetching flags:', error);
        return [];
      }
      
      return (data ?? []) as FeatureFlag[];
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
}

/**
 * Hook to update a feature flag (admin only).
 */
export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
  });
}

/**
 * Hook to create a program-scoped feature flag override (admin only).
 */
export function useCreateProgramFlag() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      key, 
      programId, 
      enabled, 
      description 
    }: { 
      key: FeatureFlagKey; 
      programId: string; 
      enabled: boolean;
      description?: string;
    }) => {
      const { error } = await supabase
        .from('feature_flags')
        .insert({
          key,
          program_id: programId,
          scope: 'program',
          enabled,
          description: description ?? `Program override for ${key}`,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
  });
}
