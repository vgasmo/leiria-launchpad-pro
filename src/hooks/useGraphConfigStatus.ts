import { useQuery } from '@tanstack/react-query';
import { invokeWithAuth } from '@/lib/invokeWithAuth';

/**
 * Hook to check if MS Graph client secret is configured server-side.
 * Returns { enabled: boolean } indicating if Graph API can be used.
 */
export function useGraphConfigStatus() {
  return useQuery({
    queryKey: ['graph-config-status'],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await invokeWithAuth('graph-config-status', {});
      if (error) {
        logger.error('error', {}, '[useGraphConfigStatus] Error:', error);
        return false;
      }
      return data?.enabled ?? false;
    },
    staleTime: 5 * 60_000, // Cache 5 min
    retry: 1,
  });
}
