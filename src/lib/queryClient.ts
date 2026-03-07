/**
 * Shared QueryClient instance and cache persistence logic.
 * 
 * Separated from App.tsx to avoid circular imports with AuthContext.
 */

import { QueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

// --- QueryClient: shared across the app ---
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
      gcTime: 1000 * 60 * 60 * 4, // 4 hours
      networkMode: 'offlineFirst',
    },
  },
});

// --- Persisted cache: ALLOWLIST strategy ---
// Only these query key prefixes are persisted to localStorage.
// Everything else is ephemeral (in-memory only).
const PERSIST_ALLOWLIST: string[] = [
  'programs',         // small, rarely changes
  'feature-flags',    // small, rarely changes
  'tags',             // small lookup
];

const CACHE_KEY = 'sl-query-cache';
const CACHE_MAX_AGE = 1000 * 60 * 60 * 4; // 4 hours
const CACHE_USER_KEY = 'sl-cache-uid';

/**
 * Deferred cache hydration — called ONLY after auth confirms user identity.
 * Never hydrates on boot before auth is known.
 */
export function hydrateCache(userId: string) {
  try {
    // Ownership check: only hydrate if cache belongs to this user
    const cachedUid = localStorage.getItem(CACHE_USER_KEY);
    if (cachedUid && cachedUid !== userId) {
      logger.warn('cache_hydration_blocked', { reason: 'owner_mismatch' });
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_USER_KEY);
      return;
    }

    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;

    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_MAX_AGE || !data) {
      localStorage.removeItem(CACHE_KEY);
      return;
    }

    let hydrated = 0;
    for (const entry of data) {
      if (entry.queryKey && entry.state?.data !== undefined) {
        queryClient.setQueryData(entry.queryKey, entry.state.data);
        hydrated++;
      }
    }

    localStorage.setItem(CACHE_USER_KEY, userId);
    logger.debug('cache_hydrated', { entries: hydrated });
  } catch {
    localStorage.removeItem(CACHE_KEY);
  }
}

// Persist allowlisted cache periodically
let persistTimer: ReturnType<typeof setTimeout>;
const persistCache = () => {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const userId = localStorage.getItem(CACHE_USER_KEY);
      if (!userId) return; // Don't persist if no authenticated user

      const cache = queryClient.getQueryCache().getAll();
      const data = cache
        .filter(q => {
          const key = q.queryKey[0];
          if (typeof key !== 'string') return false;
          // ALLOWLIST: only persist explicitly safe queries
          if (!PERSIST_ALLOWLIST.includes(key)) return false;
          return q.state.status === 'success' && q.state.data !== undefined;
        })
        .map(q => ({ queryKey: q.queryKey, state: { data: q.state.data } }));

      if (data.length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
      }
    } catch {
      // Storage full or error — silently ignore
    }
  }, 3000);
};

queryClient.getQueryCache().subscribe(persistCache);
