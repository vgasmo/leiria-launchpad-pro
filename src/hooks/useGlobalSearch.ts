import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SearchResult {
  type: 'session' | 'action' | 'note' | 'document' | 'message' | 'milestone';
  id: string;
  workspace_id: string;
  title: string;
  snippet: string;
  updated_at: string;
  url: string;
  workspace_name?: string;
}

export interface SearchFilters {
  query: string;
  types?: string[];
  workspaceIds?: string[];
  tagIds?: string[];
  dateRange?: 'week' | 'month' | 'quarter' | 'all';
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

// Global search across multiple tables
export function useGlobalSearch(filters: SearchFilters) {
  return useQuery({
    queryKey: ['global-search', filters],
    queryFn: async () => {
      if (!filters.query || filters.query.length < 2) return [];

      const searchTerm = filters.query.trim();
      const tsQuery = searchTerm.split(' ').filter(Boolean).join(' & ');
      const ilikeTerm = `%${searchTerm}%`;
      
      const results: SearchResult[] = [];
      const typesToSearch = filters.types?.length ? filters.types : ['session', 'action', 'note', 'document', 'message', 'milestone'];

      // Calculate date filter
      let dateFilter: string | null = null;
      if (filters.dateRange && filters.dateRange !== 'all') {
        const now = new Date();
        if (filters.dateRange === 'week') {
          now.setDate(now.getDate() - 7);
        } else if (filters.dateRange === 'month') {
          now.setDate(now.getDate() - 30);
        } else if (filters.dateRange === 'quarter') {
          now.setDate(now.getDate() - 90);
        }
        dateFilter = now.toISOString();
      }

      // Search sessions
      if (typesToSearch.includes('session')) {
        let query = supabase
          .from('sessions')
          .select('id, workspace_id, title, notes, updated_at, workspaces!inner(startup:startups(name))')
          .or(`title.ilike.${ilikeTerm},notes.ilike.${ilikeTerm},agenda.ilike.${ilikeTerm}`)
          .limit(20);

        if (filters.workspaceIds?.length) {
          query = query.in('workspace_id', filters.workspaceIds);
        }
        if (dateFilter) {
          query = query.gte('updated_at', dateFilter);
        }

        const { data } = await query;
        results.push(...(data || []).map(s => ({
          type: 'session' as const,
          id: s.id,
          workspace_id: s.workspace_id,
          title: s.title,
          snippet: s.notes?.slice(0, 150) || '',
          updated_at: s.updated_at,
          url: `/workspace/${s.workspace_id}?tab=sessions`,
          workspace_name: (s.workspaces as any)?.startup?.name,
        })));
      }

      // Search action items
      if (typesToSearch.includes('action')) {
        let query = supabase
          .from('action_items')
          .select('id, workspace_id, title, description, updated_at, workspaces!inner(startup:startups(name))')
          .or(`title.ilike.${ilikeTerm},description.ilike.${ilikeTerm}`)
          .limit(20);

        if (filters.workspaceIds?.length) {
          query = query.in('workspace_id', filters.workspaceIds);
        }
        if (dateFilter) {
          query = query.gte('updated_at', dateFilter);
        }

        const { data } = await query;
        results.push(...(data || []).map(a => ({
          type: 'action' as const,
          id: a.id,
          workspace_id: a.workspace_id,
          title: a.title,
          snippet: a.description?.slice(0, 150) || '',
          updated_at: a.updated_at,
          url: `/workspace/${a.workspace_id}?tab=actions`,
          workspace_name: (a.workspaces as any)?.startup?.name,
        })));
      }

      // Search consultant notes
      if (typesToSearch.includes('note')) {
        let query = supabase
          .from('consultant_notes')
          .select('id, workspace_id, content, updated_at, workspaces!inner(startup:startups(name))')
          .ilike('content', ilikeTerm)
          .limit(20);

        if (filters.workspaceIds?.length) {
          query = query.in('workspace_id', filters.workspaceIds);
        }
        if (dateFilter) {
          query = query.gte('updated_at', dateFilter);
        }

        const { data } = await query;
        results.push(...(data || []).map(n => ({
          type: 'note' as const,
          id: n.id,
          workspace_id: n.workspace_id,
          title: 'Nota',
          snippet: n.content.slice(0, 150),
          updated_at: n.updated_at,
          url: `/workspace/${n.workspace_id}?tab=notes`,
          workspace_name: (n.workspaces as any)?.startup?.name,
        })));
      }

      // Search documents
      if (typesToSearch.includes('document')) {
        let query = supabase
          .from('documents')
          .select('id, workspace_id, name, description, updated_at, workspaces!inner(startup:startups(name))')
          .or(`name.ilike.${ilikeTerm},description.ilike.${ilikeTerm}`)
          .limit(20);

        if (filters.workspaceIds?.length) {
          query = query.in('workspace_id', filters.workspaceIds);
        }
        if (dateFilter) {
          query = query.gte('updated_at', dateFilter);
        }

        const { data } = await query;
        results.push(...(data || []).map(d => ({
          type: 'document' as const,
          id: d.id,
          workspace_id: d.workspace_id,
          title: d.name,
          snippet: d.description?.slice(0, 150) || '',
          updated_at: d.updated_at,
          url: `/workspace/${d.workspace_id}?tab=documents`,
          workspace_name: (d.workspaces as any)?.startup?.name,
        })));
      }

      // Search milestones
      if (typesToSearch.includes('milestone')) {
        let query = supabase
          .from('milestones')
          .select('id, workspace_id, title, description, updated_at, workspaces!inner(startup:startups(name))')
          .or(`title.ilike.${ilikeTerm},description.ilike.${ilikeTerm}`)
          .limit(20);

        if (filters.workspaceIds?.length) {
          query = query.in('workspace_id', filters.workspaceIds);
        }
        if (dateFilter) {
          query = query.gte('updated_at', dateFilter);
        }

        const { data } = await query;
        results.push(...(data || []).map(m => ({
          type: 'milestone' as const,
          id: m.id,
          workspace_id: m.workspace_id,
          title: m.title,
          snippet: m.description?.slice(0, 150) || '',
          updated_at: m.updated_at,
          url: `/workspace/${m.workspace_id}?tab=milestones`,
          workspace_name: (m.workspaces as any)?.startup?.name,
        })));
      }

      // Sort by updated_at descending
      results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      return results.slice(0, 50);
    },
    enabled: !!filters.query && filters.query.length >= 2,
    staleTime: 30000,
  });
}

// Get all tags
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Tag[];
    },
  });
}

// Get tags for a workspace
export function useWorkspaceTags(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-tags', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_tags')
        .select('tag:tags(*)')
        .eq('workspace_id', workspaceId!);

      if (error) throw error;
      return (data || []).map(d => d.tag) as Tag[];
    },
    enabled: !!workspaceId,
  });
}

// Get tags for a session
export function useSessionTags(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-tags', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_tags')
        .select('tag:tags(*)')
        .eq('session_id', sessionId!);

      if (error) throw error;
      return (data || []).map(d => d.tag) as Tag[];
    },
    enabled: !!sessionId,
  });
}

// Create a new tag
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name, color })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // unique violation
          // Tag already exists, fetch it
          const { data: existing } = await supabase
            .from('tags')
            .select('*')
            .eq('name', name)
            .single();
          return existing;
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Add tag to workspace
export function useAddWorkspaceTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, tagId }: { workspaceId: string; tagId: string }) => {
      const { error } = await supabase
        .from('workspace_tags')
        .insert({ workspace_id: workspaceId, tag_id: tagId });

      if (error && error.code !== '23505') throw error; // Ignore duplicate
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-tags', workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Remove tag from workspace
export function useRemoveWorkspaceTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, tagId }: { workspaceId: string; tagId: string }) => {
      const { error } = await supabase
        .from('workspace_tags')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-tags', workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Add tag to session
export function useAddSessionTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, tagId }: { sessionId: string; tagId: string }) => {
      const { error } = await supabase
        .from('session_tags')
        .insert({ session_id: sessionId, tag_id: tagId });

      if (error && error.code !== '23505') throw error;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['session-tags', sessionId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Remove tag from session
export function useRemoveSessionTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, tagId }: { sessionId: string; tagId: string }) => {
      const { error } = await supabase
        .from('session_tags')
        .delete()
        .eq('session_id', sessionId)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['session-tags', sessionId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Save search as saved filter
export function useSaveSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, filters }: { name: string; filters: SearchFilters }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('saved_filters')
        .insert({
          user_id: user.id,
          name,
          filters: {
            type: 'search',
            ...filters,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      toast.success('Pesquisa guardada');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Get saved searches
export function useSavedSearches() {
  return useQuery({
    queryKey: ['saved-searches'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).filter(f => (f.filters as any)?.type === 'search');
    },
  });
}

// Delete saved search
export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      toast.success('Pesquisa removida');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
