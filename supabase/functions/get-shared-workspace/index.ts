import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  // Check standard proxy headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback - use a hash of available identifying info
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Apply IP-based rate limiting BEFORE any token processing
    // This prevents token enumeration attacks by limiting requests per IP
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp, rateLimitMap, RATE_LIMIT_MAX_REQUESTS)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ShareLinkRequest = await req.json();
    const { token } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Hash the token for database lookup
    // This prevents direct exposure of tokens if the database is compromised
    const tokenHash = await sha256(token);

    // Find share link using hashed token
    const { data: shareLink, error: linkError } = await supabase
      .from("share_links")
      .select("*")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .single();

    if (linkError || !shareLink) {
      return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Apply secondary rate limiting per valid token hash
    // This provides additional protection for valid share links
    if (!checkRateLimit(tokenHash, tokenRateLimitMap, TOKEN_RATE_LIMIT_MAX_REQUESTS)) {
      return new Response(
        JSON.stringify({ error: "Too many requests for this link. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (new Date(shareLink.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Link expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
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
      // Get latest investor update
      const { data: updates } = await supabase
        .from("investor_updates")
        .select("*")
        .eq("workspace_id", shareLink.workspace_id)
        .order("month", { ascending: false })
        .limit(1);

      responseData.investor_update = updates?.[0] || null;
    }

    if (shareLink.scope === "full_readonly") {
      // Get milestones
      const { data: milestones } = await supabase
        .from("milestones")
        .select("title, status, target_date, completed_at")
        .eq("workspace_id", shareLink.workspace_id)
        .order("target_date", { ascending: true });

      responseData.milestones = milestones;
      responseData.health_score = workspace.health_score_numeric;
      responseData.health_components = workspace.health_score_components;
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    // Log detailed error server-side only
    console.error("Error in get-shared-workspace:", error);
    // Return generic error to client to prevent information leakage
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});