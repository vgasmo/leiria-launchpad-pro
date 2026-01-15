/**
 * Shared Microsoft Graph API authentication utilities
 * Provides token acquisition with exponential backoff and retry logic
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface GraphCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export interface GraphTokenResult {
  accessToken: string;
  expiresAt: Date;
}

// Token cache to avoid repeated calls within same request
let tokenCache: { token: string; expiresAt: Date } | null = null;

/**
 * Get Graph credentials from environment or database
 * Prioritizes MS_GRAPH_CLIENT_SECRET env var over database
 */
export async function getGraphCredentials(
  supabaseAdmin: SupabaseClient
): Promise<GraphCredentials | null> {
  const envClientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET');
  
  // Support both 'graph_api' and 'microsoft_graph' integration types for backward compatibility
  const { data: globalSettings } = await supabaseAdmin
    .from('global_integration_settings')
    .select('settings_json, is_enabled')
    .in('integration_type', ['graph_api', 'microsoft_graph'])
    .eq('is_enabled', true)
    .limit(1)
    .maybeSingle();
  
  if (!globalSettings?.settings_json) return null;

  const globalJson = globalSettings.settings_json as {
    tenant_id?: string;
    client_id?: string;
    client_secret?: string;
  };
  
  const tenantId = globalJson.tenant_id;
  const clientId = globalJson.client_id;
  const clientSecret = envClientSecret || globalJson.client_secret;
  
  if (!tenantId || !clientId || !clientSecret) return null;
  
  return { tenantId, clientId, clientSecret };
}

/**
 * Sleep helper for backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get Microsoft Graph access token with exponential backoff on failure
 * Handles 429 rate limiting and transient 5xx errors
 * 
 * @param credentials - Graph API credentials
 * @param options - Retry options
 * @returns Access token string
 * @throws Error if all retries exhausted
 */
export async function getGraphAccessToken(
  credentials: GraphCredentials,
  options: { maxRetries?: number; baseDelayMs?: number } = {}
): Promise<string> {
  const { maxRetries = 3, baseDelayMs = 1000 } = options;
  
  // Check cache first (tokens are valid for ~1 hour, but we check 5 min buffer)
  if (tokenCache && tokenCache.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return tokenCache.token;
  }
  
  const tokenUrl = `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      // Handle rate limiting (429) with Retry-After header
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        const delayMs = Math.min(retryAfter * 1000, 120000); // Cap at 2 minutes
        
        console.warn(`[GraphAuth] Rate limited, waiting ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        if (attempt < maxRetries) {
          await sleep(delayMs);
          continue;
        }
        throw new Error(`Graph API rate limited after ${maxRetries + 1} attempts`);
      }

      // Handle server errors (5xx) with backoff
      if (response.status >= 500) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        
        console.warn(`[GraphAuth] Server error ${response.status}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        if (attempt < maxRetries) {
          await sleep(delayMs);
          continue;
        }
        throw new Error(`Graph API server error ${response.status} after ${maxRetries + 1} attempts`);
      }

      // Handle other errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Graph token error: ${response.status} - ${errorText.slice(0, 100)}`);
      }

      const data = await response.json();
      const expiresIn = data.expires_in || 3600; // Default 1 hour
      
      // Cache the token
      tokenCache = {
        token: data.access_token,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
      
      return data.access_token;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Network errors - retry with backoff
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        
        console.warn(`[GraphAuth] Network error, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        if (attempt < maxRetries) {
          await sleep(delayMs);
          continue;
        }
      }
      
      // Re-throw non-retriable errors immediately
      throw error;
    }
  }
  
  throw lastError || new Error('Failed to get Graph token after retries');
}

/**
 * Clear the token cache (useful for testing or forced refresh)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}

/**
 * Make a Graph API call with automatic retry on transient failures
 * 
 * @param accessToken - Valid Graph API access token
 * @param url - Full Graph API URL
 * @param options - Fetch options
 * @returns Response from Graph API
 */
export async function callGraphWithRetry(
  accessToken: string,
  url: string,
  options: RequestInit = {},
  retryOptions: { maxRetries?: number; baseDelayMs?: number } = {}
): Promise<Response> {
  const { maxRetries = 2, baseDelayMs = 500 } = retryOptions;
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers });
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '30', 10);
        const delayMs = Math.min(retryAfter * 1000, 60000);
        
        if (attempt < maxRetries) {
          console.warn(`[Graph] Rate limited, waiting ${delayMs}ms`);
          await sleep(delayMs);
          continue;
        }
      }
      
      // Handle server errors
      if (response.status >= 500 && attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.warn(`[Graph] Server error ${response.status}, retrying in ${delayMs}ms`);
        await sleep(delayMs);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries && error instanceof TypeError) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.warn(`[Graph] Network error, retrying in ${delayMs}ms`);
        await sleep(delayMs);
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error('Graph API call failed after retries');
}
