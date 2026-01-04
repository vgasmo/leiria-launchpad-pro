/**
 * Teams Notification Edge Function
 * Sends notifications to Microsoft Teams via webhook (Adaptive Cards)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
import { createLogger, generateRequestId, ErrorCode } from '../_shared/security.ts';

const FUNCTION_NAME = 'teams-notify';

interface TeamsNotificationRequest {
  workspace_id?: string;
  program_id?: string;
  event_type:
    | 'checkin_submitted'
    | 'action_assigned'
    | 'action_overdue'
    | 'session_created'
    | 'session_rescheduled'
    | 'health_alert'
    | 'test';
  payload: {
    title: string;
    summary: string;
    fields?: { name: string; value: string }[];
    link?: string;
    link_text?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
}

// Map event types to toggle columns
const EVENT_TOGGLE_MAP: Record<string, string | null> = {
  checkin_submitted: 'notify_checkin_submitted',
  action_assigned: 'notify_action_assigned',
  action_overdue: 'notify_action_overdue',
  session_created: 'notify_session_created',
  session_rescheduled: 'notify_session_rescheduled',
  health_alert: 'notify_health_alert',
  // test bypasses toggles
  test: null,
};

// Priority to color mapping (Teams Adaptive Card accent colors)
const PRIORITY_COLORS: Record<string, string> = {
  low: 'good',
  medium: 'default', 
  high: 'warning',
  critical: 'attention',
};

// Event type icons
const EVENT_ICONS: Record<string, string> = {
  checkin_submitted: '✅',
  action_assigned: '📋',
  action_overdue: '⚠️',
  session_created: '📅',
  session_rescheduled: '🔄',
  health_alert: '🚨',
};

Deno.serve(async (req: Request) => {
  const requestId = generateRequestId();
  const log = createLogger(FUNCTION_NAME, requestId);

  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    log.info('Received Teams notification request');

    // This can be called internally (cron secret) or from frontend (JWT)
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');
    
    const isSystemCall = cronSecret && cronSecret === expectedSecret;
    const isUserCall = authHeader?.startsWith('Bearer ');
    
    if (!isSystemCall && !isUserCall) {
      log.warn('Unauthorized request');
      return corsJsonResponse({ error: 'Unauthorized', code: ErrorCode.UNAUTHORIZED }, req, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json() as TeamsNotificationRequest;
    const { workspace_id, program_id, event_type, payload } = body;

    if (!event_type || !payload?.title) {
      return corsJsonResponse({ error: 'event_type and payload.title are required', code: ErrorCode.BAD_REQUEST }, req, 400);
    }

    // Allow global settings (no workspace_id/program_id) for admin testing
    const isGlobal = !workspace_id && !program_id;
    if (!isGlobal && !workspace_id && !program_id) {
      return corsJsonResponse({ error: 'Either workspace_id or program_id is required', code: ErrorCode.BAD_REQUEST }, req, 400);
    }

    const toggleColumn = EVENT_TOGGLE_MAP[event_type];
    if (toggleColumn === undefined) {
      return corsJsonResponse({ error: `Invalid event_type: ${event_type}`, code: ErrorCode.BAD_REQUEST }, req, 400);
    }

    log.info('Processing notification', { workspace_id, program_id, event_type });

    // Fetch Teams settings
    let query = supabase
      .from('teams_integration_settings')
      .select('*');

    if (workspace_id) {
      query = query.eq('workspace_id', workspace_id);
    } else if (program_id) {
      query = query.eq('program_id', program_id);
    } else {
      // Global settings
      query = query.is('workspace_id', null).is('program_id', null);
    }

    const { data: settings, error: settingsError } = await query.maybeSingle();

    if (settingsError) {
      log.error('Error fetching Teams settings', settingsError);
      throw settingsError;
    }

    if (!settings) {
      log.info('No Teams integration configured');
      return corsJsonResponse({ success: true, sent: false, reason: 'not_configured' }, req);
    }

    // For normal events, require integration enabled
    if (event_type !== 'test' && !settings.enabled) {
      log.info('Teams integration disabled');
      return corsJsonResponse({ success: true, sent: false, reason: 'disabled' }, req);
    }

    // Check if this event type is enabled (test bypasses toggles)
    if (toggleColumn && !settings[toggleColumn]) {
      log.info('Event type not enabled', { event_type, toggle: toggleColumn });
      return corsJsonResponse({ success: true, sent: false, reason: 'event_disabled' }, req);
    }

    if (!settings.webhook_url) {
      log.warn('Webhook URL not configured');
      return corsJsonResponse({ success: true, sent: false, reason: 'no_webhook_url' }, req);
    }

    // Send payload (Adaptive Card for Office 365 Connector; plain JSON for Power Automate)
    const webhookUrl: string = settings.webhook_url;
    const isPowerAutomate = webhookUrl.includes('powerplatform.com') || webhookUrl.includes('flow.microsoft.com');

    const icon = EVENT_ICONS[event_type] || '📢';

    let bodyToSend: unknown;
    if (isPowerAutomate) {
      // Power Automate flows typically start with "When an HTTP request is received" and parse JSON
      // Keep it simple and predictable.
      bodyToSend = {
        title: payload.title,
        workspaceName: payload.fields?.find((f) => f.name.toLowerCase() === 'startup')?.value,
        owner: payload.fields?.find((f) => f.name.toLowerCase() === 'owner')?.value,
        severity: payload.priority || 'medium',
        message: payload.summary,
        link: payload.link,
        linkText: payload.link_text,
        eventType: event_type,
        sentAt: new Date().toISOString(),
      };
    } else {
      // Adaptive Card format for Teams incoming webhooks
      const color = PRIORITY_COLORS[payload.priority || 'medium'];
      bodyToSend = {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            contentUrl: null,
            content: {
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              type: 'AdaptiveCard',
              version: '1.4',
              body: [
                {
                  type: 'TextBlock',
                  size: 'Medium',
                  weight: 'Bolder',
                  text: `${icon} ${payload.title}`,
                  wrap: true,
                  style: color === 'attention' ? 'attention' : undefined,
                },
                {
                  type: 'TextBlock',
                  text: payload.summary,
                  wrap: true,
                  spacing: 'Small',
                },
                ...(payload.fields?.length
                  ? [
                      {
                        type: 'FactSet',
                        facts: payload.fields.map((f) => ({ title: f.name, value: f.value })),
                        spacing: 'Medium',
                      },
                    ]
                  : []),
              ],
              actions: payload.link
                ? [
                    {
                      type: 'Action.OpenUrl',
                      title: payload.link_text || 'View Details',
                      url: payload.link,
                    },
                  ]
                : [],
            },
          },
        ],
      };
    }

    log.info('Sending to Teams webhook', { isPowerAutomate });
    const teamsResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyToSend),
    });

    if (!teamsResponse.ok) {
      const errorText = await teamsResponse.text();
      log.error('Teams webhook failed', null, { status: teamsResponse.status, error: errorText });
      return corsJsonResponse(
        {
          success: false,
          error: `Teams webhook returned ${teamsResponse.status}`,
          details: errorText.slice(0, 500),
          code: ErrorCode.INTERNAL_ERROR,
        },
        req,
        502,
      );
    }

    log.info('Teams notification sent successfully');
    return corsJsonResponse({ success: true, sent: true, isPowerAutomate }, req);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Teams notification error', error);
    return corsJsonResponse({ error: errorMessage, code: ErrorCode.INTERNAL_ERROR }, req, 500);
  }
});
