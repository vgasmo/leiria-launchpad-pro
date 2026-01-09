import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquarePlus, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface RequestPlaybookDialogProps {
  workspaceId: string;
  trigger?: React.ReactNode;
}

/**
 * Dialog for founders to request a custom/advanced playbook.
 * Uses existing consultant_notes table to avoid schema changes.
 */
export function RequestPlaybookDialog({ workspaceId, trigger }: RequestPlaybookDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState('');
  const [urgency, setUrgency] = useState<'this_week' | 'this_month'>('this_month');
  const [context, setContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!goal.trim()) {
      toast.error(t('requestPlaybook.goalRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create a structured note as a playbook request
      const requestContent = [
        `📋 **${t('requestPlaybook.title')}**`,
        '',
        `**${t('requestPlaybook.goalLabel')}:** ${goal}`,
        `**${t('requestPlaybook.urgencyLabel')}:** ${urgency === 'this_week' ? t('requestPlaybook.thisWeek') : t('requestPlaybook.thisMonth')}`,
        context ? `**${t('requestPlaybook.contextLabel')}:** ${context}` : '',
      ].filter(Boolean).join('\n');

      // Insert as consultant note (visible to staff)
      const { error } = await supabase.from('consultant_notes').insert({
        workspace_id: workspaceId,
        author_id: user.id,
        content: requestContent,
        is_private: false,
        visibility: 'staff', // Visible to consultants/admins
      });

      if (error) throw error;

      toast.success(t('requestPlaybook.submitted'));
      queryClient.invalidateQueries({ queryKey: ['consultant-notes', workspaceId] });
      setOpen(false);
      setGoal('');
      setContext('');
      setUrgency('this_month');
    } catch (error: any) {
      console.error('Failed to submit playbook request:', error);
      toast.error(t('requestPlaybook.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            {t('requestPlaybook.trigger')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('requestPlaybook.title')}</DialogTitle>
          <DialogDescription>
            {t('requestPlaybook.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal">{t('requestPlaybook.goalLabel')} *</Label>
            <Textarea
              id="goal"
              placeholder={t('requestPlaybook.goalPlaceholder')}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('requestPlaybook.urgencyLabel')}</Label>
            <RadioGroup value={urgency} onValueChange={(v) => setUrgency(v as typeof urgency)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="this_week" id="this_week" />
                <Label htmlFor="this_week" className="font-normal">
                  {t('requestPlaybook.thisWeek')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="this_month" id="this_month" />
                <Label htmlFor="this_month" className="font-normal">
                  {t('requestPlaybook.thisMonth')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">{t('requestPlaybook.contextLabel')}</Label>
            <Textarea
              id="context"
              placeholder={t('requestPlaybook.contextPlaceholder')}
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !goal.trim()}>
            {isSubmitting ? (
              <>{t('common.sending')}</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t('requestPlaybook.submit')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
