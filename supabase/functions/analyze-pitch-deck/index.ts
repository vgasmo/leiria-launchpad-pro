import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { document_id, workspace_id } = await req.json();
    if (!document_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "document_id and workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get document info
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("name, file_path, external_url, category, description")
      .eq("id", document_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get workspace context
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("stage, startup:startups(name, description)")
      .eq("id", workspace_id)
      .single();

    const startup = workspace?.startup as any;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a startup pitch deck analyst for an incubator/accelerator program. 
Analyze the provided pitch deck information and return structured feedback.

You must call the function 'analyze_pitch_deck' with your analysis.

Context:
- Startup: ${startup?.name || "Unknown"}
- Description: ${startup?.description || "N/A"}
- Stage: ${workspace?.stage || "Unknown"}
- Document: ${doc.name}
- Category: ${doc.category || "pitch_deck"}

Evaluate these dimensions on a 1-5 scale:
1. problem_solution: Is the problem clear and the solution compelling?
2. market: Is the market sized correctly (TAM/SAM/SOM)? Is there evidence?
3. business_model: Is the revenue model clear and viable?
4. team: Does the team have relevant experience?
5. traction: Are there meaningful metrics, customers, or milestones?
6. design_clarity: Is the pitch deck well-designed, clear, and concise?

For each dimension, provide a score (1-5) and specific actionable recommendations in Portuguese (PT-PT).
Also provide an overall summary and top 3 improvement priorities.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analisa este pitch deck: "${doc.name}". ${doc.description ? `Descrição: ${doc.description}` : ""} A startup está na fase "${workspace?.stage || 'unknown'}". Fornece uma avaliação detalhada com scores e recomendações práticas em português.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_pitch_deck",
              description: "Return structured pitch deck analysis with scores and recommendations.",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Overall summary of the pitch deck analysis in Portuguese" },
                  scores: {
                    type: "object",
                    properties: {
                      problem_solution: { type: "integer", minimum: 1, maximum: 5 },
                      market: { type: "integer", minimum: 1, maximum: 5 },
                      business_model: { type: "integer", minimum: 1, maximum: 5 },
                      team: { type: "integer", minimum: 1, maximum: 5 },
                      traction: { type: "integer", minimum: 1, maximum: 5 },
                      design_clarity: { type: "integer", minimum: 1, maximum: 5 },
                    },
                    required: ["problem_solution", "market", "business_model", "team", "traction", "design_clarity"],
                  },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        dimension: { type: "string" },
                        score: { type: "integer", minimum: 1, maximum: 5 },
                        feedback: { type: "string", description: "Specific feedback in Portuguese" },
                        action_items: { type: "array", items: { type: "string" }, description: "Actionable improvements in Portuguese" },
                      },
                      required: ["dimension", "score", "feedback", "action_items"],
                    },
                  },
                  top_priorities: {
                    type: "array",
                    items: { type: "string" },
                    description: "Top 3 improvement priorities in Portuguese",
                  },
                },
                required: ["summary", "scores", "recommendations", "top_priorities"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_pitch_deck" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    
    // Extract tool call result
    let analysis = null;
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        analysis = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse AI tool call arguments");
      }
    }

    if (!analysis) {
      return new Response(JSON.stringify({ error: "Failed to parse AI analysis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-pitch-deck error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
