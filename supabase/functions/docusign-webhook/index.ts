/**
 * DocuSign Webhook (Connect) Handler
 * Receives envelope status updates from DocuSign and updates contract status
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

    // DocuSign sends XML by default, but can be configured to JSON
    const contentType = req.headers.get('content-type') || ''
    let envelopeId: string | null = null
    let status: string | null = null

    if (contentType.includes('application/json')) {
      const body = await req.json()
      envelopeId = body.data?.envelopeId || body.envelopeId
      status = body.data?.envelopeSummary?.status || body.event

      // Map DocuSign events to our status
      const statusMap: Record<string, string> = {
        'envelope-sent': 'sent_for_signature',
        'envelope-delivered': 'viewed',
        'envelope-completed': 'completed',
        'envelope-declined': 'declined',
        'envelope-voided': 'voided',
        'recipient-sent': 'sent_for_signature',
        'recipient-delivered': 'viewed',
        'recipient-completed': 'completed',
        'recipient-declined': 'declined',
      }

      if (body.event && statusMap[body.event]) {
        status = statusMap[body.event]
      }
    } else {
      // XML handling - parse basic envelope status
      const xmlText = await req.text()
      const envelopeIdMatch = xmlText.match(/<EnvelopeID>([^<]+)<\/EnvelopeID>/i)
      const statusMatch = xmlText.match(/<Status>([^<]+)<\/Status>/i)
      envelopeId = envelopeIdMatch?.[1] || null
      status = statusMatch?.[1]?.toLowerCase() || null
    }

    if (!envelopeId) {
      return new Response(JSON.stringify({ error: 'No envelope ID found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`DocuSign webhook: envelope=${envelopeId}, status=${status}`)

    // Find the contract
    const { data: contract, error: findError } = await supabase
      .from('startup_contracts')
      .select('id, workspace_id, status as contract_status')
      .eq('docusign_envelope_id', envelopeId)
      .single()

    if (findError || !contract) {
      console.warn('Contract not found for envelope:', envelopeId)
      return new Response(JSON.stringify({ ok: true, message: 'No matching contract' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update contract
    const updatePayload: Record<string, unknown> = {
      signature_status: status,
    }

    if (status === 'completed') {
      updatePayload.signed_at = new Date().toISOString()
      updatePayload.status = 'active'
      updatePayload.onboarding_completed_at = new Date().toISOString()
    }

    await supabase
      .from('startup_contracts')
      .update(updatePayload)
      .eq('id', contract.id)

    // If completed, notify staff
    if (status === 'completed') {
      const { data: staffUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'consultor'])

      if (staffUsers) {
        const notifications = staffUsers.map(s => ({
          user_id: s.user_id,
          type: 'contract_signed',
          title: 'Contrato assinado digitalmente',
          message: `O contrato ${contract.id.slice(0, 8)} foi assinado via DocuSign.`,
          entity_type: 'contract',
          entity_id: contract.id,
          link: '/admin?tab=contracts',
        }))
        await supabase.from('notifications').insert(notifications)
      }

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // system
        entity_type: 'contract',
        entity_id: contract.id,
        action: 'digitally_signed',
        workspace_id: contract.workspace_id,
        metadata: { envelope_id: envelopeId },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('DocuSign webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
