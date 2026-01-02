import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateSummaryRequest {
  sessionId: string;
  transcript?: string;
}

interface ActionSuggestion {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  suggestedOwner?: string;
  suggestedDueInDays?: number;
}

interface KpiPrompt {
  kpiName: string;
  reason: string;
  suggestedAction: string;
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's auth to validate access
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionId, transcript }: GenerateSummaryRequest = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Session ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to fetch session and validate access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch session with workspace info
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .select(`
        id, workspace_id, title, agenda, notes, decisions, raw_transcript,
        workspace:workspaces(
          id, stage,
          startup:startups(name)
        )
      `)
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("Session fetch error:", sessionError);
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check workspace access using user's client
    const { data: hasAccess } = await supabaseUser.rpc("has_workspace_access", {
      _workspace_id: session.workspace_id,
    });

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Access denied to this workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare content for AI analysis
    const contentToAnalyze = transcript || session.raw_transcript || session.notes || session.agenda || "";
    
    if (!contentToAnalyze.trim()) {
      return new Response(JSON.stringify({ error: "No content to analyze. Please add notes, transcript, or agenda first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startupName = (session.workspace as any)?.startup?.name || "the startup";
    const stage = (session.workspace as any)?.stage || "unknown";

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert startup mentor assistant analyzing meeting notes for ${startupName}, currently in the ${stage} stage.

Your task is to extract structured insights from meeting content. Always respond with valid JSON.

Extract:
1. A concise executive summary (2-3 paragraphs)
2. Key decisions made (array of strings)
3. Risks or concerns identified (array of objects with "risk" and "severity" fields, severity: low/medium/high)
4. Suggested action items (array of objects with "title", "description", "priority", "suggestedDueInDays" fields)
5. KPIs that should be tracked or updated (array of objects with "kpiName", "reason", "suggestedAction" fields)

Respond ONLY with this JSON structure:
{
  "summary": "string",
  "decisions": ["string"],
  "risks": [{"risk": "string", "severity": "low|medium|high"}],
  "actionSuggestions": [{"title": "string", "description": "string", "priority": "low|medium|high|urgent", "suggestedDueInDays": number}],
  "kpiPrompts": [{"kpiName": "string", "reason": "string", "suggestedAction": "string"}]
}`,
          },
          {
            role: "user",
            content: `Meeting: ${session.title}\n\nContent to analyze:\n${contentToAnalyze}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      return new Response(JSON.stringify({ error: "No response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedOutput;
    try {
      parsedOutput = JSON.parse(aiContent);
    } catch (e) {
      console.error("Failed to parse AI response:", aiContent);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store transcript if provided
    const updateData: Record<string, any> = {
      ai_summary: parsedOutput.summary || null,
      ai_decisions: parsedOutput.decisions || [],
      ai_risks: parsedOutput.risks || [],
      ai_action_suggestions: parsedOutput.actionSuggestions || [],
      ai_kpi_prompts: parsedOutput.kpiPrompts || [],
      ai_generated_at: new Date().toISOString(),
      ai_generated_by: user.id,
    };

    if (transcript) {
      updateData.raw_transcript = transcript;
      updateData.source = "teams_import";
    }

    // Update session with AI outputs
    const { error: updateError } = await supabaseAdmin
      .from("sessions")
      .update(updateData)
      .eq("id", sessionId);

    if (updateError) {
      console.error("Failed to update session:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save AI outputs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log activity
    await supabaseAdmin.from("activity_log").insert({
      user_id: user.id,
      workspace_id: session.workspace_id,
      entity_type: "session",
      entity_id: sessionId,
      action: "ai_summary_generated",
      metadata: { sessionTitle: session.title },
    });

    console.log("AI summary generated for session:", sessionId);

    return new Response(JSON.stringify({
      success: true,
      summary: parsedOutput.summary,
      decisions: parsedOutput.decisions,
      risks: parsedOutput.risks,
      actionSuggestions: parsedOutput.actionSuggestions,
      kpiPrompts: parsedOutput.kpiPrompts,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in generate-session-summary:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
