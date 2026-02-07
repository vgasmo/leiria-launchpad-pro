/**
 * Graph Config Status - Returns whether MS Graph is configured server-side.
 * Checks for MS_GRAPH_CLIENT_SECRET env var presence.
 * Requires authenticated user (any role).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
import { requireUser, createLogger, generateRequestId } from '../_shared/security.ts';

const FUNCTION_NAME = 'graph-config-status';

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  const log = createLogger(FUNCTION_NAME, requestId);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    });

    const authResult = await requireUser(req, supabaseUser);
    if ('error' in authResult) {
      log.warn('Unauthorized access attempt');
      return authResult.error;
    }

    // Check if MS_GRAPH_CLIENT_SECRET is configured
    const secret = Deno.env.get("MS_GRAPH_CLIENT_SECRET");
    const hasSecret = !!secret && secret.length > 0;

    log.info('Config status checked', { hasSecret, userId: authResult.user.id });

    return corsJsonResponse({ enabled: hasSecret }, req);
  } catch (error) {
    log.error('Fatal error', error);
    return corsJsonResponse({ error: 'Internal error' }, req, 500);
  }
});
