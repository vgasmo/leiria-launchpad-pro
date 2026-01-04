/**
 * Import Teams Transcript Edge Function
 * Fetches meeting transcripts from Microsoft Teams via Graph API
 * and saves them to the session's raw_transcript field
 * 
 * Production-ready: proper organizer resolution, OData filter encoding, security
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
import { createLogger, generateRequestId, ErrorCode, requireUser, safeErrorMessage } from '../_shared/security.ts';

const FUNCTION_NAME = 'import-teams-transcript';

interface ImportRequest {
  session_id: string;
}

interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface GraphCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

// Get Graph credentials with env var priority for secrets
async function getGraphCredentials(
  supabaseAdmin: SupabaseClient,
  log: ReturnType<typeof createLogger>
): Promise<GraphCredentials | null> {
  // Check for env var secret first (production secure approach)
  const envClientSecret = Deno.env.get('MS_GRAPH_CLIENT_SECRET');
  
  const { data: globalSettings } = await supabaseAdmin
    .from('global_integration_settings')
    .select('settings_json, is_enabled')
    .eq('integration_type', 'graph_api')
    .eq('is_enabled', true)
    .maybeSingle();
  
  if (!globalSettings?.settings_json) {
    log.warn('No global Graph API settings found');
    return null;
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
    return null;
  }
  
  log.info('Using Graph credentials', { secretSource: envClientSecret ? 'env' : 'db' });
  return { tenantId, clientId, clientSecret };
}

// Get Microsoft Graph access token using client credentials flow
async function getGraphAccessToken(
  credentials: GraphCredentials,
  log: ReturnType<typeof createLogger>
): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  log.info('Requesting Graph API access token');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    log.error('Failed to get Graph token', null, { status: response.status });
    throw new Error(`Failed to authenticate with Microsoft: ${response.status}`);
  }

  const tokenData: GraphTokenResponse = await response.json();
  return tokenData.access_token;
}

// Parse VTT content to clean text
function parseVttToText(vttContent: string): string {
  const lines = vttContent.split('\n');
  const textLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip WEBVTT header
    if (trimmed === 'WEBVTT' || trimmed.startsWith('WEBVTT ')) continue;
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Skip timestamp lines (00:00:00.000 --> 00:00:05.000)
    if (/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/.test(trimmed)) continue;
    
    // Skip sequence numbers (just digits)
    if (/^\d+$/.test(trimmed)) continue;
    
    // Skip NOTE lines
    if (trimmed.startsWith('NOTE')) continue;
    
    // Skip STYLE blocks
    if (trimmed === 'STYLE' || trimmed.startsWith('::cue')) continue;
    
    // This is actual text content - clean up any inline formatting
    let cleanLine = trimmed
      .replace(/<[^>]+>/g, '') // Remove HTML-like tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    
    if (cleanLine) {
      textLines.push(cleanLine);
    }
  }
  
  // Join lines, collapsing consecutive lines from same speaker
  return textLines.join('\n');
}

// Resolve organizer email with proper priority (consistent with sync-outlook-calendar)
async function resolveOrganizerEmail(
  supabaseAdmin: SupabaseClient,
  session: { workspace_id: string; created_by: string | null; outlook_owner_email: string | null },
  log: ReturnType<typeof createLogger>
): Promise<string | null> {
  // Priority 1: Use stored outlook_owner_email (the actual event owner)
  if (session.outlook_owner_email) {
    log.info('Using stored outlook_owner_email', { email: session.outlook_owner_email });
    return session.outlook_owner_email;
  }
  
  // Priority 2: Assigned consultant
  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('assigned_consultor_id')
    .eq('id', session.workspace_id)
    .single();
  
  if (workspace?.assigned_consultor_id) {
    const { data: consultorProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', workspace.assigned_consultor_id)
      .single();
    
    if (consultorProfile?.email) {
      log.info('Using assigned consultant email', { email: consultorProfile.email });
      return consultorProfile.email;
    }
  }
  
  // Priority 3: Session creator
  if (session.created_by) {
    const { data: creatorProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', session.created_by)
      .single();
    
    if (creatorProfile?.email) {
      log.info('Fallback to session creator email', { email: creatorProfile.email });
      return creatorProfile.email;
    }
  }
  
  // Priority 4: Workspace calendar email
  const { data: outlookSettings } = await supabaseAdmin
    .from('outlook_calendar_settings')
    .select('calendar_user_email')
    .eq('workspace_id', session.workspace_id)
    .eq('enabled', true)
    .maybeSingle();
  
  if (outlookSettings?.calendar_user_email) {
    log.info('Fallback to workspace calendar email', { email: outlookSettings.calendar_user_email });
    return outlookSettings.calendar_user_email;
  }
  
  log.warn('Could not resolve organizer email');
  return null;
}

Deno.serve(async (req: Request) => {
  const requestId = generateRequestId();
  const log = createLogger(FUNCTION_NAME, requestId);

  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    log.info('Teams transcript import request');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client with auth header
    const authHeader = req.headers.get('Authorization');
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    // Require authenticated user
    const authResult = await requireUser(req, supabaseUser);
    if ('error' in authResult) {
      return authResult.error;
    }
    const userId = authResult.user.id;
    
    log.info('User authenticated', { userId });

    const body = await req.json() as ImportRequest;
    const { session_id } = body;

    if (!session_id) {
      return corsJsonResponse({ success: false, error: 'session_id is required', code: ErrorCode.BAD_REQUEST }, req, 400);
    }

    // Fetch session with relevant fields
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id, title, scheduled_at, workspace_id, teams_meeting_url, outlook_event_id, outlook_owner_email, created_by
      `)
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      log.error('Session not found', sessionError);
      return corsJsonResponse({ success: false, error: 'Session not found', code: ErrorCode.NOT_FOUND }, req, 404);
    }

    // Type the session
    const typedSession = session as {
      id: string;
      title: string;
      scheduled_at: string;
      workspace_id: string;
      teams_meeting_url: string | null;
      outlook_event_id: string | null;
      outlook_owner_email: string | null;
      created_by: string | null;
    };

    // Validate workspace access
    const { data: hasAccess } = await supabaseAdmin.rpc('has_workspace_access', {
      _user_id: userId,
      _workspace_id: typedSession.workspace_id,
    });
    
    if (!hasAccess) {
      return corsJsonResponse({ success: false, error: 'Access denied', code: ErrorCode.FORBIDDEN }, req, 403);
    }

    // Get Graph credentials
    const credentials = await getGraphCredentials(supabaseAdmin, log);
    if (!credentials) {
      return corsJsonResponse({ 
        success: false, 
        error: 'Microsoft Graph API not configured'
      }, req, 500);
    }

    let joinUrl = typedSession.teams_meeting_url;
    
    // If no teams_meeting_url but has outlook_event_id, try to fetch from Graph
    if (!joinUrl && typedSession.outlook_event_id && typedSession.outlook_owner_email) {
      log.info('No teams_meeting_url, attempting to fetch from Outlook event');
      
      try {
        const accessToken = await getGraphAccessToken(credentials, log);
        
        const eventUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(typedSession.outlook_owner_email)}/events/${encodeURIComponent(typedSession.outlook_event_id)}`;
        const eventResponse = await fetch(eventUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        
        if (eventResponse.ok) {
          const eventData = await eventResponse.json();
          joinUrl = eventData.onlineMeeting?.joinUrl || null;
          
          // Update session with found URL
          if (joinUrl) {
            await supabaseAdmin
              .from('sessions')
              .update({ teams_meeting_url: joinUrl })
              .eq('id', session_id);
            log.info('Found Teams URL from Outlook event');
          }
        }
      } catch (e) {
        log.warn('Could not fetch Teams URL from Outlook event', { error: safeErrorMessage(e) });
      }
    }

    if (!joinUrl) {
      return corsJsonResponse({ 
        success: false, 
        status: 'no_meeting_url',
        message: 'Esta sessão não tem link do Teams associado'
      }, req);
    }

    log.info('Found Teams meeting URL');

    // Resolve organizer email
    const organizerEmail = await resolveOrganizerEmail(supabaseAdmin, typedSession, log);

    if (!organizerEmail) {
      return corsJsonResponse({ 
        success: false, 
        error: 'Could not determine meeting organizer email'
      }, req, 500);
    }

    log.info('Using organizer email', { organizerEmail });

    // Get Graph access token
    const accessToken = await getGraphAccessToken(credentials, log);

    // Step 1: Find online meeting by join URL
    // FIX: Proper OData filter encoding - escape single quotes in the URL, then URL-encode the entire filter
    const joinUrlEscaped = joinUrl.replace(/'/g, "''"); // OData single quote escaping
    const filterString = `JoinWebUrl eq '${joinUrlEscaped}'`;
    const meetingSearchUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerEmail)}/onlineMeetings?$filter=${encodeURIComponent(filterString)}`;
    
    log.info('Searching for online meeting', { organizerEmail });
    
    const meetingResponse = await fetch(meetingSearchUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!meetingResponse.ok) {
      const errorText = await meetingResponse.text();
      log.error('Failed to search for meeting', null, { status: meetingResponse.status });
      
      // Check for policy error
      if (meetingResponse.status === 403) {
        let errorJson: { error?: { code?: string; message?: string } } = {};
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          // Ignore parse error
        }
        
        if (errorJson.error?.code === 'Forbidden' || 
            errorJson.error?.message?.includes('policy') ||
            errorJson.error?.message?.includes('application access') ||
            errorJson.error?.message?.includes('ApplicationAccessPolicy')) {
          
          // Log integration error for admin visibility
          await supabaseAdmin.from('integration_errors').insert({
            integration_type: 'teams_transcript',
            error_message: 'Application Access Policy required',
            error_details: { 
              organizerEmail,
              hint: 'Run New-CsApplicationAccessPolicy in Teams Admin PowerShell'
            },
            created_at: new Date().toISOString(),
          });
          
          return corsJsonResponse({ 
            success: false, 
            status: 'forbidden_policy',
            message: 'Falta Application Access Policy no Teams. O admin do M365 precisa executar New-CsApplicationAccessPolicy.'
          }, req);
        }
      }
      
      // Meeting not found (could be wrong organizer or meeting deleted)
      if (meetingResponse.status === 404 || errorText.includes('not found')) {
        return corsJsonResponse({ 
          success: false, 
          status: 'not_found',
          message: 'Reunião não encontrada no Teams. Pode ter sido apagada ou o organizador é diferente.'
        }, req);
      }
      
      throw new Error(`Failed to search for meeting: ${meetingResponse.status}`);
    }

    const meetingData = await meetingResponse.json();
    
    if (!meetingData.value || meetingData.value.length === 0) {
      log.warn('No online meeting found for join URL');
      return corsJsonResponse({ 
        success: false, 
        status: 'not_found',
        message: 'Reunião não encontrada. O organizador registado pode não corresponder ao utilizador que criou a reunião no Teams.'
      }, req);
    }

    const onlineMeetingId = meetingData.value[0].id;
    log.info('Found online meeting', { onlineMeetingId });

    // Step 2: List transcripts for this meeting
    const transcriptsUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerEmail)}/onlineMeetings/${encodeURIComponent(onlineMeetingId)}/transcripts`;
    
    const transcriptsResponse = await fetch(transcriptsUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!transcriptsResponse.ok) {
      log.error('Failed to list transcripts', null, { status: transcriptsResponse.status });
      
      if (transcriptsResponse.status === 403) {
        return corsJsonResponse({ 
          success: false, 
          status: 'forbidden_policy',
          message: 'Sem permissão para aceder às transcrições. Verifique OnlineMeetingTranscript.Read.All e Application Access Policy.'
        }, req);
      }
      
      throw new Error(`Failed to list transcripts: ${transcriptsResponse.status}`);
    }

    const transcriptsData = await transcriptsResponse.json();
    
    if (!transcriptsData.value || transcriptsData.value.length === 0) {
      return corsJsonResponse({ 
        success: true, 
        status: 'not_ready',
        message: 'Ainda não há transcrição disponível. A transcrição aparece ~10 min após a reunião terminar (com transcrição ativa).'
      }, req);
    }

    // Get the most recent transcript
    const transcripts = transcriptsData.value.sort((a: { createdDateTime?: string }, b: { createdDateTime?: string }) => {
      const dateA = new Date(a.createdDateTime || 0);
      const dateB = new Date(b.createdDateTime || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    const latestTranscript = transcripts[0];
    log.info('Found transcript', { transcriptId: latestTranscript.id, createdAt: latestTranscript.createdDateTime });

    // Step 3: Download transcript content as VTT
    const contentUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizerEmail)}/onlineMeetings/${encodeURIComponent(onlineMeetingId)}/transcripts/${encodeURIComponent(latestTranscript.id)}/content?$format=text/vtt`;
    
    const contentResponse = await fetch(contentUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!contentResponse.ok) {
      log.error('Failed to download transcript content', null, { status: contentResponse.status });
      throw new Error(`Failed to download transcript: ${contentResponse.status}`);
    }

    const vttContent = await contentResponse.text();
    log.info('Downloaded VTT content', { length: vttContent.length });

    // Parse VTT to clean text
    const cleanText = parseVttToText(vttContent);
    log.info('Parsed transcript to clean text', { length: cleanText.length });

    // Save to session (do NOT change source field)
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ 
        raw_transcript: cleanText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session_id);

    if (updateError) {
      log.error('Failed to save transcript to session', updateError);
      throw updateError;
    }

    // Optionally log to session_transcripts if table exists
    try {
      await supabaseAdmin
        .from('session_transcripts')
        .upsert({
          session_id,
          source: 'teams_graph',
          content: cleanText,
          created_at: new Date().toISOString(),
        }, { onConflict: 'session_id,source' });
    } catch {
      // Table may not exist, ignore
    }

    log.info('Transcript imported successfully', { session_id, textLength: cleanText.length });

    return corsJsonResponse({ 
      success: true, 
      status: 'ok',
      transcript_text: cleanText,
      message: 'Transcrição importada com sucesso'
    }, req);

  } catch (error) {
    const errorMessage = safeErrorMessage(error);
    log.error('Error importing transcript', error);
    
    // Log to integration_errors
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      await supabaseAdmin.from('integration_errors').insert({
        integration_type: 'teams_transcript',
        error_message: errorMessage,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Ignore logging errors
    }
    
    return corsJsonResponse({ 
      success: false, 
      error: errorMessage
    }, req, 500);
  }
});
