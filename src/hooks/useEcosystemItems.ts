import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EcosystemItem {
  id: string;
  item_type: 'workspace' | 'lead';
  workspace_id: string | null;
  funnel_item_id: string | null;
  name: string | null;
  program_id: string | null;
  program_name: string | null;
  stage: string | null;
  health_score: string | null;
  priority_level: string | null;
  owner_id: string | null;
  owner_name?: string | null;
  space_id: string | null;
  space_name: string | null;
  building_id: string | null;
  building_name: string | null;
  incubation_type_id: string | null;
  incubation_type_name: string | null;
  last_activity_at: string | null;
  next_meeting_at: string | null;
  created_at: string;
  updated_at: string;
  // Computed stats
  pending_actions_count?: number;
  overdue_actions_count?: number;
  has_current_month_kpi?: boolean;
  contract_expires_soon?: boolean;
  tags?: Array<{ id: string; name: string; color: string | null; category_id: string | null }>;
}

export interface EcosystemFilters {
  search?: string;
  programId?: string;
  stage?: string;
  healthScore?: string;
  ownerId?: string;
  buildingId?: string;
  incubationTypeId?: string;
  categoryId?: string;
  tagId?: string;
  needsAttention?: boolean;
}

export function useEcosystemItems(filters: EcosystemFilters = {}) {
  return useQuery({
    queryKey: ['ecosystem-items', filters],
    queryFn: async (): Promise<EcosystemItem[]> => {
      // Fetch workspaces
      let wsQuery = supabase
        .from('workspaces')
        .select(`
          id,
          program_id,
          stage,
          health_score,
          health_score_override,
          priority_level,
          updated_at,
          created_at,
          startup:startups(name),
          program:programs(name)
        `)
        .eq('status', 'active');

      if (filters.programId && filters.programId !== 'all') {
        wsQuery = wsQuery.eq('program_id', filters.programId);
      }
      if (filters.stage && filters.stage !== 'all') {
        wsQuery = wsQuery.eq('stage', filters.stage as any);
      }
      if (filters.healthScore && filters.healthScore !== 'all') {
        wsQuery = wsQuery.or(`health_score.eq.${filters.healthScore},health_score_override.eq.${filters.healthScore}`);
      }

      const { data: workspaces, error: wsError } = await wsQuery;
      if (wsError) throw wsError;

      // Fetch funnel items (leads not yet converted)
      let fiQuery = supabase
        .from('funnel_items')
        .select(`
          id,
          organization_name,
          contact_name,
          program_id,
          stage,
          owner_consultant_id,
          last_activity_at,
          next_action_at,
          updated_at,
          created_at,
          program:programs(name)
        `)
        .is('linked_workspace_id', null)
        .not('stage', 'in', '(lost,disqualified)');

      if (filters.programId && filters.programId !== 'all') {
        fiQuery = fiQuery.eq('program_id', filters.programId);
      }
      if (filters.stage && filters.stage !== 'all') {
        fiQuery = fiQuery.eq('stage', filters.stage);
      }
      if (filters.ownerId && filters.ownerId !== 'all') {
        fiQuery = fiQuery.eq('owner_consultant_id', filters.ownerId);
      }

      const { data: funnelItems, error: fiError } = await fiQuery;
      if (fiError) throw fiError;

      // Get owner info for workspaces
      const workspaceIds = workspaces?.map(w => w.id) || [];
      let ownerMap: Record<string, { id: string; name: string }> = {};
      
      if (workspaceIds.length > 0) {
        const { data: wuData } = await supabase
          .from('workspace_users')
          .select('workspace_id, user_id, profiles:user_id(full_name)')
          .in('workspace_id', workspaceIds)
          .eq('role', 'consultor')
          .eq('active', true);

        wuData?.forEach(wu => {
          const profile = wu.profiles as unknown as { full_name: string | null };
          ownerMap[wu.workspace_id] = { 
            id: wu.user_id, 
            name: profile?.full_name || 'Unknown' 
          };
        });
      }

      // Get owner names for funnel items
      const ownerIds = [...new Set(funnelItems?.filter(f => f.owner_consultant_id).map(f => f.owner_consultant_id) || [])];
      let ownerNames: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_safe')
          .select('id, full_name')
          .in('id', ownerIds as string[]);
        profiles?.forEach(p => { ownerNames[p.id] = p.full_name || 'Unknown'; });
      }

      // Map workspaces to ecosystem items
      const wsItems: EcosystemItem[] = (workspaces || []).map(w => ({
        id: w.id,
        item_type: 'workspace' as const,
        workspace_id: w.id,
        funnel_item_id: null,
        name: (w.startup as any)?.name || 'Unknown',
        program_id: w.program_id,
        program_name: (w.program as any)?.name || null,
        stage: w.stage,
        health_score: w.health_score_override || w.health_score,
        priority_level: w.priority_level,
        owner_id: ownerMap[w.id]?.id || null,
        owner_name: ownerMap[w.id]?.name || null,
        space_id: null,
        space_name: null,
        building_id: null,
        building_name: null,
        incubation_type_id: null,
        incubation_type_name: null,
        last_activity_at: w.updated_at,
        next_meeting_at: null,
        created_at: w.created_at,
        updated_at: w.updated_at,
      }));

      // Map funnel items to ecosystem items
      const fiItems: EcosystemItem[] = (funnelItems || []).map(f => ({
        id: f.id,
        item_type: 'lead' as const,
        workspace_id: null,
        funnel_item_id: f.id,
        name: f.organization_name || f.contact_name || 'Unknown Lead',
        program_id: f.program_id,
        program_name: (f.program as any)?.name || null,
        stage: f.stage,
        health_score: null,
        priority_level: null,
        owner_id: f.owner_consultant_id,
        owner_name: f.owner_consultant_id ? ownerNames[f.owner_consultant_id] : null,
        space_id: null,
        space_name: null,
        building_id: null,
        building_name: null,
        incubation_type_id: null,
        incubation_type_name: null,
        last_activity_at: f.last_activity_at || f.updated_at,
        next_meeting_at: f.next_action_at,
        created_at: f.created_at,
        updated_at: f.updated_at,
      }));

      let allItems = [...wsItems, ...fiItems];

      // Apply search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        allItems = allItems.filter(item => 
          item.name?.toLowerCase().includes(search)
        );
      }

      // Sort by last activity
      allItems.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      return allItems;
    },
  });
}

export function useTagCategories() {
  return useQuery({
    queryKey: ['tag-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tag_categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useTagsByCategory(categoryId?: string) {
  return useQuery({
    queryKey: ['tags-by-category', categoryId],
    queryFn: async () => {
      let query = supabase.from('tags').select('*, category:tag_categories(name, slug)').order('name');
      if (categoryId && categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
