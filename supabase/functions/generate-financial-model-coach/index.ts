import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIReview {
  summary: string;
  questions: { q: string; why: string }[];
  risks: { risk: string; severity: "low" | "medium" | "high"; mitigation: string }[];
  recommended_actions: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    due_in_days: number;
    owner_hint: "founder" | "staff";
  }[];
  next_session_agenda: string[];
  investor_narrative: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { version_id, mode = "full" } = await req.json();
    
    if (!version_id) {
      return new Response(JSON.stringify({ error: "version_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating AI review for financial model: ${version_id}, mode: ${mode}`);

    // Get version with workspace details
    const { data: version, error: versionError } = await supabase
      .from("financial_model_versions")
      .select("*, workspaces(id, stage, program_id, health_score, health_label, startup_id)")
      .eq("id", version_id)
      .single();

    if (versionError || !version) {
      throw new Error(`Version not found: ${versionError?.message}`);
    }

    const metrics = version.key_metrics_json as Record<string, number | null> || {};
    const workspace = version.workspaces;
    const workspaceId = version.workspace_id;

    // Get recent sessions
    const { data: recentSessions } = await supabase
      .from("sessions")
      .select("title, notes, ai_summary, scheduled_at")
      .eq("workspace_id", workspaceId)
      .order("scheduled_at", { ascending: false })
      .limit(2);

    // Get overdue actions count
    const { data: overdueActions } = await supabase
      .from("action_items")
      .select("id, title, due_date, priority")
      .eq("workspace_id", workspaceId)
      .in("status", ["pending", "in_progress"])
      .lt("due_date", new Date().toISOString().split("T")[0])
      .limit(5);

    // Get program core KPIs
    const { data: coreKpis } = await supabase
      .from("program_core_kpis")
      .select("kpi_definitions(name, description)")
      .eq("program_id", workspace?.program_id || "")
      .limit(5);

    // Extract KPI names safely
    const kpiNames = coreKpis?.map(k => {
      const def = k.kpi_definitions as { name?: string } | null;
      return def?.name;
    }).filter(Boolean) || [];

    // Build context for AI
    const context = {
      metrics,
      stage: workspace?.stage || "unknown",
      health_score: workspace?.health_score,
      health_label: workspace?.health_label,
      recent_sessions: recentSessions?.map(s => ({
        title: s.title,
        notes: s.notes?.slice(0, 500),
        ai_summary: s.ai_summary,
        date: s.scheduled_at,
      })),
      overdue_actions_count: overdueActions?.length || 0,
      top_overdue_actions: overdueActions?.slice(0, 3).map(a => ({
        title: a.title,
        priority: a.priority,
        due_date: a.due_date,
      })),
      program_focus_kpis: kpiNames,
    };

    const modeInstructions = {
      full: "Provide a comprehensive review covering all aspects.",
      investor: "Focus on investor-ready narrative and fundraising readiness.",
      mentor_prep: "Focus on discussion points and questions for the next mentoring session.",
    };

    const systemPrompt = `You are a startup financial advisor and mentor coach for an incubator program.
Analyze the financial model metrics and context provided, then generate actionable insights.

${modeInstructions[mode as keyof typeof modeInstructions] || modeInstructions.full}

Current stage: ${context.stage}
Health score: ${context.health_score || 'N/A'} (${context.health_label || 'unknown'})
Overdue actions: ${context.overdue_actions_count}

Key metrics from financial model:
${Object.entries(metrics).map(([k, v]) => `- ${k}: ${v ?? 'not available'}`).join('\n')}

Recent session notes available: ${recentSessions?.length || 0}
Program focus KPIs: ${context.program_focus_kpis?.join(', ') || 'not defined'}

You MUST respond with valid JSON matching this exact structure:
{
  "summary": "2-3 sentence executive summary",
  "questions": [{"q": "question text", "why": "reason to ask"}],
  "risks": [{"risk": "risk description", "severity": "low|medium|high", "mitigation": "suggested mitigation"}],
  "recommended_actions": [{"title": "action title", "description": "details", "priority": "low|medium|high|urgent", "due_in_days": 7, "owner_hint": "founder|staff"}],
  "next_session_agenda": ["agenda item 1", "agenda item 2"],
  "investor_narrative": "Short investor update paragraph"
}`;

    const userPrompt = `Analyze this startup's financial model and provide structured recommendations.

Context:
${JSON.stringify(context, null, 2)}

Generate insights focusing on:
1. Financial health and runway concerns
2. Unit economics optimization
3. Key risks and mitigations
4. Actionable next steps
5. Questions to explore in next session`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content from AI");
    }

    // Parse JSON from response
    let review: AIReview;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      review = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate structure
    if (!review.summary || !Array.isArray(review.risks) || !Array.isArray(review.recommended_actions)) {
      throw new Error("Invalid AI response structure");
    }

    // Save to database
    const { error: updateError } = await supabase
      .from("financial_model_versions")
      .update({
        ai_review_json: review,
        ai_review_generated_at: new Date().toISOString(),
        ai_review_generated_by: user.id,
      })
      .eq("id", version_id);

    if (updateError) {
      console.error("Failed to save AI review:", updateError);
    }

    // Log activity
    await supabase.from("activity_log").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      entity_type: "financial_model",
      entity_id: version_id,
      action: "ai_review_generated",
      metadata: { mode },
    });

    console.log(`AI review generated for: ${version_id}`);

    return new Response(JSON.stringify({ 
      success: true,
      review,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error generating AI review:", error);
    const message = error instanceof Error ? error.message : "Failed to generate AI review";
    return new Response(JSON.stringify({ 
      success: false,
      error: message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
