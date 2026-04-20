/**
 * Hook that fetches key admin dashboard signals:
 * - Pending user approvals count
 * - Contracts expiring within 30 days
 * - Overdue invoices count
 * - Occupancy (active contracts vs total office spaces)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface AdminDashboardStats {
  pendingApprovalsCount: number;
  contractRenewals30d: number;
  occupiedSpaces: number;
  totalSpaces: number;
}

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async (): Promise<AdminDashboardStats> => {
      const [pendingRes, renewalsRes, spacesRes, activeContractsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('account_status', 'pending'),

        supabase
          .from('startup_contracts' as any)
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .lte('end_date', new Date(Date.now() + 30 * 86400000).toISOString())
          .gte('end_date', new Date().toISOString()),

        supabase
          .from('rooms')
          .select('id', { count: 'exact', head: true }),

        // Occupancy: count active contracts that have at least one assigned room
        // Source of truth = startup_contracts (status='active') with linked room assignments
        supabase
          .from('contract_rooms' as any)
          .select('contract_id, startup_contracts!inner(status)', { count: 'exact', head: true })
          .eq('startup_contracts.status', 'active'),
      ]);

      return {
        pendingApprovalsCount: pendingRes.count ?? 0,
        contractRenewals30d: renewalsRes.count ?? 0,
        totalSpaces: spacesRes.count ?? 0,
        occupiedSpaces: activeContractsRes.count ?? 0,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
