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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWorkspaceActions, useWorkspaceKpis, useWorkspaceNextSession } from '@/hooks/useWorkspaceData';
import { usePendingCheckin } from '@/hooks/useCheckins';
import { format, isThisMonth } from 'date-fns';
import { pt as ptLocale, enUS } from 'date-fns/locale';

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

    // Check for overdue actions (highest priority)
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

    // Check for pending check-in
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

    // Check for missing KPIs this month
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

    // Check for upcoming session prep
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

    // Check for in-progress actions
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

    // Sort by priority and return top 3
    return items.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [actions, kpiData, nextSession, pendingCheckin, setSearchParams, t]);

  if (nextActions.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">{t('nextBestAction.allCaughtUp')}</h3>
              <p className="text-sm text-green-700 dark:text-green-300">{t('nextBestAction.noUrgentActions')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          {t('nextBestAction.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {nextActions.map((item) => (
          <div 
            key={item.id}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              item.variant === 'destructive' 
                ? 'border-amber-300/40 bg-amber-50/30 dark:border-amber-700/30 dark:bg-amber-900/10' 
                : item.variant === 'warning'
                ? 'border-amber-200/50 bg-amber-50/30 dark:border-amber-800/30 dark:bg-amber-950/10'
                : 'border-border bg-muted/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                item.variant === 'destructive' 
                  ? 'bg-amber-100/80 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' 
                  : item.variant === 'warning'
                  ? 'bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground'
              }`}>
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
                className="gap-1"
              >
                {item.actionLabel}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
