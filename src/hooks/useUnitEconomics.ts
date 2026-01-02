import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth } from 'date-fns';

export interface UnitEconomicsValue {
  id: string;
  workspace_id: string;
  period_month: string;
  marketing_costs: number;
  sales_costs: number;
  new_customers: number;
  arpu: number;
  gross_margin: number;
  monthly_churn_rate: number;
  cac: number | null;
  ltv: number | null;
  ltv_cac_ratio: number | null;
  payback_months: number | null;
  customer_lifetime_months: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnitEconomicsFormData {
  marketing_costs: number;
  sales_costs: number;
  new_customers: number;
  arpu: number;
  gross_margin: number;
  monthly_churn_rate: number;
}

function calculateMetrics(data: UnitEconomicsFormData) {
  const { marketing_costs, sales_costs, new_customers, arpu, gross_margin, monthly_churn_rate } = data;
  
  const cac = new_customers > 0 ? (marketing_costs + sales_costs) / new_customers : null;
  const customer_lifetime_months = monthly_churn_rate > 0 ? 1 / (monthly_churn_rate / 100) : null;
  const ltv = customer_lifetime_months && arpu ? arpu * customer_lifetime_months * (gross_margin / 100) : null;
  const ltv_cac_ratio = cac && ltv ? ltv / cac : null;
  const payback_months = arpu > 0 && gross_margin > 0 && cac ? cac / (arpu * (gross_margin / 100)) : null;

  return {
    cac,
    ltv,
    ltv_cac_ratio,
    payback_months,
    customer_lifetime_months,
  };
}

export function useUnitEconomicsHistory(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['unit-economics', workspaceId],
    queryFn: async (): Promise<UnitEconomicsValue[]> => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('unit_economics_values')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('period_month', { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return (data || []) as UnitEconomicsValue[];
    },
    enabled: !!workspaceId,
  });
}

export function useCurrentMonthUnitEconomics(workspaceId: string | undefined) {
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['unit-economics', workspaceId, 'current'],
    queryFn: async (): Promise<UnitEconomicsValue | null> => {
      if (!workspaceId) return null;
      
      const { data, error } = await supabase
        .from('unit_economics_values')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('period_month', currentMonth)
        .maybeSingle();
      
      if (error) throw error;
      return data as UnitEconomicsValue | null;
    },
    enabled: !!workspaceId,
  });
}

export function useSaveUnitEconomics(workspaceId: string) {
  const queryClient = useQueryClient();
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  
  return useMutation({
    mutationFn: async (formData: UnitEconomicsFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const metrics = calculateMetrics(formData);
      
      const payload = {
        workspace_id: workspaceId,
        period_month: currentMonth,
        ...formData,
        ...metrics,
        created_by: user.id,
      };
      
      const { data, error } = await supabase
        .from('unit_economics_values')
        .upsert(payload, { onConflict: 'workspace_id,period_month' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-economics', workspaceId] });
    },
  });
}
