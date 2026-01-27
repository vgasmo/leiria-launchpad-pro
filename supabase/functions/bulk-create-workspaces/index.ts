import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsJsonResponse({ error: 'No authorization header' }, req, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return corsJsonResponse({ error: 'Unauthorized' }, req, 401);
    }

    // Verify user has admin or consultor role - SECURITY: This is critical
    // because the function uses SERVICE_ROLE_KEY which bypasses RLS
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error checking user roles:', rolesError);
      return corsJsonResponse({ error: 'Failed to verify permissions' }, req, 500);
    }

    const isStaff = roles?.some(r => r.role === 'admin' || r.role === 'consultor');
    if (!isStaff) {
      console.warn('Non-staff user attempted bulk workspace creation:', user.id);
      return corsJsonResponse({ error: 'Forbidden - Staff access required' }, req, 403);
    }

    console.log('Staff user authenticated:', user.id);

    // Parse body for optional filters
    const body = await req.json().catch(() => ({}));
    const { stage = 'contracted', defaultWorkspaceStage = 'ideation', dryRun = false } = body;

    console.log('Processing with params:', { stage, defaultWorkspaceStage, dryRun });

    // Get all funnel items that need workspaces
    const { data: items, error: fetchError } = await supabase
      .from('funnel_items')
      .select('*')
      .eq('stage', stage)
      .is('linked_workspace_id', null);

    if (fetchError) {
      console.error('Error fetching funnel items:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${items?.length || 0} funnel items without workspaces`);

    if (dryRun) {
      return corsJsonResponse({
        dryRun: true,
        count: items?.length || 0,
        items: items?.map(i => ({
          id: i.id,
          name: i.organization_name || i.contact_name,
          email: i.contact_email,
          program_id: i.program_id,
          owner: i.owner_consultant_id,
        })),
      }, req);
    }

    const results = {
      created: 0,
      errors: [] as Array<{ id: string; name: string; error: string }>,
    };

    for (const item of items || []) {
      try {
        const startupName = item.organization_name || item.contact_name || 'Startup sem nome';
        
        console.log(`Creating startup for: ${startupName}`);

        // Create startup (using available columns only)
        const { data: startup, error: startupError } = await supabase
          .from('startups')
          .insert({
            name: startupName,
            description: item.notes,
            main_contact_name: item.contact_name,
            main_contact_email: item.contact_email,
            main_contact_phone: item.contact_phone,
          })
          .select()
          .single();

        if (startupError) {
          console.error(`Error creating startup for ${startupName}:`, startupError);
          results.errors.push({ id: item.id, name: startupName, error: startupError.message });
          continue;
        }

        // Create workspace
        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .insert({
            startup_id: startup.id,
            program_id: item.program_id,
            stage: defaultWorkspaceStage,
            status: 'active',
            assigned_consultor_id: item.owner_consultant_id,
          })
          .select()
          .single();

        if (workspaceError) {
          console.error(`Error creating workspace for ${startupName}:`, workspaceError);
          results.errors.push({ id: item.id, name: startupName, error: workspaceError.message });
          continue;
        }

        // Update funnel item with links
        const { error: updateError } = await supabase
          .from('funnel_items')
          .update({
            linked_startup_id: startup.id,
            linked_workspace_id: workspace.id,
            converted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (updateError) {
          console.error(`Error updating funnel item for ${startupName}:`, updateError);
          results.errors.push({ id: item.id, name: startupName, error: updateError.message });
          continue;
        }

        // Log event
        await supabase.from('funnel_events').insert({
          funnel_item_id: item.id,
          event_type: 'converted_to_startup',
          performed_by: user.id,
          metadata: { startup_id: startup.id, workspace_id: workspace.id, bulk: true },
        });

        results.created++;
        console.log(`Successfully created workspace for: ${startupName}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Unexpected error for item ${item.id}:`, errorMessage);
        results.errors.push({ 
          id: item.id, 
          name: item.organization_name || item.contact_name || 'Unknown', 
          error: errorMessage 
        });
      }
    }

    console.log(`Completed: ${results.created} created, ${results.errors.length} errors`);

    return corsJsonResponse(results, req);
  } catch (error) {
    console.error('Error in bulk-create-workspaces:', error);
    return corsJsonResponse({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, req, 500);
  }
});
