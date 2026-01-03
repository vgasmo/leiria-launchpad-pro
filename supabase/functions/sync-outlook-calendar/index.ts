/**
 * Outlook Calendar Sync Edge Function
 * Creates/updates Outlook calendar events with Teams meeting links
 * Supports both webhook mode (Power Automate) and direct Graph API
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
import { createLogger, generateRequestId, ErrorCode, requireUser } from '../_shared/security.ts';

const FUNCTION_NAME = 'sync-outlook-calendar';

interface SyncRequest {
  session_id: string;
  action: 'create' | 'update' | 'delete';
}

interface SessionData {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number | null;
  location: string | null;
  notes: string | null;
  outlook_event_id: string | null;
  workspace_id: string;
  workspaces: {
    startups: {
      name: string;
    } | null;
  };
}

Deno.serve(async (req: Request) => {
  const requestId = generateRequestId();
  const log = createLogger(FUNCTION_NAME, requestId);

  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    log.info('Outlook calendar sync request');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Require authenticated user
    const authResult = await requireUser(req, supabaseUser);
    if ('error' in authResult) {
      return authResult.error;
    }
    const user = authResult.user;
    log.info('User authenticated', { userId: user.id });

    const body = await req.json() as SyncRequest;
    const { session_id, action } = body;

    if (!session_id || !action) {
      return corsJsonResponse({ error: 'session_id and action are required', code: ErrorCode.BAD_REQUEST }, req, 400);
    }

    // Fetch session with workspace info
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id, title, scheduled_at, duration_minutes, location, notes, outlook_event_id, workspace_id,
        workspaces!inner(startups(name))
      `)
      .eq('id', session_id)
      .single() as { data: SessionData | null; error: any };

    if (sessionError || !session) {
      log.error('Session not found', sessionError);
      return corsJsonResponse({ error: 'Session not found', code: ErrorCode.NOT_FOUND }, req, 404);
    }

    // Check user has access
    const { data: hasAccess } = await supabaseAdmin.rpc('has_workspace_access', {
      _user_id: user.id,
      _workspace_id: session.workspace_id,
    });

    if (!hasAccess) {
      return corsJsonResponse({ error: 'Access denied', code: ErrorCode.FORBIDDEN }, req, 403);
    }

    // Fetch Outlook settings
    const { data: outlookSettings, error: settingsError } = await supabaseAdmin
      .from('outlook_calendar_settings')
      .select('*')
      .eq('workspace_id', session.workspace_id)
      .eq('enabled', true)
      .maybeSingle();

    if (settingsError) {
      log.error('Error fetching Outlook settings', settingsError);
      throw settingsError;
    }

    if (!outlookSettings) {
      return corsJsonResponse({ 
        success: false, 
        reason: 'not_configured',
        message: 'Outlook calendar sync not enabled for this workspace'
      }, req);
    }

    const startupName = session.workspaces?.startups?.name || 'Session';
    const appUrl = Deno.env.get('APP_URL') || 'https://startupleiria.app';
    const sessionLink = `${appUrl}/workspace/${session.workspace_id}?tab=sessions`;

    if (outlookSettings.sync_mode === 'webhook') {
      // Webhook mode - send to Power Automate
      if (!outlookSettings.webhook_url) {
        return corsJsonResponse({ 
          success: false, 
          reason: 'no_webhook_url',
          message: 'Webhook URL not configured'
        }, req);
      }

      const startDate = new Date(session.scheduled_at);
      const endDate = new Date(startDate.getTime() + (session.duration_minutes || 60) * 60 * 1000);

      const webhookPayload = {
        action,
        event_id: session.outlook_event_id,
        session_id: session.id,
        title: `${session.title} - ${startupName}`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        location: session.location || '',
        description: `${session.notes || ''}\n\nView in Startup Leiria: ${sessionLink}`,
        is_online_meeting: true, // Request Teams meeting link
        attendees: [], // Power Automate can add attendees from session participants
        workspace_id: session.workspace_id,
      };

      log.info('Sending to Power Automate webhook', { action, session_id });
      
      const webhookResponse = await fetch(outlookSettings.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        log.error('Power Automate webhook failed', null, { status: webhookResponse.status, error: errorText });
        
        await supabaseAdmin
          .from('sessions')
          .update({ 
            outlook_sync_status: 'error',
            outlook_sync_error: `Webhook returned ${webhookResponse.status}: ${errorText.slice(0, 200)}`
          })
          .eq('id', session_id);

        return corsJsonResponse({ 
          success: false, 
          error: `Webhook returned ${webhookResponse.status}`
        }, req, 502);
      }

      // Try to parse response for event ID
      let eventId = session.outlook_event_id;
      let teamsMeetingUrl = null;
      try {
        const responseData = await webhookResponse.json();
        if (responseData.event_id) eventId = responseData.event_id;
        if (responseData.teams_url) teamsMeetingUrl = responseData.teams_url;
      } catch {
        // Response may not be JSON
      }

      // Update session with sync status
      await supabaseAdmin
        .from('sessions')
        .update({ 
          outlook_sync_status: action === 'delete' ? 'pending' : 'synced',
          outlook_synced_at: new Date().toISOString(),
          outlook_sync_error: null,
          ...(eventId && { outlook_event_id: eventId }),
          ...(teamsMeetingUrl && { teams_meeting_url: teamsMeetingUrl }),
        })
        .eq('id', session_id);

      log.info('Outlook sync via webhook completed', { action, eventId });
      return corsJsonResponse({ 
        success: true, 
        mode: 'webhook',
        event_id: eventId,
        teams_meeting_url: teamsMeetingUrl,
      }, req);

    } else if (outlookSettings.sync_mode === 'graph') {
      // Direct Graph API mode (requires Azure AD app credentials)
      // This is more complex and requires OAuth token management
      // For now, return a message that Graph mode needs additional setup
      
      return corsJsonResponse({ 
        success: false, 
        reason: 'graph_not_implemented',
        message: 'Direct Microsoft Graph integration requires Azure AD app registration. Please use webhook mode with Power Automate.'
      }, req);
    }

    return corsJsonResponse({ 
      success: false, 
      reason: 'invalid_mode',
      message: `Unknown sync mode: ${outlookSettings.sync_mode}`
    }, req);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error('Outlook sync error', error);
    return corsJsonResponse({ error: errorMessage, code: ErrorCode.INTERNAL_ERROR }, req, 500);
  }
});
