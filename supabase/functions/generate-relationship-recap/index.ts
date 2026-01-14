import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface RecapRequest {
  funnel_item_id?: string;
  workspace_id?: string;
  language?: "pt" | "en";
  max_items?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check feature flag
    const { data: flag } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "crm_ai_recap")
      .is("program_id", null)
      .single();

    if (!flag?.enabled) {
      return new Response(JSON.stringify({ error: "Feature disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RecapRequest = await req.json();
    const { funnel_item_id, workspace_id, language = "pt", max_items = 40 } = body;

    if (!funnel_item_id && !workspace_id) {
      return new Response(JSON.stringify({ error: "funnel_item_id or workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify access
    if (workspace_id) {
      const { data: access } = await userClient
        .from("workspaces")
        .select("id")
        .eq("id", workspace_id)
        .single();
      
      if (!access) {
        return new Response(JSON.stringify({ error: "Workspace access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Staff check for funnel access
    if (funnel_item_id) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isStaff = roles?.some((r) => r.role === "admin" || r.role === "consultor");
      if (!isStaff) {
        return new Response(JSON.stringify({ error: "Funnel access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Gather activities
    let activities: any[] = [];

    // Communication log entries
    const commQuery = supabase
      .from("communication_log")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(max_items);

    if (workspace_id) {
      commQuery.eq("workspace_id", workspace_id);
    } else if (funnel_item_id) {
      commQuery.eq("funnel_item_id", funnel_item_id);
    }

    const { data: commLogs } = await commQuery;
    if (commLogs) {
      activities.push(...commLogs.map((c) => ({
        type: c.activity_type,
        date: c.occurred_at,
        subject: c.subject,
        preview: c.preview || c.body?.substring(0, 300),
        direction: c.direction,
      })));
    }

    // Session notes if workspace
    if (workspace_id) {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, title, scheduled_at, notes, ai_summary")
        .eq("workspace_id", workspace_id)
        .order("scheduled_at", { ascending: false })
        .limit(10);

      if (sessions) {
        activities.push(...sessions.map((s) => ({
          type: "meeting",
          date: s.scheduled_at,
          subject: s.title,
          preview: s.ai_summary || s.notes?.substring(0, 300),
        })));
      }
    }

    // Sort by date
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    activities = activities.slice(0, max_items);

    if (activities.length === 0) {
      return new Response(JSON.stringify({
        summary: language === "pt" ? "Sem interações registadas." : "No interactions recorded.",
        key_points: [],
        open_loops: [],
        risks: [],
        next_best_actions: [],
        items_analyzed: 0,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get context for the lead/workspace
    let contextName = "";
    if (funnel_item_id) {
      const { data: lead } = await supabase
        .from("funnel_items")
        .select("contact_name, organization_name, stage")
        .eq("id", funnel_item_id)
        .single();
      if (lead) {
        contextName = lead.organization_name || lead.contact_name || "Lead";
      }
    } else if (workspace_id) {
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("startups(name)")
        .eq("id", workspace_id)
        .single();
      if (workspace?.startups) {
        contextName = (workspace.startups as any).name || "Startup";
      }
    }

    const systemPrompt = language === "pt" 
      ? `És um assistente de CRM para consultores de startups. Analisa o histórico de interações com "${contextName}" e gera um resumo estruturado. Responde SEMPRE em português de Portugal.`
      : `You are a CRM assistant for startup consultants. Analyze the interaction history with "${contextName}" and generate a structured summary. Always respond in English.`;

    const userPrompt = language === "pt"
      ? `Analisa estas ${activities.length} interações e gera:
1. Um parágrafo resumo (máx 100 palavras)
2. 3-5 pontos-chave da relação
3. 1-3 "open loops" (temas pendentes/promessas)
4. 0-2 riscos identificados
5. 2-3 próximas ações recomendadas

Interações (mais recentes primeiro):
${activities.map((a, i) => `${i + 1}. [${a.type}] ${a.date}: ${a.subject || ""} - ${a.preview || ""}`).join("\n")}

Responde APENAS em JSON válido com as keys: summary, key_points (array), open_loops (array), risks (array), next_best_actions (array).`
      : `Analyze these ${activities.length} interactions and generate:
1. A summary paragraph (max 100 words)
2. 3-5 key relationship points
3. 1-3 open loops (pending topics/promises)
4. 0-2 identified risks
5. 2-3 recommended next actions

Interactions (most recent first):
${activities.map((a, i) => `${i + 1}. [${a.type}] ${a.date}: ${a.subject || ""} - ${a.preview || ""}`).join("\n")}

Respond ONLY with valid JSON with keys: summary, key_points (array), open_loops (array), risks (array), next_best_actions (array).`;

    // Call AI
    const aiResponse = await fetch("https://api.lovable.dev/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", errorText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    let recap;
    try {
      recap = JSON.parse(content);
    } catch {
      recap = {
        summary: content,
        key_points: [],
        open_loops: [],
        risks: [],
        next_best_actions: [],
      };
    }

    // Store recap
    const { error: insertError } = await supabase
      .from("relationship_recaps")
      .upsert({
        workspace_id: workspace_id || null,
        funnel_item_id: funnel_item_id || null,
        language,
        summary: recap.summary || "",
        key_points: recap.key_points || [],
        open_loops: recap.open_loops || [],
        risks: recap.risks || [],
        next_best_actions: recap.next_best_actions || [],
        items_analyzed: activities.length,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
      }, {
        onConflict: workspace_id ? "workspace_id" : "funnel_item_id",
      });

    if (insertError) {
      console.warn("Failed to store recap:", insertError);
    }

    return new Response(JSON.stringify({
      ...recap,
      items_analyzed: activities.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-relationship-recap error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
