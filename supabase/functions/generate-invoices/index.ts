/**
 * Generate Invoices Edge Function
 * Auto-generates monthly invoices from active contracts based on billing day.
 * Called by cron or manually from backoffice.
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Auth: allow cron (with secret) or authenticated staff
    const authHeader = req.headers.get('Authorization')
    let isCron = false

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const cronSecret = Deno.env.get('CRON_SECRET')
      
      if (token === cronSecret) {
        isCron = true
      } else {
        // Validate as user token
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error || !user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        // Check staff role
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'consultor', 'backoffice'])
        
        if (!roles?.length) {
          return new Response(JSON.stringify({ error: 'Staff only' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    } else {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const targetMonth = body.targetMonth || new Date().toISOString().slice(0, 7) // YYYY-MM
    const dryRun = body.dryRun === true

    const now = new Date()
    const [year, month] = targetMonth.split('-').map(Number)

    // Fetch all active contracts
    const { data: contracts, error: contractsError } = await supabase
      .from('startup_contracts')
      .select(`
        id, workspace_id, contract_number, monthly_fee, currency,
        billing_day, payment_terms_days, discount_percentage,
        start_date, end_date, status
      `)
      .eq('status', 'active')

    if (contractsError) throw contractsError

    const results: Array<{ contractId: string; invoiceNumber: string; total: number; status: string }> = []
    const errors: Array<{ contractId: string; error: string }> = []

    for (const contract of contracts || []) {
      try {
        // Check if contract was active during this month
        const contractStart = new Date(contract.start_date)
        const periodStart = new Date(year, month - 1, 1)
        const periodEnd = new Date(year, month, 0)
        
        if (contractStart > periodEnd) continue
        if (contract.end_date && new Date(contract.end_date) < periodStart) continue

        // Check if invoice already exists for this contract + month
        const invoiceNumber = `INV-${targetMonth.replace('-', '')}-${contract.contract_number || contract.id.slice(0, 6)}`
        
        const { data: existing } = await supabase
          .from('invoices')
          .select('id')
          .eq('contract_id', contract.id)
          .gte('issue_date', `${targetMonth}-01`)
          .lt('issue_date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
          .limit(1)

        if (existing?.length) {
          results.push({ 
            contractId: contract.id, 
            invoiceNumber, 
            total: 0, 
            status: 'skipped_exists' 
          })
          continue
        }

        // Fetch active discounts for this period
        const { data: discounts } = await supabase
          .from('contract_discounts')
          .select('discount_percentage')
          .eq('contract_id', contract.id)
          .lte('start_date', periodEnd.toISOString())
          .or(`end_date.is.null,end_date.gte.${periodStart.toISOString()}`)

        const maxDiscount = discounts?.reduce((max, d) => 
          Math.max(max, d.discount_percentage), 0) || contract.discount_percentage || 0

        const subtotal = contract.monthly_fee * (1 - maxDiscount / 100)
        const taxRate = 0.23 // 23% IVA
        const taxAmount = subtotal * taxRate
        const total = subtotal + taxAmount

        const billingDay = Math.min(contract.billing_day || 1, periodEnd.getDate())
        const issueDate = `${targetMonth}-${String(billingDay).padStart(2, '0')}`
        const dueDate = new Date(new Date(issueDate).getTime() + (contract.payment_terms_days || 30) * 86400000)
          .toISOString().split('T')[0]

        if (dryRun) {
          results.push({ contractId: contract.id, invoiceNumber, total, status: 'would_create' })
          continue
        }

        // Create the invoice
        const { error: insertError } = await supabase
          .from('invoices')
          .insert({
            contract_id: contract.id,
            workspace_id: contract.workspace_id,
            invoice_number: invoiceNumber,
            issue_date: issueDate,
            due_date: dueDate,
            subtotal: Math.round(subtotal * 100) / 100,
            tax_rate: taxRate * 100,
            tax_amount: Math.round(taxAmount * 100) / 100,
            total: Math.round(total * 100) / 100,
            currency: contract.currency || 'EUR',
            status: 'draft',
            line_items: [{
              description: `Mensalidade de incubação — ${new Date(year, month - 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })}`,
              quantity: 1,
              unit_price: contract.monthly_fee,
              discount_percentage: maxDiscount,
              amount: subtotal,
            }],
          })

        if (insertError) throw insertError

        results.push({ contractId: contract.id, invoiceNumber, total, status: 'created' })

      } catch (err) {
        errors.push({ contractId: contract.id, error: (err as Error).message })
      }
    }

    const created = results.filter(r => r.status === 'created').length
    const skipped = results.filter(r => r.status === 'skipped_exists').length

    return new Response(JSON.stringify({
      success: true,
      targetMonth,
      dryRun,
      summary: {
        totalContracts: contracts?.length || 0,
        created,
        skipped,
        errors: errors.length,
      },
      results,
      errors: errors.length ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Invoice generation error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
