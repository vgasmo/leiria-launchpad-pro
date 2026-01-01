import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DigestData {
  userId: string;
  email: string;
  fullName: string;
  overdueActions: number;
  criticalHealth: number;
  atRiskHealth: number;
  upcomingMeetings: number;
  pendingKpis: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting email digest job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get users who have email digest enabled
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select(`
        user_id,
        digest_frequency,
        digest_day,
        last_digest_sent_at
      `)
      .eq("email_digest_enabled", true);

    if (prefError) {
      console.error("Error fetching preferences:", prefError);
      throw prefError;
    }

    console.log(`Found ${preferences?.length || 0} users with digest enabled`);

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const emailsSent: string[] = [];

    for (const pref of preferences || []) {
      // Check if it's time to send (weekly on configured day, or daily)
      const shouldSend = pref.digest_frequency === "daily" || 
        (pref.digest_frequency === "weekly" && dayOfWeek === (pref.digest_day || 1));

      if (!shouldSend) {
        console.log(`Skipping user ${pref.user_id} - not scheduled for today`);
        continue;
      }

      // Check if already sent today
      if (pref.last_digest_sent_at) {
        const lastSent = new Date(pref.last_digest_sent_at);
        const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSent < 20) {
          console.log(`Skipping user ${pref.user_id} - already sent in last 20 hours`);
          continue;
        }
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", pref.user_id)
        .single();

      if (!profile?.email) {
        console.log(`Skipping user ${pref.user_id} - no email`);
        continue;
      }

      // Get user's workspaces
      const { data: workspaceUsers } = await supabase
        .from("workspace_users")
        .select("workspace_id")
        .eq("user_id", pref.user_id)
        .eq("active", true);

      const workspaceIds = workspaceUsers?.map(wu => wu.workspace_id) || [];

      if (workspaceIds.length === 0) {
        console.log(`Skipping user ${pref.user_id} - no workspaces`);
        continue;
      }

      // Get overdue actions count
      const { count: overdueCount } = await supabase
        .from("action_items")
        .select("*", { count: "exact", head: true })
        .in("workspace_id", workspaceIds)
        .in("status", ["pending", "in_progress"])
        .lt("due_date", now.toISOString().split("T")[0]);

      // Get critical health workspaces
      const { count: criticalCount } = await supabase
        .from("workspaces")
        .select("*", { count: "exact", head: true })
        .in("id", workspaceIds)
        .eq("health_score", "critical");

      // Get at-risk health workspaces
      const { count: atRiskCount } = await supabase
        .from("workspaces")
        .select("*", { count: "exact", head: true })
        .in("id", workspaceIds)
        .eq("health_score", "at_risk");

      // Get upcoming meetings in next 7 days
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const { count: meetingsCount } = await supabase
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .in("workspace_id", workspaceIds)
        .gte("starts_at", now.toISOString())
        .lte("starts_at", nextWeek.toISOString());

      const digestData: DigestData = {
        userId: pref.user_id,
        email: profile.email,
        fullName: profile.full_name || "User",
        overdueActions: overdueCount || 0,
        criticalHealth: criticalCount || 0,
        atRiskHealth: atRiskCount || 0,
        upcomingMeetings: meetingsCount || 0,
        pendingKpis: 0, // Calculated separately if needed
      };

      // Only send if there's something to report
      const hasContent = digestData.overdueActions > 0 || 
        digestData.criticalHealth > 0 || 
        digestData.atRiskHealth > 0;

      if (!hasContent) {
        console.log(`Skipping user ${pref.user_id} - nothing to report`);
        continue;
      }

      // Build email content
      const emailHtml = buildDigestEmail(digestData);

      // Send email via Resend API
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Startup Leiria <noreply@startupleiria.com>",
            to: [digestData.email],
            subject: `Weekly Digest: ${digestData.overdueActions} items need attention`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        const result = await emailResponse.json();
        console.log(`Email sent to ${digestData.email}:`, result);
        emailsSent.push(digestData.email);

        // Update last_digest_sent_at
        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: now.toISOString() })
          .eq("user_id", pref.user_id);
      } catch (emailError) {
        console.error(`Failed to send email to ${digestData.email}:`, emailError);
      }
    }

    console.log(`Digest job complete. Sent ${emailsSent.length} emails.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: emailsSent.length,
        recipients: emailsSent 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email-digest function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

function buildDigestEmail(data: DigestData): string {
  const items: string[] = [];

  if (data.overdueActions > 0) {
    items.push(`<li>⚠️ <strong>${data.overdueActions}</strong> overdue action items</li>`);
  }
  if (data.criticalHealth > 0) {
    items.push(`<li>🔴 <strong>${data.criticalHealth}</strong> startup(s) in critical health</li>`);
  }
  if (data.atRiskHealth > 0) {
    items.push(`<li>🟠 <strong>${data.atRiskHealth}</strong> startup(s) at risk</li>`);
  }
  if (data.upcomingMeetings > 0) {
    items.push(`<li>📅 <strong>${data.upcomingMeetings}</strong> upcoming meetings this week</li>`);
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #c8e53d 0%, #c03c3c 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Weekly Digest</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Startup Leiria</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
        <p style="margin-top: 0;">Hi ${data.fullName},</p>
        
        <p>Here's your weekly summary of items that need your attention:</p>
        
        <ul style="background: white; padding: 20px 20px 20px 40px; border-radius: 8px; border-left: 4px solid #c03c3c;">
          ${items.join("\n          ")}
        </ul>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://apxzuslwhjujgrcsfzqw.lovableproject.com/my-workspaces" 
             style="display: inline-block; background: #c03c3c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            View Dashboard
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 12px; text-align: center; margin-bottom: 0;">
          You're receiving this because you have email digests enabled.<br>
          <a href="https://apxzuslwhjujgrcsfzqw.lovableproject.com/settings" style="color: #c03c3c;">Manage preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;
}
