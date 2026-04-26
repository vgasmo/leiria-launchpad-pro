import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { requireCronSecret } from "../_shared/security.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Security guard: require cron secret for scheduled jobs
  const cronAuth = requireCronSecret(req);
  if ("error" in cronAuth) {
    return cronAuth.error;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting weekly health digest...");

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get staff/consultors with weekly_health_digest enabled
    const { data: staffRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "consultor"]);

    const staffIds = staffRoles?.map(r => r.user_id) || [];

    // Filter by preferences
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .in("user_id", staffIds)
      .eq("weekly_health_digest", true);

    const prefUserIds = preferences?.map(p => p.user_id) || [];
    
    // Users without explicit prefs default to receiving digest
    const usersToNotify = staffIds.filter(id => 
      !preferences?.find(p => p.user_id === id) || prefUserIds.includes(id)
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", usersToNotify);

    if (!profiles || profiles.length === 0) {
      console.log("No users to send digest to");
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active workspaces with health data
    const { data: workspacesRaw } = await supabase
      .from("workspaces")
      .select(`
        id,
        health_score,
        health_score_numeric,
        health_score_components,
        startup:startups(name),
        program:programs(name)
      `)
      .eq("status", "active")
      .order("health_score_numeric", { ascending: true });

    // Helper to get startup name (supabase returns joined data as array)
    const getStartupName = (ws: any): string => {
      if (!ws?.startup) return "Workspace";
      if (Array.isArray(ws.startup)) return ws.startup[0]?.name || "Workspace";
      return ws.startup.name || "Workspace";
    };

    const workspaces = workspacesRaw || [];

    // Get health history for trends
    const workspaceIds = workspaces?.map(w => w.id) || [];
    const { data: historyData } = await supabase
      .from("workspace_health_history")
      .select("workspace_id, score_numeric, computed_at")
      .in("workspace_id", workspaceIds)
      .gte("computed_at", weekAgo.toISOString())
      .order("computed_at", { ascending: true });

    // Calculate trends
    const trendsMap: Record<string, { start: number; end: number; delta: number }> = {};
    for (const ws of workspaces || []) {
      const wsHistory = historyData?.filter(h => h.workspace_id === ws.id) || [];
      if (wsHistory.length >= 2) {
        const start = wsHistory[0].score_numeric;
        const end = wsHistory[wsHistory.length - 1].score_numeric;
        trendsMap[ws.id] = { start, end, delta: end - start };
      }
    }

    // Get active alerts
    const { data: activeAlerts } = await supabase
      .from("workspace_health_alerts")
      .select("workspace_id, severity")
      .eq("status", "active");

    const alertsByWorkspace: Record<string, { critical: number; warning: number }> = {};
    for (const alert of activeAlerts || []) {
      if (!alertsByWorkspace[alert.workspace_id]) {
        alertsByWorkspace[alert.workspace_id] = { critical: 0, warning: 0 };
      }
      if (alert.severity === "critical") {
        alertsByWorkspace[alert.workspace_id].critical++;
      } else {
        alertsByWorkspace[alert.workspace_id].warning++;
      }
    }

    // Categorize workspaces
    const atRisk = workspaces?.filter(w => w.health_score === "at_risk" || w.health_score === "critical") || [];
    const mostImproved = Object.entries(trendsMap)
      .filter(([, t]) => t.delta > 0)
      .sort((a, b) => b[1].delta - a[1].delta)
      .slice(0, 5);
    const mostDeclined = Object.entries(trendsMap)
      .filter(([, t]) => t.delta < 0)
      .sort((a, b) => a[1].delta - b[1].delta)
      .slice(0, 5);

    const baseUrl = Deno.env.get("PUBLIC_APP_URL") || "https://fb.startupleiria.com";

    let emailsSent = 0;

    for (const profile of profiles) {
      try {
        const atRiskHtml = atRisk.map(w => {
          const alerts = alertsByWorkspace[w.id] || { critical: 0, warning: 0 };
          return `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                <a href="${baseUrl}/workspace/${w.id}" style="color: #2563eb; text-decoration: none; font-weight: 500;">
                  ${getStartupName(w)}
                </a>
              </td>
                </a>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                <span style="background: ${w.health_score === 'critical' ? '#fef2f2' : '#fef3c7'}; color: ${w.health_score === 'critical' ? '#dc2626' : '#d97706'}; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                  ${w.health_score_numeric}
                </span>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                ${alerts.critical > 0 ? `<span style="color: #dc2626;">🔴 ${alerts.critical}</span>` : ''}
                ${alerts.warning > 0 ? `<span style="color: #d97706;">🟡 ${alerts.warning}</span>` : ''}
                ${alerts.critical === 0 && alerts.warning === 0 ? '-' : ''}
              </td>
            </tr>
          `;
        }).join('');

        const improvedHtml = mostImproved.map(([id, trend]) => {
          const ws = workspaces?.find(w => w.id === id);
          return `
            <li style="padding: 8px 0;">
              <strong>${getStartupName(ws)}</strong>: 
              <span style="color: #059669;">+${trend.delta} pts</span>
              (${trend.start} → ${trend.end})
            </li>
          `;
        }).join('');

        const declinedHtml = mostDeclined.map(([id, trend]) => {
          const ws = workspaces?.find(w => w.id === id);
          return `
            <li style="padding: 8px 0;">
              <strong>${getStartupName(ws)}</strong>: 
              <span style="color: #dc2626;">${trend.delta} pts</span>
              (${trend.start} → ${trend.end})
            </li>
          `;
        }).join('');

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1f2937; margin-bottom: 20px;">📊 Weekly Health Digest</h1>
            <p style="color: #6b7280; margin-bottom: 30px;">
              Week of ${weekAgo.toLocaleDateString('pt-PT')} - ${now.toLocaleDateString('pt-PT')}
            </p>

            <h2 style="color: #dc2626; margin-bottom: 15px;">⚠️ Workspaces Needing Attention (${atRisk.length})</h2>
            ${atRisk.length > 0 ? `
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Startup</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Score</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Alerts</th>
                  </tr>
                </thead>
                <tbody>
                  ${atRiskHtml}
                </tbody>
              </table>
            ` : '<p style="color: #6b7280; margin-bottom: 30px;">🎉 No workspaces at risk this week!</p>'}

            ${mostImproved.length > 0 ? `
              <h2 style="color: #059669; margin-bottom: 15px;">📈 Most Improved</h2>
              <ul style="list-style: none; padding: 0; margin-bottom: 30px;">${improvedHtml}</ul>
            ` : ''}

            ${mostDeclined.length > 0 ? `
              <h2 style="color: #f59e0b; margin-bottom: 15px;">📉 Biggest Declines</h2>
              <ul style="list-style: none; padding: 0; margin-bottom: 30px;">${declinedHtml}</ul>
            ` : ''}

            <a href="${baseUrl}/my-workspaces" 
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
              View All Workspaces
            </a>

            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
              You're receiving this weekly digest. 
              <a href="${baseUrl}/settings" style="color: #6b7280;">Manage preferences</a>
            </p>
          </div>
        `;

        await resend.emails.send({
          from: "Startup Leiria <noreply@startupleiria.com>",
          to: [profile.email],
          subject: `📊 Weekly Health Digest - ${atRisk.length} workspaces need attention`,
          html,
        });

        emailsSent++;
        console.log(`Digest sent to ${profile.email}`);

        await new Promise(r => setTimeout(r, 600));
      } catch (emailError) {
        console.error(`Failed to send digest to ${profile.email}:`, emailError);
      }
    }

    console.log(`Weekly digest emails sent: ${emailsSent}`);

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-weekly-health-digest:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
