import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type StartupStage = Database['public']['Enums']['startup_stage'];

export interface ProgramModeSettings {
  program_mode: 'standard' | 'basic';
  enable_kpis: boolean;
  enable_health: boolean;
  enable_milestones: boolean;
  enable_alerts: boolean;
  enable_playbooks: boolean;
  enable_financial_model: boolean;
}

export interface DraftBasics {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  settings?: ProgramModeSettings;
}

export interface DraftStage {
  stage_key: StartupStage;
  name: string;
  description?: string;
  position: number;
  is_active: boolean;
}

export interface DraftKpi {
  name: string;
  unit?: string;
  category?: string;
  description?: string;
  direction?: string;
  is_required: boolean;
  order_index: number;
  target_value?: number;
  kpi_definition_id?: string;
}

export interface DraftStageKpis {
  stage_key: StartupStage;
  kpis: DraftKpi[];
}

export interface DraftCoreKpi {
  name: string;
  kpi_definition_id?: string;
  order_index: number;
}

export interface DraftPlaybookItem {
  item_type: 'milestone' | 'action';
  title: string;
  description?: string;
  relative_due_days?: number;
  priority?: string;
  order_index: number;
  default_owner_role?: string;
  metadata_json?: Record<string, unknown>;
}

export interface DraftPlaybook {
  stage_key: StartupStage;
  title: string;
  description?: string;
  items: DraftPlaybookItem[];
}

export interface DraftAlertRule {
  rule_type: string;
  threshold: number;
  severity: string;
  is_enabled: boolean;
}

export interface DraftHealthModel {
  weights_json: Record<string, number>;
  thresholds_json: Record<string, number>;
  is_enabled: boolean;
}

export interface ProgramSetupDraft {
  id: string;
  program_id: string | null;
  created_by: string;
  status: 'draft' | 'published' | 'discarded';
  draft_json: {
    basics: DraftBasics;
    stages: DraftStage[];
    kpis: DraftStageKpis[];
    coreKpis: DraftCoreKpi[];
    playbooks: DraftPlaybook[];
    alertRules: DraftAlertRule[];
    healthModel?: DraftHealthModel;
  };
  created_at: string;
  updated_at: string;
}

// Fetch all drafts
export function useProgramSetupDrafts() {
  return useQuery({
    queryKey: ['program-setup-drafts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_setup_drafts')
        .select('*')
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ProgramSetupDraft[];
    },
  });
}

// Fetch single draft
export function useProgramSetupDraft(draftId: string | undefined) {
  return useQuery({
    queryKey: ['program-setup-draft', draftId],
    queryFn: async () => {
      if (!draftId) return null;
      
      const { data, error } = await supabase
        .from('program_setup_drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (error) throw error;
      return data as unknown as ProgramSetupDraft;
    },
    enabled: !!draftId,
  });
}

// Create new draft
export function useCreateProgramDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (initialData?: { programId?: string; cloneFromProgramId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let draftJson = {
        basics: { name: '' },
        stages: [],
        kpis: [],
        coreKpis: [],
        playbooks: [],
        alertRules: [],
      };

      // If cloning from existing program
      if (initialData?.cloneFromProgramId) {
        draftJson = await loadProgramConfig(initialData.cloneFromProgramId);
      }
      // If editing existing program
      else if (initialData?.programId) {
        draftJson = await loadProgramConfig(initialData.programId);
      }

      const { data, error } = await supabase
        .from('program_setup_drafts')
        .insert([{
          program_id: initialData?.programId || null,
          created_by: user.id,
          status: 'draft' as const,
          draft_json: JSON.parse(JSON.stringify(draftJson)),
        }])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProgramSetupDraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-setup-drafts'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Update draft
export function useUpdateProgramDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draftId, draftJson }: { draftId: string; draftJson: Partial<ProgramSetupDraft['draft_json']> }) => {
      // Fetch current draft first
      const { data: current, error: fetchError } = await supabase
        .from('program_setup_drafts')
        .select('draft_json')
        .eq('id', draftId)
        .single();

      if (fetchError) throw fetchError;

      const currentJson = current.draft_json as unknown as ProgramSetupDraft['draft_json'];
      const updatedJson = { ...currentJson, ...draftJson };

      const { data, error } = await supabase
        .from('program_setup_drafts')
        .update({ draft_json: JSON.parse(JSON.stringify(updatedJson)) })
        .eq('id', draftId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProgramSetupDraft;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['program-setup-draft', data.id] });
      queryClient.invalidateQueries({ queryKey: ['program-setup-drafts'] });
    },
  });
}

// Discard draft
export function useDiscardProgramDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from('program_setup_drafts')
        .update({ status: 'discarded' })
        .eq('id', draftId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-setup-drafts'] });
      toast.success('Draft discarded');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Publish draft
export function usePublishProgramDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draftId: string) => {
      const { data, error } = await supabase.functions.invoke('publish-program-setup', {
        body: { draft_id: draftId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-setup-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Program published successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Helper: Load existing program config into draft format
async function loadProgramConfig(programId: string): Promise<ProgramSetupDraft['draft_json']> {
  // Load program basics
  const { data: program } = await supabase
    .from('programs')
    .select('*')
    .eq('id', programId)
    .single();

  // Load stages
  const { data: stages } = await supabase
    .from('stages')
    .select('*')
    .eq('program_id', programId)
    .order('position');

  // Load stage KPI defaults
  const { data: kpiDefaults } = await supabase
    .from('stage_kpi_defaults')
    .select('*, kpi_definition:kpi_definitions(*)')
    .eq('program_id', programId);

  // Load core KPIs
  const { data: coreKpis } = await supabase
    .from('program_core_kpis')
    .select('*, kpi_definition:kpi_definitions(*)')
    .eq('program_id', programId)
    .order('order_index');

  // Load playbooks
  const { data: playbooks } = await supabase
    .from('playbooks')
    .select('*, items:playbook_items(*)')
    .eq('program_id', programId);

  // Load alert rules
  const { data: alertRules } = await supabase
    .from('program_alert_rules')
    .select('*')
    .eq('program_id', programId);

  // Load health model
  const { data: healthModel } = await supabase
    .from('program_health_model')
    .select('*')
    .eq('program_id', programId)
    .single();

  // Transform to draft format
  const stageKpisMap = new Map<string, DraftKpi[]>();
  for (const def of kpiDefaults || []) {
    const stageKey = def.stage as StartupStage;
    if (!stageKpisMap.has(stageKey)) {
      stageKpisMap.set(stageKey, []);
    }
    const kpiDef = def.kpi_definition as { id: string; name: string; unit: string; category: string; description: string; direction: string } | null;
    stageKpisMap.get(stageKey)!.push({
      name: kpiDef?.name || '',
      unit: kpiDef?.unit,
      category: kpiDef?.category,
      description: kpiDef?.description,
      direction: kpiDef?.direction,
      is_required: def.required,
      order_index: def.order_index || 0,
      target_value: def.target_value,
      kpi_definition_id: def.kpi_definition_id,
    });
  }

  // Parse settings from program
  const programSettings = program?.settings_json as unknown as ProgramModeSettings | null;

  return {
    basics: {
      name: program?.name || '',
      description: program?.description || undefined,
      start_date: program?.start_date || undefined,
      end_date: program?.end_date || undefined,
      settings: programSettings || {
        program_mode: 'standard',
        enable_kpis: true,
        enable_health: true,
        enable_milestones: true,
        enable_alerts: true,
        enable_playbooks: true,
        enable_financial_model: true,
      },
    },
    stages: (stages || []).map((s) => ({
      stage_key: (s.stage_key || 'ideation') as StartupStage,
      name: s.name,
      description: s.description || undefined,
      position: s.position,
      is_active: s.is_active ?? true,
    })),
    kpis: Array.from(stageKpisMap.entries()).map(([stage_key, kpis]) => ({
      stage_key: stage_key as StartupStage,
      kpis,
    })),
    coreKpis: (coreKpis || []).map((c) => {
      const kpiDef = c.kpi_definition as { id: string; name: string } | null;
      return {
        name: kpiDef?.name || '',
        kpi_definition_id: c.kpi_definition_id,
        order_index: c.order_index,
      };
    }),
    playbooks: (playbooks || []).map((p) => ({
      stage_key: p.stage as StartupStage,
      title: p.title,
      description: p.description || undefined,
      items: ((p.items as unknown as DraftPlaybookItem[]) || []).map((item) => ({
        item_type: item.item_type as 'milestone' | 'action',
        title: item.title,
        description: item.description,
        relative_due_days: item.relative_due_days,
        priority: item.priority,
        order_index: item.order_index,
        default_owner_role: item.default_owner_role,
        metadata_json: item.metadata_json,
      })),
    })),
    alertRules: (alertRules || []).map((r) => ({
      rule_type: r.rule_type,
      threshold: Number(r.threshold),
      severity: r.severity,
      is_enabled: r.is_enabled,
    })),
    healthModel: healthModel ? {
      weights_json: healthModel.weights_json as Record<string, number>,
      thresholds_json: healthModel.thresholds_json as Record<string, number>,
      is_enabled: healthModel.is_enabled,
    } : undefined,
  };
}

// Fetch programs for template selection
export function usePrograms() {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}