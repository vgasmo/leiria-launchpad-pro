/**
 * PandaDoc Webhook Handler
 * Receives document status updates from PandaDoc and updates contract status.
 * Maps PandaDoc events → canonical signature states.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * PandaDoc status → canonical signature status mapping
 */
const PANDADOC_STATUS_MAP: Record<string, string> = {
  'document.uploaded': 'draft',
  'document.draft': 'draft',
  'document.sent': 'sent_for_signature',
  'document.viewed': 'viewed',
  'document.waiting_approval': 'sent_for_signature',
  'document.approved': 'sent_for_signature',
  'document.waiting_pay': 'sent_for_signature',
  'document.paid': 'completed',
  'document.completed': 'completed',
  'document.voided': 'voided',
  'document.declined': 'declined',
  'document.external_review': 'viewed',
  'document.deleted': 'voided',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json()

    // PandaDoc webhook payload structure
    const events = Array.isArray(body) ? body : [body]

    for (const event of events) {
      const pandadocDocId = event.data?.id || event.uuid || null
      const pandadocStatus = event.event || event.data?.status || null
      const eventName = event.event || 'unknown'

      if (!pandadocDocId) {
        console.warn('PandaDoc webhook: no document ID found in payload', JSON.stringify(event).slice(0, 300))
        continue
      }

      console.log(`PandaDoc webhook: doc=${pandadocDocId}, event=${eventName}, status=${pandadocStatus}`)

      // Find contract by provider_document_id
      const { data: contract, error: findError } = await supabase
        .from('startup_contracts')
        .select('id, workspace_id, status as contract_status, legal_representative_email, legal_representative_name, signature_status')
        .eq('provider_document_id', pandadocDocId)
        .eq('signature_provider', 'pandadoc')
        .single()

      if (findError || !contract) {
        console.warn('Contract not found for PandaDoc document:', pandadocDocId)
        continue
      }

      // Map to canonical status
      const canonicalStatus = PANDADOC_STATUS_MAP[eventName] || contract.signature_status || 'draft'

      const updatePayload: Record<string, unknown> = {
        signature_status: canonicalStatus,
        provider_last_event: eventName,
        provider_last_sync_at: new Date().toISOString(),
        provider_last_error: null,
      }

      if (canonicalStatus === 'completed') {
        updatePayload.signed_at = new Date().toISOString()
        updatePayload.status = 'active'
        updatePayload.provider_completed_at = new Date().toISOString()
        updatePayload.onboarding_completed_at = new Date().toISOString()
        updatePayload.onboarding_token = null
        updatePayload.onboarding_token_expires_at = null
      }

      await supabase
        .from('startup_contracts')
        .update(updatePayload)
        .eq('id', contract.id)

      // Notify staff on completion
      if (canonicalStatus === 'completed') {
        const { data: staffUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'consultor'])

        if (staffUsers?.length) {
          await supabase.from('notifications').insert(
            staffUsers.map((s: { user_id: string }) => ({
              user_id: s.user_id,
              type: 'contract_signed',
              title: 'Contrato assinado digitalmente (PandaDoc)',
              message: `O contrato ${contract.id.slice(0, 8)} foi assinado por ${contract.legal_representative_name || 'founder'} via PandaDoc.`,
              entity_type: 'contract',
              entity_id: contract.id,
              link: '/admin?tab=contracts',
            }))
          )
        }

        // Log activity
        await supabase.from('activity_log').insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          entity_type: 'contract',
          entity_id: contract.id,
          action: 'digitally_signed_pandadoc',
          workspace_id: contract.workspace_id,
          metadata: { pandadoc_document_id: pandadocDocId, event: eventName },
        })
      }

      // On decline, notify staff
      if (canonicalStatus === 'declined') {
        const { data: staffUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'consultor'])

        if (staffUsers?.length) {
          await supabase.from('notifications').insert(
            staffUsers.map((s: { user_id: string }) => ({
              user_id: s.user_id,
              type: 'contract_declined',
              title: 'Contrato recusado (PandaDoc)',
              message: `O contrato ${contract.id.slice(0, 8)} foi recusado via PandaDoc.`,
              entity_type: 'contract',
              entity_id: contract.id,
              link: '/admin?tab=contracts',
            }))
          )
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('PandaDoc webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
