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
      alias,
      from,
      subject,
      body_text,
      body_html,
      attachments_meta,
    } = body;

    console.log('Received inbound email:', { alias, from, subject });

    if (!alias) {
      return new Response(JSON.stringify({ error: 'Email alias is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Resolve workspace by alias
    const { data: emailAlias, error: aliasError } = await supabase
      .from('workspace_email_aliases')
      .select('workspace_id')
      .eq('alias', alias)
      .maybeSingle();

    if (aliasError || !emailAlias) {
      console.log('Alias not found:', alias);
      return new Response(JSON.stringify({ error: 'Unknown email alias' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const workspaceId = emailAlias.workspace_id;

    // Store in communication_log
    const { data: logEntry, error: logError } = await supabase
      .from('communication_log')
      .insert({
        workspace_id: workspaceId,
        channel: 'email',
        from_address: from,
        subject: subject,
        body: body_text || body_html,
        metadata_json: {
          has_attachments: !!attachments_meta?.length,
          attachments: attachments_meta,
        },
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Error storing email:', logError);
      throw logError;
    }

    // Log activity
    await supabase.from('activity_log').insert({
      workspace_id: workspaceId,
      user_id: '00000000-0000-0000-0000-000000000000', // System user
      entity_type: 'communication',
      entity_id: logEntry.id,
      action: 'email_received',
      metadata: {
        from,
        subject,
        has_attachments: !!attachments_meta?.length,
      },
    });

    console.log('Email stored successfully:', logEntry.id);

    return new Response(JSON.stringify({ 
      success: true,
      communication_id: logEntry.id,
      workspace_id: workspaceId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Log full error server-side for debugging
    console.error('Inbound email error:', errorMessage);
    // Return sanitized error to client
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
