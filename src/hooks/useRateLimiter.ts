// Simple client-side rate limiter for edge function calls
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

export function getRemainingRequests(key: string, maxRequests: number = 10): number {
  const entry = rateLimitStore.get(key);
  if (!entry || Date.now() > entry.resetAt) {
    return maxRequests;
  }
  return Math.max(0, maxRequests - entry.count);
}
