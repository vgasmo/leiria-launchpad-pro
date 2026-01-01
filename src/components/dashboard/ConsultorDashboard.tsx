import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  Calendar, 
  TrendingUp, 
  Users, 
  Clock,
  AlertTriangle,
  ArrowRight,
  Activity,
  ClipboardList
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
import { PendingTemplateReviews } from '@/components/dashboard/PendingTemplateReviews';
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
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Startups
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Across {programsCount} program{programsCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`animate-fade-in cursor-pointer transition-shadow hover:shadow-md ${
            stats.needsAttentionCount > 0 
              ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20' 
              : ''
          }`}
          onClick={() => navigate('/my-workspaces?filter=attention')}
          style={{ animationDelay: '50ms' }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs Attention
            </CardTitle>
            <AlertCircle className={`h-4 w-4 ${stats.needsAttentionCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.needsAttentionCount > 0 ? 'text-amber-600' : ''}`}>
              {stats.needsAttentionCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Critical or at-risk startups
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Meetings This Week
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingMeetingsCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.meetingsTodayCount} scheduled for today
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '150ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Health Distribution
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 h-6">
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
                        className={`${colors[health]} rounded h-full cursor-pointer transition-all hover:opacity-80`}
                        style={{ width: `${width}%`, minWidth: count > 0 ? '8px' : 0 }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="capitalize">{health.replace('_', ' ')}: {count}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
              {stats.healthCounts.healthy + stats.healthCounts.thriving > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-health-healthy" />
                  {stats.healthCounts.healthy + stats.healthCounts.thriving} healthy
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reviews & Tasks Section */}
      <div className="grid gap-6 lg:grid-cols-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <PendingTemplateReviews showEmpty />
        <StaffTasksPanel />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Needs Attention Column */}
        <Card className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '250ms' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle>Needs Attention</CardTitle>
            </div>
            {attentionStartups.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-workspaces?filter=attention')}>
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {attentionStartups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">All startups are on track!</p>
                <p className="text-sm">No critical issues at the moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attentionStartups.map(workspace => {
                  const health = workspace.health_score_override || workspace.health_score;
                  return (
                    <div
                      key={workspace.id}
                      className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/workspace/${workspace.id}`)}
                    >
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage src={workspace.startup?.logo_url || undefined} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                          {workspace.startup?.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{workspace.startup?.name}</h4>
                          <HealthBadge score={health as HealthScore | null} size="sm" />
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{workspace.program?.name}</span>
                          {workspace.overdueActionsCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {workspace.overdueActionsCount} overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                      <StageBadge stage={workspace.stage} size="sm" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <ActivityFeed />
        </div>
      </div>

      {/* Today's Meetings */}
      {todaysMeetings.length > 0 && (
        <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Today's Meetings</CardTitle>
              <Badge variant="secondary">{todaysMeetings.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {todaysMeetings.map(workspace => (
                <div
                  key={workspace.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/workspace/${workspace.id}`)}
                >
                  <Avatar className="h-10 w-10 rounded-lg">
                    <AvatarImage src={workspace.startup?.logo_url || undefined} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                      {workspace.startup?.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{workspace.startup?.name}</h4>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(workspace.nextMeetingDate!), 'h:mm a')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
