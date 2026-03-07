/**
 * Structured Logger — Operational diagnostics for V1 launch.
 * 
 * Centralizes logging with structured events, severity levels, and context.
 * Designed to be easily connected to Sentry or similar in V2.
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('claim_failed', { userId, email }, error);
 *   logger.warn('cache_mismatch', { expected: uid1, actual: uid2 });
 *   logger.info('session_reset', { reason: 'logout' });
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  event: string;
  context?: Record<string, unknown>;
  error?: unknown;
  timestamp: string;
}

const LOG_PREFIX = '[SL]';

function formatError(err: unknown): Record<string, unknown> | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return { message: err.message, name: err.name, stack: err.stack?.split('\n').slice(0, 3).join('\n') };
  }
  return { raw: String(err) };
}

function emit(entry: LogEntry) {
  const { level, event, context, error } = entry;
  const tag = `${LOG_PREFIX} ${event}`;

  // Future: send to Sentry/external here
  // if (window.__SENTRY__) Sentry.captureMessage(...)

  const payload = { ...context, ...(error ? { error: formatError(error) } : {}) };

  switch (level) {
    case 'error':
      console.error(tag, payload);
      break;
    case 'warn':
      console.warn(tag, payload);
      break;
    case 'info':
      console.info(tag, payload);
      break;
    case 'debug':
      if (import.meta.env.DEV) console.debug(tag, payload);
      break;
  }
}

export const logger = {
  debug(event: string, context?: Record<string, unknown>) {
    emit({ level: 'debug', event, context, timestamp: new Date().toISOString() });
  },
  info(event: string, context?: Record<string, unknown>) {
    emit({ level: 'info', event, context, timestamp: new Date().toISOString() });
  },
  warn(event: string, context?: Record<string, unknown>) {
    emit({ level: 'warn', event, context, timestamp: new Date().toISOString() });
  },
  error(event: string, context?: Record<string, unknown>, error?: unknown) {
    emit({ level: 'error', event, context, error, timestamp: new Date().toISOString() });
  },
};
