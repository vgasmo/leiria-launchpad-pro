/**
 * Public Contract Onboarding Edge Function
 * Handles all operations for the public contract signing flow:
 * - GET: Fetch contract by onboarding token
 * - POST action=save_data: Save company data
 * - POST action=submit_signing: Generate PDF + send to DocuSign
 * - POST action=generate_token: (staff only) Generate onboarding token
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const body = await req.json()
    const { action, token, contractId } = body

    // === Staff action: generate onboarding token ===
    if (action === 'generate_token') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const jwt = authHeader.replace('Bearer ', '')
      const { data: claims, error: claimsErr } = await supabase.auth.getUser(jwt)
      if (claimsErr || !claims.user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check staff role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', claims.user.id)
        .in('role', ['admin', 'consultor', 'backoffice'])
      
      if (!roles?.length) {
        return new Response(JSON.stringify({ error: 'Staff only' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const onboardingToken = generateToken()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

      const { error: updateErr } = await supabase
        .from('startup_contracts')
        .update({
          onboarding_token: onboardingToken,
          onboarding_token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', contractId)

      if (updateErr) throw updateErr

      const publicUrl = `${req.headers.get('origin') || 'https://leiria-launchpad-pro.lovable.app'}/contract-signing/${onboardingToken}`

      return new Response(JSON.stringify({ 
        token: onboardingToken, 
        url: publicUrl,
        expiresAt: expiresAt.toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === Public actions: require valid onboarding token ===
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch contract by token
    const { data: contract, error: fetchErr } = await supabase
      .from('startup_contracts')
      .select(`
        id, contract_number, status, monthly_fee, currency, start_date, end_date,
        square_meters, signature_status, legal_representative_name,
        legal_representative_email, company_nif, company_address,
        company_city, company_postal_code, onboarding_token_expires_at,
        regulation_accepted_at, regulation_version,
        workspace:workspaces(id, startup:startups(id, name, nif, main_contact_name, main_contact_email, address)),
        incubation_type:incubation_types(name),
        building:buildings(name, code, address)
      `)
      .eq('onboarding_token', token)
      .single()

    if (fetchErr || !contract) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check expiry
    if (contract.onboarding_token_expires_at && new Date(contract.onboarding_token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === GET contract data ===
    if (action === 'get_contract') {
      // Strip sensitive fields
      const { onboarding_token_expires_at, ...safeContract } = contract as any
      return new Response(JSON.stringify({ contract: safeContract }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === Save company data ===
    if (action === 'save_data') {
      const { formData } = body
      if (!formData) {
        return new Response(JSON.stringify({ error: 'formData required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error: saveErr } = await supabase
        .from('startup_contracts')
        .update({
          legal_representative_name: formData.legal_representative_name,
          legal_representative_email: formData.legal_representative_email,
          company_nif: formData.company_nif,
          company_address: formData.company_address,
          company_city: formData.company_city,
          company_postal_code: formData.company_postal_code,
        })
        .eq('id', contract.id)

      if (saveErr) throw saveErr

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === Submit for DocuSign signing ===
    if (action === 'submit_signing') {
      const { formData } = body
      const signerEmail = formData?.legal_representative_email || contract.legal_representative_email
      const signerName = formData?.legal_representative_name || contract.legal_representative_name

      if (!signerEmail || !signerName) {
        return new Response(JSON.stringify({ error: 'Signer data required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Mark regulation as accepted
      await supabase
        .from('startup_contracts')
        .update({
          regulation_accepted_at: new Date().toISOString(),
          regulation_version: 'V11_2026',
          signature_status: 'sent_for_signature',
          signature_requested_at: new Date().toISOString(),
          legal_representative_name: signerName,
          legal_representative_email: signerEmail,
          company_nif: formData?.company_nif || contract.company_nif,
        })
        .eq('id', contract.id)

      // Try to generate PDF and send via DocuSign
      let docusignResult: any = { status: 'pending_manual' }

      try {
        // Generate PDF via internal call
        const pdfRes = await fetch(`${supabaseUrl}/functions/v1/generate-contract-pdf`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contractId: contract.id }),
        })

        let documentBase64 = ''
        if (pdfRes.ok) {
          const pdfData = await pdfRes.json()
          documentBase64 = pdfData.documentBase64 || ''
        }

        // Check DocuSign configuration
        const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY')
        if (integrationKey) {
          // Send via DocuSign
          const dsRes = await fetch(`${supabaseUrl}/functions/v1/docusign-send-envelope`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contractId: contract.id,
              signerEmail,
              signerName,
              companyNif: formData?.company_nif || contract.company_nif,
              documentBase64,
            }),
          })

          if (dsRes.ok) {
            docusignResult = await dsRes.json()
          } else {
            console.warn('DocuSign send failed:', await dsRes.text())
            docusignResult = { status: 'pending_manual', message: 'DocuSign unavailable' }
          }
        } else {
          // No DocuSign configured - notify staff
          const { data: staffUsers } = await supabase
            .from('user_roles')
            .select('user_id')
            .in('role', ['admin', 'consultor'])

          if (staffUsers?.length) {
            const startupName = (contract as any).workspace?.startup?.name || 'Startup'
            await supabase.from('notifications').insert(
              staffUsers.map(s => ({
                user_id: s.user_id,
                type: 'contract_signing',
                title: `Contrato pendente: ${startupName}`,
                message: `${signerName} (${signerEmail}) completou o onboarding contratual. DocuSign não configurado.`,
                entity_type: 'contract',
                entity_id: contract.id,
                link: '/admin?tab=contracts',
              }))
            )
          }
        }
      } catch (err) {
        console.error('Signing flow error:', err)
        docusignResult = { status: 'pending_manual', message: String(err) }
      }

      return new Response(JSON.stringify(docusignResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Public contract onboarding error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
