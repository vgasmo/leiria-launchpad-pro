import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// CORS headers for this function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationData {
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  entity_type: string;
  entity_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const cutoff24hAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const notificationsToCreate: NotificationData[] = [];

    // Get staff users (admin or consultor)
    const { data: staffRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'consultor']);

    const staffUserIds = [...new Set(staffRoles?.map(r => r.user_id) || [])];

    if (staffUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, created: 0, message: 'No staff users found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing recent notifications to avoid duplicates
    const { data: recentNotifications } = await supabase
      .from('notifications')
      .select('user_id, type, entity_type, entity_id')
      .gte('created_at', cutoff24hAgo.toISOString());

    const existingKeys = new Set(
      recentNotifications?.map(n => `${n.user_id}:${n.type}:${n.entity_type}:${n.entity_id}`) || []
    );

    // 1. Task notifications
    const { data: tasks } = await supabase
      .from('communication_log')
      .select('id, subject, due_at, assigned_to, funnel_item_id, workspace_id')
      .eq('activity_type', 'task')
      .eq('status', 'open')
      .not('due_at', 'is', null);

    for (const task of tasks || []) {
      if (!task.due_at) continue;
      
      const dueDate = new Date(task.due_at);
      const userId = task.assigned_to;
      
      // Only notify assigned staff users
      if (!userId || !staffUserIds.includes(userId)) continue;

      // Determine notification type
      let type: string | null = null;
      if (dueDate < now) {
        type = 'task_overdue';
      } else if (dueDate <= in24h) {
        type = 'task_due';
      }

      if (!type) continue;

      const key = `${userId}:${type}:task:${task.id}`;
      if (existingKeys.has(key)) continue;

      notificationsToCreate.push({
        user_id: userId,
        type,
        title: type === 'task_overdue' ? 'Task Overdue' : 'Task Due Soon',
        message: task.subject || 'Unnamed task',
        link: task.funnel_item_id ? `/crm?open=${task.funnel_item_id}` : null,
        entity_type: 'task',
        entity_id: task.id,
      });

      existingKeys.add(key);
    }

    // 2. Next action notifications
    const { data: funnelItems } = await supabase
      .from('funnel_items')
      .select('id, organization_name, contact_name, next_action_at, next_action_description, owner_consultant_id')
      .not('next_action_at', 'is', null)
      .not('stage', 'in', '("rejected","archived")');

    for (const item of funnelItems || []) {
      if (!item.next_action_at) continue;

      const dueDate = new Date(item.next_action_at);
      const userId = item.owner_consultant_id;

      // Only notify assigned staff users
      if (!userId || !staffUserIds.includes(userId)) continue;

      let type: string | null = null;
      if (dueDate < now) {
        type = 'next_action_overdue';
      } else if (dueDate <= in24h) {
        type = 'next_action_due';
      }

      if (!type) continue;

      const key = `${userId}:${type}:funnel_item:${item.id}`;
      if (existingKeys.has(key)) continue;

      const name = item.organization_name || item.contact_name || 'Lead';

      notificationsToCreate.push({
        user_id: userId,
        type,
        title: type === 'next_action_overdue' ? 'Follow-up Overdue' : 'Follow-up Due Soon',
        message: `${name}: ${item.next_action_description || 'Next action required'}`,
        link: `/crm?open=${item.id}`,
        entity_type: 'funnel_item',
        entity_id: item.id,
      });

      existingKeys.add(key);
    }

    // Insert notifications
    let createdCount = 0;
    if (notificationsToCreate.length > 0) {
      const { data: inserted, error } = await supabase
        .from('notifications')
        .insert(notificationsToCreate.map(n => ({ ...n, read: false })))
        .select();

      if (error) {
        console.error('Failed to insert notifications:', error);
      } else {
        createdCount = inserted?.length || 0;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        created: createdCount,
        checked: {
          tasks: tasks?.length || 0,
          funnelItems: funnelItems?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating CRM notifications:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
