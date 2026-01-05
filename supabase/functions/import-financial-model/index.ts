import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KeyMetrics {
  runway_months: number | null;
  burn_rate_monthly: number | null;
  gross_margin_pct: number | null;
  cac: number | null;
  churn_monthly_pct: number | null;
  ltv: number | null;
  ltv_cac: number | null;
  payback_months: number | null;
  cash_end: number | null;
  treasury_need: number | null;
}

// Extract number from cell value
function extractNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  const cleaned = String(value).replace(/[^0-9.,\-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Normalize label for matching
function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Metric patterns for matching (supports EN and PT labels)
const METRIC_PATTERNS: Record<keyof KeyMetrics, string[]> = {
  runway_months: ['runway', 'monthsrunway', 'cashrunway', 'runwaymonths', 'mesesrunway'],
  burn_rate_monthly: ['burn', 'burnrate', 'monthlyburn', 'cashburn', 'taxaqueima', 'burnmensal'],
  gross_margin_pct: ['grossmargin', 'gm', 'margembruta', 'margem'],
  cac: ['cac', 'customeracquisition', 'acquisitioncost', 'custoacquisicao'],
  churn_monthly_pct: ['churn', 'monthlychurn', 'churnrate', 'taxachurn'],
  ltv: ['ltv', 'lifetimevalue', 'customerlifetime', 'valorvida'],
  ltv_cac: ['ltvcac', 'ltvcacratio'],
  payback_months: ['payback', 'cacpayback', 'paybackperiod', 'periodopayback'],
  cash_end: ['cashend', 'endingcash', 'cashbalance', 'treasury', 'tesouraria', 'caixa', 'saldocaixa'],
  treasury_need: ['treasuryneed', 'fundingneed', 'capitalrequired', 'necessidadecapital'],
};

// Find metric value from key-value pairs
function findMetricFromPairs(pairs: [string, string | number][], metricKey: keyof KeyMetrics): number | null {
  const patterns = METRIC_PATTERNS[metricKey];
  
  for (const [label, value] of pairs) {
    const normalizedLabel = normalizeLabel(label);
    for (const pattern of patterns) {
      if (normalizedLabel.includes(pattern)) {
        return extractNumber(value);
      }
    }
  }
  return null;
}

// Parse CSV content
function parseCSV(content: string): [string, string | number][] {
  const pairs: [string, string | number][] = [];
  const lines = content.trim().split(/\r?\n/);
  
  for (const line of lines) {
    // Handle both comma and semicolon separators
    const separator = line.includes(';') ? ';' : ',';
    const cells = line.split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
    
    for (let i = 0; i < cells.length - 1; i++) {
      const label = cells[i];
      const value = cells[i + 1];
      if (label && value) {
        const numValue = extractNumber(value);
        pairs.push([label, numValue !== null ? numValue : value]);
      }
    }
  }
  
  return pairs;
}

// Parse XLSX/XLSM file (which is a ZIP with XML inside)
async function parseExcel(arrayBuffer: ArrayBuffer): Promise<[string, string | number][]> {
  const pairs: [string, string | number][] = [];
  
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(arrayBuffer);
    
    // Get shared strings (text values are stored separately in XLSX)
    const sharedStringsFile = contents.file('xl/sharedStrings.xml');
    const sharedStrings: string[] = [];
    
    if (sharedStringsFile) {
      const ssXml = await sharedStringsFile.async('string');
      // Extract all <t> elements (text content)
      const matches = ssXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g);
      for (const match of matches) {
        sharedStrings.push(match[1]);
      }
    }
    
    // Find all sheet XML files
    const sheetFiles = Object.keys(contents.files).filter(
      name => name.startsWith('xl/worksheets/') && name.endsWith('.xml')
    );
    
    for (const sheetPath of sheetFiles) {
      const sheetFile = contents.file(sheetPath);
      if (!sheetFile) continue;
      
      const sheetXml = await sheetFile.async('string');
      
      // Parse rows - look for <row> elements
      const rowMatches = sheetXml.matchAll(/<row[^>]*>(.*?)<\/row>/gs);
      
      for (const rowMatch of rowMatches) {
        const rowContent = rowMatch[1];
        // Parse cells within the row
        const cellMatches = rowContent.matchAll(/<c[^>]*r="([A-Z]+)(\d+)"[^>]*(?:t="([^"]*)")?[^>]*>(?:<v>([^<]*)<\/v>)?/g);
        
        const rowCells: { col: string; value: string | number }[] = [];
        
        for (const cellMatch of cellMatches) {
          const col = cellMatch[1];
          const cellType = cellMatch[3];
          const rawValue = cellMatch[4] || '';
          
          let value: string | number;
          if (cellType === 's') {
            // Shared string reference
            const idx = parseInt(rawValue, 10);
            value = sharedStrings[idx] || '';
          } else if (cellType === 'str' || cellType === 'inlineStr') {
            value = rawValue;
          } else {
            // Numeric value
            const num = parseFloat(rawValue);
            value = isNaN(num) ? rawValue : num;
          }
          
          rowCells.push({ col, value });
        }
        
        // Sort cells by column
        rowCells.sort((a, b) => a.col.localeCompare(b.col));
        
        // Create pairs from adjacent cells
        for (let i = 0; i < rowCells.length - 1; i++) {
          const label = rowCells[i].value;
          const val = rowCells[i + 1].value;
          if (typeof label === 'string' && label.trim()) {
            pairs.push([label.trim(), val]);
          }
        }
      }
    }
    
    console.log(`[parseExcel] Extracted ${pairs.length} pairs from ${sheetFiles.length} sheets`);
    
  } catch (err) {
    console.error('[parseExcel] Error parsing Excel:', err);
    throw new Error('Failed to parse Excel file. Please try exporting as CSV.');
  }
  
  return pairs;
}

// Calculate derived metrics if missing
function calculateDerivedMetrics(metrics: KeyMetrics): KeyMetrics {
  const result = { ...metrics };
  
  if (result.ltv_cac === null && result.ltv !== null && result.cac !== null && result.cac > 0) {
    result.ltv_cac = Math.round((result.ltv / result.cac) * 100) / 100;
  }
  
  if (result.runway_months === null && result.cash_end !== null && result.burn_rate_monthly !== null && result.burn_rate_monthly > 0) {
    result.runway_months = Math.round(result.cash_end / result.burn_rate_monthly);
  }
  
  if (result.payback_months === null && result.cac !== null && result.ltv !== null && result.churn_monthly_pct !== null) {
    const avgLifetimeMonths = result.churn_monthly_pct > 0 ? 1 / (result.churn_monthly_pct / 100) : 12;
    const monthlyRevenue = result.ltv / avgLifetimeMonths;
    if (monthlyRevenue > 0) {
      result.payback_months = Math.round(result.cac / monthlyRevenue);
    }
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { version_id } = await req.json();
    
    if (!version_id) {
      return new Response(JSON.stringify({ error: "version_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[import-financial-model] User ${user.id} parsing version: ${version_id}`);

    await supabase
      .from("financial_model_versions")
      .update({ status: "parsing" })
      .eq("id", version_id);

    const { data: version, error: versionError } = await supabase
      .from("financial_model_versions")
      .select("*, documents(*)")
      .eq("id", version_id)
      .single();

    if (versionError || !version) {
      throw new Error(`Version not found: ${versionError?.message}`);
    }

    const { data: hasAccess } = await supabase.rpc("has_workspace_access", {
      _user_id: user.id,
      _workspace_id: version.workspace_id,
    });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const document = version.documents;
    if (!document?.file_path) {
      throw new Error("Document has no file path");
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("workspace-documents")
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    console.log(`[import-financial-model] Downloaded file: ${document.name}, size: ${fileData.size}`);

    const fileName = document.name.toLowerCase();
    let pairs: [string, string | number][] = [];

    if (fileName.endsWith('.csv')) {
      const text = await fileData.text();
      pairs = parseCSV(text);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlsm')) {
      const arrayBuffer = await fileData.arrayBuffer();
      pairs = await parseExcel(arrayBuffer);
    } else {
      throw new Error(`Unsupported file type: ${fileName}`);
    }
    
    console.log(`[import-financial-model] Total pairs extracted: ${pairs.length}`);
    
    let keyMetrics: KeyMetrics = {
      runway_months: findMetricFromPairs(pairs, 'runway_months'),
      burn_rate_monthly: findMetricFromPairs(pairs, 'burn_rate_monthly'),
      gross_margin_pct: findMetricFromPairs(pairs, 'gross_margin_pct'),
      cac: findMetricFromPairs(pairs, 'cac'),
      churn_monthly_pct: findMetricFromPairs(pairs, 'churn_monthly_pct'),
      ltv: findMetricFromPairs(pairs, 'ltv'),
      ltv_cac: findMetricFromPairs(pairs, 'ltv_cac'),
      payback_months: findMetricFromPairs(pairs, 'payback_months'),
      cash_end: findMetricFromPairs(pairs, 'cash_end'),
      treasury_need: findMetricFromPairs(pairs, 'treasury_need'),
    };

    keyMetrics = calculateDerivedMetrics(keyMetrics);
    
    console.log(`[import-financial-model] Extracted metrics:`, JSON.stringify(keyMetrics));

    const hasData = Object.values(keyMetrics).some(v => v !== null);
    
    if (!hasData) {
      await supabase
        .from("financial_model_versions")
        .update({ 
          status: "failed",
          parse_error: "Could not extract key metrics from the file. Please ensure the file contains labeled metrics (e.g., 'Runway', 'CAC', 'LTV', 'Burn Rate', 'Caixa', 'Tesouraria', etc.)."
        })
        .eq("id", version_id);

      return new Response(JSON.stringify({ 
        success: false,
        error: "No metrics could be extracted. Please check file format and ensure metrics are labeled."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase
      .from("financial_model_versions")
      .update({
        status: "parsed",
        key_metrics_json: keyMetrics,
        parse_error: null,
      })
      .eq("id", version_id);

    if (updateError) {
      throw updateError;
    }

    console.log(`[import-financial-model] Successfully parsed version: ${version_id}`);

    return new Response(JSON.stringify({ 
      success: true,
      metrics: keyMetrics,
      message: "Financial model parsed successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[import-financial-model] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to parse financial model";
    return new Response(JSON.stringify({ 
      success: false,
      error: message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
