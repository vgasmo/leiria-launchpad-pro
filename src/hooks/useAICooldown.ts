import { useState, useCallback, useRef, useEffect } from 'react';
import { checkRateLimit, getRemainingRequests } from '@/hooks/useRateLimiter';

interface UseAICooldownOptions {
  /** Cooldown in milliseconds after a successful invocation (default: 60000 = 60s) */
  cooldownMs?: number;
  /** Rate limit key for grouping (e.g. 'session-ai', 'financial-review') */
  rateLimitKey: string;
  /** Max requests per window (default: 5) */
  maxRequests?: number;
  /** Rate limit window in ms (default: 300000 = 5 min) */
  windowMs?: number;
}

/**
 * Hook that provides cooldown + rate-limit state for AI buttons.
 * Returns `isCoolingDown`, `remainingSeconds`, and a `trigger` wrapper.
 */
export function useAICooldown({
  cooldownMs = 60000,
  rateLimitKey,
  maxRequests = 5,
  windowMs = 300000,
}: UseAICooldownOptions) {
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Tick down the cooldown
  useEffect(() => {
    if (!cooldownEnd) {
      setRemainingSeconds(0);
      return;
    }

    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (left <= 0) {
        setCooldownEnd(null);
        clearInterval(timerRef.current);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [cooldownEnd]);

  const isCoolingDown = remainingSeconds > 0;
  const remaining = getRemainingRequests(rateLimitKey, maxRequests);

  /**
   * Wraps an async action with rate-limit check + post-success cooldown.
   * Returns false if rate-limited, otherwise calls `fn` and starts cooldown.
   */
  const trigger = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | false> => {
      if (isCoolingDown) return false;

      if (!checkRateLimit(rateLimitKey, maxRequests, windowMs)) {
        return false;
      }

      const result = await fn();
      setCooldownEnd(Date.now() + cooldownMs);
      return result;
    },
    [isCoolingDown, rateLimitKey, maxRequests, windowMs, cooldownMs],
  );

  return {
    isCoolingDown,
    remainingSeconds,
    remainingRequests: remaining,
    trigger,
  };
}
