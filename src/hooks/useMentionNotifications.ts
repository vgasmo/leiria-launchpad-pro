import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { extractMentions } from '@/lib/mentions';

interface SendMentionNotificationParams {
  mentionedUserIds: string[];
  entityType: 'session' | 'action' | 'note';
  entityId: string;
  entityTitle: string;
  workspaceId: string;
  content: string;
}

export function useMentionNotifications() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const sendNotifications = useMutation({
    mutationFn: async (params: SendMentionNotificationParams) => {
      if (!user) throw new Error('Not authenticated');

      const notifications = params.mentionedUserIds.map(userId => ({
        user_id: userId,
        type: 'mention',
        title: `${profile?.full_name || 'Someone'} mentioned you`,
        message: `You were mentioned in ${params.entityType}: "${params.entityTitle}"`,
        link: `/workspace/${params.workspaceId}?tab=agenda`,
        metadata: {
          entity_type: params.entityType,
          entity_id: params.entityId,
          mentioned_by: user.id,
          mentioned_by_name: profile?.full_name || profile?.email,
          preview: params.content.slice(0, 100),
        },
      }));

      if (notifications.length === 0) return [];

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Helper to extract and notify mentions from text
  const notifyMentions = async (
    text: string,
    previousText: string,
    entityType: 'session' | 'action' | 'note',
    entityId: string,
    entityTitle: string,
    workspaceId: string,
    memberProfiles: Array<{ id: string; full_name: string | null; email: string }>
  ) => {
    const currentMentions = extractMentions(text);
    const previousMentions = extractMentions(previousText);
    
    // Find new mentions (not in previous text)
    const previousUsernames = new Set(previousMentions.map(m => m.username.toLowerCase()));
    const newMentions = currentMentions.filter(
      m => !previousUsernames.has(m.username.toLowerCase())
    );

    if (newMentions.length === 0) return;

    // Map usernames to user IDs
    const mentionedUserIds: string[] = [];
    
    newMentions.forEach(mention => {
      const username = mention.username.toLowerCase();
      
      memberProfiles.forEach(profile => {
        const emailPrefix = profile.email.split('@')[0].toLowerCase();
        const normalizedName = profile.full_name?.toLowerCase().replace(/\s+/g, '.') || '';
        
        if (emailPrefix === username || normalizedName === username) {
          if (!mentionedUserIds.includes(profile.id) && profile.id !== user?.id) {
            mentionedUserIds.push(profile.id);
          }
        }
      });
    });

    if (mentionedUserIds.length > 0) {
      await sendNotifications.mutateAsync({
        mentionedUserIds,
        entityType,
        entityId,
        entityTitle,
        workspaceId,
        content: text,
      });
    }
  };

  return {
    notifyMentions,
    isNotifying: sendNotifications.isPending,
  };
}
