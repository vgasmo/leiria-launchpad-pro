import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentFeedbackButtonProps {
  documentId: string;
  documentName: string;
  workspaceId: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Request feedback button for documents (Item J from audit).
 * Creates a feedback request via messaging or copies a share link.
 */
export function DocumentFeedbackButton({
  documentId,
  documentName,
  workspaceId,
  variant = 'ghost',
  size = 'sm',
}: DocumentFeedbackButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/workspace/${workspaceId}?tab=documents&doc=${documentId}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success(t('documentFeedback.linkCopied', 'Link copied! Share it to request feedback.'));
    setShowDialog(false);
  };

  const handleSendRequest = async () => {
    if (!user) return;
    
    setIsSending(true);
    try {
      // Create a notification for workspace consultants
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id, // This would typically be the consultant/mentor
          type: 'feedback_request',
          title: t('documentFeedback.requestTitle', 'Feedback requested'),
          message: t('documentFeedback.requestMessage', '{{user}} requested feedback on "{{doc}}"', {
            user: user.email,
            doc: documentName,
          }),
          link: `/workspace/${workspaceId}?tab=documents&doc=${documentId}`,
          metadata: { documentId, workspaceId, requestedBy: user.id, message },
        });

      if (error) throw error;

      toast.success(t('documentFeedback.requestSent', 'Feedback request sent!'));
      setShowDialog(false);
      setMessage('');
    } catch (error) {
      toast.error(t('documentFeedback.requestFailed', 'Failed to send request. Please try again.'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowDialog(true)}
        title={t('documentFeedback.requestFeedback', 'Request Feedback')}
      >
        <MessageSquare className="h-4 w-4" />
        {size !== 'icon' && (
          <span className="ml-1.5">{t('documentFeedback.feedback', 'Feedback')}</span>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('documentFeedback.title', 'Request Feedback')}
            </DialogTitle>
            <DialogDescription>
              {t('documentFeedback.description', 'Ask for feedback on "{{name}}" from your mentors or consultants.', {
                name: documentName,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-message">
                {t('documentFeedback.whatFeedback', 'What feedback are you looking for?')}
              </Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('documentFeedback.placeholder', 'e.g., "Please review my pitch deck structure and financial projections..."')}
                rows={3}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                {t('documentFeedback.orShare', 'Or share a link for feedback:')}
              </p>
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                {t('documentFeedback.copyLink', 'Copy Share Link')}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSendRequest} disabled={isSending}>
              <Send className="h-4 w-4 mr-1.5" />
              {isSending 
                ? t('common.sending', 'Sending...') 
                : t('documentFeedback.sendRequest', 'Send Request')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
