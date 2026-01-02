import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthModel {
  program_id: string;
  weights_json: {
    actions: number;
    sessions: number;
    kpis: number;
    checkins: number;
  };
  thresholds_json: {
    thriving: number;
    healthy: number;
    stable: number;
    at_risk: number;
  };
}

interface ExplanationFactor {
  factor: string;
  score: number;
  maxScore: number;
  details: string;
  impact: "positive" | "negative" | "neutral";
}

function getHealthLabel(score: number, thresholds: HealthModel["thresholds_json"]): string {
  if (score >= thresholds.thriving) return "thriving";
  if (score >= thresholds.healthy) return "healthy";
  if (score >= thresholds.stable) return "stable";
  if (score >= thresholds.at_risk) return "at_risk";
  return "critical";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting health scores recomputation...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7) + "-01";
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 7) + "-01";

    // Get all active workspaces
    const { data: workspaces, error: wsError } = await supabase
      .from("workspaces")
      .select("id, program_id, status")
      .eq("status", "active");

    if (wsError) {
      console.error("Error fetching workspaces:", wsError);
      throw wsError;
    }

    console.log(`Processing ${workspaces?.length || 0} active workspaces`);

    // Get health models for all programs
    const { data: healthModels } = await supabase
      .from("program_health_model")
      .select("*")
      .eq("is_enabled", true);

    const modelsByProgram: Record<string, HealthModel> = {};
    for (const model of healthModels || []) {
      modelsByProgram[model.program_id] = model;
    }

    // Default model if program doesn't have one
    const defaultModel: HealthModel = {
      program_id: "default",
      weights_json: { actions: 30, sessions: 20, kpis: 30, checkins: 20 },
      thresholds_json: { thriving: 85, healthy: 70, stable: 50, at_risk: 30 },
    };

    let updatedCount = 0;

    for (const workspace of workspaces || []) {
      const model = modelsByProgram[workspace.program_id] || defaultModel;
      const weights = model.weights_json;
      const thresholds = model.thresholds_json;
      const explanation: ExplanationFactor[] = [];

      // Fetch all data in parallel
      const [
        actionsResult,
        sessionsResult,
        kpisResult,
        kpisLastMonthResult,
        checkinsResult,
        workspaceKpisResult,
      ] = await Promise.all([
        // Actions: completed vs total in last 30 days + overdue
        supabase
          .from("action_items")
          .select("id, status, due_date, created_at")
          .eq("workspace_id", workspace.id)
          .gte("created_at", new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        // Sessions: last session + upcoming
        supabase
          .from("sessions")
          .select("id, scheduled_at")
          .eq("workspace_id", workspace.id)
          .order("scheduled_at", { ascending: false })
          .limit(5),
        // KPIs: current month
        supabase
          .from("kpi_values")
          .select("id, kpi_definition_id, value")
          .eq("workspace_id", workspace.id)
          .eq("period_month", currentMonth),
        // KPIs: last month (for trend)
        supabase
          .from("kpi_values")
          .select("id, kpi_definition_id, value")
          .eq("workspace_id", workspace.id)
          .eq("period_month", lastMonth),
        // Check-ins compliance
        supabase
          .from("checkin_instances")
          .select("id, status, due_date, submitted_at")
          .eq("workspace_id", workspace.id)
          .gte("due_date", new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
        // Expected KPIs
        supabase
          .from("workspace_kpis")
          .select("kpi_definition_id")
          .eq("workspace_id", workspace.id)
          .eq("active", true),
      ]);

      // Calculate Actions Score (0-100)
      const actions = actionsResult.data || [];
      const totalActions = actions.length;
      const completedActions = actions.filter(a => a.status === "completed").length;
      const overdueActions = actions.filter(a => 
        a.status !== "completed" && 
        a.due_date && 
        new Date(a.due_date) < today
      ).length;

      let actionsScore = 100;
      if (totalActions > 0) {
        const completionRate = completedActions / totalActions;
        const overdueRate = overdueActions / totalActions;
        actionsScore = Math.max(0, Math.min(100, 
          completionRate * 80 + 20 - (overdueRate * 50)
        ));
      }

      explanation.push({
        factor: "Ações",
        score: Math.round(actionsScore),
        maxScore: 100,
        details: totalActions === 0 
          ? "Sem ações criadas" 
          : `${completedActions}/${totalActions} completas, ${overdueActions} em atraso`,
        impact: overdueActions > 2 ? "negative" : completedActions === totalActions ? "positive" : "neutral",
      });

      // Calculate Sessions Score (0-100)
      const sessions = sessionsResult.data || [];
      const pastSessions = sessions.filter(s => new Date(s.scheduled_at) < today);
      const futureSessions = sessions.filter(s => new Date(s.scheduled_at) >= today);

      let sessionsScore = 50; // Base score
      if (pastSessions.length > 0) {
        const lastSession = new Date(pastSessions[0].scheduled_at);
        const daysSince = Math.floor((today.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSince <= 7) sessionsScore = 100;
        else if (daysSince <= 14) sessionsScore = 80;
        else if (daysSince <= 21) sessionsScore = 50;
        else if (daysSince <= 30) sessionsScore = 30;
        else sessionsScore = 10;
      } else {
        sessionsScore = 20; // No sessions ever
      }

      // Bonus for having upcoming sessions
      if (futureSessions.length > 0) {
        sessionsScore = Math.min(100, sessionsScore + 10);
      }

      const daysSinceSession = pastSessions.length > 0 
        ? Math.floor((today.getTime() - new Date(pastSessions[0].scheduled_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      explanation.push({
        factor: "Sessões",
        score: Math.round(sessionsScore),
        maxScore: 100,
        details: daysSinceSession !== null 
          ? `Última sessão há ${daysSinceSession} dias` 
          : "Sem sessões registadas",
        impact: sessionsScore < 50 ? "negative" : sessionsScore >= 80 ? "positive" : "neutral",
      });

      // Calculate KPIs Score (0-100)
      const currentKpis = kpisResult.data || [];
      const expectedKpis = workspaceKpisResult.data || [];
      const expectedCount = expectedKpis.length;
      const filledCount = currentKpis.length;

      let kpisScore = 100;
      if (expectedCount > 0) {
        const fillRate = filledCount / expectedCount;
        kpisScore = fillRate * 100;
      }

      // Check for KPI trends (bonus/penalty)
      const lastMonthKpis = kpisLastMonthResult.data || [];
      if (currentKpis.length > 0 && lastMonthKpis.length > 0) {
        // Simple trend check: are values generally improving?
        let improving = 0;
        let declining = 0;
        for (const current of currentKpis) {
          const last = lastMonthKpis.find(l => l.kpi_definition_id === current.kpi_definition_id);
          if (last && current.value !== null && last.value !== null) {
            if (current.value > last.value) improving++;
            else if (current.value < last.value) declining++;
          }
        }
        if (improving > declining) kpisScore = Math.min(100, kpisScore + 5);
        else if (declining > improving) kpisScore = Math.max(0, kpisScore - 5);
      }

      explanation.push({
        factor: "KPIs",
        score: Math.round(kpisScore),
        maxScore: 100,
        details: expectedCount === 0 
          ? "Sem KPIs configurados" 
          : `${filledCount}/${expectedCount} preenchidos este mês`,
        impact: kpisScore < 50 ? "negative" : kpisScore >= 80 ? "positive" : "neutral",
      });

      // Calculate Check-ins Score (0-100)
      const checkins = checkinsResult.data || [];
      const submittedOnTime = checkins.filter(c => 
        c.status === "submitted" && 
        c.submitted_at && 
        new Date(c.submitted_at) <= new Date(c.due_date + "T23:59:59")
      ).length;
      const totalCheckins = checkins.length;

      let checkinsScore = 100;
      if (totalCheckins > 0) {
        checkinsScore = (submittedOnTime / totalCheckins) * 100;
      }

      const overdueCheckins = checkins.filter(c => 
        c.status === "pending" && 
        new Date(c.due_date) < today
      ).length;

      explanation.push({
        factor: "Check-ins",
        score: Math.round(checkinsScore),
        maxScore: 100,
        details: totalCheckins === 0 
          ? "Sem check-ins configurados" 
          : `${submittedOnTime}/${totalCheckins} submetidos a tempo${overdueCheckins > 0 ? `, ${overdueCheckins} em atraso` : ""}`,
        impact: overdueCheckins > 0 ? "negative" : checkinsScore >= 80 ? "positive" : "neutral",
      });

      // Calculate weighted total score
      const totalWeight = weights.actions + weights.sessions + weights.kpis + weights.checkins;
      const weightedScore = (
        (actionsScore * weights.actions) +
        (sessionsScore * weights.sessions) +
        (kpisScore * weights.kpis) +
        (checkinsScore * weights.checkins)
      ) / totalWeight;

      const finalScore = Math.round(weightedScore);
      const healthLabel = getHealthLabel(finalScore, thresholds);

      // Sort explanation by impact (negative first)
      explanation.sort((a, b) => {
        const order = { negative: 0, neutral: 1, positive: 2 };
        return order[a.impact] - order[b.impact];
      });

      // Update workspace
      const { error: updateError } = await supabase
        .from("workspaces")
        .update({
          health_score_calculated: healthLabel,
          health_score_numeric: finalScore,
          health_score_updated_at: new Date().toISOString(),
          health_score_explanation: explanation,
          // Only update health_score if no override is set
          health_score: healthLabel,
        })
        .eq("id", workspace.id)
        .is("health_score_override", null);

      // If there's an override, still update the calculated fields
      await supabase
        .from("workspaces")
        .update({
          health_score_calculated: healthLabel,
          health_score_numeric: finalScore,
          health_score_updated_at: new Date().toISOString(),
          health_score_explanation: explanation,
        })
        .eq("id", workspace.id)
        .not("health_score_override", "is", null);

      if (!updateError) {
        updatedCount++;
      } else {
        console.error(`Error updating workspace ${workspace.id}:`, updateError);
      }
    }

    console.log(`Health scores recomputation complete. Updated ${updatedCount} workspaces.`);

    return new Response(
      JSON.stringify({
        success: true,
        updatedWorkspaces: updatedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in recompute-health-scores:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
