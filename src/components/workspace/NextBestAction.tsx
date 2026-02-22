import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Zap, 
  TrendingUp, 
  CheckCircle2, 
  ClipboardList, 
  Calendar, 
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWorkspaceActions, useWorkspaceKpis, useWorkspaceNextSession } from '@/hooks/useWorkspaceData';
import { usePendingCheckin } from '@/hooks/useCheckins';
import { triggerMiniCelebration } from '@/lib/confetti';
import { format, isThisMonth } from 'date-fns';
import { pt as ptLocale, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NextBestActionProps {
  workspaceId: string;
  programId: string;
  stage: string;
  canWrite: boolean;
}

interface ActionItem {
  id: string;
  type: 'kpi' | 'action' | 'checkin' | 'session' | 'stage_gate';
  priority: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  variant: 'destructive' | 'warning' | 'default';
  action: () => void;
  actionLabel: string;
}

export function NextBestAction({ workspaceId, programId, stage, canWrite }: NextBestActionProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('pt') ? ptLocale : enUS;
  const [, setSearchParams] = useSearchParams();
  const { data: actions } = useWorkspaceActions(workspaceId);
  const { data: kpiData } = useWorkspaceKpis(workspaceId);
  const { data: nextSession } = useWorkspaceNextSession(workspaceId);
  const { data: pendingCheckin } = usePendingCheckin(workspaceId);

  const nextActions = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];
    const today = new Date();

    const overdueActions = actions?.filter(a => 
      a.due_date && new Date(a.due_date) < today && a.status !== 'completed'
    ) || [];
    
    if (overdueActions.length > 0) {
      items.push({
        id: 'overdue-actions',
        type: 'action',
        priority: 1,
        title: t('nextBestAction.overdueActions', { count: overdueActions.length }),
        description: t('nextBestAction.completeOrReschedule'),
        icon: <AlertTriangle className="h-5 w-5" />,
        variant: 'destructive',
        action: () => setSearchParams({ tab: 'actions' }),
        actionLabel: t('nextBestAction.viewActions'),
      });
    }

    if (pendingCheckin) {
      items.push({
        id: 'pending-checkin',
        type: 'checkin',
        priority: 2,
        title: t('nextBestAction.weeklyCheckinPending'),
        description: t('nextBestAction.dueOn', { date: format(new Date(pendingCheckin.due_date), 'EEEE', { locale: dateLocale }) }),
        icon: <ClipboardList className="h-5 w-5" />,
        variant: 'warning',
        action: () => setSearchParams({ tab: 'overview' }),
        actionLabel: t('nextBestAction.completeCheckin'),
      });
    }

    const hasCurrentMonthKpis = kpiData?.current.some(k => 
      k.period_month && isThisMonth(new Date(k.period_month))
    );
    
    if (!hasCurrentMonthKpis) {
      items.push({
        id: 'missing-kpis',
        type: 'kpi',
        priority: 3,
        title: t('nextBestAction.updateKpisForMonth'),
        description: t('nextBestAction.trackProgress'),
        icon: <TrendingUp className="h-5 w-5" />,
        variant: 'warning',
        action: () => setSearchParams({ tab: 'kpis' }),
        actionLabel: t('nextBestAction.addKpis'),
      });
    }

    if (nextSession) {
      const sessionDate = new Date(nextSession.starts_at);
      const daysUntil = Math.ceil((sessionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= 2 && daysUntil >= 0) {
        items.push({
          id: 'session-prep',
          type: 'session',
          priority: 4,
          title: t('nextBestAction.prepareSession'),
          description: t('nextBestAction.sessionOn', { title: nextSession.title, date: format(sessionDate, 'EEE, dd MMM', { locale: dateLocale }) }),
          icon: <Calendar className="h-5 w-5" />,
          variant: 'default',
          action: () => setSearchParams({ tab: 'agenda' }),
          actionLabel: t('nextBestAction.viewSession'),
        });
      }
    }

    const inProgressActions = actions?.filter(a => a.status === 'in_progress') || [];
    if (inProgressActions.length > 0 && items.length < 3) {
      items.push({
        id: 'in-progress-actions',
        type: 'action',
        priority: 5,
        title: t('nextBestAction.actionsInProgress', { count: inProgressActions.length }),
        description: inProgressActions[0]?.title || t('nextBestAction.continueWork'),
        icon: <CheckCircle2 className="h-5 w-5" />,
        variant: 'default',
        action: () => setSearchParams({ tab: 'actions' }),
        actionLabel: t('nextBestAction.continue'),
      });
    }

    return items.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [actions, kpiData, nextSession, pendingCheckin, setSearchParams, t]);

  if (nextActions.length === 0) {
    return (
      <Card className="relative overflow-hidden border-green-200 dark:border-green-900 bg-gradient-to-r from-green-50/80 via-emerald-50/50 to-transparent dark:from-green-950/30 dark:via-emerald-950/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-400/10 to-transparent rounded-bl-full" />
        <CardContent className="py-6 relative">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center ring-1 ring-green-500/20">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100">{t('nextBestAction.allCaughtUp')}</h3>
              <p className="text-sm text-green-700 dark:text-green-300">{t('nextBestAction.noUrgentActions')}</p>
            </div>
            <Sparkles className="h-5 w-5 text-green-400/50" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      {/* Subtle hero gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-accent/3 pointer-events-none" />
      
      <CardHeader className="pb-3 relative">
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          {t('nextBestAction.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 relative">
        {nextActions.map((item, index) => (
          <div 
            key={item.id}
            className={cn(
              'group flex items-center justify-between p-3 rounded-xl border transition-all duration-200',
              'hover:shadow-sm hover:scale-[1.005]',
              item.variant === 'destructive' 
                ? 'border-amber-300/40 bg-amber-50/40 dark:border-amber-700/30 dark:bg-amber-900/10 hover:border-amber-400/60' 
                : item.variant === 'warning'
                ? 'border-amber-200/50 bg-amber-50/30 dark:border-amber-800/30 dark:bg-amber-950/10 hover:border-amber-300/60'
                : 'border-border bg-muted/30 hover:border-border/80 hover:bg-muted/50',
              index === 0 && 'ring-1 ring-primary/10'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105',
                item.variant === 'destructive' 
                  ? 'bg-amber-100/80 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' 
                  : item.variant === 'warning'
                  ? 'bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground'
              )}>
                {item.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
            {canWrite && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={item.action}
                className="gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
              >
                {item.actionLabel}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
