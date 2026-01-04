import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  AlertCircle, 
  Calendar, 
  TrendingUp, 
  Users, 
  Clock,
  AlertTriangle,
  ArrowRight,
  Activity,
  ClipboardList,
  Zap,
} from 'lucide-react';
import { isToday, isThisWeek, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { StaffTasksPanel } from '@/components/staff/StaffTasksPanel';
import { WorkQueuePanel } from '@/components/staff/WorkQueuePanel';
import { TriageWorkspaceList } from '@/components/staff/TriageWorkspaceList';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { PendingTemplateReviews } from '@/components/dashboard/PendingTemplateReviews';
import { PendingCheckinsPanel } from '@/components/checkins/PendingCheckinsPanel';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';

import { CockpitQuickActions } from '@/components/staff/CockpitQuickActions';
import { IntegrationErrorsPanel } from '@/components/admin/IntegrationErrorsPanel';
import { WorkspaceWithDetails } from '@/hooks/useWorkspaces';
import { HealthScore } from '@/types/database';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConsultorDashboardProps {
  workspaces: WorkspaceWithDetails[];
  isLoading: boolean;
  programsCount: number;
}

export function ConsultorDashboard({ workspaces, isLoading, programsCount }: ConsultorDashboardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const stats = useMemo(() => {
    if (!workspaces) return null;

    const healthCounts = {
      critical: 0,
      at_risk: 0,
      stable: 0,
      healthy: 0,
      thriving: 0,
    };

    let upcomingMeetingsCount = 0;
    let meetingsTodayCount = 0;
    let needsAttentionCount = 0;
    let overdueCount = 0;
    let missingKpiCount = 0;

    workspaces.forEach(w => {
      const health = w.health_score_override || w.health_score || 'stable';
      if (health in healthCounts) {
        healthCounts[health as keyof typeof healthCounts]++;
      }

      if (w.nextMeetingDate && isThisWeek(new Date(w.nextMeetingDate))) {
        upcomingMeetingsCount++;
      }

      if (w.nextMeetingDate && isToday(new Date(w.nextMeetingDate))) {
        meetingsTodayCount++;
      }

      if (health === 'critical' || health === 'at_risk') {
        needsAttentionCount++;
      }

      if (w.overdueActionsCount > 0) {
        overdueCount++;
      }

      if (!w.hasCurrentMonthKpi) {
        missingKpiCount++;
      }
    });

    return {
      total: workspaces.length,
      healthCounts,
      upcomingMeetingsCount,
      meetingsTodayCount,
      needsAttentionCount,
      overdueCount,
      missingKpiCount,
    };
  }, [workspaces]);

  // Get startups needing immediate attention
  const attentionStartups = useMemo(() => {
    if (!workspaces) return [];
    return workspaces
      .filter(w => {
        const health = w.health_score_override || w.health_score;
        return health === 'critical' || health === 'at_risk' || w.overdueActionsCount > 0;
      })
      .sort((a, b) => {
        const aHealth = a.health_score_override || a.health_score || 'stable';
        const bHealth = b.health_score_override || b.health_score || 'stable';
        if (aHealth === 'critical' && bHealth !== 'critical') return -1;
        if (bHealth === 'critical' && aHealth !== 'critical') return 1;
        return b.overdueActionsCount - a.overdueActionsCount;
      })
      .slice(0, 5);
  }, [workspaces]);

  // Get today's meetings
  const todaysMeetings = useMemo(() => {
    if (!workspaces) return [];
    return workspaces
      .filter(w => w.nextMeetingDate && isToday(new Date(w.nextMeetingDate)))
      .sort((a, b) => 
        new Date(a.nextMeetingDate!).getTime() - new Date(b.nextMeetingDate!).getTime()
      );
  }, [workspaces]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Compact Stats Bar */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.totalStartups')}</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            stats.needsAttentionCount > 0 ? 'border-amber-300 dark:border-amber-700' : ''
          }`}
          onClick={() => navigate('/my-workspaces?filter=attention')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.needsAttention')}</p>
              <p className={`text-2xl font-bold ${stats.needsAttentionCount > 0 ? 'text-amber-600' : ''}`}>
                {stats.needsAttentionCount}
              </p>
            </div>
            <AlertCircle className={`h-5 w-5 ${stats.needsAttentionCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.meetingsThisWeek')}</p>
              <p className="text-2xl font-bold">{stats.upcomingMeetingsCount}</p>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.overdueActions')}</p>
              <p className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-destructive' : ''}`}>
                {stats.overdueCount}
              </p>
            </div>
            <ClipboardList className={`h-5 w-5 ${stats.overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </div>
        </Card>

        <Card className="p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground mb-2">{t('dashboard.healthDistribution')}</p>
          <div className="flex gap-1 h-4">
            {Object.entries(stats.healthCounts).map(([health, count]) => {
              if (count === 0) return null;
              const colors: Record<string, string> = {
                critical: 'bg-health-critical',
                at_risk: 'bg-health-at-risk',
                stable: 'bg-health-stable',
                healthy: 'bg-health-healthy',
                thriving: 'bg-health-thriving',
              };
              const width = (count / stats.total) * 100;
              return (
                <Tooltip key={health}>
                  <TooltipTrigger asChild>
                    <div 
                      className={`${colors[health]} rounded cursor-pointer transition-all hover:opacity-80`}
                      style={{ width: `${width}%`, minWidth: count > 0 ? '8px' : 0 }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>{t(`health.${health}`)}: {count}</span>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Primary Action Area: Work Queue + Urgent Items */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <WorkQueuePanel compact />
          
          {/* Today's Meetings - Only show if there are any */}
          {todaysMeetings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{t('dashboard.todaysMeetings')}</CardTitle>
                  <Badge variant="secondary" className="ml-auto">{todaysMeetings.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {todaysMeetings.slice(0, 4).map(workspace => (
                    <div
                      key={workspace.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/workspace/${workspace.id}`)}
                    >
                      <Avatar className="h-8 w-8 rounded-md">
                        <AvatarImage src={workspace.startup?.logo_url || undefined} />
                        <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs font-semibold">
                          {workspace.startup?.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{workspace.startup?.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(workspace.nextMeetingDate!), 'h:mm a')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar: Quick Actions + Quick Glance */}
        <div className="space-y-4">
          <CockpitQuickActions workspaces={workspaces} />
          <StaffTasksPanel compact />
          <IntegrationErrorsPanel compact />
        </div>
      </div>

      {/* Secondary: Triage List (collapsible feel) */}
      <TriageWorkspaceList 
        workspaces={workspaces.map(w => ({
          id: w.id,
          startup_id: w.startup_id,
          program_id: w.program_id,
          stage: w.stage,
          health_score: null,
          health_label: (w.health_score_override || w.health_score) as HealthScore | null,
          created_at: w.created_at,
          updated_at: w.updated_at,
          startup: w.startup,
          program: w.program,
          overdue_actions_count: w.overdueActionsCount,
          last_session_date: w.lastSession?.scheduled_at || null,
          next_session_date: w.nextMeetingDate || null,
          top_overdue_action: undefined,
          missing_kpis_count: w.hasCurrentMonthKpi ? 0 : 1,
        }))}
        onScheduleSession={(workspaceId) => navigate(`/workspace/${workspaceId}?tab=sessions`)}
        onMessage={(workspaceId) => navigate(`/workspace/${workspaceId}?tab=notes`)}
      />

      {/* Bottom Grid: Calendar + Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CalendarWidget />
        <ActivityFeed />
      </div>
    </div>
  );
}
