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

// ============================================
// ROOMS
// ============================================

export interface Room {
  id: string;
  space_id: string;
  name: string;
  room_number: string | null;
  floor: string | null;
  room_type: string;
  capacity: number | null;
  amenities: string[] | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  space?: OfficeSpace;
  current_allocation?: RoomAllocation | null;
}

export interface RoomAllocation {
  id: string;
  room_id: string;
  workspace_id: string | null;
  funnel_item_id: string | null;
  allocation_type: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Joined
  workspace?: { id: string; startup?: { name: string } | null };
  funnel_item?: { id: string; organization_name: string | null; contact_name: string | null };
}

export interface FloorMap {
  id: string;
  space_id: string;
  name: string;
  floor: string | null;
  file_path: string;
  uploaded_by: string | null;
  created_at: string;
  // Joined
  space?: OfficeSpace;
}

export interface SpaceWaitingListItem {
  id: string;
  workspace_id: string | null;
  funnel_item_id: string | null;
  request_type: string;
  preferred_space_id: string | null;
  preferred_capacity: number | null;
  priority: number;
  status: string;
  notes: string | null;
  requested_by: string | null;
  requested_at: string;
  fulfilled_at: string | null;
  fulfilled_by: string | null;
  offered_room_id: string | null;
  created_at: string;
  // Joined
  workspace?: { id: string; startup?: { name: string } | null };
  funnel_item?: { id: string; organization_name: string | null; contact_name: string | null };
  preferred_space?: OfficeSpace;
  offered_room?: Room;
}

export function useRooms(filters?: { spaceId?: string; status?: string }) {
  return useQuery({
    queryKey: ['rooms', filters],
    queryFn: async () => {
      let query = supabase
        .from('rooms')
        .select(`
          *,
          space:office_spaces(*)
        `)
        .order('name', { ascending: true });

      if (filters?.spaceId) {
        query = query.eq('space_id', filters.spaceId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Room[];
    },
  });
}

export function useRoomsWithAllocations(spaceId?: string) {
  return useQuery({
    queryKey: ['rooms-with-allocations', spaceId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let roomQuery = supabase
        .from('rooms')
        .select(`*, space:office_spaces(*)`)
        .order('name', { ascending: true });
      
      if (spaceId) {
        roomQuery = roomQuery.eq('space_id', spaceId);
      }
      
      const { data: rooms, error: roomsError } = await roomQuery;
      if (roomsError) throw roomsError;

      // Get current allocations
      const { data: allocations } = await supabase
        .from('room_allocations')
        .select(`
          *,
          workspace:workspaces(id, startup:startups(name)),
          funnel_item:funnel_items(id, organization_name, contact_name)
        `)
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`);

      const allocMap = new Map<string, RoomAllocation>();
      (allocations || []).forEach(a => {
        allocMap.set(a.room_id, a as unknown as RoomAllocation);
      });

      return (rooms || []).map(room => ({
        ...room,
        current_allocation: allocMap.get(room.id) || null,
      })) as Room[];
    },
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('rooms')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-with-allocations'] });
      toast.success('Room created');
    },
    onError: () => toast.error('Failed to create room'),
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await supabase
        .from('rooms')
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-with-allocations'] });
      toast.success('Room updated');
    },
    onError: () => toast.error('Failed to update room'),
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-with-allocations'] });
      toast.success('Room deleted');
    },
    onError: () => toast.error('Failed to delete room'),
  });
}

// ============================================
// ROOM ALLOCATIONS
// ============================================

export function useRoomAllocations(roomId?: string) {
  return useQuery({
    queryKey: ['room-allocations', roomId],
    queryFn: async () => {
      let query = supabase
        .from('room_allocations')
        .select(`
          *,
          workspace:workspaces(id, startup:startups(name)),
          funnel_item:funnel_items(id, organization_name, contact_name)
        `)
        .order('start_date', { ascending: false });

      if (roomId) {
        query = query.eq('room_id', roomId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as RoomAllocation[];
    },
  });
}

export function useCreateRoomAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('room_allocations')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      
      // Update room status
      await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', payload.room_id as string);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-with-allocations'] });
      toast.success('Room allocated');
    },
    onError: () => toast.error('Failed to allocate room'),
  });
}

export function useEndRoomAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, roomId }: { id: string; roomId: string }) => {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('room_allocations')
        .update({ end_date: today })
        .eq('id', id);
      if (error) throw error;
      
      // Check if there are other active allocations for this room
      const { data: otherAllocations } = await supabase
        .from('room_allocations')
        .select('id')
        .eq('room_id', roomId)
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .neq('id', id);
      
      if (!otherAllocations?.length) {
        await supabase.from('rooms').update({ status: 'available' }).eq('id', roomId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-with-allocations'] });
      toast.success('Allocation ended');
    },
    onError: () => toast.error('Failed to end allocation'),
  });
}

// ============================================
// FLOOR MAPS
// ============================================

export function useFloorMaps(spaceId?: string) {
  return useQuery({
    queryKey: ['floor-maps', spaceId],
    queryFn: async () => {
      let query = supabase
        .from('floor_maps')
        .select(`*, space:office_spaces(*)`)
        .order('floor', { ascending: true });

      if (spaceId) {
        query = query.eq('space_id', spaceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as FloorMap[];
    },
  });
}

export function useCreateFloorMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('floor_maps')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-maps'] });
      toast.success('Floor map uploaded');
    },
    onError: () => toast.error('Failed to upload floor map'),
  });
}

export function useDeleteFloorMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      // Delete from storage
      await supabase.storage.from('floor-maps').remove([filePath]);
      // Delete record
      const { error } = await supabase.from('floor_maps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floor-maps'] });
      toast.success('Floor map deleted');
    },
    onError: () => toast.error('Failed to delete floor map'),
  });
}

// ============================================
// SPACE WAITING LIST
// ============================================

export function useSpaceWaitingList(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['space-waiting-list', filters],
    queryFn: async () => {
      let query = supabase
        .from('space_waiting_list')
        .select(`
          *,
          workspace:workspaces(id, startup:startups(name)),
          funnel_item:funnel_items(id, organization_name, contact_name),
          preferred_space:office_spaces(*),
          offered_room:rooms(*)
        `)
        .order('priority', { ascending: false })
        .order('requested_at', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as SpaceWaitingListItem[];
    },
  });
}

export function useCreateWaitingListRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('space_waiting_list')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-waiting-list'] });
      toast.success('Request added to waiting list');
    },
    onError: () => toast.error('Failed to add request'),
  });
}

export function useUpdateWaitingListRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: string }) => {
      const { data, error } = await supabase
        .from('space_waiting_list')
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-waiting-list'] });
      toast.success('Request updated');
    },
    onError: () => toast.error('Failed to update request'),
  });
}

export function useFulfillWaitingListRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      requestId, 
      roomId, 
      startDate,
      userId 
    }: { 
      requestId: string; 
      roomId: string; 
      startDate: string;
      userId: string;
    }) => {
      // Get request details
      const { data: request } = await supabase
        .from('space_waiting_list')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (!request) throw new Error('Request not found');
      
      // Create allocation
      await supabase.from('room_allocations').insert({
        room_id: roomId,
        workspace_id: request.workspace_id,
        funnel_item_id: request.funnel_item_id,
        allocation_type: request.request_type === 'hotdesk' ? 'hotdesk' : 'permanent',
        start_date: startDate,
        created_by: userId,
      });
      
      // Update room status
      await supabase.from('rooms').update({ status: 'occupied' }).eq('id', roomId);
      
      // Mark request as fulfilled
      const { error } = await supabase
        .from('space_waiting_list')
        .update({ 
          status: 'fulfilled', 
          fulfilled_at: new Date().toISOString(),
          fulfilled_by: userId,
          offered_room_id: roomId,
        })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-waiting-list'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-with-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['room-allocations'] });
      toast.success('Request fulfilled');
    },
    onError: () => toast.error('Failed to fulfill request'),
  });
}
