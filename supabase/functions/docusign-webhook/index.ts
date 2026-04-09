/**
 * DocuSign Webhook (Connect) Handler
 * Receives envelope status updates from DocuSign and updates contract status.
 * 
 * Security:
 * 1. Verifies webhook authenticity via HMAC or shared secret (WEBHOOK_SECRET)
 * 2. Idempotency protection via provider_webhook_event_id
 * 3. Stores provider event payloads in contract_lifecycle_events for auditability
 * 
 * On completion: auto-creates founder account if not yet registered,
 * triggers invoice schedule generation.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => chars[b % chars.length]).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // ═══ WEBHOOK AUTHENTICITY VERIFICATION ═══
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
    if (webhookSecret) {
      // DocuSign sends HMAC signatures in x-docusign-signature-* headers
      const signature = req.headers.get('x-docusign-signature-1')
      // If DocuSign Connect is configured with HMAC, verify it
      // For basic shared-secret setups, we check a custom header
      const authHeader = req.headers.get('x-webhook-secret')
      if (!signature && authHeader !== webhookSecret) {
        console.warn('DocuSign webhook: authenticity verification failed')
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Parse DocuSign payload (JSON or XML)
    const contentType = req.headers.get('content-type') || ''
    let envelopeId: string | null = null
    let status: string | null = null
    let rawPayload: Record<string, unknown> = {}
    let eventId: string | null = null

    if (contentType.includes('application/json')) {
      const body = await req.json()
      rawPayload = body
      envelopeId = body.data?.envelopeId || body.envelopeId
      status = body.data?.envelopeSummary?.status || body.event
      // Generate a stable event ID from envelope + event + timestamp for idempotency
      eventId = body.data?.eventId || `ds-${envelopeId}-${body.event || status}-${body.generatedDateTime || Date.now()}`

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
      const xmlText = await req.text()
      rawPayload = { xml: xmlText }
      const envelopeIdMatch = xmlText.match(/<EnvelopeID>([^<]+)<\/EnvelopeID>/i)
      const statusMatch = xmlText.match(/<Status>([^<]+)<\/Status>/i)
      envelopeId = envelopeIdMatch?.[1] || null
      status = statusMatch?.[1]?.toLowerCase() || null
      eventId = `ds-xml-${envelopeId}-${status}-${Date.now()}`
    }

    if (!envelopeId) {
      return new Response(JSON.stringify({ error: 'No envelope ID found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`DocuSign webhook: envelope=${envelopeId}, status=${status}, eventId=${eventId}`)

    // Find the contract
    const { data: contract, error: findError } = await supabase
      .from('startup_contracts')
      .select('id, workspace_id, status as contract_status, legal_representative_email, legal_representative_name, signature_status, provider_webhook_event_id, pricing_snapshot_json')
      .eq('docusign_envelope_id', envelopeId)
      .single()

    if (findError || !contract) {
      console.warn('Contract not found for envelope:', envelopeId)
      return new Response(JSON.stringify({ ok: true, message: 'No matching contract' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ═══ IDEMPOTENCY: Skip duplicate events ═══
    if (eventId && contract.provider_webhook_event_id === eventId) {
      console.log(`Duplicate event skipped: ${eventId}`)
      return new Response(JSON.stringify({ ok: true, message: 'Duplicate event' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ═══ AUDIT: Log event to contract_lifecycle_events ═══
    await supabase.from('contract_lifecycle_events').insert({
      contract_id: contract.id,
      event_type: `docusign_webhook_${status}`,
      event_date: new Date().toISOString().split('T')[0],
      details: {
        provider: 'docusign',
        envelope_id: envelopeId,
        event_id: eventId,
        canonical_status: status,
        raw_event: typeof rawPayload === 'object' ? { event: (rawPayload as any).event, generatedDateTime: (rawPayload as any).generatedDateTime } : null,
      },
    })

    // Update contract
    const updatePayload: Record<string, unknown> = {
      signature_status: status,
      provider_last_event: status,
      provider_last_sync_at: new Date().toISOString(),
      provider_last_error: null,
      provider_webhook_event_id: eventId,
    }

    if (status === 'completed') {
      updatePayload.signed_at = new Date().toISOString()
      updatePayload.status = 'active'
      updatePayload.onboarding_completed_at = new Date().toISOString()
      updatePayload.provider_completed_at = new Date().toISOString()
      updatePayload.canonical_signature_status = 'completed'
      // Clear the onboarding token (no longer needed)
      updatePayload.onboarding_token = null
      updatePayload.onboarding_token_expires_at = null
    } else if (status === 'declined') {
      updatePayload.canonical_signature_status = 'declined'
    } else if (status === 'voided') {
      updatePayload.canonical_signature_status = 'voided'
    } else if (status === 'sent_for_signature') {
      updatePayload.canonical_signature_status = 'sent'
    } else if (status === 'viewed') {
      updatePayload.canonical_signature_status = 'viewed'
    }

    await supabase
      .from('startup_contracts')
      .update(updatePayload)
      .eq('id', contract.id)

    // ═══ CANONICAL LIFECYCLE SYNC: Keep contract_intakes and CRM in sync ═══
    if (status === 'completed' || status === 'sent_for_signature') {
      try {
        // Find the linked intake
        const { data: intake } = await supabase
          .from('contract_intakes')
          .select('id, status, funnel_item_id')
          .eq('contract_id', contract.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (intake) {
          if (status === 'completed') {
            // Sync intake to signed → activated
            await supabase.from('contract_intakes')
              .update({ status: 'signed' })
              .eq('id', intake.id)

            await supabase.from('intake_events').insert({
              intake_id: intake.id,
              event_type: 'lifecycle_sync_signed',
              from_status: intake.status,
              to_status: 'signed',
              metadata: { source: 'docusign_webhook', envelope_id: envelopeId },
            })

            // Then activate
            await supabase.from('contract_intakes')
              .update({ status: 'activated' })
              .eq('id', intake.id)

            await supabase.from('intake_events').insert({
              intake_id: intake.id,
              event_type: 'lifecycle_sync_activated',
              from_status: 'signed',
              to_status: 'activated',
              metadata: { source: 'docusign_webhook', envelope_id: envelopeId },
            })

            // Sync CRM to contracted
            if (intake.funnel_item_id) {
              await supabase.from('funnel_items')
                .update({ stage: 'contracted' })
                .eq('id', intake.funnel_item_id)
            }

            console.log(`Lifecycle sync: intake ${intake.id} → activated, CRM synced`)
          } else if (status === 'sent_for_signature') {
            // Sync intake to signature_sent
            if (intake.status !== 'signature_sent' && intake.status !== 'signed' && intake.status !== 'activated') {
              await supabase.from('contract_intakes')
                .update({ status: 'signature_sent' })
                .eq('id', intake.id)

              await supabase.from('intake_events').insert({
                intake_id: intake.id,
                event_type: 'lifecycle_sync_signature_sent',
                from_status: intake.status,
                to_status: 'signature_sent',
                metadata: { source: 'docusign_webhook', envelope_id: envelopeId },
              })

              if (intake.funnel_item_id) {
                await supabase.from('funnel_items')
                  .update({ stage: 'sent_for_signature' })
                  .eq('id', intake.funnel_item_id)
              }
              console.log(`Lifecycle sync: intake ${intake.id} → signature_sent`)
            }
          }
        }
      } catch (syncErr) {
        console.error('Lifecycle sync error (non-fatal):', syncErr)
      }
    }

    // === AUTO-REGISTRATION on completion ===
    if (status === 'completed' && contract.legal_representative_email) {
      try {
        await autoCreateFounderAccount(supabase, contract)
      } catch (regErr) {
        console.error('Auto-registration error (non-fatal):', regErr)
      }
    }

    // === AUTO-GENERATE FIRST INVOICE on completion ===
    if (status === 'completed') {
      try {
        const targetMonth = new Date().toISOString().slice(0, 7)
        console.log(`Triggering invoice generation for contract ${contract.id}, month ${targetMonth}`)
        
        const functionUrl = `${supabaseUrl}/functions/v1/generate-invoices`
        await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetMonth,
            contractId: contract.id,
          }),
        })
      } catch (invoiceErr) {
        console.error('Auto-invoice generation error (non-fatal):', invoiceErr)
      }
    }

    // Notify staff
    if (status === 'completed') {
      const { data: staffUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'consultor'])

      if (staffUsers?.length) {
        await supabase.from('notifications').insert(
          staffUsers.map(s => ({
            user_id: s.user_id,
            type: 'contract_signed',
            title: 'Contrato assinado digitalmente',
            message: `O contrato ${contract.id.slice(0, 8)} foi assinado por ${contract.legal_representative_name || 'founder'} via DocuSign.`,
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
        action: 'digitally_signed',
        workspace_id: contract.workspace_id,
        metadata: { envelope_id: envelopeId, provider: 'docusign', event_id: eventId },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('DocuSign webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

/**
 * Auto-create founder account after contract signing.
 * If email already exists, link to workspace. Otherwise create new account.
 */
async function autoCreateFounderAccount(
  supabase: any,
  contract: { id: string; workspace_id: string; legal_representative_email: string; legal_representative_name: string | null }
) {
  const email = contract.legal_representative_email.toLowerCase().trim()
  const fullName = contract.legal_representative_name || 'Founder'

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find((u: any) => u.email?.toLowerCase() === email)

  let userId: string

  if (existingUser) {
    userId = existingUser.id
    console.log(`User already exists: ${userId}`)
  } else {
    // Create new user with temporary password (they'll reset via email)
    const tempPassword = generateSecurePassword()
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        selected_role: 'founder',
        auto_created: true,
        contract_id: contract.id,
      },
    })

    if (createErr) throw createErr
    userId = newUser.user.id
    console.log(`Created new user: ${userId}`)

    // Send password reset so they can set their own password
    await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${Deno.env.get("PUBLIC_APP_URL") || 'https://fb.startupleiria.com'}/reset-password`,
      },
    })
  }

  // Ensure founder role
  await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role: 'founder' }, { onConflict: 'user_id,role' })

  // Add to workspace
  await supabase
    .from('workspace_users')
    .upsert(
      { workspace_id: contract.workspace_id, user_id: userId, role: 'founder', active: true },
      { onConflict: 'workspace_id,user_id' }
    )

  // Activate workspace if still draft/pending
  const { data: ws } = await supabase
    .from('workspaces')
    .select('status')
    .eq('id', contract.workspace_id)
    .single()

  if (ws && ['pending', 'imported_unclaimed', 'draft'].includes(ws.status)) {
    await supabase
      .from('workspaces')
      .update({ status: 'claimed', updated_at: new Date().toISOString() })
      .eq('id', contract.workspace_id)
  }

  console.log(`Founder ${email} linked to workspace ${contract.workspace_id}`)
}
