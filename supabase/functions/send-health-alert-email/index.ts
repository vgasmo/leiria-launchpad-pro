import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthAlertEmailRequest {
  alert_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { alert_id }: HealthAlertEmailRequest = await req.json();

    console.log(`Processing health alert email for alert: ${alert_id}`);

    // Get alert details
    const { data: alert, error: alertError } = await supabase
      .from("workspace_health_alerts")
      .select(`
        *,
        workspace:workspaces(
          id,
          program_id,
          startup:startups(name)
        )
      `)
      .eq("id", alert_id)
      .single();

    if (alertError || !alert) {
      throw new Error(`Alert not found: ${alert_id}`);
    }

    // Get workspace members with email_on_health_drop enabled
    const { data: workspaceUsers } = await supabase
      .from("workspace_users")
      .select("user_id")
      .eq("workspace_id", alert.workspace_id)
      .eq("active", true);

    const userIds = workspaceUsers?.map(wu => wu.user_id) || [];

    // Get users with notification preferences
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .in("user_id", userIds)
      .eq("email_on_health_drop", true);

    const prefUserIds = preferences?.map(p => p.user_id) || [];

    // Get user emails (users without explicit prefs default to receiving emails)
    const usersToNotify = userIds.filter(id => 
      !preferences?.find(p => p.user_id === id) || prefUserIds.includes(id)
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", usersToNotify);

    if (!profiles || profiles.length === 0) {
      console.log("No users to notify");
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startupName = alert.workspace?.startup?.name || "Workspace";
    const evidence = alert.evidence_json || {};
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "";

    let emailsSent = 0;

    for (const profile of profiles) {
      try {
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: ${alert.severity === 'critical' ? '#dc2626' : '#f59e0b'}; margin-bottom: 20px;">
              ⚠️ Health Alert: ${startupName}
            </h1>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px;">${alert.reason}</h2>
              <p style="color: #6b7280; margin: 0;">
                Severity: <strong style="color: ${alert.severity === 'critical' ? '#dc2626' : '#f59e0b'}">${alert.severity.toUpperCase()}</strong>
              </p>
            </div>

            ${evidence.prev_score !== undefined ? `
              <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 10px;">Score Change</h3>
                <p style="font-size: 24px; margin: 0;">
                  <span style="color: #6b7280;">${evidence.prev_score}</span>
                  <span style="margin: 0 10px;">→</span>
                  <span style="color: ${alert.severity === 'critical' ? '#dc2626' : '#f59e0b'}">${evidence.new_score}</span>
                  <span style="color: #dc2626; font-size: 14px; margin-left: 10px;">(-${evidence.delta || 0})</span>
                </p>
              </div>
            ` : ''}

            <a href="${baseUrl}/workspace/${alert.workspace_id}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
              View Workspace
            </a>

            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
              You're receiving this because you have health alerts enabled. 
              <a href="${baseUrl}/settings" style="color: #6b7280;">Manage preferences</a>
            </p>
          </div>
        `;

        await resend.emails.send({
          from: "Startup Leiria <noreply@startupleiria.com>",
          to: [profile.email],
          subject: `⚠️ Health Alert: ${startupName} - ${alert.severity.toUpperCase()}`,
          html,
        });

        emailsSent++;
        console.log(`Email sent to ${profile.email}`);

        // Rate limiting delay
        await new Promise(r => setTimeout(r, 600));
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
      }
    }

    console.log(`Health alert emails sent: ${emailsSent}`);

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-health-alert-email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
