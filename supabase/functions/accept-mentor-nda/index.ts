import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const CURRENT_NDA_VERSION = 'PT-NDA-2026-01';

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

    // Check if user is mentor_externo
    const { data: isMentor } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'mentor_externo'
    });

    if (!isMentor) {
      return corsJsonResponse({ error: 'Only external mentors need to accept NDA' }, req, 400);
    }

    // Get user agent and hash IP
    const userAgent = req.headers.get('User-Agent') || null;
    const clientIp = req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 
                     req.headers.get('CF-Connecting-IP') || 
                     'unknown';
    
    // Hash IP for privacy
    const encoder = new TextEncoder();
    const data = encoder.encode(clientIp + 'salt-for-privacy');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');

    // Record NDA acceptance
    const { error: insertError } = await supabaseAdmin
      .from('mentor_nda_acceptances')
      .upsert({
        user_id: user.id,
        nda_version: CURRENT_NDA_VERSION,
        ip_hash: ipHash,
        user_agent: userAgent?.substring(0, 500),
        accepted_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,nda_version'
      });

    if (insertError) {
      console.error('Error recording NDA acceptance:', insertError);
      return corsJsonResponse({ error: 'Failed to record NDA acceptance' }, req, 500);
    }

    return corsJsonResponse({
      success: true,
      message: 'NDA accepted successfully',
      nda_version: CURRENT_NDA_VERSION,
      accepted_at: new Date().toISOString(),
    }, req);

  } catch (error: any) {
    console.error('Accept NDA error:', error);
    return corsJsonResponse({ error: 'Internal server error' }, req, 500);
  }
});
