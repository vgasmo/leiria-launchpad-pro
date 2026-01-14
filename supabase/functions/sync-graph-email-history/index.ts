import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SyncRequest {
  funnel_item_id?: string;
  workspace_id?: string;
  consultant_user_id: string;
  lookback_days?: number;
  max_messages?: number;
}

interface SyncResult {
  inserted: number;
  skipped: number;
  errors: string[];
  mailbox: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, authHeader.replace("Bearer ", ""), {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is staff
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isStaff = roles?.some((r) => r.role === "admin" || r.role === "consultor");
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden: Staff only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check feature flag
    const { data: flag } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "crm_graph_email_sync")
      .is("program_id", null)
      .single();

    if (!flag?.enabled) {
      return new Response(JSON.stringify({ error: "Feature disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SyncRequest = await req.json();
    const { funnel_item_id, workspace_id, consultant_user_id, lookback_days = 90, max_messages = 200 } = body;

    if (!funnel_item_id && !workspace_id) {
      return new Response(JSON.stringify({ error: "funnel_item_id or workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!consultant_user_id) {
      return new Response(JSON.stringify({ error: "consultant_user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Graph integration settings
    const { data: integrationSettings } = await supabase
      .from("global_integration_settings")
      .select("settings_json, is_enabled")
      .eq("integration_type", "microsoft_graph")
      .single();

    if (!integrationSettings?.is_enabled) {
      return new Response(JSON.stringify({ error: "Microsoft Graph not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const graphSettings = integrationSettings.settings_json as {
      tenant_id?: string;
      client_id?: string;
      client_secret?: string;
    };

    if (!graphSettings.tenant_id || !graphSettings.client_id || !graphSettings.client_secret) {
      return new Response(JSON.stringify({ error: "Graph credentials incomplete" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get consultant email
    const { data: consultantProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", consultant_user_id)
      .single();

    if (!consultantProfile?.email) {
      return new Response(JSON.stringify({ error: "Consultant email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get contact emails to filter
    let contactEmails: string[] = [];

    if (funnel_item_id) {
      const { data: lead } = await supabase
        .from("funnel_items")
        .select("contact_email")
        .eq("id", funnel_item_id)
        .single();
      if (lead?.contact_email) {
        contactEmails.push(lead.contact_email.toLowerCase());
      }
    }

    if (workspace_id) {
      // Get founder emails
      const { data: workspaceUsers } = await supabase
        .from("workspace_users")
        .select("user_id, role")
        .eq("workspace_id", workspace_id)
        .eq("role", "founder")
        .eq("active", true);

      if (workspaceUsers?.length) {
        const founderIds = workspaceUsers.map((wu) => wu.user_id);
        const { data: founderProfiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", founderIds);
        
        founderProfiles?.forEach((p) => {
          if (p.email) contactEmails.push(p.email.toLowerCase());
        });
      }

      // Get startup main email
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("startup_id")
        .eq("id", workspace_id)
        .single();

      if (workspace?.startup_id) {
        const { data: startup } = await supabase
          .from("startups")
          .select("main_contact_email")
          .eq("id", workspace.startup_id)
          .single();
        if (startup?.main_contact_email) {
          contactEmails.push(startup.main_contact_email.toLowerCase());
        }
      }
    }

    contactEmails = [...new Set(contactEmails)];

    if (contactEmails.length === 0) {
      return new Response(JSON.stringify({ 
        inserted: 0, 
        skipped: 0, 
        errors: ["No contact emails found"], 
        mailbox: consultantProfile.email 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Graph access token
    const tokenUrl = `https://login.microsoftonline.com/${graphSettings.tenant_id}/oauth2/v2.0/token`;
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: graphSettings.client_id,
        client_secret: graphSettings.client_secret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Token error:", errorText);
      return new Response(JSON.stringify({ error: "Graph auth failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const result: SyncResult = {
      inserted: 0,
      skipped: 0,
      errors: [],
      mailbox: consultantProfile.email,
    };

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - lookback_days);
    const filterDate = lookbackDate.toISOString();

    // Fetch messages from inbox and sent folders
    const folders = ["inbox", "sentitems"];
    
    for (const folder of folders) {
      const direction = folder === "inbox" ? "inbound" : "outbound";
      
      try {
        const messagesUrl = `https://graph.microsoft.com/v1.0/users/${consultantProfile.email}/mailFolders/${folder}/messages?$select=id,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime&$filter=receivedDateTime ge ${filterDate}&$top=${max_messages}&$orderby=receivedDateTime desc`;
        
        const messagesRes = await fetch(messagesUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!messagesRes.ok) {
          result.errors.push(`Failed to fetch ${folder}: ${messagesRes.status}`);
          continue;
        }

        const messagesData = await messagesRes.json();
        const messages = messagesData.value || [];

        for (const msg of messages) {
          // Check if message involves any contact email
          const allParticipants = [
            msg.from?.emailAddress?.address,
            ...(msg.toRecipients || []).map((r: any) => r.emailAddress?.address),
            ...(msg.ccRecipients || []).map((r: any) => r.emailAddress?.address),
          ].filter(Boolean).map((e: string) => e.toLowerCase());

          const hasContact = allParticipants.some((p) => contactEmails.includes(p));
          if (!hasContact) continue;

          // Upsert into communication_log
          const { error } = await supabase
            .from("communication_log")
            .upsert({
              workspace_id: workspace_id || null,
              funnel_item_id: funnel_item_id || null,
              activity_type: "email",
              channel: "email",
              direction,
              subject: msg.subject?.substring(0, 500),
              preview: msg.bodyPreview?.substring(0, 500),
              from_address: msg.from?.emailAddress?.address,
              occurred_at: msg.receivedDateTime || msg.sentDateTime,
              visibility: "staff",
              external_source: "ms_graph",
              external_id: msg.id,
              metadata_json: {
                to: msg.toRecipients?.map((r: any) => r.emailAddress?.address),
                cc: msg.ccRecipients?.map((r: any) => r.emailAddress?.address),
              },
            }, {
              onConflict: "external_source,external_id",
              ignoreDuplicates: true,
            });

          if (error) {
            if (error.code === "23505") {
              result.skipped++;
            } else {
              result.errors.push(`Insert error: ${error.message}`);
            }
          } else {
            result.inserted++;
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        result.errors.push(`${folder} error: ${errorMessage}`);
      }
    }

    console.log(`Email sync completed: ${JSON.stringify(result)}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-graph-email-history error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
