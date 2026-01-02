import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsJsonResponse({ error: 'Authorization required' }, req, 401);
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return corsJsonResponse({ error: 'Invalid token' }, req, 401);
    }

    // Parse request
    const { link_id } = await req.json();

    if (!link_id) {
      return corsJsonResponse({ error: 'link_id is required' }, req, 400);
    }

    // Get the share link and its workspace
    const { data: shareLink, error: linkError } = await supabaseAdmin
      .from('dataroom_share_links')
      .select(`
        id,
        dataroom:datarooms(workspace_id)
      `)
      .eq('id', link_id)
      .single();

    if (linkError || !shareLink) {
      return corsJsonResponse({ error: 'Link not found' }, req, 404);
    }

    const workspaceId = (shareLink.dataroom as any)?.workspace_id;

    // Check user access
    const { data: hasAccess } = await supabaseAdmin.rpc('has_workspace_access', {
      _user_id: user.id,
      _workspace_id: workspaceId
    });

    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', {
      _user_id: user.id
    });

    if (!hasAccess && !isAdmin) {
      return corsJsonResponse({ error: 'Access denied' }, req, 403);
    }

    // Revoke the link
    const { error: updateError } = await supabaseAdmin
      .from('dataroom_share_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', link_id);

    if (updateError) {
      console.error('Error revoking link:', updateError);
      return corsJsonResponse({ error: 'Failed to revoke link' }, req, 500);
    }

    return corsJsonResponse({
      success: true,
      message: 'Link revoked successfully'
    }, req);

  } catch (error: any) {
    console.error('Revoke link error:', error);
    return corsJsonResponse({ error: 'Internal server error' }, req, 500);
  }
});
