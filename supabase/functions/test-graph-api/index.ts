/**
 * Test Graph API Edge Function
 * Creates a test event with Teams link, then deletes it
 * Used by admins to verify Graph API configuration
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
import { createLogger, generateRequestId, ErrorCode, requireUser, safeErrorMessage } from '../_shared/security.ts';

const FUNCTION_NAME = 'test-graph-api';

interface TestRequest {
  test_email: string;
}

interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

Deno.serve(async (req: Request) => {
  const requestId = generateRequestId();
  const log = createLogger(FUNCTION_NAME, requestId);

  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    log.info('Test Graph API request');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Require authenticated admin user
    const authHeader = req.headers.get('Authorization');
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const authResult = await requireUser(req, supabaseUser);
    if ('error' in authResult) {
      return authResult.error;
    }
    const userId = authResult.user.id;

    // Check if user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: userId });
    if (!isAdmin) {
      return corsJsonResponse({ 
        success: false, 
        error: 'Only admins can test Graph API' 
      }, req, 403);
    }

    const body = await req.json() as TestRequest;
    const { test_email } = body;

    if (!test_email || !test_email.includes('@')) {
      return corsJsonResponse({ 
        success: false, 
        error: 'Valid test_email is required' 
      }, req, 400);
    }

    // Get Graph credentials
    const envClientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET');
    
    const { data: globalSettings } = await supabaseAdmin
      .from('global_integration_settings')
      .select('settings_json, is_enabled')
      .eq('integration_type', 'graph_api')
      .eq('is_enabled', true)
      .maybeSingle();
    
    if (!globalSettings?.settings_json) {
      return corsJsonResponse({ 
        success: false, 
        error: 'Graph API not configured' 
      }, req);
    }

    const globalJson = globalSettings.settings_json as {
      tenant_id?: string;
      client_id?: string;
      client_secret?: string;
    };
    
    const tenantId = globalJson.tenant_id;
    const clientId = globalJson.client_id;
    const clientSecret = envClientSecret || globalJson.client_secret;
    
    if (!tenantId || !clientId || !clientSecret) {
      return corsJsonResponse({ 
        success: false, 
        error: 'Incomplete Graph credentials' 
      }, req);
    }

    // Get access token
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      log.error('Token fetch failed', null, { status: tokenResponse.status });
      return corsJsonResponse({ 
        success: false, 
        error: `Authentication failed: ${tokenResponse.status}` 
      }, req);
    }

    const tokenData: GraphTokenResponse = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Create test event
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min duration

    const testEvent = {
      subject: '[TEST] Startup Leiria Graph API Test - DELETE ME',
      body: {
        contentType: 'HTML',
        content: '<p>This is a test event. It will be automatically deleted.</p>',
      },
      start: {
        dateTime: startTime.toISOString().slice(0, -1),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString().slice(0, -1),
        timeZone: 'UTC',
      },
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
    };

    const createUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(test_email)}/events`;
    
    log.info('Creating test event', { test_email });
    
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEvent),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      log.error('Create event failed', null, { status: createResponse.status, error: errorText.slice(0, 200) });
      return corsJsonResponse({ 
        success: false, 
        error: `Failed to create event: ${createResponse.status}. User may not have a mailbox or permissions are missing.` 
      }, req);
    }

    const createdEvent = await createResponse.json();
    const eventId = createdEvent.id;
    const teamsUrl = createdEvent.onlineMeeting?.joinUrl;
    
    log.info('Test event created', { eventId, hasTeamsUrl: !!teamsUrl });

    // Delete the test event
    const deleteUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(test_email)}/events/${encodeURIComponent(eventId)}`;
    
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      log.warn('Failed to delete test event', { status: deleteResponse.status });
    } else {
      log.info('Test event deleted');
    }

    return corsJsonResponse({ 
      success: true,
      message: 'Graph API test passed. Event created with Teams link and deleted.',
      teams_url: teamsUrl,
    }, req);

  } catch (error) {
    const errorMessage = safeErrorMessage(error);
    log.error('Test failed', error);
    return corsJsonResponse({ 
      success: false, 
      error: errorMessage 
    }, req, 500);
  }
});
