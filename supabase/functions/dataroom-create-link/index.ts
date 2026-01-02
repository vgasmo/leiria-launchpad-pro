import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

// SHA-256 hash function
async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate random token
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
    
    // User client for auth check
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Service client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return corsJsonResponse({ error: 'Invalid token' }, req, 401);
    }

    // Parse request
    const { workspace_id, expires_in_days, allow_download = true } = await req.json();

    if (!workspace_id) {
      return corsJsonResponse({ error: 'workspace_id is required' }, req, 400);
    }

    // Check user access to workspace
    const { data: hasAccess } = await supabaseAdmin.rpc('has_workspace_access', {
      _user_id: user.id,
      _workspace_id: workspace_id
    });

    // Check if admin
    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', {
      _user_id: user.id
    });

    if (!hasAccess && !isAdmin) {
      return corsJsonResponse({ error: 'Access denied to this workspace' }, req, 403);
    }

    // Ensure dataroom exists
    const { data: dataroomId, error: dataroomError } = await supabaseAdmin.rpc('ensure_dataroom_exists', {
      _workspace_id: workspace_id
    });

    if (dataroomError || !dataroomId) {
      console.error('Error ensuring dataroom:', dataroomError);
      return corsJsonResponse({ error: 'Failed to create/get dataroom' }, req, 500);
    }

    // Generate token
    const token = generateToken();
    const tokenHash = await sha256(token);

    // Calculate expiry
    let expiresAt = null;
    if (expires_in_days && expires_in_days > 0) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expires_in_days);
      expiresAt = expiry.toISOString();
    }

    // Create share link
    const { data: shareLink, error: linkError } = await supabaseAdmin
      .from('dataroom_share_links')
      .insert({
        dataroom_id: dataroomId,
        token_hash: tokenHash,
        created_by: user.id,
        expires_at: expiresAt,
        allow_download: allow_download,
      })
      .select()
      .single();

    if (linkError) {
      console.error('Error creating link:', linkError);
      return corsJsonResponse({ error: 'Failed to create share link' }, req, 500);
    }

    // Build share URL
    const appUrl = Deno.env.get('APP_URL') || 'https://lovable.dev';
    const shareUrl = `${appUrl}/dataroom/shared/${token}`;

    return corsJsonResponse({
      success: true,
      link: {
        id: shareLink.id,
        url: shareUrl,
        token: token,
        expires_at: expiresAt,
        allow_download: allow_download,
        created_at: shareLink.created_at,
      }
    }, req);

  } catch (error: any) {
    console.error('Create link error:', error);
    return corsJsonResponse({ error: 'Internal server error' }, req, 500);
  }
});
