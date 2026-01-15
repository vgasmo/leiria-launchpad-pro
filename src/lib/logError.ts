/**
 * Structured error logging utility for client-side error capture
 * Provides consistent error formatting and future integration with monitoring services
 */

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
}

export interface LoggedError {
  errorId: string;
  message: string;
  name: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  url: string;
  userAgent: string;
}

/**
 * Generate a unique error ID for support reference
 */
function generateErrorId(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Sanitize error message for logging (remove sensitive data)
 */
function sanitizeMessage(message: string): string {
  // Remove potential secrets/tokens from error messages
  return message
    .replace(/Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/gi, 'Bearer [REDACTED]')
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/secret[=:]\s*\S+/gi, 'secret=[REDACTED]')
    .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]')
    .replace(/key[=:]\s*[A-Za-z0-9\-_]{20,}/gi, 'key=[REDACTED]');
}

/**
 * Log an error with structured context
 * This is the main entry point for error logging throughout the app
 */
export function logError(error: Error, context: ErrorContext = {}): LoggedError {
  const errorId = generateErrorId();
  const isDev = import.meta.env.DEV;
  
  const loggedError: LoggedError = {
    errorId,
    message: sanitizeMessage(error.message),
    name: error.name,
    stack: isDev ? error.stack : undefined, // Only include stack in dev
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };

  // Always log to console with structured format
  console.error(`[${errorId}]`, {
    message: loggedError.message,
    name: loggedError.name,
    context: loggedError.context,
    timestamp: loggedError.timestamp,
  });

  // In development, also log the full stack
  if (isDev && error.stack) {
    console.error(`[${errorId}] Stack:`, error.stack);
  }

  // TODO: In production, send to monitoring service
  // Example integrations:
  // - Sentry: Sentry.captureException(error, { extra: loggedError.context });
  // - LogRocket: LogRocket.captureException(error, { extra: loggedError.context });
  // - Custom endpoint: fetch('/api/log-error', { method: 'POST', body: JSON.stringify(loggedError) });

  return loggedError;
}

/**
 * Log a warning (non-fatal) with context
 */
export function logWarning(message: string, context: ErrorContext = {}): void {
  const warningId = `WARN-${Date.now().toString(36).toUpperCase()}`;
  
  console.warn(`[${warningId}]`, {
    message: sanitizeMessage(message),
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Wrap an async function with error logging
 */
export function withErrorLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        logError(error, context);
      }
      throw error;
    }
  }) as T;
}
