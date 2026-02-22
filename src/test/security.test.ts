import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mock supabaseClient ────────────────────────────────────────────────────
const mockGetSession = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    functions: { invoke: mockInvoke },
  },
}));

vi.mock('@/lib/logError', () => ({
  logError: vi.fn(),
}));

// ─── Mock useRateLimiter ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCheckRateLimit = vi.fn<any>(() => true);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetRemainingRequests = vi.fn<any>(() => 5);

vi.mock('@/hooks/useRateLimiter', () => ({
  checkRateLimit: (...args: any[]) => mockCheckRateLimit(...args),
  getRemainingRequests: (...args: any[]) => mockGetRemainingRequests(...args),
}));

// ═══════════════════════════════════════════════════════════════════════════
// TASK 1A: invokeWithAuth
// ═══════════════════════════════════════════════════════════════════════════
describe('invokeWithAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appends Bearer token from session to invoke headers', async () => {
    const fakeToken = 'jwt-token-abc123';
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: fakeToken } },
      error: null,
    });
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });

    const { invokeWithAuth } = await import('@/lib/invokeWithAuth');
    const result = await invokeWithAuth('my-function', { body: { foo: 'bar' } });

    expect(mockInvoke).toHaveBeenCalledOnce();
    const [fnName, opts] = mockInvoke.mock.calls[0];
    expect(fnName).toBe('my-function');
    expect(opts.headers.Authorization).toBe(`Bearer ${fakeToken}`);
    expect(opts.body).toEqual({ foo: 'bar' });
    expect(result.data).toEqual({ ok: true });
    expect(result.error).toBeNull();
  });

  it('merges custom headers with Authorization', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    });
    mockInvoke.mockResolvedValue({ data: null, error: null });

    const { invokeWithAuth } = await import('@/lib/invokeWithAuth');
    await invokeWithAuth('fn', {
      headers: { 'X-Custom': 'value' },
    });

    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer tok');
    expect(opts.headers['X-Custom']).toBe('value');
  });

  it('returns error when session is missing (no access_token)', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { invokeWithAuth } = await import('@/lib/invokeWithAuth');
    const result = await invokeWithAuth('fn');

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toMatch(/sign in/i);
  });

  it('returns error when getSession fails', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'JWT expired', code: 'session_expired' },
    });

    const { invokeWithAuth } = await import('@/lib/invokeWithAuth');
    const result = await invokeWithAuth('fn');

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it('returns error when invoke itself fails', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    });
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Function crashed', code: 'INTERNAL_ERROR' },
    });

    const { invokeWithAuth } = await import('@/lib/invokeWithAuth');
    const result = await invokeWithAuth('fn');

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TASK 1B: useAICooldown
// ═══════════════════════════════════════════════════════════════════════════
describe('useAICooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetRemainingRequests.mockReturnValue(5);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no cooldown', async () => {
    const { useAICooldown } = await import('@/hooks/useAICooldown');
    const { result } = renderHook(() =>
      useAICooldown({ rateLimitKey: 'test', cooldownMs: 5000 }),
    );

    expect(result.current.isCoolingDown).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('activates cooldown after trigger and counts down', async () => {
    const { useAICooldown } = await import('@/hooks/useAICooldown');
    const { result } = renderHook(() =>
      useAICooldown({ rateLimitKey: 'test-cd', cooldownMs: 3000 }),
    );

    // Trigger the cooldown
    let triggerResult: unknown;
    await act(async () => {
      triggerResult = await result.current.trigger(async () => 'done');
    });
    expect(triggerResult).toBe('done');

    // Should be cooling down now
    expect(result.current.isCoolingDown).toBe(true);
    expect(result.current.remainingSeconds).toBeGreaterThan(0);

    // Advance 1 second – should still be cooling down
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.isCoolingDown).toBe(true);

    // Advance past the full cooldown
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.isCoolingDown).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('rejects trigger calls while cooling down', async () => {
    const { useAICooldown } = await import('@/hooks/useAICooldown');
    const { result } = renderHook(() =>
      useAICooldown({ rateLimitKey: 'test-reject', cooldownMs: 5000 }),
    );

    // First call succeeds
    await act(async () => {
      await result.current.trigger(async () => 'ok');
    });

    // Second call while cooling down returns false
    let secondResult: unknown;
    await act(async () => {
      secondResult = await result.current.trigger(async () => 'should-not-run');
    });
    expect(secondResult).toBe(false);
  });

  it('returns false when rate limit is exhausted', async () => {
    mockCheckRateLimit.mockReturnValue(false);

    const { useAICooldown } = await import('@/hooks/useAICooldown');
    const { result } = renderHook(() =>
      useAICooldown({ rateLimitKey: 'test-rl', cooldownMs: 1000 }),
    );

    let triggerResult: unknown;
    await act(async () => {
      triggerResult = await result.current.trigger(async () => 'nope');
    });
    expect(triggerResult).toBe(false);
  });
});
