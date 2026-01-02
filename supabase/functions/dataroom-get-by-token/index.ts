import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

// Simple in-memory rate limiting (per token, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(tokenHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(tokenHash);
  
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(tokenHash, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  entry.count++;
  return true;
}

// SHA-256 hash function
async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    // Parse request body
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return corsJsonResponse({ error: 'Token is required' }, req, 400);
    }

    // Hash the token
    const tokenHash = await sha256(token);

    // Check rate limit
    if (!checkRateLimit(tokenHash)) {
      return corsJsonResponse({ error: 'Too many requests. Please try again later.' }, req, 429);
    }

    // Create Supabase client with service role for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the share link
    const { data: shareLink, error: linkError } = await supabase
      .from('dataroom_share_links')
      .select(`
        id,
        dataroom_id,
        allow_download,
        expires_at,
        revoked_at,
        dataroom:datarooms(
          id,
          workspace:workspaces(
            id,
            startup:startups(name, logo_url)
          )
        )
      `)
      .eq('token_hash', tokenHash)
      .single();

    if (linkError || !shareLink) {
      return corsJsonResponse({ error: 'Invalid or expired link' }, req, 404);
    }

    // Check if revoked
    if (shareLink.revoked_at) {
      return corsJsonResponse({ error: 'This link has been revoked', code: 'REVOKED' }, req, 403);
    }

    // Check if expired
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return corsJsonResponse({ error: 'This link has expired', code: 'EXPIRED' }, req, 403);
    }

    // Get dataroom items (only investor-visible)
    const { data: items, error: itemsError } = await supabase
      .from('dataroom_items')
      .select(`
        id,
        type,
        title,
        description,
        sort_order,
        url,
        document_id,
        investor_update_id,
        document:documents(id, name, file_path, mime_type),
        investor_update:investor_updates(id, month, content_json)
      `)
      .eq('dataroom_id', shareLink.dataroom_id)
      .eq('visibility', 'investors')
      .order('sort_order', { ascending: true });

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
      return corsJsonResponse({ error: 'Failed to fetch dataroom items' }, req, 500);
    }

    // Generate signed URLs for documents if download is allowed
    const processedItems = await Promise.all((items || []).map(async (item: any) => {
      const result: any = {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        sort_order: item.sort_order,
      };

      if (item.type === 'link' && item.url) {
        result.url = item.url;
      }

      if (item.type === 'document' && item.document) {
        result.document = {
          id: item.document.id,
          name: item.document.name,
          mime_type: item.document.mime_type,
        };
        
        // Generate signed URL if download allowed
        if (shareLink.allow_download && item.document.file_path) {
          const { data: signedUrl } = await supabase.storage
            .from('workspace-documents')
            .createSignedUrl(item.document.file_path, 600); // 10 minute expiry
          
          if (signedUrl?.signedUrl) {
            result.document.download_url = signedUrl.signedUrl;
          }
        }
      }

      if (item.type === 'investor_update' && item.investor_update) {
        result.investor_update = {
          id: item.investor_update.id,
          month: item.investor_update.month,
          content: item.investor_update.content_json,
        };
      }

      return result;
    }));

    // Update access stats (non-blocking)
    supabase
      .from('dataroom_share_links')
      .update({
        last_access_at: new Date().toISOString(),
        access_count: (shareLink as any).access_count + 1,
      })
      .eq('id', shareLink.id)
      .then(() => {});

    // Extract workspace/startup info
    const dataroom = shareLink.dataroom as any;
    const workspace = dataroom?.workspace;
    const startup = workspace?.startup;

    return corsJsonResponse({
      success: true,
      dataroom: {
        id: dataroom.id,
        startup_name: startup?.name || 'Startup',
        logo_url: startup?.logo_url,
        allow_download: shareLink.allow_download,
      },
      items: processedItems,
    }, req);

  } catch (error: any) {
    console.error('Dataroom access error:', error);
    return corsJsonResponse({ error: 'Internal server error' }, req, 500);
  }
});
