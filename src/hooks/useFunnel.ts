import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { type FunnelStage, type FunnelType } from '@/constants/funnelStages';

// Re-export for backward compatibility
export type { FunnelStage, FunnelType };

export interface FunnelItem {
  id: string;
  stage: FunnelStage;
  type: FunnelType;
  owner_consultant_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  organization_name: string | null;
  source: string | null;
  tags: string[];
  notes: string | null;
  linked_startup_id: string | null;
  linked_workspace_id: string | null;
  linked_contract_id: string | null;
  program_id: string | null;
  first_contact_at: string | null;
  qualified_at: string | null;
  converted_at: string | null;
  next_action_at: string | null;
  next_action_description: string | null;
  last_activity_at: string | null;
  deal_value: number | null;
  deal_currency: string | null;
  expected_close_date: string | null;
  win_probability: number | null;
  loss_reason: string | null;
  created_at: string;
  updated_at: string;
  owner?: { id: string; full_name: string | null; email: string } | null;
  program?: { id: string; name: string } | null;
}

export function useFunnelItems(filters?: { stage?: FunnelStage; consultantId?: string }) {
  return useQuery({
    queryKey: ['funnel-items', filters],
    queryFn: async (): Promise<FunnelItem[]> => {
      let query = supabase
        .from('funnel_items')
        .select('id, type, stage, organization_name, contact_name, contact_email, contact_phone, source, notes, tags, owner_consultant_id, program_id, linked_startup_id, linked_workspace_id, linked_contract_id, first_contact_at, qualified_at, converted_at, next_action_at, next_action_description, last_activity_at, deal_value, deal_currency, expected_close_date, win_probability, loss_reason, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (filters?.stage) {
        query = query.eq('stage', filters.stage);
      }
      if (filters?.consultantId) {
        query = query.eq('owner_consultant_id', filters.consultantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch owner profiles
      const ownerIds = [...new Set((data || []).filter(d => d.owner_consultant_id).map(d => d.owner_consultant_id))];
      let owners: Record<string, { id: string; full_name: string | null; email: string }> = {};
      
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_safe')
          .select('id, full_name, email')
          .in('id', ownerIds as string[]);
        profiles?.forEach(p => { owners[p.id] = p; });
      }

      return (data || []).map(item => ({
        ...item,
        stage: item.stage as FunnelStage,
        type: item.type as FunnelType,
        tags: item.tags || [],
        owner: item.owner_consultant_id ? owners[item.owner_consultant_id] || null : null,
      })) as FunnelItem[];
    },
  });
}

export function useCreateFunnelItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Partial<FunnelItem>) => {
      const { data, error } = await supabase
        .from('funnel_items')
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;

      // Log event
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('funnel_events').insert({
        funnel_item_id: data.id,
        event_type: 'created',
        to_stage: item.stage || 'new',
        performed_by: user?.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-items'] });
      toast.success('Lead created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateFunnelItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FunnelItem> & { id: string }) => {
      // Get current item for event logging
      const { data: current } = await supabase
        .from('funnel_items')
        .select('stage')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('funnel_items')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Log stage change if applicable
      if (updates.stage && current?.stage !== updates.stage) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('funnel_events').insert({
          funnel_item_id: id,
          event_type: 'stage_changed',
          from_stage: current?.stage,
          to_stage: updates.stage,
          performed_by: user?.id,
        });

        // Trigger CRM stage transition email (fire-and-forget)
        supabase.functions.invoke('send-crm-stage-transition-email', {
          body: {
            funnel_item_id: id,
            from_stage: current?.stage,
            to_stage: updates.stage,
          },
        }).catch((err) => {
          console.warn('CRM stage email trigger failed (non-blocking):', err);
        });
      }

      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      // Optimistic update: immediately reflect stage change in cache
      await queryClient.cancelQueries({ queryKey: ['funnel-items'] });
      await queryClient.cancelQueries({ queryKey: ['crm-pipeline'] });

      const previousFunnelItems = queryClient.getQueryData(['funnel-items']);
      const previousPipeline = queryClient.getQueryData(['crm-pipeline']);

      // Patch funnel-items cache
      queryClient.setQueriesData<FunnelItem[]>({ queryKey: ['funnel-items'] }, (old) => {
        if (!old) return old;
        return old.map((item) => (item.id === id ? { ...item, ...updates } : item));
      });

      // Patch crm-pipeline cache (array of arrays or flat)
      queryClient.setQueriesData<any>({ queryKey: ['crm-pipeline'] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((item: any) => (item?.id === id ? { ...item, ...updates } : item));
        }
        return old;
      });

      return { previousFunnelItems, previousPipeline };
    },
    onError: (e: Error, _vars, context) => {
      // Rollback on error
      if (context?.previousFunnelItems) {
        queryClient.setQueryData(['funnel-items'], context.previousFunnelItems);
      }
      if (context?.previousPipeline) {
        queryClient.setQueryData(['crm-pipeline'], context.previousPipeline);
      }
      toast.error(e.message);
    },
    onSuccess: () => {
      toast.success('Updated');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-items'] });
      queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['crm-inbox'] });
    },
  });
}

export function useConvertToStartup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      funnelItemId, 
      programId, 
      stage,
      incubationTypeId,
      buildingId,
      squareMeters,
      monthlyFee,
    }: { 
      funnelItemId: string; 
      programId: string; 
      stage: string;
      incubationTypeId?: string;
      buildingId?: string;
      squareMeters?: number;
      monthlyFee?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get funnel item
      const { data: item, error: itemError } = await supabase
        .from('funnel_items')
        .select('*')
        .eq('id', funnelItemId)
        .single();
      if (itemError) throw itemError;

      // Create startup
      const { data: startup, error: startupError } = await supabase
        .from('startups')
        .insert({
          name: item.organization_name || item.contact_name || 'New Startup',
          description: item.notes,
          created_by: user.id,
        })
        .select()
        .single();
      if (startupError) throw startupError;

      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          startup_id: startup.id,
          program_id: programId,
          stage: stage as any,
          status: 'active',
          assigned_consultor_id: item.owner_consultant_id,
        })
        .select()
        .single();
      if (workspaceError) throw workspaceError;

      // Create contract if incubation type is specified
      let contract = null;
      if (incubationTypeId) {
        const { data: contractData, error: contractError } = await supabase
          .from('startup_contracts')
          .insert({
            workspace_id: workspace.id,
            incubation_type_id: incubationTypeId,
            building_id: buildingId || null,
            square_meters: squareMeters || null,
            monthly_fee: monthlyFee || 0,
            start_date: new Date().toISOString().split('T')[0],
            status: 'draft',
            funnel_item_id: funnelItemId,
            created_by: user.id,
          })
          .select()
          .single();
        if (contractError) {
          console.error('Contract creation error:', contractError);
        } else {
          contract = contractData;
        }
      }

      // Update funnel item
      await supabase
        .from('funnel_items')
        .update({
          stage: stage === 'ideation' ? 'incubating' : 'accelerating',
          type: 'startup_active',
          linked_startup_id: startup.id,
          linked_workspace_id: workspace.id,
          linked_contract_id: contract?.id || null,
          converted_at: new Date().toISOString(),
        })
        .eq('id', funnelItemId);

      // Log event
      await supabase.from('funnel_events').insert({
        funnel_item_id: funnelItemId,
        event_type: 'converted_to_startup',
        performed_by: user.id,
        metadata: { startup_id: startup.id, workspace_id: workspace.id, contract_id: contract?.id },
      });

      return { startup, workspace, contract };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-items'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Converted to startup');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
