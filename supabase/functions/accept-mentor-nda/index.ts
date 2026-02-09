import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const CURRENT_NDA_VERSION = 'PT-NDA-2026-01';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return corsJsonResponse({ error: 'Authorization required' }, req, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with caller's JWT — RLS enforces mentor role + ownership
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify caller identity
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return corsJsonResponse({ error: 'Invalid token' }, req, 401);
    }

    const userId = claimsData.claims.sub as string;

    // Get user agent and hash IP for privacy
    const userAgent = req.headers.get('User-Agent') || null;
    const clientIp = req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                     req.headers.get('CF-Connecting-IP') ||
                     'unknown';

    const encoder = new TextEncoder();
    const data = encoder.encode(clientIp + 'salt-for-privacy');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');

    // Upsert NDA acceptance — RLS ensures only mentor_externo users can insert/update their own row
    const { error: upsertError } = await supabase
      .from('mentor_nda_acceptances')
      .upsert({
        user_id: userId,
        nda_version: CURRENT_NDA_VERSION,
        ip_hash: ipHash,
        user_agent: userAgent?.substring(0, 500),
        accepted_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,nda_version'
      });

    if (upsertError) {
      console.error('NDA upsert error:', upsertError);
      // Surface a clear message if RLS blocks (e.g. non-mentor user)
      if (upsertError.code === '42501' || upsertError.message?.includes('row-level security')) {
        return corsJsonResponse({ error: 'Only external mentors can accept the NDA' }, req, 403);
      }
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
