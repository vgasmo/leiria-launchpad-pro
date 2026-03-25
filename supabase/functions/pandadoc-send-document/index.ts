/**
 * PandaDoc Send Document Edge Function
 * Sends a contract for digital signature via PandaDoc API.
 * Uses the REAL generated contract PDF from the canonical contract engine.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PANDADOC_API = 'https://api.pandadoc.com/public/v1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const contractId = typeof body?.contractId === 'string' ? body.contractId.trim() : ''
    const requestedSignerEmail = typeof body?.signerEmail === 'string' ? body.signerEmail.trim() : ''
    const requestedSignerName = typeof body?.signerName === 'string' ? body.signerName.trim() : ''

    if (!contractId) {
      return new Response(JSON.stringify({ error: 'Missing required field: contractId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check PandaDoc API key
    const pandadocApiKey = Deno.env.get('PANDADOC_API_KEY')
    if (!pandadocApiKey) {
      // Fallback: mark as pending manual
      await supabase
        .from('startup_contracts')
        .update({
          signature_status: 'pending_manual',
          signature_provider: 'manual',
          signature_requested_at: new Date().toISOString(),
          provider_last_error: 'PANDADOC_API_KEY not configured',
        })
        .eq('id', contractId)

      return new Response(JSON.stringify({
        status: 'pending_manual',
        message: 'PandaDoc not configured. Contract marked for manual processing.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch contract
    const { data: contract, error: contractError } = await supabase
      .from('startup_contracts')
      .select('*, workspace:workspaces(startup:startups(name,main_contact_email))')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const signerEmail =
      requestedSignerEmail ||
      contract.legal_representative_email ||
      contract.workspace?.startup?.main_contact_email ||
      ''

    const signerName =
      requestedSignerName ||
      contract.legal_representative_name ||
      contract.workspace?.startup?.name ||
      'Founder'

    if (!signerEmail) {
      const missingSignerError = 'No signer email found. Fill Legal Representative Email or Startup main contact email before sending.'

      await supabase
        .from('startup_contracts')
        .update({
          provider_last_error: missingSignerError,
          provider_last_sync_at: new Date().toISOString(),
        })
        .eq('id', contractId)

      return new Response(JSON.stringify({ error: missingSignerError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Guard: do not resend already-sent contracts
    if (contract.signature_provider && contract.provider_document_id &&
        contract.signature_status && !['draft', 'failed'].includes(contract.signature_status)) {
      return new Response(JSON.stringify({
        error: 'Contract already sent for signature. Cannot resend.',
        currentProvider: contract.signature_provider,
        currentStatus: contract.signature_status,
      }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate the contract PDF using canonical engine
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
        const errText = await pdfRes.text()
        console.error('PDF generation failed:', errText)
      }
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr)
    }

    if (!documentBase64) {
      await supabase.from('startup_contracts').update({
        provider_last_error: 'Failed to generate contract PDF',
        provider_last_sync_at: new Date().toISOString(),
      }).eq('id', contractId)

      return new Response(JSON.stringify({
        error: 'Failed to generate contract PDF. Cannot send to PandaDoc.',
      }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const startupName = contract.workspace?.startup?.name || 'Startup'

    // Step 1: Create document from PDF file upload
    const boundary = '----PandaDocBoundary' + Date.now()
    const pdfBytes = Uint8Array.from(atob(documentBase64), c => c.charCodeAt(0))

    const metadata = JSON.stringify({
      name: `Contrato de Incubação — ${startupName}`,
      recipients: [{
        email: signerEmail,
        first_name: signerName.split(' ')[0],
        last_name: signerName.split(' ').slice(1).join(' ') || '',
        role: 'signer',
      }],
      parse_form_fields: false,
    })

    // Build multipart body
    const encoder = new TextEncoder()
    const parts: Uint8Array[] = []

    // Metadata part
    parts.push(encoder.encode(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="data"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      metadata + '\r\n'
    ))

    // File part
    parts.push(encoder.encode(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="Contrato_Incubacao_${startupName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n`
    ))
    parts.push(pdfBytes)
    parts.push(encoder.encode('\r\n'))

    // Closing boundary
    parts.push(encoder.encode(`--${boundary}--\r\n`))

    // Combine parts
    const totalLength = parts.reduce((sum, p) => sum + p.length, 0)
    const bodyBytes = new Uint8Array(totalLength)
    let offset = 0
    for (const part of parts) {
      bodyBytes.set(part, offset)
      offset += part.length
    }

    const createRes = await fetch(`${PANDADOC_API}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `API-Key ${pandadocApiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBytes,
    })

    if (!createRes.ok) {
      const errText = await createRes.text()
      await supabase.from('startup_contracts').update({
        provider_last_error: `PandaDoc create failed [${createRes.status}]: ${errText.slice(0, 500)}`,
        provider_last_sync_at: new Date().toISOString(),
      }).eq('id', contractId)

      throw new Error(`PandaDoc API error [${createRes.status}]: ${errText}`)
    }

    const doc = await createRes.json()
    const pandadocDocId = doc.id

    // Update contract with PandaDoc document ID
    await supabase.from('startup_contracts').update({
      signature_provider: 'pandadoc',
      provider_document_id: pandadocDocId,
      signature_status: 'draft',
      signature_requested_at: new Date().toISOString(),
      provider_last_sync_at: new Date().toISOString(),
      provider_last_event: 'document.created',
      provider_last_error: null,
    }).eq('id', contractId)

    // Step 2: Wait briefly for document processing, then send
    // PandaDoc needs time to process the uploaded document
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Check document status before sending
    const statusRes = await fetch(`${PANDADOC_API}/documents/${pandadocDocId}`, {
      headers: { 'Authorization': `API-Key ${pandadocApiKey}` },
    })

    if (statusRes.ok) {
      const statusData = await statusRes.json()

      if (statusData.status === 'document.draft') {
        // Send the document for signature
        const sendRes = await fetch(`${PANDADOC_API}/documents/${pandadocDocId}/send`, {
          method: 'POST',
          headers: {
            'Authorization': `API-Key ${pandadocApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Caro/a ${signerName}, segue o contrato de incubação para assinatura digital via PandaDoc.`,
            silent: false,
          }),
        })

        if (sendRes.ok) {
          await supabase.from('startup_contracts').update({
            signature_status: 'sent_for_signature',
            provider_sent_at: new Date().toISOString(),
            provider_last_event: 'document.sent',
            provider_last_sync_at: new Date().toISOString(),
            provider_last_error: null,
          }).eq('id', contractId)
        } else {
          const sendErr = await sendRes.text()
          await supabase.from('startup_contracts').update({
            signature_status: 'ready_to_send',
            provider_last_error: `Send failed [${sendRes.status}]: ${sendErr.slice(0, 500)}`,
            provider_last_sync_at: new Date().toISOString(),
          }).eq('id', contractId)
        }
      } else {
        // Document still processing — mark as ready_to_send for retry
        await supabase.from('startup_contracts').update({
          signature_status: 'ready_to_send',
          provider_last_event: statusData.status,
          provider_last_sync_at: new Date().toISOString(),
        }).eq('id', contractId)
      }
    }

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      entity_type: 'contract',
      entity_id: contractId,
      action: 'sent_for_signature_pandadoc',
      metadata: { pandadoc_document_id: pandadocDocId, signer: signerEmail },
    })

    return new Response(JSON.stringify({
      status: 'sent',
      provider: 'pandadoc',
      documentId: pandadocDocId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('PandaDoc error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown PandaDoc error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})