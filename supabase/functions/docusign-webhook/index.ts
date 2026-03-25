/**
 * DocuSign Webhook (Connect) Handler
 * Receives envelope status updates from DocuSign and updates contract status.
 * On completion: auto-creates founder account if not yet registered.
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

    // Parse DocuSign payload (JSON or XML)
    const contentType = req.headers.get('content-type') || ''
    let envelopeId: string | null = null
    let status: string | null = null

    if (contentType.includes('application/json')) {
      const body = await req.json()
      envelopeId = body.data?.envelopeId || body.envelopeId
      status = body.data?.envelopeSummary?.status || body.event

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
      const envelopeIdMatch = xmlText.match(/<EnvelopeID>([^<]+)<\/EnvelopeID>/i)
      const statusMatch = xmlText.match(/<Status>([^<]+)<\/Status>/i)
      envelopeId = envelopeIdMatch?.[1] || null
      status = statusMatch?.[1]?.toLowerCase() || null
    }

    if (!envelopeId) {
      return new Response(JSON.stringify({ error: 'No envelope ID found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`DocuSign webhook: envelope=${envelopeId}, status=${status}`)

    // Find the contract
    const { data: contract, error: findError } = await supabase
      .from('startup_contracts')
      .select('id, workspace_id, status as contract_status, legal_representative_email, legal_representative_name')
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
      // Clear the onboarding token (no longer needed)
      updatePayload.onboarding_token = null
      updatePayload.onboarding_token_expires_at = null
    }

    await supabase
      .from('startup_contracts')
      .update(updatePayload)
      .eq('id', contract.id)

    // === AUTO-REGISTRATION on completion ===
    if (status === 'completed' && contract.legal_representative_email) {
      try {
        await autoCreateFounderAccount(supabase, contract)
      } catch (regErr) {
        console.error('Auto-registration error (non-fatal):', regErr)
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
        metadata: { envelope_id: envelopeId },
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
        redirectTo: `https://leiria-launchpad-pro.lovable.app/reset-password`,
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
