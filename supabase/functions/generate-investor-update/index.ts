import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  workspace_id: string;
  month: string; // YYYY-MM-01
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check using anon client
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use anon key client for auth verification
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized", details: authError?.message }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: GenerateRequest = await req.json();
    const { workspace_id, month } = body;

    console.log(`Generating investor update for workspace ${workspace_id}, month ${month}`);

    // Get workspace info
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select(`
        id, stage, health_score, health_score_numeric,
        startup:startups(name, description, website, logo_url),
        program:programs(name)
      `)
      .eq("id", workspace_id)
      .single();

    if (wsError || !workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prevMonth = new Date(month);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = prevMonth.toISOString().slice(0, 7) + "-01";

    // Get KPIs for current and previous month
    const { data: currentKpis } = await supabase
      .from("kpi_values")
      .select(`
        value, target_value,
        kpi_definition:kpi_definitions(name, unit)
      `)
      .eq("workspace_id", workspace_id)
      .eq("period_month", month);

    const { data: prevKpis } = await supabase
      .from("kpi_values")
      .select(`value, kpi_definition_id`)
      .eq("workspace_id", workspace_id)
      .eq("period_month", prevMonthStr);

    const kpisSnapshot = (currentKpis || []).map((kpi: any) => {
      const prevKpi = prevKpis?.find((p: any) => p.kpi_definition_id === kpi.kpi_definition_id);
      const delta = prevKpi ? (kpi.value || 0) - (prevKpi.value || 0) : null;
      return {
        name: kpi.kpi_definition?.name || "KPI",
        value: kpi.value,
        target: kpi.target_value,
        unit: kpi.kpi_definition?.unit || "",
        delta,
      };
    });

    // Get milestones completed this month
    const monthStart = new Date(month);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const { data: completedMilestones } = await supabase
      .from("milestones")
      .select("title, completed_at")
      .eq("workspace_id", workspace_id)
      .eq("status", "completed")
      .gte("completed_at", monthStart.toISOString())
      .lt("completed_at", monthEnd.toISOString());

    // Get upcoming milestones
    const { data: upcomingMilestones } = await supabase
      .from("milestones")
      .select("title, target_date")
      .eq("workspace_id", workspace_id)
      .in("status", ["not_started", "in_progress"])
      .order("target_date", { ascending: true })
      .limit(5);

    // Get health explanation as risks
    const { data: healthData } = await supabase
      .from("workspaces")
      .select("health_score_explanation")
      .eq("id", workspace_id)
      .single();

    const risks = (healthData?.health_score_explanation as any[] || [])
      .filter((f: any) => f.impact === "negative")
      .map((f: any) => f.details);

    // Build content
    const content = {
      month,
      startup_name: (workspace.startup as any)?.name || "Startup",
      highlights: [], // To be filled by user
      lowlights: [], // To be filled by user
      kpis: kpisSnapshot,
      milestones_achieved: (completedMilestones || []).map((m: any) => m.title),
      next_milestones: (upcomingMilestones || []).map((m: any) => ({
        title: m.title,
        target_date: m.target_date,
      })),
      risks,
      asks: [], // To be filled by user
      next_month_priorities: [], // To be filled by user
      health_score: workspace.health_score_numeric,
      stage: workspace.stage,
    };

    // Upsert the investor update
    const { data: update, error: upsertError } = await supabase
      .from("investor_updates")
      .upsert({
        workspace_id,
        month,
        content_json: content,
        generated_by: user.id,
      }, { onConflict: "workspace_id,month" })
      .select()
      .single();

    if (upsertError) throw upsertError;

    // Log activity
    await supabase.from("activity_log").insert({
      workspace_id,
      user_id: user.id,
      entity_type: "investor_update",
      entity_id: update.id,
      action: "generated",
      metadata: { month },
    });

    console.log(`Investor update generated: ${update.id}`);

    return new Response(
      JSON.stringify({ success: true, update }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in generate-investor-update:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
