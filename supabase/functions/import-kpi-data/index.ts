import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format, startOfMonth } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportConfig {
  workspace_id: string;
  source: 'stripe' | 'manual';
  kpi_mappings?: Record<string, string>; // source_metric -> kpi_definition_id
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
    const { workspace_id, source, kpi_mappings } = await req.json() as ImportConfig;

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: 'workspace_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const periodMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const importedKpis: { metric: string; value: number; kpi_id?: string }[] = [];

    if (source === 'stripe') {
      if (!stripeSecretKey) {
        return new Response(
          JSON.stringify({ 
            error: 'Stripe not configured',
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

      console.log(`[import-kpi-data] Stripe metrics imported: MRR=${mrr}, Customers=${activeCustomers.size}, Revenue=${monthlyRevenue}`);
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
            console.error(`[import-kpi-data] Error saving KPI ${kpi.metric}:`, error);
          } else {
            kpi.kpi_id = kpiDefId;
          }
        }
      }

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
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
        message: `Imported ${importedKpis.length} metrics from ${source}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[import-kpi-data] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
