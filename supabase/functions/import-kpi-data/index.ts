import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format, startOfMonth } from 'https://esm.sh/date-fns@3.6.0';
import {
  validateUUID,
  validateString,
  validateOptionalUUID,
  parseAndValidateBody,
  sanitizeErrorForClient,
  validationErrorResponse,
} from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportConfig {
  workspace_id: string;
  source: 'stripe' | 'manual';
  kpi_mappings?: Record<string, string>; // source_metric -> kpi_definition_id
}

/**
 * Validate import config
 */
function validateImportConfig(body: ImportConfig): { valid: true; data: ImportConfig } | { valid: false; error: string } {
  // Validate workspace_id (required)
  const workspaceResult = validateUUID(body.workspace_id, 'workspace_id');
  if (!workspaceResult.valid) {
    return { valid: false, error: workspaceResult.error! };
  }

  // Validate source
  const validSources = ['stripe', 'manual'];
  if (!body.source || !validSources.includes(body.source)) {
    return { valid: false, error: 'source must be one of: stripe, manual' };
  }

  // Validate kpi_mappings if provided
  if (body.kpi_mappings && typeof body.kpi_mappings === 'object') {
    const mappings: Record<string, string> = {};
    for (const [key, value] of Object.entries(body.kpi_mappings)) {
      if (typeof key === 'string' && typeof value === 'string') {
        // Validate each UUID in mappings
        const uuidResult = validateUUID(value, `kpi_mappings.${key}`);
        if (!uuidResult.valid) {
          return { valid: false, error: uuidResult.error! };
        }
        mappings[key.slice(0, 50)] = uuidResult.value!;
      }
    }
    body.kpi_mappings = mappings;
  }

  return {
    valid: true,
    data: {
      workspace_id: workspaceResult.value!,
      source: body.source,
      kpi_mappings: body.kpi_mappings,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // SECURITY: Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const bodyResult = await parseAndValidateBody<ImportConfig>(req);
    if (!bodyResult.valid) {
      return validationErrorResponse(bodyResult.error!, corsHeaders);
    }

    // Validate all fields
    const validation = validateImportConfig(bodyResult.value!);
    if (!validation.valid) {
      return validationErrorResponse(validation.error, corsHeaders);
    }

    const { workspace_id, source, kpi_mappings } = validation.data;

    // SECURITY: Validate user has access to this workspace
    const { data: hasAccess } = await supabase.rpc('has_workspace_access', {
      _user_id: user.id,
      _workspace_id: workspace_id,
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const periodMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const importedKpis: { metric: string; value: number; kpi_id?: string }[] = [];

    if (source === 'stripe') {
      if (!stripeSecretKey) {
        return new Response(
          JSON.stringify({ 
            error: 'Integration not configured',
            message: 'Please enable Stripe integration to import financial KPIs'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch Stripe metrics
      const stripeHeaders = {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      // Get MRR from active subscriptions
      const subsResponse = await fetch(
        'https://api.stripe.com/v1/subscriptions?status=active&limit=100',
        { headers: stripeHeaders }
      );
      const subsData = await subsResponse.json();
      
      let mrr = 0;
      let activeCustomers = new Set<string>();
      
      if (subsData.data) {
        for (const sub of subsData.data) {
          activeCustomers.add(sub.customer);
          for (const item of sub.items?.data || []) {
            const amount = item.price?.unit_amount || 0;
            const interval = item.price?.recurring?.interval || 'month';
            // Normalize to monthly
            if (interval === 'year') {
              mrr += amount / 12;
            } else if (interval === 'month') {
              mrr += amount;
            }
          }
        }
      }

      // Convert from cents to currency units
      mrr = mrr / 100;

      // Get total customers
      const customersResponse = await fetch(
        'https://api.stripe.com/v1/customers?limit=1',
        { headers: stripeHeaders }
      );
      const customersData = await customersResponse.json();
      const totalCustomers = customersData.total_count || activeCustomers.size;

      // Get recent charges for revenue
      const now = new Date();
      const startOfThisMonth = Math.floor(startOfMonth(now).getTime() / 1000);
      const chargesResponse = await fetch(
        `https://api.stripe.com/v1/charges?created[gte]=${startOfThisMonth}&limit=100`,
        { headers: stripeHeaders }
      );
      const chargesData = await chargesResponse.json();
      
      let monthlyRevenue = 0;
      if (chargesData.data) {
        for (const charge of chargesData.data) {
          if (charge.paid && !charge.refunded) {
            monthlyRevenue += charge.amount;
          }
        }
      }
      monthlyRevenue = monthlyRevenue / 100;

      importedKpis.push(
        { metric: 'mrr', value: Math.round(mrr * 100) / 100 },
        { metric: 'active_customers', value: activeCustomers.size },
        { metric: 'total_customers', value: totalCustomers },
        { metric: 'monthly_revenue', value: Math.round(monthlyRevenue * 100) / 100 }
      );

      console.log(`[import-kpi-data] Metrics imported: count=${importedKpis.length}`);
    }

    // If mappings provided, save to kpi_values
    if (kpi_mappings && Object.keys(kpi_mappings).length > 0) {
      for (const kpi of importedKpis) {
        const kpiDefId = kpi_mappings[kpi.metric];
        if (kpiDefId) {
          // Upsert the KPI value
          const { error } = await supabase
            .from('kpi_values')
            .upsert({
              workspace_id,
              kpi_definition_id: kpiDefId,
              period_month: periodMonth,
              value: kpi.value,
              notes: `Auto-imported from ${source} on ${new Date().toISOString()}`,
            }, {
              onConflict: 'workspace_id,kpi_definition_id,period_month',
            });

          if (error) {
            console.error(`[import-kpi-data] Error saving KPI:`, error);
          } else {
            kpi.kpi_id = kpiDefId;
          }
        }
      }

      // Log activity
      await supabase.from('activity_log').insert({
        workspace_id,
        user_id: user?.id || 'system',
        entity_type: 'kpi',
        action: 'import',
        metadata: {
          source,
          metrics_count: importedKpis.length,
          period_month: periodMonth,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        period_month: periodMonth,
        imported: importedKpis,
        message: `Imported ${importedKpis.length} metrics`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[import-kpi-data] Error:', error);
    // Return sanitized error
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
