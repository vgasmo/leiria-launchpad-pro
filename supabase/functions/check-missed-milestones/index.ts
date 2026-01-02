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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking for missed milestones...");

    const today = new Date().toISOString().split('T')[0];

    // Find milestones that are past due and not completed/delayed
    const { data: missedMilestones, error: milestonesError } = await supabase
      .from('milestones')
      .select(`
        id,
        title,
        target_date,
        workspace_id,
        status,
        workspace:workspaces!inner(
          id,
          startup:startups(name)
        )
      `)
      .lt('target_date', today)
      .in('status', ['not_started', 'in_progress'])
      .is('completed_at', null);

    if (milestonesError) {
      console.error("Error fetching milestones:", milestonesError);
      throw milestonesError;
    }

    console.log(`Found ${missedMilestones?.length || 0} missed milestones`);

    const createdActions: any[] = [];
    const createdAlerts: any[] = [];

    for (const milestone of missedMilestones || []) {
      // Check if we already created an action for this missed milestone
      const { data: existingAction } = await supabase
        .from('action_items')
        .select('id')
        .eq('milestone_id', milestone.id)
        .ilike('title', '%missed%')
        .limit(1);

      if (existingAction && existingAction.length > 0) {
        console.log(`Action already exists for milestone ${milestone.id}`);
        continue;
      }

      // Create action item for missed milestone
      const { data: actionData, error: actionError } = await supabase
        .from('action_items')
        .insert({
          workspace_id: milestone.workspace_id,
          milestone_id: milestone.id,
          title: `Review missed milestone: ${milestone.title}`,
          description: `This milestone was due on ${milestone.target_date} but has not been completed. Please review and update the status or reschedule.`,
          priority: 'high',
          status: 'pending',
        })
        .select()
        .single();

      if (actionError) {
        console.error(`Error creating action for milestone ${milestone.id}:`, actionError);
        continue;
      }

      createdActions.push(actionData);

      // Mark milestone as delayed
      await supabase
        .from('milestones')
        .update({ status: 'delayed' })
        .eq('id', milestone.id);

      // Create workspace alert
      const { data: alertData, error: alertError } = await supabase
        .from('staff_work_queue_items')
        .insert({
          workspace_id: milestone.workspace_id,
          type: 'milestone_missed',
          title: `Milestone missed: ${milestone.title}`,
          description: `Target date ${milestone.target_date} has passed`,
          priority: 'high',
          status: 'open',
          related_milestone_id: milestone.id,
        })
        .select()
        .single();

      if (!alertError && alertData) {
        createdAlerts.push(alertData);
      }

      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          workspace_id: milestone.workspace_id,
          entity_type: 'milestone',
          entity_id: milestone.id,
          action: 'auto_missed_alert',
          user_id: '00000000-0000-0000-0000-000000000000', // System user
          metadata: { milestone_title: milestone.title, target_date: milestone.target_date },
        });
    }

    console.log(`Created ${createdActions.length} actions and ${createdAlerts.length} alerts`);

    return new Response(
      JSON.stringify({ 
        success: true,
        checked: missedMilestones?.length || 0,
        actionsCreated: createdActions.length,
        alertsCreated: createdAlerts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-missed-milestones:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
