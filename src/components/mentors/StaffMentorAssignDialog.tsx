import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserPlus, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MentorRecommendationWidget } from './MentorRecommendationWidget';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface StaffMentorAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  workspaceId: string;
  expertiseTags: string[];
  suggestedMentorId?: string | null;
}

export function StaffMentorAssignDialog({
  open,
  onOpenChange,
  requestId,
  workspaceId,
  expertiseTags,
  suggestedMentorId,
}: StaffMentorAssignDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(suggestedMentorId || null);

  // Assign mentor mutation - adds to workspace_users and updates request
  const assignMentor = useMutation({
    mutationFn: async () => {
      if (!selectedMentorId) throw new Error('No mentor selected');

      // Check if mentor is already assigned to workspace
      const { data: existing } = await supabase
        .from('workspace_users')
        .select('id, active')
        .eq('workspace_id', workspaceId)
        .eq('user_id', selectedMentorId)
        .eq('role', 'mentor_externo')
        .maybeSingle();

      if (existing) {
        // Reactivate if inactive
        if (!existing.active) {
          await supabase
            .from('workspace_users')
            .update({ active: true })
            .eq('id', existing.id);
        }
      } else {
        // Add new workspace user
        const { error: wsError } = await supabase
          .from('workspace_users')
          .insert({
            workspace_id: workspaceId,
            user_id: selectedMentorId,
            role: 'mentor_externo',
            active: true,
          });
        if (wsError) throw wsError;
      }

      // Update the request status
      const { error: reqError } = await supabase
        .from('mentor_requests')
        .update({
          status: 'fulfilled',
          assigned_mentor_id: selectedMentorId,
          fulfilled_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (reqError) throw reqError;

      // Create a mentor connection record
      // Note: mentor_connections.founder_id stores workspace_id for connection tracking
      const { error: connError } = await supabase
        .from('mentor_connections')
        .upsert({
          mentor_id: selectedMentorId,
          founder_id: workspaceId, // workspace_id used as connection anchor
          status: 'connected',
          responded_at: new Date().toISOString(),
        }, {
          onConflict: 'mentor_id,founder_id',
        });
      
      // Ignore connection errors as it's supplementary
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-mentor-requests'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-users'] });
      toast.success(t('mentors.mentorAssigned', 'Mentor assigned successfully'));
      onOpenChange(false);
    },
    onError: (error) => {
      logger.error('Assignment error', {}, error);
      toast.error(t('common.error'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('mentors.assignMentor', 'Assign Mentor')}
          </DialogTitle>
          <DialogDescription>
            {t('mentors.assignMentorDesc', 'Selecione um mentor para associar a este workspace. Será adicionado como mentor externo com acesso de leitura às notas e sessões.')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <MentorRecommendationWidget
            requestedTags={expertiseTags}
            workspaceId={workspaceId}
            onSelectMentor={setSelectedMentorId}
            selectedMentorId={selectedMentorId}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => assignMentor.mutate()}
            disabled={!selectedMentorId || assignMentor.isPending}
          >
            {assignMentor.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {t('mentors.confirmAssignment', 'Confirm Assignment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
