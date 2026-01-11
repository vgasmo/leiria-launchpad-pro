/**
 * Edge function for founders to request playbook activation
 * 
 * This bypasses RLS restrictions on consultant_notes since founders
 * cannot directly insert into that table. The function validates
 * workspace access and creates a staff-visible request.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
import { requireUser, validateWorkspaceAccess, errorResponse, ErrorCode, generateRequestId, createLogger } from '../_shared/security.ts';

interface PlaybookRequestBody {
  workspaceId: string;
  playbookId?: string;
  playbookTitle?: string;
  goal: string;
  urgency: 'this_week' | 'this_month';
  context?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const requestId = generateRequestId();
  const logger = createLogger('request-playbook', requestId);

  try {
    // Create clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') || '';
    
    // User client for auth validation
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Require authenticated user
    const authResult = await requireUser(req, supabaseUser);
    if ('error' in authResult) {
      logger.warn('Authentication failed');
      return authResult.error;
    }
    const { user } = authResult;

    // Parse request body
    const body: PlaybookRequestBody = await req.json();
    const { workspaceId, playbookId, playbookTitle, goal, urgency, context } = body;

    // Validate required fields
    if (!workspaceId || !goal) {
      return errorResponse(req, 'workspaceId and goal are required', ErrorCode.BAD_REQUEST, 400);
    }

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(supabaseAdmin, user.id, workspaceId);
    if (!hasAccess) {
      logger.warn('Workspace access denied', { userId: user.id, workspaceId });
      return errorResponse(req, 'Workspace access denied', ErrorCode.FORBIDDEN, 403);
    }

    // Build machine-readable tag for status tracking
    const machineTag = playbookId 
      ? `[PLAYBOOK_REQUEST] playbook_id=${playbookId}` 
      : '[PLAYBOOK_REQUEST] playbook_id=custom';

    // Build request content
    const requestContent = [
      `📋 **Playbook Request**`,
      '',
      machineTag,
      '',
      playbookTitle ? `**Playbook:** ${playbookTitle}` : '',
      `**Goal:** ${goal}`,
      `**Urgency:** ${urgency === 'this_week' ? 'This week' : 'This month'}`,
      context ? `**Context:** ${context}` : '',
    ].filter(Boolean).join('\n');

    // Insert consultant note with service role (bypasses RLS)
    // Use 'shared_with_founder' visibility so founder can see their own request
    const { error: insertError } = await supabaseAdmin
      .from('consultant_notes')
      .insert({
        workspace_id: workspaceId,
        author_id: user.id,
        content: requestContent,
        is_private: false,
        visibility: 'shared_with_founder',
      });

    if (insertError) {
      logger.error('Failed to create playbook request', insertError);
      return errorResponse(req, 'Failed to submit request', ErrorCode.INTERNAL_ERROR, 500);
    }

    logger.info('Playbook request created', { userId: user.id, workspaceId, playbookId });

    return corsJsonResponse({ 
      success: true, 
      message: 'Request submitted successfully' 
    }, req);

  } catch (error) {
    logger.error('Unexpected error', error);
    return errorResponse(req, 'Internal server error', ErrorCode.INTERNAL_ERROR, 500);
  }
});
