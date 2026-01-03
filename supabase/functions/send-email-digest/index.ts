import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
import { requireCronSecret, generateRequestId, createLogger } from '../_shared/security.ts';

const FUNCTION_NAME = 'send-email-digest';
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "https://startupleiria.com";

interface DigestData {
  userId: string;
  email: string;
  fullName: string;
  overdueActions: number;
  criticalHealth: number;
  atRiskHealth: number;
  upcomingSessions: number;
  pendingKpis: number;
}

// HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  const log = createLogger(FUNCTION_NAME, requestId);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // SECURITY: Require cron secret for system-initiated calls
    const authResult = requireCronSecret(req);
    if ('error' in authResult) {
      log.warn('Unauthorized access attempt');
      return authResult.error;
    }

    log.info('Starting email digest job');

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
      log.error('Error fetching preferences', prefError);
      throw prefError;
    }

    log.info('Found users with digest enabled', { count: preferences?.length || 0 });

    const now = new Date();
    const dayOfWeek = now.getDay();
    const emailsSent: string[] = [];

    for (const pref of preferences || []) {
      // Check if it's time to send
      const shouldSend = pref.digest_frequency === "daily" || 
        (pref.digest_frequency === "weekly" && dayOfWeek === (pref.digest_day || 1));

      if (!shouldSend) {
        continue;
      }

      // Check if already sent today
      if (pref.last_digest_sent_at) {
        const lastSent = new Date(pref.last_digest_sent_at);
        const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSent < 20) {
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

      // Get upcoming sessions in next 7 days
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const { count: sessionsCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .in("workspace_id", workspaceIds)
        .gte("scheduled_at", now.toISOString())
        .lte("scheduled_at", nextWeek.toISOString());

      const digestData: DigestData = {
        userId: pref.user_id,
        email: profile.email,
        fullName: profile.full_name || "User",
        overdueActions: overdueCount || 0,
        criticalHealth: criticalCount || 0,
        atRiskHealth: atRiskCount || 0,
        upcomingSessions: sessionsCount || 0,
        pendingKpis: 0,
      };

      // Only send if there's something to report
      const hasContent = digestData.overdueActions > 0 || 
        digestData.criticalHealth > 0 || 
        digestData.atRiskHealth > 0;

      if (!hasContent) {
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
        log.info('Email sent', { email: digestData.email, emailId: result.id });
        emailsSent.push(digestData.email);

        // Update last_digest_sent_at
        await supabase
          .from("notification_preferences")
          .update({ last_digest_sent_at: now.toISOString() })
          .eq("user_id", pref.user_id);
      } catch (emailError) {
        log.error('Failed to send email', emailError, { email: digestData.email });
      }
    }

    log.info('Digest job complete', { emailsSent: emailsSent.length });

    return corsJsonResponse({ 
      success: true, 
      emailsSent: emailsSent.length,
      recipients: emailsSent 
    }, req);

  } catch (error) {
    log.error('Fatal error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return corsJsonResponse({ error: message, code: 'INTERNAL_ERROR' }, req, 500);
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
  if (data.upcomingSessions > 0) {
    items.push(`<li>📅 <strong>${data.upcomingSessions}</strong> upcoming sessions this week</li>`);
  }

  const safeFullName = escapeHtml(data.fullName);

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
        <p style="margin-top: 0;">Hi ${safeFullName},</p>
        
        <p>Here's your weekly summary of items that need your attention:</p>
        
        <ul style="background: white; padding: 20px 20px 20px 40px; border-radius: 8px; border-left: 4px solid #c03c3c;">
          ${items.join("\n          ")}
        </ul>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${SITE_URL}/my-workspaces" 
             style="display: inline-block; background: #c03c3c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            View Dashboard
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 12px; text-align: center; margin-bottom: 0;">
          You're receiving this because you have email digests enabled.<br>
          <a href="${SITE_URL}/settings" style="color: #c03c3c;">Manage preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;
}
