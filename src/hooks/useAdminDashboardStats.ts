/**
 * Hook that fetches key admin dashboard signals:
 * - Pending user approvals count
 * - Contracts expiring within 30 days
 * - Overdue invoices count
 * - Occupancy (active contracts vs total office spaces)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminDashboardStats {
  pendingApprovalsCount: number;
  contractRenewals30d: number;
  overdueInvoicesCount: number;
  occupiedSpaces: number;
  totalSpaces: number;
}

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async (): Promise<AdminDashboardStats> => {
      // Run all queries in parallel
      const [pendingRes, renewalsRes, overdueRes, spacesRes, occupiedRes] = await Promise.all([
        // 1. Pending user approvals
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('account_status', 'pending'),

        // 2. Contracts expiring within 30 days
        supabase
          .from('startup_contracts' as any)
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .lte('end_date', new Date(Date.now() + 30 * 86400000).toISOString())
          .gte('end_date', new Date().toISOString()),

        // 3. Overdue invoices
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'overdue'),

        // 4. Total office spaces
        supabase
          .from('office_spaces' as any)
          .select('id', { count: 'exact', head: true }),

        // 5. Occupied office spaces
        supabase
          .from('office_spaces' as any)
          .select('id', { count: 'exact', head: true })
          .eq('status', 'occupied'),
      ]);

      return {
        pendingApprovalsCount: pendingRes.count ?? 0,
        contractRenewals30d: renewalsRes.count ?? 0,
        overdueInvoicesCount: overdueRes.count ?? 0,
        totalSpaces: spacesRes.count ?? 0,
        occupiedSpaces: occupiedRes.count ?? 0,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
