import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShareLinkRequest {
  token: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Find share link
    const { data: shareLink, error: linkError } = await supabase
      .from("share_links")
      .select("*")
      .eq("token", token)
      .is("revoked_at", null)
      .single();

    if (linkError || !shareLink) {
      return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    if (new Date(shareLink.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Link expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment view count
    await supabase
      .from("share_links")
      .update({ 
        views_count: (shareLink.views_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("id", shareLink.id);

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
