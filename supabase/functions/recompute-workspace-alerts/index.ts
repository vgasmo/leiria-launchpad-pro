import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRule {
  id: string;
  program_id: string;
  rule_type: string;
  threshold: number;
  severity: string;
  is_enabled: boolean;
}

interface WorkspaceData {
  id: string;
  program_id: string;
  startup_id: string;
  status: string;
}

interface AlertResult {
  workspace_id: string;
  rule_type: string;
  severity: string;
  reason: string;
  evidence_json: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting workspace alerts recomputation...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7) + "-01";

    // Get all active workspaces
    const { data: workspaces, error: wsError } = await supabase
      .from("workspaces")
      .select("id, program_id, startup_id, status")
      .eq("status", "active");

    if (wsError) {
      console.error("Error fetching workspaces:", wsError);
      throw wsError;
    }

    console.log(`Processing ${workspaces?.length || 0} active workspaces`);

    // Get all enabled alert rules grouped by program
    const { data: allRules, error: rulesError } = await supabase
      .from("program_alert_rules")
      .select("*")
      .eq("is_enabled", true);

    if (rulesError) {
      console.error("Error fetching rules:", rulesError);
      throw rulesError;
    }

    const rulesByProgram: Record<string, AlertRule[]> = {};
    for (const rule of allRules || []) {
      if (!rulesByProgram[rule.program_id]) {
        rulesByProgram[rule.program_id] = [];
      }
      rulesByProgram[rule.program_id].push(rule);
    }

    const newAlerts: AlertResult[] = [];
    const resolvedAlertIds: string[] = [];

    for (const workspace of workspaces || []) {
      const rules = rulesByProgram[workspace.program_id] || [];
      const wsAlerts: AlertResult[] = [];

      // Fetch workspace data in parallel
      const [sessionsResult, actionsResult, kpisResult, checkinsResult, milestonesResult] = await Promise.all([
        // Last session
        supabase
          .from("sessions")
          .select("scheduled_at")
          .eq("workspace_id", workspace.id)
          .lt("scheduled_at", today.toISOString())
          .order("scheduled_at", { ascending: false })
          .limit(1),
        // Overdue actions
        supabase
          .from("action_items")
          .select("id, title, due_date")
          .eq("workspace_id", workspace.id)
          .in("status", ["pending", "in_progress"])
          .lt("due_date", today.toISOString().split("T")[0]),
        // Current month KPIs
        supabase
          .from("kpi_values")
          .select("id, kpi_definition_id")
          .eq("workspace_id", workspace.id)
          .eq("period_month", currentMonth),
        // Overdue check-ins
        supabase
          .from("checkin_instances")
          .select("id, due_date, status")
          .eq("workspace_id", workspace.id)
          .eq("status", "pending")
          .lt("due_date", today.toISOString().split("T")[0]),
        // Overdue milestones
        supabase
          .from("milestones")
          .select("id, title, target_date, status")
          .eq("workspace_id", workspace.id)
          .in("status", ["not_started", "in_progress"])
          .lt("target_date", today.toISOString().split("T")[0]),
      ]);

      // Get workspace KPI definitions to check missing
      const { data: workspaceKpis } = await supabase
        .from("workspace_kpis")
        .select("kpi_definition_id, kpi_definitions(name)")
        .eq("workspace_id", workspace.id)
        .eq("active", true);

      const filledKpiIds = new Set((kpisResult.data || []).map(k => k.kpi_definition_id));
      const missingKpis = (workspaceKpis || [])
        .filter(wk => !filledKpiIds.has(wk.kpi_definition_id))
        .map(wk => (wk.kpi_definitions as any)?.name || "Unknown");

      // Calculate days since last session
      let daysSinceLastSession = 999;
      if (sessionsResult.data && sessionsResult.data.length > 0) {
        const lastSessionDate = new Date(sessionsResult.data[0].scheduled_at);
        daysSinceLastSession = Math.floor((today.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      const overdueActions = actionsResult.data || [];
      const overdueCheckins = checkinsResult.data || [];
      const overdueMilestones = milestonesResult.data || [];

      // Calculate oldest overdue checkin days
      let checkinOverdueDays = 0;
      if (overdueCheckins.length > 0) {
        const oldestCheckin = overdueCheckins.reduce((oldest, current) => {
          return new Date(current.due_date) < new Date(oldest.due_date) ? current : oldest;
        });
        checkinOverdueDays = Math.floor((today.getTime() - new Date(oldestCheckin.due_date).getTime()) / (1000 * 60 * 60 * 24));
      }

      // Process each rule
      for (const rule of rules) {
        let triggered = false;
        let reason = "";
        let evidence: Record<string, unknown> = {};

        switch (rule.rule_type) {
          case "no_session_days":
            if (daysSinceLastSession >= rule.threshold) {
              triggered = true;
              reason = `Sem sessão há ${daysSinceLastSession} dias`;
              evidence = {
                last_session_date: sessionsResult.data?.[0]?.scheduled_at || null,
                days_since: daysSinceLastSession,
                threshold: rule.threshold,
              };
            }
            break;

          case "overdue_actions_count":
            if (overdueActions.length >= rule.threshold) {
              triggered = true;
              reason = `${overdueActions.length} ações em atraso`;
              evidence = {
                overdue_count: overdueActions.length,
                actions: overdueActions.slice(0, 5).map(a => ({ id: a.id, title: a.title, due_date: a.due_date })),
                threshold: rule.threshold,
              };
            }
            break;

          case "missing_kpis_current_month":
            if (missingKpis.length >= rule.threshold) {
              triggered = true;
              reason = `${missingKpis.length} KPI(s) por preencher este mês`;
              evidence = {
                missing_count: missingKpis.length,
                missing_kpis: missingKpis.slice(0, 5),
                current_month: currentMonth,
                threshold: rule.threshold,
              };
            }
            break;

          case "checkin_overdue_days":
            if (checkinOverdueDays >= rule.threshold) {
              triggered = true;
              reason = `Check-in em atraso há ${checkinOverdueDays} dias`;
              evidence = {
                overdue_days: checkinOverdueDays,
                pending_checkins: overdueCheckins.length,
                threshold: rule.threshold,
              };
            }
            break;

          case "milestone_overdue_count":
            if (overdueMilestones.length >= rule.threshold) {
              triggered = true;
              reason = `${overdueMilestones.length} milestone(s) em atraso`;
              evidence = {
                overdue_count: overdueMilestones.length,
                milestones: overdueMilestones.slice(0, 5).map(m => ({ id: m.id, title: m.title, target_date: m.target_date })),
                threshold: rule.threshold,
              };
            }
            break;
        }

        if (triggered) {
          wsAlerts.push({
            workspace_id: workspace.id,
            rule_type: rule.rule_type,
            severity: rule.severity,
            reason,
            evidence_json: evidence,
          });
        }
      }

      newAlerts.push(...wsAlerts);
    }

    // Get existing active alerts
    const { data: existingAlerts } = await supabase
      .from("workspace_alerts")
      .select("id, workspace_id, rule_type")
      .eq("status", "active");

    // Determine which alerts to resolve (exist but no longer triggered)
    const newAlertKeys = new Set(newAlerts.map(a => `${a.workspace_id}:${a.rule_type}`));
    for (const existing of existingAlerts || []) {
      const key = `${existing.workspace_id}:${existing.rule_type}`;
      if (!newAlertKeys.has(key)) {
        resolvedAlertIds.push(existing.id);
      }
    }

    // Resolve old alerts
    if (resolvedAlertIds.length > 0) {
      await supabase
        .from("workspace_alerts")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .in("id", resolvedAlertIds);
      console.log(`Resolved ${resolvedAlertIds.length} alerts`);
    }

    // Upsert new alerts (only if not already exists with same status)
    const existingActiveKeys = new Set((existingAlerts || []).map(a => `${a.workspace_id}:${a.rule_type}`));
    const alertsToInsert = newAlerts.filter(a => !existingActiveKeys.has(`${a.workspace_id}:${a.rule_type}`));

    if (alertsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("workspace_alerts")
        .insert(alertsToInsert.map(a => ({
          ...a,
          status: "active",
        })));

      if (insertError) {
        console.error("Error inserting alerts:", insertError);
      } else {
        console.log(`Created ${alertsToInsert.length} new alerts`);
      }
    }

    // Update existing alerts with new evidence
    const alertsToUpdate = newAlerts.filter(a => existingActiveKeys.has(`${a.workspace_id}:${a.rule_type}`));
    for (const alert of alertsToUpdate) {
      await supabase
        .from("workspace_alerts")
        .update({
          reason: alert.reason,
          evidence_json: alert.evidence_json,
          severity: alert.severity,
        })
        .eq("workspace_id", alert.workspace_id)
        .eq("rule_type", alert.rule_type)
        .eq("status", "active");
    }

    console.log(`Alerts recomputation complete. Active: ${newAlerts.length}, Resolved: ${resolvedAlertIds.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        activeAlerts: newAlerts.length,
        resolvedAlerts: resolvedAlertIds.length,
        newAlerts: alertsToInsert.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in recompute-workspace-alerts:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
