/**
 * Generate Contract PDF Edge Function
 * Creates a professional PDF contract from structured contract data.
 * Returns base64-encoded PDF that can be sent to DocuSign or stored.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContractData {
  contractNumber: string | null;
  startupName: string;
  nif: string | null;
  contactName: string | null;
  contactEmail: string | null;
  incubationType: string;
  buildingName: string | null;
  squareMeters: number | null;
  monthlyFee: number;
  currency: string;
  discountPercentage: number;
  effectiveFee: number;
  equityPercentage: number | null;
  startDate: string;
  endDate: string | null;
  billingDay: number;
  paymentTermsDays: number;
  regulationVersion: string;
}

/**
 * Generate a text-based contract document.
 * In production this would use a template engine + real PDF library.
 * For now generates a structured text that DocuSign can render.
 */
function generateContractContent(data: ContractData): string {
  const today = new Date().toLocaleDateString('pt-PT');
  const startFormatted = new Date(data.startDate).toLocaleDateString('pt-PT');
  const endFormatted = data.endDate ? new Date(data.endDate).toLocaleDateString('pt-PT') : 'Indeterminado';
  
  return `
CONTRATO DE INCUBAÇÃO
=====================

Contrato N.º: ${data.contractNumber || 'A definir'}
Data: ${today}

PARTES:

PRIMEIRA: Startup Leiria - Associação para o Empreendedorismo e Inovação
(adiante designada por "Incubadora")

SEGUNDA: ${data.startupName}
NIF: ${data.nif || 'A completar'}
Representante: ${data.contactName || 'A completar'}
Email: ${data.contactEmail || 'A completar'}
(adiante designada por "Incubada")

---

CLÁUSULA 1.ª - OBJETO
O presente contrato tem por objeto a prestação de serviços de incubação pela
Incubadora à Incubada, nos termos e condições definidos no Regulamento de
Incubação em vigor (versão: ${data.regulationVersion}).

CLÁUSULA 2.ª - MODALIDADE DE INCUBAÇÃO
Tipo: ${data.incubationType}
${data.buildingName ? `Edifício: ${data.buildingName}` : ''}
${data.squareMeters ? `Área: ${data.squareMeters} m²` : ''}

CLÁUSULA 3.ª - DURAÇÃO
Início: ${startFormatted}
Fim: ${endFormatted}

CLÁUSULA 4.ª - CONDIÇÕES FINANCEIRAS
Mensalidade base: €${data.monthlyFee.toFixed(2)} ${data.currency}
${data.discountPercentage > 0 ? `Desconto aplicado: ${data.discountPercentage}%` : ''}
${data.discountPercentage > 0 ? `Mensalidade efetiva: €${data.effectiveFee.toFixed(2)} ${data.currency}` : ''}
${data.equityPercentage ? `Participação no capital: ${data.equityPercentage}%` : ''}
Dia de faturação: ${data.billingDay}
Prazo de pagamento: ${data.paymentTermsDays} dias

CLÁUSULA 5.ª - OBRIGAÇÕES DA INCUBADA
a) Pagamento atempado da mensalidade;
b) Cumprimento do Regulamento de Incubação;
c) Participação nos check-ins e sessões de acompanhamento;
d) Reportar KPIs conforme definido no programa de incubação;
e) Manter os espaços atribuídos em boas condições.

CLÁUSULA 6.ª - OBRIGAÇÕES DA INCUBADORA
a) Disponibilização do espaço e serviços contratados;
b) Acompanhamento por consultor designado;
c) Acesso a rede de mentores e recursos;
d) Faturação conforme condições acordadas.

CLÁUSULA 7.ª - RESOLUÇÃO
O presente contrato pode ser resolvido:
a) Por mútuo acordo das partes;
b) Por incumprimento de obrigações contratuais;
c) Por denúncia com aviso prévio de 30 dias.

CLÁUSULA 8.ª - REGULAMENTO
O presente contrato é regido pelo Regulamento de Incubação da Startup Leiria
(versão ${data.regulationVersion}), que a Incubada declara conhecer e aceitar.

---

Assinado em ${today}

Pela Incubadora: ___________________________

Pela Incubada: ___________________________
`.trim();
}

/**
 * Encode text content as a simple PDF.
 * Uses a minimal PDF structure for maximum compatibility.
 */
function textToPdfBase64(text: string): string {
  // Split text into lines and pages
  const lines = text.split('\n');
  const linesPerPage = 50;
  const pages: string[][] = [];
  
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }

  // Build minimal PDF
  const objects: string[] = [];
  let objectCount = 0;
  const offsets: number[] = [];
  let currentOffset = 0;

  function addObject(content: string): number {
    objectCount++;
    offsets.push(currentOffset);
    const obj = `${objectCount} 0 obj\n${content}\nendobj\n`;
    objects.push(obj);
    currentOffset += new TextEncoder().encode(obj).length;
    return objectCount;
  }

  // Header
  const header = '%PDF-1.4\n';
  currentOffset = new TextEncoder().encode(header).length;

  // Catalog
  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  
  // Pages (placeholder, will be updated)
  const pagesId = addObject(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`);

  // Create each page
  for (const pageLines of pages) {
    // Escape special PDF characters and encode text
    const textContent = pageLines.map((line, idx) => {
      const y = 770 - idx * 14;
      const escaped = line
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        // Replace non-ASCII chars with approximations
        .replace(/[àáâã]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõ]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[ñ]/g, 'n')
        .replace(/[ÀÁÂÃ]/g, 'A')
        .replace(/[ÈÉÊË]/g, 'E')
        .replace(/[ÌÍÎÏ]/g, 'I')
        .replace(/[ÒÓÔÕ]/g, 'O')
        .replace(/[ÙÚÛÜ]/g, 'U')
        .replace(/[Ç]/g, 'C')
        .replace(/[Ñ]/g, 'N')
        .replace(/€/g, 'EUR')
        .replace(/[^\x20-\x7E]/g, '');
      
      // Bold effect for headers (lines with === or all caps)
      const fontSize = line.includes('===') || line === line.toUpperCase() && line.trim().length > 3 ? 12 : 10;
      return `BT /F1 ${fontSize} Tf ${50} ${y} Td (${escaped}) Tj ET`;
    }).join('\n');

    const streamContent = textContent;
    const streamBytes = new TextEncoder().encode(streamContent);

    // Page object
    addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${objectCount + 2} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>`);
    
    // Stream object
    addObject(`<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream`);
  }

  // Build the complete PDF
  const body = objects.join('');
  const xrefOffset = new TextEncoder().encode(header + body).length;
  
  const xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n${offsets.map(o => String(o).padStart(10, '0') + ' 00000 n ').join('\n')}\n`;
  const trailer = `trailer\n<< /Size ${objectCount + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const pdfContent = header + body + xref + trailer;
  
  // Convert to base64
  const bytes = new TextEncoder().encode(pdfContent);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { contractId } = await req.json()
    if (!contractId) {
      return new Response(JSON.stringify({ error: 'contractId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch contract with all related data
    const { data: contract, error: contractError } = await supabase
      .from('startup_contracts')
      .select(`
        *,
        workspace:workspaces(id, startup:startups(name, nif, main_contact_name, main_contact_email)),
        incubation_type:incubation_types(name, equity_percentage),
        building:buildings(name, code)
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch active discounts
    const { data: discounts } = await supabase
      .from('contract_discounts')
      .select('*')
      .eq('contract_id', contractId)
      .lte('start_date', new Date().toISOString())
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)

    const maxDiscount = discounts?.reduce((max, d) => Math.max(max, d.discount_percentage), 0) || 0
    const effectiveFee = contract.monthly_fee * (1 - maxDiscount / 100)

    const startup = contract.workspace?.startup
    const contractData: ContractData = {
      contractNumber: contract.contract_number,
      startupName: startup?.name || 'N/A',
      nif: startup?.nif || null,
      contactName: startup?.main_contact_name || null,
      contactEmail: startup?.main_contact_email || null,
      incubationType: contract.incubation_type?.name || 'Standard',
      buildingName: contract.building?.name || null,
      squareMeters: contract.square_meters,
      monthlyFee: contract.monthly_fee,
      currency: contract.currency || 'EUR',
      discountPercentage: maxDiscount,
      effectiveFee,
      equityPercentage: contract.incubation_type?.equity_percentage || contract.equity_percentage,
      startDate: contract.start_date,
      endDate: contract.end_date,
      billingDay: contract.billing_day || 1,
      paymentTermsDays: contract.payment_terms_days || 30,
      regulationVersion: 'REG-2025-01',
    }

    // Generate the contract content and PDF
    const content = generateContractContent(contractData)
    const pdfBase64 = textToPdfBase64(content)

    // Store the generated document
    const fileName = `contract_${contract.contract_number || contractId.slice(0, 8)}_${Date.now()}.pdf`
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
    
    const { error: uploadError } = await supabase.storage
      .from('contract-documents')
      .upload(`generated/${fileName}`, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
    }

    // Update contract with document URL
    const documentPath = `generated/${fileName}`
    await supabase
      .from('startup_contracts')
      .update({ 
        document_url: documentPath,
        regulation_version: contractData.regulationVersion,
      })
      .eq('id', contractId)

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      entity_type: 'contract',
      entity_id: contractId,
      action: 'pdf_generated',
      workspace_id: contract.workspace_id,
      metadata: { document_path: documentPath },
    })

    return new Response(JSON.stringify({
      success: true,
      documentBase64: pdfBase64,
      documentPath,
      fileName,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('PDF generation error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
