import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ValuePropFields {
  segment: string;
  problem: string;
  evidence: string;
  consequence: string;
  jobs_to_be_done: string;
  alternatives: string;
  why_alternatives_fail: string;
  value_prop: string;
  proof: string;
}

export interface ValuePropOutputs {
  vp_statement: string;
  short_version: string;
  bullet_points: string[];
  solution_structure?: {
    component1: string;
    component2: string;
    component3: string;
  };
}

export interface ValuePropArtifact {
  id: string;
  workspace_id: string;
  created_by: string | null;
  json_fields: ValuePropFields;
  outputs_text: ValuePropOutputs;
  version: number;
  created_at: string;
  updated_at: string;
}

export function useValuePropArtifacts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['value-prop-artifacts', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('value_prop_artifacts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        json_fields: d.json_fields as unknown as ValuePropFields,
        outputs_text: d.outputs_text as unknown as ValuePropOutputs,
      })) as ValuePropArtifact[];
    },
    enabled: !!workspaceId,
  });
}

export function useValuePropArtifact(id: string | undefined) {
  return useQuery({
    queryKey: ['value-prop-artifact', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('value_prop_artifacts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        json_fields: data.json_fields as unknown as ValuePropFields,
        outputs_text: data.outputs_text as unknown as ValuePropOutputs,
      } as ValuePropArtifact;
    },
    enabled: !!id,
  });
}

export function useCreateValueProp(workspaceId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      fields,
      outputs,
    }: {
      fields: ValuePropFields;
      outputs: ValuePropOutputs;
    }) => {
      const { data, error } = await supabase
        .from('value_prop_artifacts')
        .insert({
          workspace_id: workspaceId,
          created_by: user?.id,
          json_fields: fields as never,
          outputs_text: outputs as never,
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['value-prop-artifacts', workspaceId] });
    },
  });
}

export function useUpdateValueProp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      fields,
      outputs,
    }: {
      id: string;
      fields: ValuePropFields;
      outputs: ValuePropOutputs;
    }) => {
      const { data, error } = await supabase
        .from('value_prop_artifacts')
        .update({
          json_fields: fields as never,
          outputs_text: outputs as never,
        } as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['value-prop-artifacts', data.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['value-prop-artifact', data.id] });
    },
  });
}

// Generate outputs from fields
export function generateValuePropOutputs(fields: ValuePropFields): ValuePropOutputs {
  const { segment, problem, value_prop, proof, jobs_to_be_done, consequence } = fields;

  // VP Statement (1-2 sentences)
  const vp_statement = `For ${segment || '[segment]'} who ${problem || '[problem]'}, we provide ${value_prop || '[value prop]'}${proof ? `, backed by ${proof}` : ''}.`;

  // Short version (1 sentence)
  const short_version = value_prop || 'We help [segment] solve [problem] with [solution].';

  // Bullet points
  const bullet_points = [
    problem && `Solves: ${problem}`,
    jobs_to_be_done && `Enables: ${jobs_to_be_done}`,
    value_prop && `Delivers: ${value_prop}`,
    proof && `Proven by: ${proof}`,
    consequence && `Prevents: ${consequence}`,
  ].filter(Boolean) as string[];

  return {
    vp_statement,
    short_version,
    bullet_points: bullet_points.slice(0, 5),
  };
}
