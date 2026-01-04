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
  duration: number | null;
  location: string | null;
  notes: string | null;
  outlook_event_id: string | null;
  outlook_sync_status: string | null;
  workspace_id: string;
  workspaces: {
    startups: {
      name: string;
    } | null;
  };
}

interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface GraphCalendarEvent {
  id?: string;
  subject: string;
  body: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  isOnlineMeeting: boolean;
  onlineMeetingProvider?: string;
  onlineMeeting?: {
    joinUrl: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type: string;
  }>;
}

// Get Microsoft Graph access token using client credentials flow
async function getGraphAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  log: ReturnType<typeof createLogger>
): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  log.info('Requesting Graph API access token', { tenantId, clientId: clientId.slice(0, 8) + '...' });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Failed to get Graph token', null, { status: response.status, error: errorText });
    throw new Error(`Failed to authenticate with Microsoft: ${response.status}`);
  }

  const tokenData: GraphTokenResponse = await response.json();
  return tokenData.access_token;
}

// Create calendar event via Graph API
async function createCalendarEvent(
  accessToken: string,
  userId: string,
  event: GraphCalendarEvent,
  log: ReturnType<typeof createLogger>
): Promise<GraphCalendarEvent> {
  // For application permissions, we need to specify the user
  const url = `https://graph.microsoft.com/v1.0/users/${userId}/events`;
  
  log.info('Creating calendar event via Graph', { userId, subject: event.subject });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Failed to create calendar event', null, { status: response.status, error: errorText });
    throw new Error(`Failed to create calendar event: ${response.status}`);
  }

  return await response.json();
}

// Update calendar event via Graph API
async function updateCalendarEvent(
  accessToken: string,
  userId: string,
  eventId: string,
  event: Partial<GraphCalendarEvent>,
  log: ReturnType<typeof createLogger>
): Promise<GraphCalendarEvent> {
  const url = `https://graph.microsoft.com/v1.0/users/${userId}/events/${eventId}`;
  
  log.info('Updating calendar event via Graph', { userId, eventId });

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Failed to update calendar event', null, { status: response.status, error: errorText });
    throw new Error(`Failed to update calendar event: ${response.status}`);
  }

  return await response.json();
}

// Delete calendar event via Graph API
async function deleteCalendarEvent(
  accessToken: string,
  userId: string,
  eventId: string,
  log: ReturnType<typeof createLogger>
): Promise<void> {
  const url = `https://graph.microsoft.com/v1.0/users/${userId}/events/${eventId}`;
  
  log.info('Deleting calendar event via Graph', { userId, eventId });

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    log.error('Failed to delete calendar event', null, { status: response.status, error: errorText });
    throw new Error(`Failed to delete calendar event: ${response.status}`);
  }
}

// Create online meeting via Graph API (for Teams)
async function createOnlineMeeting(
  accessToken: string,
  organizerId: string,
  session: SessionData,
  log: ReturnType<typeof createLogger>
): Promise<{ joinUrl: string; meetingId: string }> {
  const url = `https://graph.microsoft.com/v1.0/users/${organizerId}/onlineMeetings`;
  
  const startDate = new Date(session.scheduled_at);
  const endDate = new Date(startDate.getTime() + (session.duration || 60) * 60 * 1000);

  const meetingPayload = {
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString(),
    subject: session.title,
  };

  log.info('Creating Teams online meeting via Graph', { organizerId, subject: session.title });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meetingPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Failed to create online meeting', null, { status: response.status, error: errorText });
    throw new Error(`Failed to create Teams meeting: ${response.status}`);
  }

  const meeting = await response.json();
  return {
    joinUrl: meeting.joinWebUrl,
    meetingId: meeting.id,
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
        id, title, scheduled_at, duration, location, notes, outlook_event_id, outlook_sync_status, workspace_id,
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

    // ========== WEBHOOK MODE ==========
    if (outlookSettings.sync_mode === 'webhook') {
      if (!outlookSettings.webhook_url) {
        return corsJsonResponse({ 
          success: false, 
          reason: 'no_webhook_url',
          message: 'Webhook URL not configured'
        }, req);
      }

      const startDate = new Date(session.scheduled_at);
      const endDate = new Date(startDate.getTime() + (session.duration || 60) * 60 * 1000);

      const webhookPayload = {
        action,
        event_id: session.outlook_event_id,
        session_id: session.id,
        title: `${session.title} - ${startupName}`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        location: session.location || '',
        description: `${session.notes || ''}\n\nView in Startup Leiria: ${sessionLink}`,
        is_online_meeting: true,
        attendees: [],
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

      let eventId = session.outlook_event_id;
      let teamsMeetingUrl = null;
      try {
        const responseData = await webhookResponse.json();
        if (responseData.event_id) eventId = responseData.event_id;
        if (responseData.teams_url) teamsMeetingUrl = responseData.teams_url;
      } catch {
        // Response may not be JSON
      }

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

    // ========== GRAPH API MODE ==========
    } else if (outlookSettings.sync_mode === 'graph') {
      // Try workspace credentials first, then fall back to global
      let tenantId = outlookSettings.graph_tenant_id;
      let clientId = outlookSettings.graph_client_id;
      let clientSecret = outlookSettings.graph_secret_key;
      let calendarEmail = outlookSettings.calendar_user_email;
      
      // If workspace doesn't have its own credentials, try global settings
      if (!tenantId || !clientId || !clientSecret) {
        log.info('Workspace has no Graph credentials, checking global settings');
        
        const { data: globalSettings } = await supabaseAdmin
          .from('global_integration_settings')
          .select('settings_json, is_enabled')
          .eq('integration_type', 'graph_api')
          .eq('is_enabled', true)
          .maybeSingle();
        
        if (globalSettings?.settings_json) {
          const globalJson = globalSettings.settings_json as {
            tenant_id?: string;
            client_id?: string;
            client_secret?: string;
          };
          tenantId = globalJson.tenant_id || null;
          clientId = globalJson.client_id || null;
          clientSecret = globalJson.client_secret || null;
          log.info('Using global Graph API credentials');
        }
      }
      
      if (!tenantId || !clientId || !clientSecret) {
        return corsJsonResponse({ 
          success: false, 
          reason: 'graph_not_configured',
          message: 'Microsoft Graph API credentials not configured (neither workspace nor global)'
        }, req);
      }

      // Use workspace's calendar_user_email, or fall back to user's email
      if (!calendarEmail) {
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single();
        calendarEmail = userProfile?.email || null;
      }

      if (!calendarEmail) {
        return corsJsonResponse({ 
          success: false, 
          reason: 'no_calendar_email',
          message: 'No calendar email configured for this workspace'
        }, req);
      }

      log.info('Using calendar email', { calendarEmail });

      try {
        // Get Graph API access token
        const accessToken = await getGraphAccessToken(
          tenantId,
          clientId,
          clientSecret,
          log
        );

        const startDate = new Date(session.scheduled_at);
        const endDate = new Date(startDate.getTime() + (session.duration || 60) * 60 * 1000);

        // Build event object
        const eventData: GraphCalendarEvent = {
          subject: `${session.title} - ${startupName}`,
          body: {
            contentType: 'HTML',
            content: `<p>${session.notes || ''}</p><p><a href="${sessionLink}">View in Startup Leiria</a></p>`,
          },
          start: {
            dateTime: startDate.toISOString().slice(0, -1), // Remove Z for Graph API
            timeZone: 'UTC',
          },
          end: {
            dateTime: endDate.toISOString().slice(0, -1),
            timeZone: 'UTC',
          },
          isOnlineMeeting: true,
          onlineMeetingProvider: 'teamsForBusiness',
        };

        if (session.location) {
          eventData.location = { displayName: session.location };
        }

        let eventId = session.outlook_event_id;
        let teamsMeetingUrl: string | null = null;
        let createdEvent: GraphCalendarEvent | null = null;

        if (action === 'create') {
          createdEvent = await createCalendarEvent(accessToken, calendarEmail, eventData, log);
          eventId = createdEvent.id || null;
          teamsMeetingUrl = createdEvent.onlineMeeting?.joinUrl || null;
          
        } else if (action === 'update' && eventId) {
          createdEvent = await updateCalendarEvent(accessToken, calendarEmail, eventId, eventData, log);
          teamsMeetingUrl = createdEvent.onlineMeeting?.joinUrl || null;
          
        } else if (action === 'delete' && eventId) {
          await deleteCalendarEvent(accessToken, calendarEmail, eventId, log);
          eventId = null;
        }

        // Update session with sync status
        await supabaseAdmin
          .from('sessions')
          .update({ 
            outlook_sync_status: action === 'delete' ? 'pending' : 'synced',
            outlook_synced_at: new Date().toISOString(),
            outlook_sync_error: null,
            outlook_event_id: eventId,
            ...(teamsMeetingUrl && { teams_meeting_url: teamsMeetingUrl }),
          })
          .eq('id', session_id);

        log.info('Outlook sync via Graph API completed', { action, eventId, teamsMeetingUrl });
        
        return corsJsonResponse({ 
          success: true, 
          mode: 'graph',
          event_id: eventId,
          teams_meeting_url: teamsMeetingUrl,
        }, req);

      } catch (graphError: unknown) {
        const errorMessage = graphError instanceof Error ? graphError.message : 'Unknown Graph API error';
        log.error('Graph API sync failed', graphError);
        
        // Log integration error
        await supabaseAdmin
          .from('integration_errors')
          .insert({
            source: 'outlook_graph',
            error_message: errorMessage,
            workspace_id: session.workspace_id,
          });

        await supabaseAdmin
          .from('sessions')
          .update({ 
            outlook_sync_status: 'error',
            outlook_sync_error: errorMessage.slice(0, 200),
          })
          .eq('id', session_id);

        return corsJsonResponse({ 
          success: false, 
          error: errorMessage
        }, req, 502);
      }
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
