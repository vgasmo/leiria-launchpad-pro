import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret (use dedicated WEBHOOK_SECRET)
    const webhookSecret = req.headers.get('X-Webhook-Secret');
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET');
    
    
    if (!webhookSecret || webhookSecret !== expectedSecret) {
      console.error('Invalid or missing webhook secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      workspace_id,
      workspace_external_id,
      meeting_title,
      start_time,
      end_time,
      participants,
      transcript_text,
      summary,
      join_url,
      source = 'webhook',
    } = body;

    // Log without sensitive IDs - only log metadata for debugging
    console.log('Received meeting ingest webhook:', { 
      has_workspace_id: !!workspace_id, 
      has_workspace_external_id: !!workspace_external_id, 
      meeting_title, 
      source 
    });

    // Resolve workspace
    let resolvedWorkspaceId = workspace_id;
    
    if (!resolvedWorkspaceId && workspace_external_id) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('external_id', workspace_external_id)
        .maybeSingle();

      if (workspace) {
        resolvedWorkspaceId = workspace.id;
      }
    }

    if (!resolvedWorkspaceId) {
      return new Response(JSON.stringify({ 
        error: 'Could not resolve workspace. Provide workspace_id or valid workspace_external_id' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Verify workspace exists and is active
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, status')
      .eq('id', resolvedWorkspaceId)
      .single();

    if (wsError || !workspace) {
      return new Response(JSON.stringify({ error: 'Workspace not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create or update session
    const sessionData: Record<string, unknown> = {
      workspace_id: resolvedWorkspaceId,
      title: meeting_title || 'Meeting from ' + source,
      scheduled_at: start_time || new Date().toISOString(),
      status: 'completed',
      session_type: 'meeting',
    };

    if (end_time) {
      sessionData.duration_minutes = Math.round(
        (new Date(end_time).getTime() - new Date(start_time).getTime()) / 60000
      );
    }

    if (join_url) {
      sessionData.join_url = join_url;
    }

    if (summary) {
      sessionData.summary = summary;
    }

    // Check for existing session with same title and time (deduplication)
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('workspace_id', resolvedWorkspaceId)
      .eq('title', sessionData.title)
      .gte('scheduled_at', new Date(new Date(start_time).getTime() - 3600000).toISOString()) // Within 1 hour
      .lte('scheduled_at', new Date(new Date(start_time).getTime() + 3600000).toISOString())
      .maybeSingle();

    let sessionId: string;

    if (existingSession) {
      // Update existing session
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ ...sessionData, updated_at: new Date().toISOString() })
        .eq('id', existingSession.id);

      if (updateError) {
        console.error('Error updating session:', updateError);
        throw updateError;
      }
      sessionId = existingSession.id;
      console.log('Updated existing session:', sessionId);
    } else {
      // Create new session
      const { data: newSession, error: insertError } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating session:', insertError);
        throw insertError;
      }
      sessionId = newSession.id;
      console.log('Created new session:', sessionId);
    }

    // Store transcript if provided
    if (transcript_text) {
      const { error: transcriptError } = await supabase
        .from('session_transcripts')
        .insert({
          session_id: sessionId,
          transcript_text,
          source,
        });

      if (transcriptError) {
        console.error('Error storing transcript:', transcriptError);
      }
    }

    // Log activity
    await supabase.from('activity_log').insert({
      workspace_id: resolvedWorkspaceId,
      user_id: '00000000-0000-0000-0000-000000000000', // System user
      entity_type: 'session',
      entity_id: sessionId,
      action: existingSession ? 'meeting_updated' : 'meeting_ingested',
      metadata: {
        source,
        has_transcript: !!transcript_text,
        participants_count: participants?.length || 0,
      },
    });

    return new Response(JSON.stringify({ 
      success: true,
      session_id: sessionId,
      workspace_id: resolvedWorkspaceId,
      action: existingSession ? 'updated' : 'created',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Log full error for debugging (server-side only)
    console.error('Meeting ingest error:', errorMessage);
    // Return sanitized error to client
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
