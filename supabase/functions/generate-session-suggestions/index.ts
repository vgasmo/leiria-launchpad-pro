import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
import { requireUser, checkAIRateLimit, generateRequestId, createLogger } from '../_shared/security.ts';

const FUNCTION_NAME = 'generate-session-suggestions';

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  const log = createLogger(FUNCTION_NAME, requestId);

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      log.error('LOVABLE_API_KEY not configured');
      return corsJsonResponse({ error: 'AI service not configured', code: 'CONFIG_ERROR' }, req, 500);
    }

    // SECURITY: Require authenticated user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    });

    const authResult = await requireUser(req, supabaseUser);
    if ('error' in authResult) {
      log.warn('Unauthorized access attempt');
      return authResult.error;
    }

    const user = authResult.user;
    const { notes, workspace_id } = await req.json();

    if (!notes || notes.length < 50) {
      return corsJsonResponse({ 
        error: 'Notes must be at least 50 characters',
        code: 'BAD_REQUEST'
      }, req, 400);
    }

    log.info('Generating session suggestions', { userId: user.id, workspaceId: workspace_id });

    // RATE LIMITING: Check AI rate limit
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const withinLimit = await checkAIRateLimit(supabase, user.id, workspace_id, FUNCTION_NAME, 20);

    if (!withinLimit) {
      log.warn('Rate limit exceeded', { userId: user.id });
      return corsJsonResponse({ 
        error: 'Rate limit exceeded. You can make up to 20 AI requests per hour.',
        code: 'RATE_LIMITED'
      }, req, 429);
    }

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
        Authorization: `Bearer ${lovableApiKey}`,
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
      log.error('AI gateway error', new Error(errorText), { status: response.status });
      
      if (response.status === 429) {
        return corsJsonResponse({ 
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMITED'
        }, req, 429);
      }
      if (response.status === 402) {
        return corsJsonResponse({ 
          error: 'AI credits exhausted. Please add credits.',
          code: 'CREDITS_EXHAUSTED'
        }, req, 402);
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
      log.error('Failed to parse AI response', parseError);
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

    log.info('Suggestions generated successfully');

    return corsJsonResponse(result, req);

  } catch (error) {
    log.error('Fatal error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return corsJsonResponse({ error: message, code: 'INTERNAL_ERROR' }, req, 500);
  }
});
