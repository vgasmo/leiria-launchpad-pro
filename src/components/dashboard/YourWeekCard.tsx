import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format, isThisWeek, differenceInDays } from 'date-fns';
import { 
  Zap,
  Calendar,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Flame,
  ClipboardCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { WorkspaceWithDetails } from '@/hooks/useWorkspaces';

interface YourWeekCardProps {
  workspace: WorkspaceWithDetails;
  streakWeeks?: number;
}

interface PriorityItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  urgency: 'high' | 'medium' | 'low';
  action: string;
  tab: string;
}

export function YourWeekCard({ workspace, streakWeeks = 0 }: YourWeekCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const priorities = useMemo<PriorityItem[]>(() => {
    const items: PriorityItem[] = [];

    // 1. Overdue actions
    if (workspace.overdueActionsCount > 0) {
      items.push({
        id: 'overdue',
        label: t('yourWeek.overdueActions', { count: workspace.overdueActionsCount }),
        description: t('yourWeek.overdueActionsDesc'),
        icon: <AlertTriangle className="h-4 w-4" />,
        urgency: 'high',
        action: t('yourWeek.viewActions'),
        tab: 'actions',
      });
    }

    // 2. Pending actions
    if (workspace.pendingActionsCount > 0 && items.length < 3) {
      items.push({
        id: 'pending',
        label: t('yourWeek.pendingActions', { count: workspace.pendingActionsCount }),
        description: t('yourWeek.pendingActionsDesc'),
        icon: <Target className="h-4 w-4" />,
        urgency: 'medium',
        action: t('yourWeek.viewActions'),
        tab: 'actions',
      });
    }

    // 3. KPIs need update
    if (!workspace.hasCurrentMonthKpi && items.length < 3) {
      items.push({
        id: 'kpis',
        label: t('yourWeek.updateKpis'),
        description: t('yourWeek.kpisThisMonth'),
        icon: <TrendingUp className="h-4 w-4" />,
        urgency: 'medium',
        action: t('yourWeek.addKpis'),
        tab: 'kpis',
      });
    }

    // 4. Upcoming meeting
    if (workspace.nextMeetingDate && items.length < 3) {
      const meetingDate = new Date(workspace.nextMeetingDate);
      const daysUntil = differenceInDays(meetingDate, new Date());
      if (daysUntil <= 7 && daysUntil >= 0) {
        items.push({
          id: 'meeting',
          label: t('yourWeek.upcomingSession'),
          description: format(meetingDate, 'EEEE, MMM d'),
          icon: <Calendar className="h-4 w-4" />,
          urgency: daysUntil <= 1 ? 'high' : 'low',
          action: t('yourWeek.prepare'),
          tab: 'sessions',
        });
      }
    }

    // If nothing urgent, show "all caught up"
    return items.slice(0, 3);
  }, [workspace, t]);

  const dueThisWeek = useMemo(() => {
    const items: { type: string; label: string }[] = [];
    
    if (workspace.nextMeetingDate && isThisWeek(new Date(workspace.nextMeetingDate))) {
      items.push({
        type: 'session',
        label: t('yourWeek.sessionThisWeek'),
      });
    }

    return items;
  }, [workspace, t]);

  const primaryAction = priorities[0];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t('yourWeek.title')}
          </CardTitle>
          {streakWeeks > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              {t('yourWeek.streak', { count: streakWeeks })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Priorities */}
        {priorities.length > 0 ? (
          <div className="space-y-2">
            {priorities.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                  item.urgency === 'high'
                    ? 'border-destructive/30 bg-destructive/5'
                    : item.urgency === 'medium'
                    ? 'border-amber-300/50 bg-amber-50/50 dark:border-amber-700/30 dark:bg-amber-900/10'
                    : 'border-border bg-muted/30'
                }`}
                onClick={() => navigate(`/workspace/${workspace.id}?tab=${item.tab}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    item.urgency === 'high'
                      ? 'bg-destructive/10 text-destructive'
                      : item.urgency === 'medium'
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                {t('yourWeek.allCaughtUp')}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                {t('yourWeek.greatWork')}
              </p>
            </div>
          </div>
        )}

        {/* Due This Week */}
        {dueThisWeek.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">{t('yourWeek.dueThisWeek')}</p>
            <div className="flex flex-wrap gap-2">
              {dueThisWeek.map((item, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Primary CTA */}
        {primaryAction && (
          <Button 
            className="w-full mt-2" 
            onClick={() => navigate(`/workspace/${workspace.id}?tab=${primaryAction.tab}`)}
          >
            {primaryAction.action}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}