import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  workspace_id: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  join_url: string | null;
  provider: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  workspace_id: string;
  starts_at: string;
  ends_at: string;
  location?: string;
  join_url?: string;
}

export interface UpdateMeetingInput {
  id: string;
  title?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  location?: string;
  join_url?: string;
}

export function useMeetings(workspaceId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: meetings = [], isLoading, error } = useQuery({
    queryKey: ['meetings', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('starts_at', { ascending: true });

      if (error) throw error;
      return data as Meeting[];
    },
    enabled: !!workspaceId,
  });

  const createMeeting = useMutation({
    mutationFn: async (input: CreateMeetingInput) => {
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] });
      toast.success('Meeting scheduled successfully');
    },
    onError: (error) => {
      console.error('Error creating meeting:', error);
      toast.error('Failed to schedule meeting');
    },
  });

  const updateMeeting = useMutation({
    mutationFn: async (input: UpdateMeetingInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] });
      toast.success('Meeting updated successfully');
    },
    onError: (error) => {
      console.error('Error updating meeting:', error);
      toast.error('Failed to update meeting');
    },
  });

  const deleteMeeting = useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] });
      toast.success('Meeting deleted');
    },
    onError: (error) => {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    },
  });

  return {
    meetings,
    isLoading,
    error,
    createMeeting,
    updateMeeting,
    deleteMeeting,
  };
}
