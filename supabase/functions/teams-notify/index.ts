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
  event_type: 'checkin_submitted' | 'action_assigned' | 'action_overdue' | 'session_created' | 'session_rescheduled' | 'health_alert';
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
const EVENT_TOGGLE_MAP: Record<string, string> = {
  checkin_submitted: 'notify_checkin_submitted',
  action_assigned: 'notify_action_assigned',
  action_overdue: 'notify_action_overdue',
  session_created: 'notify_session_created',
  session_rescheduled: 'notify_session_rescheduled',
  health_alert: 'notify_health_alert',
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

    if (!workspace_id && !program_id) {
      return corsJsonResponse({ error: 'Either workspace_id or program_id is required', code: ErrorCode.BAD_REQUEST }, req, 400);
    }

    const toggleColumn = EVENT_TOGGLE_MAP[event_type];
    if (!toggleColumn) {
      return corsJsonResponse({ error: `Invalid event_type: ${event_type}`, code: ErrorCode.BAD_REQUEST }, req, 400);
    }

    log.info('Processing notification', { workspace_id, program_id, event_type });

    // Fetch Teams settings
    let query = supabase
      .from('teams_integration_settings')
      .select('*')
      .eq('enabled', true);

    if (workspace_id) {
      query = query.eq('workspace_id', workspace_id);
    } else if (program_id) {
      query = query.eq('program_id', program_id);
    }

    const { data: settings, error: settingsError } = await query.maybeSingle();

    if (settingsError) {
      log.error('Error fetching Teams settings', settingsError);
      throw settingsError;
    }

    if (!settings) {
      log.info('No Teams integration configured or not enabled');
      return corsJsonResponse({ success: true, sent: false, reason: 'not_configured' }, req);
    }

    // Check if this event type is enabled
    if (!settings[toggleColumn]) {
      log.info('Event type not enabled', { event_type, toggle: toggleColumn });
      return corsJsonResponse({ success: true, sent: false, reason: 'event_disabled' }, req);
    }

    if (!settings.webhook_url) {
      log.warn('Webhook URL not configured');
      return corsJsonResponse({ success: true, sent: false, reason: 'no_webhook_url' }, req);
    }

    // Build Adaptive Card for Teams
    const icon = EVENT_ICONS[event_type] || '📢';
    const color = PRIORITY_COLORS[payload.priority || 'medium'];
    
    const card = {
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
              ...(payload.fields?.length ? [
                {
                  type: 'FactSet',
                  facts: payload.fields.map(f => ({ title: f.name, value: f.value })),
                  spacing: 'Medium',
                },
              ] : []),
            ],
            actions: payload.link ? [
              {
                type: 'Action.OpenUrl',
                title: payload.link_text || 'View Details',
                url: payload.link,
              },
            ] : [],
          },
        },
      ],
    };

    // Send to Teams webhook
    log.info('Sending to Teams webhook');
    const teamsResponse = await fetch(settings.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });

    if (!teamsResponse.ok) {
      const errorText = await teamsResponse.text();
      log.error('Teams webhook failed', null, { status: teamsResponse.status, error: errorText });
      return corsJsonResponse({ 
        success: false, 
        error: `Teams webhook returned ${teamsResponse.status}`,
        code: ErrorCode.INTERNAL_ERROR 
      }, req, 502);
    }

    log.info('Teams notification sent successfully');
    return corsJsonResponse({ success: true, sent: true }, req);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Teams notification error', error);
    return corsJsonResponse({ error: errorMessage, code: ErrorCode.INTERNAL_ERROR }, req, 500);
  }
});
