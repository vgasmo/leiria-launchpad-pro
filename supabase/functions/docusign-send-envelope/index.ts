/**
 * DocuSign Send Envelope Edge Function
 * Sends a contract for digital signature via DocuSign eSignature API
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getDocuSignAccessToken(): Promise<{ accessToken: string; accountId: string }> {
  const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY')!
  const userId = Deno.env.get('DOCUSIGN_USER_ID')!
  const rsaPrivateKey = Deno.env.get('DOCUSIGN_RSA_PRIVATE_KEY')!
  const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID')!
  const baseUrl = Deno.env.get('DOCUSIGN_BASE_URL') || 'https://demo.docusign.net'

  // JWT Grant flow
  const now = Math.floor(Date.now() / 1000)
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({
    iss: integrationKey,
    sub: userId,
    aud: baseUrl.includes('demo') ? 'account-d.docusign.com' : 'account.docusign.com',
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation',
  }))

  // Sign JWT with RSA key
  const keyData = rsaPrivateKey.replace(/-----BEGIN RSA PRIVATE KEY-----|-----END RSA PRIVATE KEY-----|\n/g, '')
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  )
  const signatureData = new TextEncoder().encode(`${header}.${payload}`)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, signatureData)
  const jwt = `${header}.${payload}.${btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`

  // Exchange JWT for access token
  const tokenUrl = baseUrl.includes('demo')
    ? 'https://account-d.docusign.com/oauth/token'
    : 'https://account.docusign.com/oauth/token'

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`DocuSign token error: ${err}`)
  }

  const tokenData = await tokenRes.json()
  return { accessToken: tokenData.access_token, accountId }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { contractId, signerEmail, signerName, companyNif } = await req.json()

    if (!contractId || !signerEmail || !signerName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch contract details
    const { data: contract, error: contractError } = await supabase
      .from('startup_contracts')
      .select('*, workspace:workspaces(startup:startups(name))')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate the contract PDF first
    let documentBase64 = ''
    try {
      const pdfRes = await fetch(`${supabaseUrl}/functions/v1/generate-contract-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractId }),
      })
      if (pdfRes.ok) {
        const pdfData = await pdfRes.json()
        documentBase64 = pdfData.documentBase64 || ''
      } else {
        console.warn('PDF generation failed, proceeding with placeholder')
      }
    } catch (pdfErr) {
      console.warn('PDF generation error:', pdfErr)
    }

    // Check if DocuSign keys are configured
    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY')
    if (!integrationKey) {
      // Graceful fallback: mark as pending manual signature
      await supabase
        .from('startup_contracts')
        .update({
          signature_status: 'pending_manual',
          signature_requested_at: new Date().toISOString(),
        })
        .eq('id', contractId)

      // Notify staff
      const { data: staffUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'consultor'])

      if (staffUsers) {
        const notifications = staffUsers.map(s => ({
          user_id: s.user_id,
          type: 'contract_signing',
          title: `Contrato pendente de assinatura: ${contract.workspace?.startup?.name || contractId}`,
          message: `O representante ${signerName} (${signerEmail}) completou o onboarding contratual. DocuSign não configurado — assinatura manual necessária.`,
          entity_type: 'contract',
          entity_id: contractId,
          link: `/admin?tab=contracts`,
        }))
        await supabase.from('notifications').insert(notifications)
      }

      return new Response(JSON.stringify({
        status: 'pending_manual',
        message: 'DocuSign not configured. Staff notified for manual processing.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send via DocuSign
    const { accessToken, accountId } = await getDocuSignAccessToken()
    const baseUrl = (Deno.env.get('DOCUSIGN_BASE_URL') || 'https://demo.docusign.net') + '/restapi'

    const startupName = contract.workspace?.startup?.name || 'Startup'
    const envelopeBody = {
      emailSubject: `Contrato de Incubação — ${startupName} — Startup Leiria`,
      emailBlurb: `Caro/a ${signerName}, segue o contrato de incubação para assinatura digital.`,
      status: 'sent',
      recipients: {
        signers: [{
          email: signerEmail,
          name: signerName,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [{ documentId: '1', pageNumber: '1', xPosition: '100', yPosition: '600' }],
            dateSignedTabs: [{ documentId: '1', pageNumber: '1', xPosition: '300', yPosition: '600' }],
          },
        }],
      },
      documents: [{
        documentId: '1',
        name: `Contrato_Incubacao_${startupName}.pdf`,
        documentBase64: documentBase64, // Real generated contract PDF
        fileExtension: 'pdf',
      }],
    }

    const envRes = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/envelopes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelopeBody),
    })

    if (!envRes.ok) {
      const errText = await envRes.text()
      throw new Error(`DocuSign API error: ${errText}`)
    }

    const envelope = await envRes.json()

    // Update contract with envelope ID
    await supabase
      .from('startup_contracts')
      .update({
        docusign_envelope_id: envelope.envelopeId,
        signature_status: 'sent_for_signature',
        signature_requested_at: new Date().toISOString(),
      })
      .eq('id', contractId)

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      entity_type: 'contract',
      entity_id: contractId,
      action: 'sent_for_signature',
      metadata: { envelope_id: envelope.envelopeId, signer: signerEmail },
    })

    return new Response(JSON.stringify({
      status: 'sent',
      envelopeId: envelope.envelopeId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('DocuSign error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
