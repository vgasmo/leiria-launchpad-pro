import { useTranslation } from 'react-i18next';
import { Target, Clock, X, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FunnelItem, FunnelStage } from '@/hooks/useFunnel';
import { LeadScoreCard } from '@/components/crm/LeadScoreCard';
import { getFunnelStageLabel } from '@/lib/stageLabels';
import { formatRelativeTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { STAGE_COLORS } from './RecordDrawerHeader';

interface OverviewTabProps {
  item: FunnelItem;
  nextActionAt: string | null;
  nextActionDescription: string | null;
  lastActivityAt: string | null;
  onSetNextAction: () => void;
  onClearNextAction: () => void;
  isClearingNextAction: boolean;
}

export function OverviewTab({
  item,
  nextActionAt,
  nextActionDescription,
  lastActivityAt,
  onSetNextAction,
  onClearNextAction,
  isClearingNextAction,
}: OverviewTabProps) {
  const { t } = useTranslation();
  const stageColor = STAGE_COLORS[item.stage];
  const stageLabel = getFunnelStageLabel(t, item.stage);

  return (
    <div className="flex-1 p-4 space-y-4 overflow-auto">
      {/* Next Action Card */}
      <Card className={cn(
        nextActionAt && new Date(nextActionAt) < new Date() && 'border-warning/50 bg-warning/5'
      )}>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            {t('crm.nextAction')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {nextActionAt ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className={cn(
                  'h-4 w-4',
                  new Date(nextActionAt) < new Date() ? 'text-warning' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-sm',
                  new Date(nextActionAt) < new Date() && 'text-warning font-medium'
                )}>
                  {formatRelativeTime(nextActionAt)}
                </span>
              </div>
              {nextActionDescription && (
                <p className="text-sm text-muted-foreground">{nextActionDescription}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSetNextAction} data-testid="next-action-open">
                  {t('crm.updateNextAction')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={onClearNextAction}
                  disabled={isClearingNextAction}
                >
                  <X className="h-3 w-3 mr-1" />
                  {t('crm.clearNextAction')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('crm.noNextActionSet')}</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSetNextAction} data-testid="next-action-open">
                <Plus className="h-3 w-3 mr-1" />
                {t('crm.setNextAction')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Score */}
      <LeadScoreCard
        item={{
          id: item.id,
          stage: item.stage,
          contact_name: item.contact_name,
          contact_email: item.contact_email,
          contact_phone: item.contact_phone,
          organization_name: item.organization_name,
          next_action_at: nextActionAt,
          last_activity_at: lastActivityAt,
          created_at: item.created_at,
          source: item.source,
          notes: item.notes,
        }}
      />

      {/* Details */}
      <div className="grid gap-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('crm.stage')}</span>
          <Badge className={cn(stageColor, 'text-white')}>{stageLabel}</Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('crm.owner')}</span>
          <span>{item.owner?.full_name || t('crm.unassigned')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('crm.created')}</span>
          <span>{formatRelativeTime(item.created_at)}</span>
        </div>
        {item.source && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('crm.source')}</span>
            <span>{item.source}</span>
          </div>
        )}
        {item.contact_phone && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('crm.phone')}</span>
            <span>{item.contact_phone}</span>
          </div>
        )}
      </div>

      {item.notes && (
        <div className="pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{t('crm.notes')}</p>
          <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
        </div>
      )}
    </div>
  );
}
