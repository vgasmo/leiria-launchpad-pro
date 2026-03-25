/**
 * CRM Drawer - Email History Panel
 * Shows synced Outlook emails from communication_log for the funnel item
 */
import { useTranslation } from 'react-i18next';
import { Mail, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { formatRelativeTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface EmailHistoryPanelProps {
  funnelItemId: string;
  onSyncEmails: () => void;
  isSyncing: boolean;
  emailSyncEnabled: boolean;
}

export function EmailHistoryPanel({ funnelItemId, onSyncEmails, isSyncing, emailSyncEnabled }: EmailHistoryPanelProps) {
  const { t } = useTranslation();

  const { data: emails, isLoading } = useQuery({
    queryKey: ['crm-emails', funnelItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_log')
        .select('id, subject, preview, direction, channel, occurred_at, from_address, status')
        .eq('funnel_item_id', funnelItemId)
        .in('channel', ['email', 'outlook'])
        .order('occurred_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          {t('crm.emailHistory', { defaultValue: 'Histórico de Email' })}
        </p>
        {emailSyncEnabled && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={onSyncEmails}
            disabled={isSyncing}
          >
            <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
            {t('crm.sync', { defaultValue: 'Sincronizar' })}
          </Button>
        )}
      </div>

      {!emails || emails.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center">
            <Mail className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('crm.noEmails', { defaultValue: 'Sem emails sincronizados' })}
            </p>
            {emailSyncEnabled && (
              <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={onSyncEmails} disabled={isSyncing}>
                <RefreshCw className="h-3 w-3 mr-1" />
                {t('crm.syncNow', { defaultValue: 'Sincronizar agora' })}
              </Button>
            )}
            {!emailSyncEnabled && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('crm.emailSyncDisabled', { defaultValue: 'Ative a feature flag crm_graph_email_sync para sincronizar.' })}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1">
            {emails.map(email => (
              <Card key={email.id} className="border-border/40 hover:bg-muted/40 transition-colors">
                <CardContent className="p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {email.direction === 'inbound' ? (
                        <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium truncate">{email.subject || '(sem assunto)'}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(email.occurred_at)}
                        </span>
                      </div>
                      {email.from_address && (
                        <p className="text-[10px] text-muted-foreground truncate">{email.from_address}</p>
                      )}
                      {email.preview && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{email.preview}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
