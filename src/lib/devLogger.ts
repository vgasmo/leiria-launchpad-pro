/**
 * Development-only logger utility
 * Guards console.log calls to only run in development mode
 * 
 * Usage:
 *   import { devLog, devWarn, devError } from '@/lib/devLogger';
 *   devLog('Debug message', { data });
 */

const isDev = import.meta.env.DEV;

/**
 * Log only in development mode
 */
export function devLog(message: string, ...args: unknown[]): void {
  if (isDev) {
    console.log(`[DEV] ${message}`, ...args);
  }
}

/**
 * Warn only in development mode
 */
export function devWarn(message: string, ...args: unknown[]): void {
  if (isDev) {
    console.warn(`[DEV] ${message}`, ...args);
  }
}

/**
 * Error logging - always active but with structured output
 * Use this for errors that should be tracked in production too
 */
export function devError(message: string, error?: unknown, ...args: unknown[]): void {
  const errorDetails = error instanceof Error 
    ? { name: error.name, message: error.message }
    : error;
  
  console.error(`[ERROR] ${message}`, errorDetails, ...args);
}

/**
 * Conditional logger for specific features
 */
export function createFeatureLogger(feature: string, enabled = isDev) {
  return {
    log: (msg: string, ...args: unknown[]) => {
      if (enabled) console.log(`[${feature}] ${msg}`, ...args);
    },
    warn: (msg: string, ...args: unknown[]) => {
      if (enabled) console.warn(`[${feature}] ${msg}`, ...args);
    },
    error: (msg: string, error?: unknown) => {
      console.error(`[${feature}] ${msg}`, error);
    },
  };
}
