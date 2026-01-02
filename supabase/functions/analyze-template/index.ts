import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  instance_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) {
      console.error('[analyze-template] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { instance_id } = await req.json() as AnalyzeRequest;

    if (!instance_id) {
      return new Response(
        JSON.stringify({ error: 'instance_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the template instance with template details
    const { data: instance, error: instanceError } = await supabase
      .from('template_instances')
      .select(`
        *,
        template:templates(name, description, schema_json, category)
      `)
      .eq('id', instance_id)
      .single();

    if (instanceError || !instance) {
      console.error('[analyze-template] Instance fetch error:', instanceError);
      return new Response(
        JSON.stringify({ error: 'Template instance not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate user has access to this workspace
    const { data: hasAccess } = await supabase.rpc('has_workspace_access', {
      _user_id: user.id,
      _workspace_id: instance.workspace_id,
    });

    if (!hasAccess) {
      console.error('[analyze-template] Access denied for user:', user.id, 'workspace:', instance.workspace_id);
      return new Response(
        JSON.stringify({ error: 'Access denied to this workspace' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch workspace context for better analysis
    const { data: workspace } = await supabase
      .from('workspaces')
      .select(`
        stage,
        startup:startups(name, industry, description)
      `)
      .eq('id', instance.workspace_id)
      .single();

    const template = instance.template as any;
    const formData = instance.data_json || {};
    const startupInfo = workspace?.startup as any;

    // Build a structured prompt for analysis
    const sections = template?.schema_json?.sections || [];
    let formattedResponses = '';
    
    for (const section of sections) {
      formattedResponses += `\n## ${section.title}\n`;
      for (const field of section.fields || []) {
        const value = formData[field.id];
        const displayValue = Array.isArray(value) 
          ? value.join(', ') 
          : (value !== undefined && value !== null && value !== '') 
            ? String(value) 
            : '(not provided)';
        formattedResponses += `- **${field.label}**: ${displayValue}\n`;
      }
    }

    const systemPrompt = `You are an expert startup mentor and consultant reviewing a founder's submitted template. 
Your role is to provide constructive, actionable feedback that helps the founder improve their submission.

Be specific, professional, and encouraging. Focus on:
1. Completeness - Are all required fields filled with sufficient detail?
2. Clarity - Is the content clear and well-articulated?
3. Strategy - Does the content show sound strategic thinking?
4. Actionability - Are the plans concrete and achievable?
5. Gaps - What important aspects might be missing?

Provide your analysis in JSON format with the following structure:
{
  "overall_score": <number 1-10>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<specific improvement suggestion 1>", "<specific improvement suggestion 2>", ...],
  "questions": ["<clarifying question 1>", "<clarifying question 2>", ...],
  "recommendation": "approve" | "needs_changes" | "needs_discussion"
}`;

    const userPrompt = `Analyze this startup template submission:

**Startup**: ${startupInfo?.name || 'Unknown'} (${startupInfo?.industry || 'Unknown industry'})
**Stage**: ${workspace?.stage || 'Unknown'}
**Description**: ${startupInfo?.description || 'No description'}

**Template**: ${template?.name || 'Unknown'}
**Category**: ${template?.category || 'General'}
**Template Description**: ${template?.description || 'No description'}

**Submitted Responses**:
${formattedResponses}

Please analyze this submission and provide structured feedback.`;

    console.log('[analyze-template] Calling AI for instance:', instance_id, 'by user:', user.id);

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('[analyze-template] AI gateway error:', aiResponse.status, errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('[analyze-template] Failed to parse AI response:', parseError);
      // Return a fallback structured response
      analysis = {
        overall_score: 5,
        summary: content.slice(0, 300),
        strengths: [],
        improvements: ['Unable to parse detailed analysis. Please review manually.'],
        questions: [],
        recommendation: 'needs_discussion'
      };
    }

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      workspace_id: instance.workspace_id,
      entity_type: 'template_instance',
      entity_id: instance_id,
      action: 'ai_analyzed',
      metadata: { score: analysis.overall_score, recommendation: analysis.recommendation },
    });

    console.log('[analyze-template] Analysis complete for instance:', instance_id);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        template_name: template?.name,
        startup_name: startupInfo?.name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[analyze-template] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
