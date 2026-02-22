import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // ── Auth guard ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return corsJsonResponse({ error: "Unauthorized" }, req, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return corsJsonResponse({ error: "Invalid or expired token" }, req, 401);
    }

    const userId = claimsData.claims.sub as string;

    // ── Input validation ────────────────────────────────────────
    const body = await req.json();
    const messages: Array<{ role: string; content: string }> = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return corsJsonResponse({ error: "messages array is required" }, req, 400);
    }

    // Validate each message shape
    for (const msg of messages) {
      if (
        typeof msg.role !== "string" ||
        typeof msg.content !== "string" ||
        !["user", "assistant"].includes(msg.role) ||
        msg.content.length > 4000
      ) {
        return corsJsonResponse({ error: "Invalid message format" }, req, 400);
      }
    }

    // ── Rate limit check ────────────────────────────────────────
    // Use existing DB function for rate limiting (20 requests/hour)
    const { data: withinLimit } = await supabase.rpc("check_ai_rate_limit", {
      _user_id: userId,
      _workspace_id: userId, // Use userId as fallback workspace
      _function_name: "copilot-chat",
      _max_requests: 30,
    });

    if (withinLimit === false) {
      return corsJsonResponse(
        { error: "Rate limit exceeded. Please try again later." },
        req,
        429
      );
    }

    // ── Call Lovable AI Gateway ──────────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return corsJsonResponse({ error: "AI service not configured" }, req, 500);
    }

    const systemPrompt = `You are the Ecosystem Copilot for Startup Leiria, an AI assistant embedded in a startup incubator management platform.

Your role:
- Help founders understand their tasks, KPIs, health scores, and next best actions.
- Help consultants get quick summaries of their portfolio.
- Provide concise, actionable advice about startup management.

Guidelines:
- Be concise. Most answers should be 2-4 sentences.
- Use bullet points for lists.
- When you don't have specific data, give general best-practice advice and suggest which section of the platform to visit.
- Always be encouraging and professional.
- Answer in the same language the user writes in.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);

      if (status === 429) {
        return corsJsonResponse(
          { error: "AI rate limit exceeded. Please try again later." },
          req,
          429
        );
      }
      if (status === 402) {
        return corsJsonResponse(
          { error: "AI credits exhausted. Please add credits in Settings." },
          req,
          402
        );
      }

      return corsJsonResponse({ error: "AI service unavailable" }, req, 502);
    }

    // Stream the response back to the client
    const corsHeaders = getCorsHeaders(req);
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("copilot-chat error:", err);
    return corsJsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      req,
      500
    );
  }
});
