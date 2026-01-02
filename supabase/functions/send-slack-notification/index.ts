import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SlackNotificationRequest {
  workspace_id: string;
  message: string;
  title?: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id, message, title, type = "info", link } = await req.json() as SlackNotificationRequest;

    if (!workspace_id || !message) {
      return new Response(
        JSON.stringify({ error: "workspace_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending Slack notification for workspace ${workspace_id}`);

    // Get workspace users with Slack enabled
    const { data: workspaceUsers, error: usersError } = await supabase
      .from("workspace_users")
      .select(`
        user_id,
        notification_preferences(slack_enabled, slack_webhook_url)
      `)
      .eq("workspace_id", workspace_id)
      .eq("active", true);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    const emoji = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "🚨",
    }[type];

    const color = {
      info: "#3b82f6",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
    }[type];

    let sentCount = 0;

    for (const user of workspaceUsers || []) {
      const prefs = user.notification_preferences?.[0];
      
      if (!prefs?.slack_enabled || !prefs?.slack_webhook_url) {
        continue;
      }

      try {
        const blocks: any[] = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: title ? `${emoji} *${title}*\n${message}` : `${emoji} ${message}`,
            },
          },
        ];

        if (link) {
          blocks.push({
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "View Details" },
                url: link,
              },
            ],
          });
        }

        await fetch(prefs.slack_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: title ? `${emoji} ${title}: ${message}` : `${emoji} ${message}`,
            attachments: [
              {
                color,
                blocks,
              },
            ],
          }),
        });

        sentCount++;
        console.log(`Slack notification sent to user ${user.user_id}`);
      } catch (slackError) {
        console.error(`Error sending to user ${user.user_id}:`, slackError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent_count: sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-slack-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
