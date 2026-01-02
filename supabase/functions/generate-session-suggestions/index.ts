import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notes, workspace_id } = await req.json();

    if (!notes || notes.length < 50) {
      return new Response(
        JSON.stringify({ error: "Notes must be at least 50 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating session suggestions for workspace:", workspace_id);

    const systemPrompt = `You are an expert startup mentor assistant. Analyze the session notes and extract structured insights.

Your response must be valid JSON with this exact structure:
{
  "summary": "A concise 2-3 sentence summary of the session",
  "keyDecisions": ["Decision 1", "Decision 2"],
  "actionItems": ["Action 1 with owner and deadline if mentioned", "Action 2"],
  "risks": ["Risk or concern 1", "Risk 2"],
  "followUpQuestions": ["Question to explore in next session", "Another question"]
}

Guidelines:
- Summary should capture the main topics and outcomes
- Key decisions should be concrete choices made during the session
- Action items should be specific and actionable, include owner names if mentioned
- Risks are concerns, blockers, or potential issues discussed
- Follow-up questions are topics that need further exploration

If a category has no items, return an empty array for that category.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze these session notes and extract insights:\n\n${notes}` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let suggestions;
    try {
      // Handle potential markdown code blocks
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
      suggestions = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI suggestions");
    }

    // Validate and provide defaults
    const result = {
      summary: suggestions.summary || "No summary generated",
      keyDecisions: Array.isArray(suggestions.keyDecisions) ? suggestions.keyDecisions : [],
      actionItems: Array.isArray(suggestions.actionItems) ? suggestions.actionItems : [],
      risks: Array.isArray(suggestions.risks) ? suggestions.risks : [],
      followUpQuestions: Array.isArray(suggestions.followUpQuestions) ? suggestions.followUpQuestions : [],
    };

    console.log("Generated suggestions:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in generate-session-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
