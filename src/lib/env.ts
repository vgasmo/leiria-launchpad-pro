/**
 * Environment Variable Validation
 * 
 * Validates required environment variables at startup with friendly error messages.
 * Uses Zod for type-safe validation without changing existing variable names.
 */

import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .url('VITE_SUPABASE_URL must be a valid URL')
    .min(1, 'VITE_SUPABASE_URL is required'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'VITE_SUPABASE_PUBLISHABLE_KEY is required'),
  VITE_SUPABASE_PROJECT_ID: z
    .string()
    .min(1, 'VITE_SUPABASE_PROJECT_ID is required'),
  // Optional variables
  VITE_APP_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns typed env object.
 * Throws descriptive error in development, shows friendly screen in production.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
    VITE_APP_URL: import.meta.env.VITE_APP_URL,
  });

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    const message = `❌ Environment validation failed:\n${errors}\n\nCheck your .env file or deployment configuration.`;

    // In development, throw to fail fast
    if (import.meta.env.DEV) {
      throw new Error(message);
    }

    // In production, log minimal info and show generic user-friendly screen
    // Note: Avoid exposing internal state or configuration details
    console.error('[App] Service initialization failed');
    
    // Show a generic error screen - no internal details exposed
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      const root = document.getElementById('root');
      if (root) {
        // Use textContent to avoid any XSS risk from innerHTML
        root.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;padding:20px;text-align:center;';
        
        const heading = document.createElement('h1');
        heading.textContent = 'Service Temporarily Unavailable';
        heading.style.cssText = 'color:#6b7280;margin-bottom:16px;';
        
        const message = document.createElement('p');
        message.textContent = 'We are experiencing technical difficulties. Please try again later or contact support if the problem persists.';
        message.style.cssText = 'color:#9ca3af;max-width:400px;';
        
        root.appendChild(heading);
        root.appendChild(message);
      }
    }
    
    // Return partial env to allow non-critical pages to work
    return {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
      VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
      VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID || '',
    };
  }

  return result.data;
}

// Singleton - validate once on module load
let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}

// Export individual env vars for convenience (typed)
export const env = {
  get supabaseUrl() {
    return getEnv().VITE_SUPABASE_URL;
  },
  get supabaseKey() {
    return getEnv().VITE_SUPABASE_PUBLISHABLE_KEY;
  },
  get projectId() {
    return getEnv().VITE_SUPABASE_PROJECT_ID;
  },
  get appUrl() {
    return getEnv().VITE_APP_URL;
  },
  get isDev() {
    return import.meta.env.DEV;
  },
  get isProd() {
    return import.meta.env.PROD;
  },
};
