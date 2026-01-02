import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Zap, 
  TrendingUp, 
  CheckCircle2, 
  ClipboardList, 
  Calendar, 
  Shield,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspaceActions, useWorkspaceKpis, useWorkspaceNextSession } from '@/hooks/useWorkspaceData';
import { usePendingCheckin } from '@/hooks/useCheckins';
import { format, isThisMonth } from 'date-fns';

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
        title: `${overdueActions.length} overdue action${overdueActions.length > 1 ? 's' : ''}`,
        description: 'Complete or reschedule these tasks',
        icon: <AlertTriangle className="h-5 w-5" />,
        variant: 'destructive',
        action: () => setSearchParams({ tab: 'actions' }),
        actionLabel: 'View Actions',
      });
    }

    // Check for pending check-in
    if (pendingCheckin) {
      items.push({
        id: 'pending-checkin',
        type: 'checkin',
        priority: 2,
        title: 'Weekly check-in pending',
        description: `Due ${format(new Date(pendingCheckin.due_date), 'EEEE')}`,
        icon: <ClipboardList className="h-5 w-5" />,
        variant: 'warning',
        action: () => setSearchParams({ tab: 'overview' }),
        actionLabel: 'Complete Check-in',
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
        title: 'Update KPIs for this month',
        description: 'Track your progress with latest metrics',
        icon: <TrendingUp className="h-5 w-5" />,
        variant: 'warning',
        action: () => setSearchParams({ tab: 'kpis' }),
        actionLabel: 'Add KPIs',
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
          title: 'Prepare for upcoming session',
          description: `${nextSession.title} on ${format(sessionDate, 'EEE, MMM d')}`,
          icon: <Calendar className="h-5 w-5" />,
          variant: 'default',
          action: () => setSearchParams({ tab: 'sessions' }),
          actionLabel: 'View Session',
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
        title: `${inProgressActions.length} action${inProgressActions.length > 1 ? 's' : ''} in progress`,
        description: inProgressActions[0]?.title || 'Continue your work',
        icon: <CheckCircle2 className="h-5 w-5" />,
        variant: 'default',
        action: () => setSearchParams({ tab: 'actions' }),
        actionLabel: 'Continue',
      });
    }

    // Sort by priority and return top 3
    return items.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [actions, kpiData, nextSession, pendingCheckin, setSearchParams]);

  if (nextActions.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">All caught up!</h3>
              <p className="text-sm text-green-700 dark:text-green-300">No urgent actions needed right now.</p>
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
          Next Best Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {nextActions.map((item) => (
          <div 
            key={item.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              item.variant === 'destructive' 
                ? 'border-destructive/30 bg-destructive/5' 
                : item.variant === 'warning'
                ? 'border-amber-300/50 bg-amber-50/50 dark:border-amber-700/30 dark:bg-amber-900/10'
                : 'border-border bg-muted/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                item.variant === 'destructive' 
                  ? 'bg-destructive/10 text-destructive' 
                  : item.variant === 'warning'
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
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
