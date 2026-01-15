import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export interface IncubationType {
  id: string;
  name: string;
  description: string | null;
  base_monthly_fee: number;
  base_currency: string;
  duration_months: number | null;
  includes_office_space: boolean;
  includes_mentoring_hours: number;
  includes_meeting_room_hours: number;
  equity_percentage: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface StartupContract {
  id: string;
  workspace_id: string;
  incubation_type_id: string | null;
  contract_number: string | null;
  status: 'draft' | 'pending_signature' | 'active' | 'suspended' | 'terminated' | 'expired';
  start_date: string;
  end_date: string | null;
  signed_at: string | null;
  monthly_fee: number;
  currency: string;
  discount_percentage: number;
  discount_reason: string | null;
  discount_applied_by: string | null;
  equity_percentage: number | null;
  billing_day: number;
  payment_terms_days: number;
  notes: string | null;
  document_url: string | null;
  created_at: string;
  // Joined data
  workspace?: { id: string; startup?: { name: string } | null };
  incubation_type?: IncubationType | null;
}

export interface Invoice {
  id: string;
  contract_id: string;
  workspace_id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  line_items: unknown;
  notes: string | null;
  created_at: string;
  // Joined
  workspace?: { id: string; startup?: { name: string } | null };
  contract?: StartupContract | null;
}

export interface Payment {
  id: string;
  invoice_id: string;
  workspace_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface OfficeSpace {
  id: string;
  name: string;
  type: 'desk' | 'private_office' | 'meeting_room' | 'hot_desk';
  floor: string | null;
  capacity: number;
  is_available: boolean;
  monthly_cost: number;
  amenities: string[];
  notes: string | null;
  created_at: string;
}

export interface SpaceAllocation {
  id: string;
  office_space_id: string;
  workspace_id: string;
  start_date: string;
  end_date: string | null;
  monthly_cost_override: number | null;
  notes: string | null;
  created_at: string;
  // Joined
  office_space?: OfficeSpace;
  workspace?: { id: string; startup?: { name: string } | null };
}

// ============================================
// INCUBATION TYPES
// ============================================

export function useIncubationTypes() {
  return useQuery({
    queryKey: ['incubation-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incubation_types')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as IncubationType[];
    },
  });
}

export function useCreateIncubationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('incubation_types')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incubation-types'] });
      toast.success('Incubation type created');
    },
    onError: () => toast.error('Failed to create incubation type'),
  });
}

export function useUpdateIncubationType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await supabase
        .from('incubation_types')
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incubation-types'] });
      toast.success('Incubation type updated');
    },
    onError: () => toast.error('Failed to update incubation type'),
  });
}

// ============================================
// CONTRACTS
// ============================================

export function useContracts(filters?: { status?: string; workspaceId?: string }) {
  return useQuery({
    queryKey: ['contracts', filters],
    queryFn: async () => {
      let query = supabase
        .from('startup_contracts')
        .select(`
          *,
          workspace:workspaces(id, startup:startups(name)),
          incubation_type:incubation_types(*)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.workspaceId) {
        query = query.eq('workspace_id', filters.workspaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StartupContract[];
    },
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('startup_contracts')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract created');
    },
    onError: () => toast.error('Failed to create contract'),
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await supabase
        .from('startup_contracts')
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract updated');
    },
    onError: () => toast.error('Failed to update contract'),
  });
}

// ============================================
// INVOICES
// ============================================

export function useInvoices(filters?: { status?: string; workspaceId?: string }) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          workspace:workspaces(id, startup:startups(name)),
          contract:startup_contracts(*)
        `)
        .order('issue_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.workspaceId) {
        query = query.eq('workspace_id', filters.workspaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Invoice[];
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created');
    },
    onError: () => toast.error('Failed to create invoice'),
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated');
    },
    onError: () => toast.error('Failed to update invoice'),
  });
}

// ============================================
// PAYMENTS
// ============================================

export function usePayments(filters?: { invoiceId?: string; workspaceId?: string }) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (filters?.invoiceId) {
        query = query.eq('invoice_id', filters.invoiceId);
      }
      if (filters?.workspaceId) {
        query = query.eq('workspace_id', filters.workspaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Payment recorded');
    },
    onError: () => toast.error('Failed to record payment'),
  });
}

// ============================================
// OFFICE SPACES
// ============================================

export function useOfficeSpaces() {
  return useQuery({
    queryKey: ['office-spaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('office_spaces')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as OfficeSpace[];
    },
  });
}

export function useCreateOfficeSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('office_spaces')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-spaces'] });
      toast.success('Office space created');
    },
    onError: () => toast.error('Failed to create office space'),
  });
}

export function useUpdateOfficeSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await supabase
        .from('office_spaces')
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-spaces'] });
      toast.success('Office space updated');
    },
    onError: () => toast.error('Failed to update office space'),
  });
}

// ============================================
// SPACE ALLOCATIONS
// ============================================

export function useSpaceAllocations(filters?: { officeSpaceId?: string; workspaceId?: string }) {
  return useQuery({
    queryKey: ['space-allocations', filters],
    queryFn: async () => {
      let query = supabase
        .from('space_allocations')
        .select(`
          *,
          office_space:office_spaces(*),
          workspace:workspaces(id, startup:startups(name))
        `)
        .order('start_date', { ascending: false });

      if (filters?.officeSpaceId) {
        query = query.eq('office_space_id', filters.officeSpaceId);
      }
      if (filters?.workspaceId) {
        query = query.eq('workspace_id', filters.workspaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SpaceAllocation[];
    },
  });
}

export function useCreateSpaceAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('space_allocations')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['office-spaces'] });
      toast.success('Space allocated');
    },
    onError: () => toast.error('Failed to allocate space'),
  });
}

// ============================================
// DASHBOARD STATS
// ============================================

export function useBackofficeDashboard() {
  return useQuery({
    queryKey: ['backoffice-dashboard'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get contract stats
      const { data: contracts } = await supabase
        .from('startup_contracts')
        .select('status, start_date');
      
      // Get invoice stats
      const { data: invoices } = await supabase
        .from('invoices')
        .select('status, total, due_date');
      
      // Get upcoming anniversaries (contracts starting around this month in previous years)
      const thisMonth = new Date().getMonth() + 1;
      const { data: anniversaries } = await supabase
        .from('startup_contracts')
        .select(`
          id,
          start_date,
          workspace:workspaces(id, startup:startups(name))
        `)
        .eq('status', 'active');

      const activeContracts = contracts?.filter(c => c.status === 'active').length || 0;
      const pendingInvoices = invoices?.filter(i => i.status === 'sent').length || 0;
      const overdueInvoices = invoices?.filter(i => i.status === 'overdue' || (i.status === 'sent' && i.due_date < today)).length || 0;
      const totalOutstanding = invoices
        ?.filter(i => i.status === 'sent' || i.status === 'overdue')
        .reduce((sum, i) => sum + (i.total || 0), 0) || 0;

      // Find contracts with anniversaries this month
      const upcomingAnniversaries = anniversaries?.filter(c => {
        const startMonth = new Date(c.start_date).getMonth() + 1;
        return startMonth === thisMonth;
      }) || [];

      return {
        activeContracts,
        pendingInvoices,
        overdueInvoices,
        totalOutstanding,
        upcomingAnniversaries,
      };
    },
  });
}
