/**
 * Check Contract Anniversaries
 * Runs via cron to detect 1/2/3 year incubation milestones and notify staff
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth: cron or staff only
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')
    const isCron = authHeader === `Bearer ${cronSecret}`

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (!isCron) {
      // Check if staff user
      const token = authHeader?.replace('Bearer ', '')
      if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: { user } } = await supabase.auth.getUser(token)
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'consultor'])
      if (!roles || roles.length === 0) {
        return new Response(JSON.stringify({ error: 'Staff only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const today = new Date()
    const todayMonth = today.getMonth() + 1
    const todayDay = today.getDate()
    const milestoneYears = [1, 2, 3]
    const alerts: { contractId: string; workspaceId: string; startupName: string; years: number; startDate: string }[] = []

    // Fetch all active contracts
    const { data: contracts, error: fetchError } = await supabase
      .from('startup_contracts')
      .select('id, workspace_id, start_date, workspace:workspaces(startup:startups(name))')
      .eq('status', 'active')

    if (fetchError) throw fetchError

    for (const contract of contracts || []) {
      const startDate = new Date(contract.start_date)
      const startMonth = startDate.getMonth() + 1
      const startDay = startDate.getDate()

      // Check if today is an anniversary (±7 days window for notification)
      for (const years of milestoneYears) {
        const anniversaryDate = new Date(startDate)
        anniversaryDate.setFullYear(startDate.getFullYear() + years)

        const diffDays = Math.round((today.getTime() - anniversaryDate.getTime()) / (1000 * 60 * 60 * 24))

        // Notify 7 days before anniversary
        if (diffDays >= -7 && diffDays <= 0) {
          // Check if we already notified for this milestone
          const { data: existing } = await supabase
            .from('contract_reminders')
            .select('id')
            .eq('contract_id', contract.id)
            .eq('reminder_type', `anniversary_${years}y`)
            .gte('scheduled_date', new Date(today.getFullYear(), today.getMonth(), 1).toISOString())

          if (!existing || existing.length === 0) {
            alerts.push({
              contractId: contract.id,
              workspaceId: contract.workspace_id,
              startupName: (contract as any).workspace?.startup?.name || 'Unknown',
              years,
              startDate: contract.start_date,
            })
          }
        }
      }
    }

    // Create notifications and reminders
    if (alerts.length > 0) {
      const { data: staffUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'consultor'])

      for (const alert of alerts) {
        // Record reminder
        await supabase.from('contract_reminders').insert({
          contract_id: alert.contractId,
          reminder_type: `anniversary_${alert.years}y`,
          scheduled_date: today.toISOString().split('T')[0],
        })

        // Notify all staff
        if (staffUsers) {
          const notifications = staffUsers.map(s => ({
            user_id: s.user_id,
            type: 'contract_anniversary',
            title: `🎂 ${alert.startupName} — ${alert.years} ${alert.years === 1 ? 'ano' : 'anos'} de incubação`,
            message: `A startup ${alert.startupName} atinge ${alert.years} ${alert.years === 1 ? 'ano' : 'anos'} de incubação (início: ${new Date(alert.startDate).toLocaleDateString('pt-PT')}). Momento para revisão e acompanhamento.`,
            entity_type: 'contract',
            entity_id: alert.contractId,
            link: `/workspace/${alert.workspaceId}`,
          }))
          await supabase.from('notifications').insert(notifications)
        }
      }
    }

    return new Response(JSON.stringify({
      checked: contracts?.length || 0,
      alerts: alerts.length,
      details: alerts,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Anniversary check error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
