import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoachRequest {
  template_instance_id: string;
  mode?: 'review' | 'actions' | 'kpis';
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

    // SECURITY: Validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate token and get user
    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) {
      console.error('[generate-template-coach] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { template_instance_id, mode = 'review' } = await req.json() as CoachRequest;

    if (!template_instance_id) {
      return new Response(
        JSON.stringify({ error: 'template_instance_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-template-coach] Processing instance:', template_instance_id, 'mode:', mode, 'user:', user.id);

    // Fetch template instance with related data
    const { data: instance, error: instanceError } = await supabase
      .from('template_instances')
      .select(`
        *,
        template:templates(id, name, description, schema_json, category)
      `)
      .eq('id', template_instance_id)
      .single();

    if (instanceError || !instance) {
      console.error('[generate-template-coach] Instance fetch error:', instanceError);
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
      console.error('[generate-template-coach] Access denied for user:', user.id, 'workspace:', instance.workspace_id);
      return new Response(
        JSON.stringify({ error: 'Access denied to this workspace' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch workspace context
    const { data: workspace } = await supabase
      .from('workspaces')
      .select(`
        id, stage, program_id,
        startup:startups(name, industry, description)
      `)
      .eq('id', instance.workspace_id)
      .single();

    // Fetch program core KPIs if available
    let coreKpis: any[] = [];
    if (workspace?.program_id) {
      const { data: programKpis } = await supabase
        .from('program_core_kpis')
        .select('kpi_definition:kpi_definitions(name, description, category)')
        .eq('program_id', workspace.program_id)
        .order('order_index');
      coreKpis = programKpis || [];
    }

    // Fetch last session for context
    const { data: lastSession } = await supabase
      .from('sessions')
      .select('title, notes, ai_summary, scheduled_at')
      .eq('workspace_id', instance.workspace_id)
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch action items counts
    const { count: openActionsCount } = await supabase
      .from('action_items')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', instance.workspace_id)
      .in('status', ['pending', 'in_progress']);

    const { count: overdueActionsCount } = await supabase
      .from('action_items')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', instance.workspace_id)
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', new Date().toISOString().split('T')[0]);

    const template = instance.template as any;
    const formData = instance.data_json || {};
    const startupInfo = workspace?.startup as any;

    // Build formatted responses from template
    const sections = template?.schema_json?.sections || [];
    let formattedResponses = '';
    for (const section of sections) {
      formattedResponses += `\n## ${section.title}\n`;
      if (section.description) formattedResponses += `_${section.description}_\n`;
      for (const field of section.fields || []) {
        const value = formData[field.id];
        let displayValue = '(not provided)';
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            displayValue = value.join(', ');
          } else if (typeof value === 'object') {
            displayValue = JSON.stringify(value);
          } else {
            displayValue = String(value);
          }
        }
        formattedResponses += `- **${field.label}** [${field.type}${field.required ? ', required' : ''}]: ${displayValue}\n`;
      }
    }

    // Build context information
    const coreKpisList = coreKpis.map(k => k.kpi_definition?.name).filter(Boolean).join(', ') || 'None defined';
    const sessionContext = lastSession 
      ? `Last session: "${lastSession.title}" on ${lastSession.scheduled_at?.split('T')[0] || 'unknown date'}. ${lastSession.ai_summary ? `Summary: ${lastSession.ai_summary.slice(0, 200)}...` : ''}`
      : 'No previous sessions recorded.';

    // System prompt for AI Coach
    const systemPrompt = `You are an expert startup mentor and accelerator consultant providing actionable coaching feedback.
Your role is to analyze a founder's template submission and provide structured, practical guidance.

You must respond with ONLY valid JSON (no markdown code blocks) in this exact structure:
{
  "summary": "Brief 2-3 sentence assessment",
  "strengths": ["strength 1", "strength 2", ...],
  "gaps": [{"field": "field name or area", "why": "why this is a gap", "question": "clarifying question"}],
  "assumptions_to_test": [{"assumption": "the assumption", "test": "how to test it", "metric": "what to measure"}],
  "red_flags": [{"risk": "the risk", "severity": "low|medium|high", "mitigation": "suggested action"}],
  "recommended_actions": [{"title": "action title", "description": "what to do", "priority": "low|medium|high|urgent", "due_in_days": 7, "owner_hint": "founder|staff"}],
  "next_session_agenda": ["agenda item 1", "agenda item 2", ...],
  "kpi_suggestions": [{"name": "KPI name", "definition": "how to measure", "target_hint": "suggested target"}]
}

Guidelines:
- Be specific and actionable, not generic
- Consider the startup's current stage (${workspace?.stage || 'unknown'})
- Focus on ${mode === 'actions' ? 'recommended actions' : mode === 'kpis' ? 'KPI suggestions' : 'overall review'}
- Keep recommendations realistic for a startup context
- Identify blind spots and unstated assumptions
- Suggest 3-5 actions, 2-4 assumptions to test, 2-3 agenda items`;

    const userPrompt = `Analyze this startup template submission and provide coaching feedback:

**Startup Context**
- Name: ${startupInfo?.name || 'Unknown'}
- Industry: ${startupInfo?.industry || 'Unknown'}
- Stage: ${workspace?.stage || 'Unknown'}
- Description: ${startupInfo?.description || 'No description'}

**Program KPIs**: ${coreKpisList}

**Current Status**
- Open actions: ${openActionsCount || 0}
- Overdue actions: ${overdueActionsCount || 0}
- ${sessionContext}

**Template**: ${template?.name || 'Unknown'} (${template?.category || 'General'})
${template?.description ? `Template Purpose: ${template.description}` : ''}

**Submitted Responses**:
${formattedResponses}

Provide your analysis as a JSON object. Focus on ${mode === 'actions' ? 'specific recommended actions with realistic timelines' : mode === 'kpis' ? 'relevant KPI suggestions for tracking progress' : 'comprehensive review of all aspects'}.`;

    console.log('[generate-template-coach] Calling AI for analysis');

    // Call Lovable AI Gateway with tool calling for structured output
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
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_coaching_feedback',
              description: 'Provide structured coaching feedback for the template submission',
              parameters: {
                type: 'object',
                properties: {
                  summary: { type: 'string', description: 'Brief 2-3 sentence assessment' },
                  strengths: { type: 'array', items: { type: 'string' } },
                  gaps: { 
                    type: 'array', 
                    items: { 
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        why: { type: 'string' },
                        question: { type: 'string' }
                      },
                      required: ['field', 'why', 'question']
                    }
                  },
                  assumptions_to_test: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        assumption: { type: 'string' },
                        test: { type: 'string' },
                        metric: { type: 'string' }
                      },
                      required: ['assumption', 'test', 'metric']
                    }
                  },
                  red_flags: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        risk: { type: 'string' },
                        severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                        mitigation: { type: 'string' }
                      },
                      required: ['risk', 'severity', 'mitigation']
                    }
                  },
                  recommended_actions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                        due_in_days: { type: 'number' },
                        owner_hint: { type: 'string', enum: ['founder', 'staff'] }
                      },
                      required: ['title', 'description', 'priority', 'due_in_days', 'owner_hint']
                    }
                  },
                  next_session_agenda: { type: 'array', items: { type: 'string' } },
                  kpi_suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        definition: { type: 'string' },
                        target_hint: { type: 'string' }
                      },
                      required: ['name', 'definition', 'target_hint']
                    }
                  }
                },
                required: ['summary', 'strengths', 'gaps', 'assumptions_to_test', 'red_flags', 'recommended_actions', 'next_session_agenda', 'kpi_suggestions']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'provide_coaching_feedback' } }
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
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('[generate-template-coach] AI gateway error:', aiResponse.status, errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    
    // Extract feedback from tool call
    let feedback;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        feedback = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('[generate-template-coach] Failed to parse tool call arguments:', e);
      }
    }

    // Fallback: try to parse from content if tool call failed
    if (!feedback) {
      const content = aiData.choices?.[0]?.message?.content || '';
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
        feedback = JSON.parse(jsonMatch[1] || content);
      } catch (e) {
        console.error('[generate-template-coach] Failed to parse content:', e);
        // Return minimal feedback
        feedback = {
          summary: 'Unable to generate detailed analysis. Please try again.',
          strengths: [],
          gaps: [],
          assumptions_to_test: [],
          red_flags: [],
          recommended_actions: [],
          next_session_agenda: [],
          kpi_suggestions: []
        };
      }
    }

    // Save feedback to database
    await supabase
      .from('template_instances')
      .update({
        ai_feedback_json: feedback,
        ai_feedback_generated_at: new Date().toISOString(),
        ai_feedback_generated_by: user.id,
        ai_feedback_visibility: 'staff',
      })
      .eq('id', template_instance_id);

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      workspace_id: instance.workspace_id,
      entity_type: 'template_instance',
      entity_id: template_instance_id,
      action: 'ai_coach_generated',
      metadata: { mode },
    });

    console.log('[generate-template-coach] Analysis complete for:', template_instance_id);

    return new Response(
      JSON.stringify({
        success: true,
        feedback,
        template_name: template?.name,
        startup_name: startupInfo?.name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-template-coach] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
