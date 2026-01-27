import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

interface ShareLinkRequest {
  token: string;
}

// Simple in-memory rate limiting (per IP address, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;

// Secondary rate limiting for valid tokens (stricter)
const tokenRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const TOKEN_RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(key: string, limitMap: Map<string, { count: number; resetAt: number }>, maxRequests: number): boolean {
  const now = Date.now();
  const entry = limitMap.get(key);
  
  if (!entry || now >= entry.resetAt) {
    limitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= maxRequests) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Get client IP from request headers
function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  return 'unknown';
}

// SHA-256 hash function
async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // SECURITY: Apply IP-based rate limiting BEFORE any token processing
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp, rateLimitMap, RATE_LIMIT_MAX_REQUESTS)) {
      return corsJsonResponse(
        { error: "Too many requests. Please try again later." },
        req, 429
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ShareLinkRequest = await req.json();
    const { token } = body;

    if (!token) {
      return corsJsonResponse({ error: "Token required" }, req, 400);
    }

    // SECURITY: Hash the token for database lookup
    const tokenHash = await sha256(token);

    // Find share link using hashed token
    const { data: shareLink, error: linkError } = await supabase
      .from("share_links")
      .select("*")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .single();

    if (linkError || !shareLink) {
      return corsJsonResponse({ error: "Invalid or expired link" }, req, 404);
    }

    // SECURITY: Apply secondary rate limiting per valid token hash
    if (!checkRateLimit(tokenHash, tokenRateLimitMap, TOKEN_RATE_LIMIT_MAX_REQUESTS)) {
      return corsJsonResponse(
        { error: "Too many requests for this link. Please try again later." },
        req, 429
      );
    }

    // Check expiration
    if (new Date(shareLink.expires_at) < new Date()) {
      return corsJsonResponse({ error: "Link expired" }, req, 410);
    }

    // Increment view count (non-blocking)
    supabase
      .from("share_links")
      .update({ 
        views_count: (shareLink.views_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("id", shareLink.id)
      .then(() => {});

    // Get workspace data based on scope
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select(`
        id, stage, health_score, health_score_numeric, health_score_components,
        startup:startups(name, description, logo_url, website)
      `)
      .eq("id", shareLink.workspace_id)
      .single();

    if (wsError) throw wsError;

    let responseData: any = {
      scope: shareLink.scope,
      workspace: {
        startup_name: (workspace.startup as any)?.name,
        logo_url: (workspace.startup as any)?.logo_url,
        stage: workspace.stage,
      },
    };

    // Add data based on scope
    if (shareLink.scope === "kpis_only" || shareLink.scope === "full_readonly") {
      const { data: kpis } = await supabase
        .from("kpi_values")
        .select(`
          value, target_value, period_month,
          kpi_definition:kpi_definitions(name, unit)
        `)
        .eq("workspace_id", shareLink.workspace_id)
        .order("period_month", { ascending: false })
        .limit(20);

      responseData.kpis = kpis;
    }

    if (shareLink.scope === "report_only" || shareLink.scope === "full_readonly") {
      const { data: updates } = await supabase
        .from("investor_updates")
        .select("*")
        .eq("workspace_id", shareLink.workspace_id)
        .order("month", { ascending: false })
        .limit(1);

      responseData.investor_update = updates?.[0] || null;
    }

    if (shareLink.scope === "full_readonly") {
      const { data: milestones } = await supabase
        .from("milestones")
        .select("title, status, target_date, completed_at")
        .eq("workspace_id", shareLink.workspace_id)
        .order("target_date", { ascending: true });

      responseData.milestones = milestones;
      responseData.health_score = workspace.health_score_numeric;
      responseData.health_components = workspace.health_score_components;
    }

    return corsJsonResponse({ success: true, data: responseData }, req);
  } catch (error: unknown) {
    console.error("Error in get-shared-workspace:", error);
    return corsJsonResponse({ error: "Internal server error" }, req, 500);
  }
});
