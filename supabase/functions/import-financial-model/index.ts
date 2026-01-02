import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Simple CSV parser
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["\s]/g, '_'));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

// Extract number from cell value
function extractNumber(value: string | undefined | null): number | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[^0-9.,\-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Look for metric by various label patterns
function findMetricValue(rows: Record<string, string>[], patterns: string[]): number | null {
  for (const row of rows) {
    const keys = Object.keys(row);
    const labelKey = keys.find(k => k.includes('label') || k.includes('metric') || k.includes('name') || keys[0] === k);
    const valueKey = keys.find(k => k.includes('value') || k.includes('amount') || (keys.length > 1 && k !== labelKey));
    
    if (labelKey && valueKey) {
      const label = (row[labelKey] || '').toLowerCase();
      if (patterns.some(p => label.includes(p))) {
        return extractNumber(row[valueKey]);
      }
    }
    
    // Also check all string values that might be labels
    for (const [key, val] of Object.entries(row)) {
      if (typeof val === 'string' && patterns.some(p => val.toLowerCase().includes(p))) {
        // Look for adjacent numeric value
        const numKey = Object.keys(row).find(k => k !== key && extractNumber(row[k]) !== null);
        if (numKey) return extractNumber(row[numKey]);
      }
    }
  }
  return null;
}

// Extract metrics from parsed CSV data
function extractMetricsFromCSV(rows: Record<string, string>[]): KeyMetrics {
  return {
    runway_months: findMetricValue(rows, ['runway', 'months_runway', 'cash_runway']),
    burn_rate_monthly: findMetricValue(rows, ['burn', 'burn_rate', 'monthly_burn', 'cash_burn']),
    gross_margin_pct: findMetricValue(rows, ['gross_margin', 'gm', 'margin']),
    cac: findMetricValue(rows, ['cac', 'customer_acquisition', 'acquisition_cost']),
    churn_monthly_pct: findMetricValue(rows, ['churn', 'monthly_churn', 'churn_rate']),
    ltv: findMetricValue(rows, ['ltv', 'lifetime_value', 'customer_lifetime']),
    ltv_cac: findMetricValue(rows, ['ltv_cac', 'ltv/cac', 'ltv:cac']),
    payback_months: findMetricValue(rows, ['payback', 'cac_payback', 'payback_period']),
    cash_end: findMetricValue(rows, ['cash_end', 'ending_cash', 'cash_balance', 'treasury']),
    treasury_need: findMetricValue(rows, ['treasury_need', 'funding_need', 'capital_required']),
  };
}

// Calculate derived metrics if missing
function calculateDerivedMetrics(metrics: KeyMetrics): KeyMetrics {
  const result = { ...metrics };
  
  // Calculate LTV/CAC if missing
  if (result.ltv_cac === null && result.ltv !== null && result.cac !== null && result.cac > 0) {
    result.ltv_cac = Math.round((result.ltv / result.cac) * 100) / 100;
  }
  
  // Calculate runway if we have cash and burn rate
  if (result.runway_months === null && result.cash_end !== null && result.burn_rate_monthly !== null && result.burn_rate_monthly > 0) {
    result.runway_months = Math.round(result.cash_end / result.burn_rate_monthly);
  }
  
  // Calculate payback if we have CAC and monthly revenue per customer (approximated from LTV/12)
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
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { workspace_id, document_id, version_id } = await req.json();
    
    if (!version_id) {
      return new Response(JSON.stringify({ error: "version_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Parsing financial model version: ${version_id}`);

    // Update status to parsing
    await supabase
      .from("financial_model_versions")
      .update({ status: "parsing" })
      .eq("id", version_id);

    // Get version details
    const { data: version, error: versionError } = await supabase
      .from("financial_model_versions")
      .select("*, documents(*)")
      .eq("id", version_id)
      .single();

    if (versionError || !version) {
      throw new Error(`Version not found: ${versionError?.message}`);
    }

    const document = version.documents;
    if (!document?.file_path) {
      throw new Error("Document has no file path");
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("workspace-documents")
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    let keyMetrics: KeyMetrics;
    const fileName = document.name.toLowerCase();

    // Parse based on file type
    if (fileName.endsWith('.csv')) {
      const text = await fileData.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        throw new Error("CSV file is empty or invalid format");
      }
      
      keyMetrics = extractMetricsFromCSV(rows);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlsm')) {
      // For Excel files, we need a more sophisticated parser
      // Since we can't run full xlsx parsing in Deno easily, we'll return a specific error
      // prompting the user to export as CSV or use a future enhanced parser
      
      // For now, attempt to extract any text-based content
      const text = await fileData.text();
      
      // Check if there's any readable content (sometimes Excel XML format)
      if (text.includes('<?xml') || text.includes('<worksheet')) {
        // Attempt to extract values from XML format
        const numberMatches = text.match(/<v>([0-9.]+)<\/v>/g) || [];
        const textMatches = text.match(/<t>([^<]+)<\/t>/g) || [];
        
        // Build a simple key-value structure
        const extractedRows: Record<string, string>[] = [];
        textMatches.forEach((t, idx) => {
          const label = t.replace(/<\/?t>/g, '');
          const value = numberMatches[idx]?.replace(/<\/?v>/g, '') || '';
          extractedRows.push({ label, value });
        });
        
        keyMetrics = extractMetricsFromCSV(extractedRows);
      } else {
        // Binary Excel format - return guidance
        await supabase
          .from("financial_model_versions")
          .update({ 
            status: "failed",
            parse_error: "Excel binary format detected. Please open in Excel/Sheets, ensure all formulas are calculated, then export as CSV and re-upload."
          })
          .eq("id", version_id);

        return new Response(JSON.stringify({ 
          success: false,
          error: "Please export your Excel file as CSV for automatic parsing, or use the manual mapping feature."
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      throw new Error(`Unsupported file type: ${fileName}`);
    }

    // Calculate derived metrics
    keyMetrics = calculateDerivedMetrics(keyMetrics);

    // Check if we extracted any useful data
    const hasData = Object.values(keyMetrics).some(v => v !== null);
    
    if (!hasData) {
      await supabase
        .from("financial_model_versions")
        .update({ 
          status: "failed",
          parse_error: "Could not extract key metrics from the file. Please ensure the file contains labeled metrics (e.g., 'Runway', 'CAC', 'LTV', 'Burn Rate', etc.) or use manual mapping."
        })
        .eq("id", version_id);

      return new Response(JSON.stringify({ 
        success: false,
        error: "No metrics could be extracted. Please check file format."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update version with parsed data
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

    console.log(`Successfully parsed financial model: ${version_id}`);

    return new Response(JSON.stringify({ 
      success: true,
      metrics: keyMetrics,
      message: "Financial model parsed successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error parsing financial model:", error);
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
