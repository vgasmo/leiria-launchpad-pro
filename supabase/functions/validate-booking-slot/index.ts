/**
 * Validate a specific booking slot against consultant calendar free/busy.
 *
 * - If Graph integration is configured, this is a hard gate: busy/tentative => available=false.
 * - If Graph integration is NOT configured, returns checked=false so the UI can allow booking with a warning.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
import { createLogger, generateRequestId, ErrorCode, safeErrorMessage } from '../_shared/security.ts';

const FUNCTION_NAME = 'validate-booking-slot';

interface ValidateRequest {
  workspaceId: string;
  startTime: string; // ISO or local (YYYY-MM-DDTHH:mm[:ss])
  endTime: string; // ISO or local
}

// Get Graph credentials with env var priority
async function getGraphCredentials(
  supabaseAdmin: SupabaseClient,
): Promise<{ tenantId: string; clientId: string; clientSecret: string } | null> {
  const envClientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET');

  // Support both 'graph_api' and 'microsoft_graph' for backward compatibility
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

async function getGraphAccessToken(credentials: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Graph token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

interface GraphGetScheduleResponse {
  value: Array<{
    scheduleId: string;
    availabilityView: string;
  }>;
}

async function getScheduleAvailabilityView(
  accessToken: string,
  userEmail: string,
  startTime: string,
  endTime: string,
): Promise<string | null> {
  const body = {
    schedules: [userEmail],
    startTime: { dateTime: startTime, timeZone: 'Europe/Lisbon' },
    endTime: { dateTime: endTime, timeZone: 'Europe/Lisbon' },
    availabilityViewInterval: 30,
  };

  const url = 'https://graph.microsoft.com/v1.0/me/calendar/getSchedule';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    const json = (await res.json()) as GraphGetScheduleResponse;
    return json?.value?.[0]?.availabilityView ?? null;
  }

  // Fallback to /users/{id}
  const userUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/calendar/getSchedule`;
  const res2 = await fetch(userUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res2.ok) {
    throw new Error(`Failed to get schedule: ${res2.status}`);
  }

  const json2 = (await res2.json()) as GraphGetScheduleResponse;
  return json2?.value?.[0]?.availabilityView ?? null;
}

function normalizeToLocalDateTime(input: string): string {
  // If ISO with timezone (Z or +/-), keep as-is (Graph accepts dateTime + timeZone)
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(input)) return input;
  // Ensure seconds
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) return `${input}:00`;
  return input;
}

Deno.serve(async (req: Request) => {
  const requestId = generateRequestId();
  const log = createLogger(FUNCTION_NAME, requestId);

  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsJsonResponse({ error: 'Unauthorized', code: ErrorCode.UNAUTHORIZED }, req, 401);
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return corsJsonResponse({ error: 'Unauthorized', code: ErrorCode.UNAUTHORIZED }, req, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = (await req.json()) as ValidateRequest;
    const { workspaceId, startTime, endTime } = body;

    if (!workspaceId || !startTime || !endTime) {
      return corsJsonResponse(
        { error: 'workspaceId, startTime, endTime are required', code: ErrorCode.BAD_REQUEST },
        req,
        400,
      );
    }

    const { data: hasAccess } = await supabaseAdmin.rpc('has_workspace_access', {
      _user_id: user.id,
      _workspace_id: workspaceId,
    });

    if (!hasAccess) {
      return corsJsonResponse({ error: 'Access denied', code: ErrorCode.FORBIDDEN }, req, 403);
    }

    // Get workspace consultant email (avoid embedded profile relationship dependencies)
    const { data: consultantMembership, error: membershipErr } = await supabaseAdmin
      .from('workspace_users')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'consultor')
      .eq('active', true)
      .maybeSingle();

    if (membershipErr) {
      log.error('Failed to fetch consultant membership', { membershipErr });
      return corsJsonResponse({ available: true, checked: false, reason: 'consultant_query_error' }, req);
    }

    if (!consultantMembership?.user_id) {
      return corsJsonResponse({ available: true, checked: false, reason: 'no_consultant' }, req);
    }

    const { data: consultantProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', consultantMembership.user_id)
      .maybeSingle();

    const consultantEmail = consultantProfile?.email as string | undefined;
    if (!consultantEmail) {
      return corsJsonResponse({ available: true, checked: false, reason: 'no_consultant_email' }, req);
    }

    const credentials = await getGraphCredentials(supabaseAdmin);
    if (!credentials) {
      return corsJsonResponse(
        { available: true, checked: false, reason: 'no_graph_integration' },
        req,
      );
    }

    const start = normalizeToLocalDateTime(startTime);
    const end = normalizeToLocalDateTime(endTime);

    log.info('Validating slot', { workspaceId, consultantEmail, start, end });

    const accessToken = await getGraphAccessToken(credentials);
    const availabilityView = await getScheduleAvailabilityView(accessToken, consultantEmail, start, end);

    if (!availabilityView) {
      // If Graph didn’t return a view for this window, don’t hard-block.
      return corsJsonResponse(
        { available: true, checked: false, reason: 'no_availability_view' },
        req,
      );
    }

    // Any non-0 means tentative/busy/oof/etc.
    const isFree = availabilityView.split('').every((c) => c === '0');

    return corsJsonResponse(
      {
        available: isFree,
        checked: true,
        conflict: isFree ? undefined : 'calendar_busy',
      },
      req,
    );
  } catch (error) {
    return corsJsonResponse(
      {
        error: safeErrorMessage(error),
        code: ErrorCode.INTERNAL_ERROR,
      },
      req,
      500,
    );
  }
});
