import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Target, 
  TrendingUp, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  ArrowRight,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useActionItems } from '@/hooks/useActionItems';
import { usePendingCheckin } from '@/hooks/useCheckins';
import { WorkspaceWithDetails } from '@/hooks/useWorkspaces';
import { isPast, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';

interface OneThingTodayProps {
  workspace: WorkspaceWithDetails;
  className?: string;
}

interface RecommendedAction {
  type: 'overdue_action' | 'checkin' | 'kpi_update' | 'session_prep' | 'template' | 'milestone';
  title: string;
  why: string;
  link: string;
  priority: number;
  icon: typeof Target;
  variant: 'destructive' | 'warning' | 'default';
}

export function OneThingToday({ workspace, className }: OneThingTodayProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: actions } = useActionItems(workspace.id);
  const { data: pendingCheckin } = usePendingCheckin(workspace.id);

  const recommendation = useMemo<RecommendedAction | null>(() => {
    const candidates: RecommendedAction[] = [];

    // Check for overdue actions (highest priority but softer tone)
    const overdueActions = actions?.filter(
      a => a.status !== 'completed' && a.due_date && isPast(new Date(a.due_date))
    ) || [];
    
    if (overdueActions.length > 0) {
      const oldest = overdueActions[0];
      const daysOverdue = differenceInDays(new Date(), new Date(oldest.due_date!));
      // Only show as destructive if severely overdue (7+ days), else use warning
      const variant = daysOverdue >= 7 ? 'destructive' : 'warning';
      candidates.push({
        type: 'overdue_action',
        title: oldest.title,
        why: t('oneThingToday.overdueWhy', { days: daysOverdue }),
        link: `/workspace/${workspace.id}?tab=actions`,
        priority: 100 + daysOverdue,
        icon: daysOverdue >= 7 ? AlertCircle : Target,
        variant,
      });
    }

    // Check for pending check-in this month
    if (pendingCheckin) {
      candidates.push({
        type: 'checkin',
        title: t('oneThingToday.submitCheckin'),
        why: t('oneThingToday.checkinWhy'),
        link: `/workspace/${workspace.id}?tab=overview`,
        priority: 80,
        icon: Calendar,
        variant: 'warning',
      });
    }

    // Check if KPIs need update
    if (!workspace.hasCurrentMonthKpi) {
      candidates.push({
        type: 'kpi_update',
        title: t('oneThingToday.updateKpis'),
        why: t('oneThingToday.kpiWhy'),
        link: `/workspace/${workspace.id}?tab=kpis`,
        priority: 60,
        icon: TrendingUp,
        variant: 'warning',
      });
    }

    // Check for upcoming session needing prep
    if (workspace.nextMeetingDate) {
      const daysUntil = differenceInDays(new Date(workspace.nextMeetingDate), new Date());
      if (daysUntil <= 2 && daysUntil >= 0) {
        candidates.push({
          type: 'session_prep',
          title: t('oneThingToday.prepSession'),
          why: t('oneThingToday.sessionPrepWhy'),
          link: `/workspace/${workspace.id}?tab=sessions`,
          priority: 50,
          icon: FileText,
          variant: 'default',
        });
      }
    }

    // Check for pending actions (not overdue)
    const pendingActions = actions?.filter(
      a => a.status === 'pending' && (!a.due_date || !isPast(new Date(a.due_date)))
    ) || [];
    
    if (pendingActions.length > 0 && candidates.length === 0) {
      const next = pendingActions[0];
      candidates.push({
        type: 'milestone',
        title: next.title,
        why: t('oneThingToday.actionWhy'),
        link: `/workspace/${workspace.id}?tab=actions`,
        priority: 30,
        icon: CheckCircle2,
        variant: 'default',
      });
    }

    // Sort by priority and return the highest
    candidates.sort((a, b) => b.priority - a.priority);
    return candidates[0] || null;
  }, [actions, pendingCheckin, workspace, t]);

  if (!recommendation) {
    return (
      <Card className={`bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-700 dark:text-green-400">
                {t('oneThingToday.allCaughtUp')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('oneThingToday.keepMomentum')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const Icon = recommendation.icon;
  // Softer color scheme - use amber/warning instead of heavy red
  const bgClass = recommendation.variant === 'destructive' 
    ? 'from-red-500/5 to-orange-500/5 border-red-400/30'
    : recommendation.variant === 'warning'
    ? 'from-amber-500/5 to-yellow-500/5 border-amber-400/30'
    : 'from-primary/5 to-accent/5 border-primary/20';
  
  const iconBgClass = recommendation.variant === 'destructive'
    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
    : recommendation.variant === 'warning'
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : 'bg-primary/10 text-primary';

  return (
    <Card className={`bg-gradient-to-br ${bgClass} ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${iconBgClass}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                {t('oneThingToday.focusToday')}
              </Badge>
            </div>
            <p className="font-medium truncate">{recommendation.title}</p>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{recommendation.why}</p>
          </div>
          <Button 
            size="sm" 
            variant={recommendation.variant === 'destructive' ? 'destructive' : 'default'}
            onClick={() => navigate(recommendation.link)}
            className="flex-shrink-0"
          >
            {t('common.go')}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
