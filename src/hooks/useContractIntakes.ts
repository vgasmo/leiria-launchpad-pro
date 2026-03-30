/**
 * Hook for managing contract intake lifecycle.
 * Provides CRUD, status transitions, and audit trail for the two-phase onboarding flow.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type IntakeStatus =
  | 'intake_requested'
  | 'intake_in_progress'
  | 'intake_submitted'
  | 'review_pending'
  | 'changes_requested'
  | 'approved_for_signature'
  | 'rejected';

export interface ContractIntake {
  id: string;
  funnel_item_id: string | null;
  contract_id: string | null;
  status: IntakeStatus;
  organization_name: string | null;
  company_nif: string | null;
  company_address: string | null;
  company_city: string | null;
  company_postal_code: string | null;
  company_country: string | null;
  iban: string | null;
  legal_representative_name: string | null;
  legal_representative_email: string | null;
  legal_representative_phone: string | null;
  billing_email: string | null;
  startup_description: string | null;
  website: string | null;
  documents_json: Record<string, any>;
  missing_documents: string[];
  intake_token: string | null;
  intake_token_expires_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  changes_requested_notes: string | null;
  approved_data_snapshot: Record<string, any> | null;
  last_reminder_sent_at: string | null;
  reminder_count: number;
  created_by: string | null;
  assigned_to: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntakeEvent {
  id: string;
  intake_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  performed_by: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

/** Fetch all intakes with optional status filter */
export function useContractIntakes(statusFilter?: IntakeStatus | IntakeStatus[]) {
  return useQuery({
    queryKey: ['contract-intakes', statusFilter],
    queryFn: async (): Promise<ContractIntake[]> => {
      let query = supabase
        .from('contract_intakes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (statusFilter) {
        if (Array.isArray(statusFilter)) {
          query = query.in('status', statusFilter);
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ContractIntake[];
    },
  });
}

/** Fetch single intake by ID */
export function useContractIntake(intakeId: string | undefined) {
  return useQuery({
    queryKey: ['contract-intake', intakeId],
    enabled: !!intakeId,
    queryFn: async (): Promise<ContractIntake | null> => {
      const { data, error } = await supabase
        .from('contract_intakes')
        .select('*')
        .eq('id', intakeId!)
        .maybeSingle();
      if (error) throw error;
      return data as ContractIntake | null;
    },
  });
}

/** Fetch intake events (audit trail) */
export function useIntakeEvents(intakeId: string | undefined) {
  return useQuery({
    queryKey: ['intake-events', intakeId],
    enabled: !!intakeId,
    queryFn: async (): Promise<IntakeEvent[]> => {
      const { data, error } = await supabase
        .from('intake_events')
        .select('*')
        .eq('intake_id', intakeId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as IntakeEvent[];
    },
  });
}

/** Create a new intake request from CRM */
export function useCreateIntake() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      funnelItemId: string;
      organizationName: string;
      contactEmail: string;
      contactName: string;
      assignedTo?: string;
    }) => {
      // Generate token for public form
      const tokenArr = new Uint8Array(32);
      crypto.getRandomValues(tokenArr);
      const token = Array.from(tokenArr, b => b.toString(16).padStart(2, '0')).join('');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { data, error } = await supabase
        .from('contract_intakes')
        .insert({
          funnel_item_id: params.funnelItemId,
          status: 'intake_requested',
          organization_name: params.organizationName,
          legal_representative_email: params.contactEmail,
          legal_representative_name: params.contactName,
          intake_token: token,
          intake_token_expires_at: expiresAt.toISOString(),
          created_by: user?.id,
          assigned_to: params.assignedTo || user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.from('intake_events').insert({
        intake_id: data.id,
        event_type: 'intake_created',
        to_status: 'intake_requested',
        performed_by: user?.id,
        metadata: {
          funnel_item_id: params.funnelItemId,
          organization_name: params.organizationName,
        },
      });

      return { intake: data, token, publicUrl: `${window.location.origin}/contract-intake/${token}` };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-intakes'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-items'] });
      queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao criar pedido de contratação');
    },
  });
}

/** Transition intake status with audit trail */
export function useTransitionIntakeStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      intakeId: string;
      newStatus: IntakeStatus;
      notes?: string;
      metadata?: Record<string, any>;
    }) => {
      // Get current status
      const { data: current, error: fetchErr } = await supabase
        .from('contract_intakes')
        .select('status')
        .eq('id', params.intakeId)
        .single();
      if (fetchErr) throw fetchErr;

      const updateFields: Record<string, any> = {
        status: params.newStatus,
      };

      if (params.newStatus === 'intake_submitted' || params.newStatus === 'review_pending') {
        updateFields.submitted_at = new Date().toISOString();
      }
      if (params.newStatus === 'approved_for_signature') {
        updateFields.reviewed_by = user?.id;
        updateFields.reviewed_at = new Date().toISOString();
        updateFields.review_notes = params.notes || null;
      }
      if (params.newStatus === 'changes_requested') {
        updateFields.changes_requested_notes = params.notes || null;
      }

      const { error } = await supabase
        .from('contract_intakes')
        .update(updateFields)
        .eq('id', params.intakeId);
      if (error) throw error;

      // Audit trail
      await supabase.from('intake_events').insert({
        intake_id: params.intakeId,
        event_type: `status_changed_to_${params.newStatus}`,
        from_status: current.status,
        to_status: params.newStatus,
        performed_by: user?.id,
        metadata: params.metadata || { notes: params.notes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-intakes'] });
      queryClient.invalidateQueries({ queryKey: ['contract-intake'] });
      queryClient.invalidateQueries({ queryKey: ['intake-events'] });
    },
  });
}
