import { memo, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FocusModeProvider, FocusModeToggle, useFocusMode } from '@/components/ui/FocusModeToggle';
import { 
  AlertCircle, 
  Calendar, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  BarChart3,
  Target,
  MessageSquare,
  Sparkles,
  Loader2,
  X,
  BookOpen,
} from 'lucide-react';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { UnifiedSmartInbox } from '@/components/dashboard/UnifiedSmartInbox';
import { toast } from 'sonner';
import { isToday, isThisWeek, format, differenceInDays, isPast } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkQueuePanel } from '@/components/staff/WorkQueuePanel';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { useCrmPipeline, PIPELINE_STAGES } from '@/hooks/useCrmPipeline';
import { useAuth } from '@/contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { WorkspaceWithDetails } from '@/hooks/useWorkspaces';
import { HealthScore } from '@/types/database';
import { FirstContactPrepSheet } from '@/components/consultor/FirstContactPrepSheet';

interface ConsultorDashboardProps {
  workspaces: WorkspaceWithDetails[];
  isLoading: boolean;
  programsCount: number;
}

interface RiskItem {
  workspace: WorkspaceWithDetails;
  reason: string;
  priority: 'critical' | 'high' | 'medium';
}

export const ConsultorDashboard = memo(function ConsultorDashboard({ workspaces, isLoading, programsCount }: ConsultorDashboardProps) {
  return (
    <FocusModeProvider defaultFocused={true}>
      <ConsultorDashboardInner workspaces={workspaces} isLoading={isLoading} programsCount={programsCount} />
    </FocusModeProvider>
  );
});


function ConsultorDashboardInner({ workspaces, isLoading, programsCount }: ConsultorDashboardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isFocused } = useFocusMode();
  const [prepSheetWorkspaceId, setPrepSheetWorkspaceId] = useState<string | null>(null);

  // Fetch CRM pipeline for snapshot
  const { data: pipeline } = useCrmPipeline({ 
    myItemsOnly: true, 
    currentUserId: user?.id 
  });

  // Calculate risk items - top 5 startups needing attention
  const riskItems = useMemo((): RiskItem[] => {
    if (!workspaces) return [];
    
    const items: RiskItem[] = [];
    const now = new Date();

    workspaces.forEach(w => {
      const health = w.health_score_override || w.health_score || 'stable';
      const daysSinceSession = w.lastSession?.scheduled_at 
        ? differenceInDays(now, new Date(w.lastSession.scheduled_at))
        : 999;

      // Critical health
      if (health === 'critical') {
        items.push({
          workspace: w,
          reason: t('consultor.risk.criticalHealth'),
          priority: 'critical',
        });
      }
      // At risk health
      else if (health === 'at_risk') {
        items.push({
          workspace: w,
          reason: t('consultor.risk.atRisk'),
          priority: 'high',
        });
      }
      // Overdue actions
      else if (w.overdueActionsCount > 0) {
        items.push({
          workspace: w,
          reason: t('consultor.risk.overdueActions', { count: w.overdueActionsCount }),
          priority: 'high',
        });
      }
      // No session in 30+ days
      else if (daysSinceSession > 30) {
        items.push({
          workspace: w,
          reason: t('consultor.risk.noRecentSession'),
          priority: 'medium',
        });
      }
      // Missing KPIs
      else if (!w.hasCurrentMonthKpi) {
        items.push({
          workspace: w,
          reason: t('consultor.risk.missingKpis'),
          priority: 'medium',
        });
      }
    });

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 5);
  }, [workspaces, t]);

  // Stats aggregation
  const stats = useMemo(() => {
    if (!workspaces) return null;

    const healthCounts = { critical: 0, at_risk: 0, stable: 0, healthy: 0, thriving: 0 };
    let upcomingMeetingsCount = 0;
    let meetingsTodayCount = 0;
    let overdueActionsCount = 0;
    let missingKpiCount = 0;

    workspaces.forEach(w => {
      const health = (w.health_score_override || w.health_score || 'stable') as keyof typeof healthCounts;
      if (health in healthCounts) healthCounts[health]++;

      if (w.nextMeetingDate && isThisWeek(new Date(w.nextMeetingDate))) upcomingMeetingsCount++;
      if (w.nextMeetingDate && isToday(new Date(w.nextMeetingDate))) meetingsTodayCount++;
      if (w.overdueActionsCount > 0) overdueActionsCount++;
      if (!w.hasCurrentMonthKpi) missingKpiCount++;
    });

    return {
      total: workspaces.length,
      healthCounts,
      upcomingMeetingsCount,
      meetingsTodayCount,
      overdueActionsCount,
      missingKpiCount,
      needsAttention: healthCounts.critical + healthCounts.at_risk,
    };
  }, [workspaces]);

  // Upcoming sessions (7 days)
  const upcomingSessions = useMemo(() => {
    if (!workspaces) return [];
    return workspaces
      .filter(w => w.nextMeetingDate && isThisWeek(new Date(w.nextMeetingDate)))
      .sort((a, b) => 
        new Date(a.nextMeetingDate!).getTime() - new Date(b.nextMeetingDate!).getTime()
      )
      .slice(0, 5);
  }, [workspaces]);

  // Overdue/blocked actions across all workspaces
  const criticalActions = useMemo(() => {
    if (!workspaces) return [];
    return workspaces
      .filter(w => w.overdueActionsCount > 0)
      .sort((a, b) => b.overdueActionsCount - a.overdueActionsCount)
      .slice(0, 5);
  }, [workspaces]);

  // Pipeline snapshot
  const pipelineSnapshot = useMemo(() => {
    if (!pipeline) return null;
    
    const newLeads = pipeline['new']?.length || 0;
    const contracted = pipeline['contracted']?.length || 0;
    const total = PIPELINE_STAGES.reduce((sum, stage) => sum + (pipeline[stage]?.length || 0), 0);
    
    // Find items with no next action
    const needsAction = PIPELINE_STAGES.reduce((count, stage) => {
      const items = pipeline[stage] || [];
      return count + items.filter(i => !i.next_action_at || isPast(new Date(i.next_action_at))).length;
    }, 0);

    return { newLeads, contracted, total, needsAction };
  }, [pipeline]);

  // Data quality alerts
  const dataAlerts = useMemo(() => {
    if (!workspaces) return [];
    
    const alerts: { type: string; count: number; message: string }[] = [];
    
    const noKpi = workspaces.filter(w => !w.hasCurrentMonthKpi).length;
    if (noKpi > 0) {
      alerts.push({
        type: 'kpi',
        count: noKpi,
        message: t('consultor.alerts.missingKpis', { count: noKpi }),
      });
    }

    const noSessionLong = workspaces.filter(w => {
      if (!w.lastSession?.scheduled_at) return true;
      return differenceInDays(new Date(), new Date(w.lastSession.scheduled_at)) > 30;
    }).length;
    
    if (noSessionLong > 0) {
      alerts.push({
        type: 'session',
        count: noSessionLong,
        message: t('consultor.alerts.noRecentSessions', { count: noSessionLong }),
      });
    }

    return alerts;
  }, [workspaces, t]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Smart Inbox */}
      <UnifiedSmartInbox
        overdueCount={stats.overdueActionsCount}
        missingKpiCount={stats.missingKpiCount}
      />

      {/* SECTION 0: Work Queue - ALWAYS VISIBLE for triage cockpit */}
      <WorkQueuePanel compact={false} />

      {/* SECTION 1: HERO - "Risco e Prioridades de Hoje" */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold leading-tight text-foreground">
              {t('consultor.hero.title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('consultor.hero.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FocusModeToggle />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/my-workspaces?filter=attention')}
              className="text-muted-foreground hover:text-foreground"
            >
              {t('common.viewAll')}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {riskItems.length === 0 ? (
          <Card className="border-health-healthy/30 bg-health-healthy/5 rounded-2xl">
            <CardContent className="flex items-center gap-3 py-5">
              <div className="h-10 w-10 rounded-full bg-health-healthy/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-health-healthy" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {t('consultor.hero.allClear')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('consultor.hero.noPriorities')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {riskItems.map((item) => {
              const health = (item.workspace.health_score_override || item.workspace.health_score) as HealthScore | null;
              return (
                <Card 
                  key={item.workspace.id}
                  className={`cursor-pointer transition-all hover:shadow-sm rounded-2xl border-border/60 border-l-2 ${
                    item.priority === 'critical' ? 'border-l-health-critical' :
                    item.priority === 'high' ? 'border-l-health-at-risk' :
                    'border-l-health-stable'
                  }`}
                  onClick={() => navigate(`/workspace/${item.workspace.id}`)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage src={item.workspace.startup?.logo_url || undefined} alt={item.workspace.startup?.name || 'Startup logo'} />
                        <AvatarFallback className="rounded-lg bg-muted text-muted-foreground text-xs font-semibold">
                          {item.workspace.startup?.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.workspace.startup?.name}</span>
                          {health && <HealthBadge score={health} size="sm" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-7 hidden sm:inline-flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrepSheetWorkspaceId(item.workspace.id);
                        }}
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        {t('consultor.prepSheet.button', { defaultValue: 'Preparar reunião' })}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-7 hidden sm:inline-flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workspace/${item.workspace.id}?tab=milestones`);
                        }}
                      >
                        <Target className="h-3 w-3 mr-1" />
                        {t('consultor.reviewMilestone', { defaultValue: 'Review' })}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workspace/${item.workspace.id}?tab=agenda`);
                        }}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {t('consultor.nudgeFounder', { defaultValue: 'Nudge' })}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: Stats Bar (Compact) - Max 4 visible on mobile */}
      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 rounded-2xl border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('dashboard.totalStartups')}</p>
              <p className="text-3xl font-semibold">{stats.total}</p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </Card>

        <Card 
          className={`p-4 rounded-2xl border-border/60 cursor-pointer transition-all hover:shadow-sm ${
            stats.needsAttention > 0 ? 'border-health-at-risk/30' : ''
          }`}
          onClick={() => navigate('/my-workspaces?filter=attention')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('dashboard.needsAttention')}</p>
              <p className={`text-3xl font-semibold ${stats.needsAttention > 0 ? 'text-health-at-risk' : ''}`}>
                {stats.needsAttention}
              </p>
            </div>
            <AlertCircle className={`h-5 w-5 ${stats.needsAttention > 0 ? 'text-health-at-risk/60' : 'text-muted-foreground/50'}`} />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('dashboard.meetingsThisWeek')}</p>
              <p className="text-3xl font-semibold">{stats.upcomingMeetingsCount}</p>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('dashboard.overdueActions')}</p>
              <p className={`text-3xl font-semibold ${stats.overdueActionsCount > 0 ? 'text-health-critical' : ''}`}>
                {stats.overdueActionsCount}
              </p>
            </div>
            <AlertTriangle className={`h-5 w-5 ${stats.overdueActionsCount > 0 ? 'text-health-critical/60' : 'text-muted-foreground/50'}`} />
          </div>
        </Card>
      </section>

      {/* Health Matrix - Visual grid showing R/Y/G per startup */}
      <Card className="p-4 rounded-2xl border-border/60">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('consultor.healthMatrix.title', { defaultValue: 'Portfolio Health Matrix' })}</p>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/my-workspaces')}>
            {t('common.viewAll')}
          </Button>
        </div>
        {/* Distribution bar */}
        <div className="flex gap-1 h-2.5 rounded-full overflow-hidden bg-muted/50 mb-4">
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
                    className={`${colors[health]} cursor-pointer transition-opacity hover:opacity-80`}
                    style={{ width: `${width}%`, minWidth: count > 0 ? '8px' : 0 }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <span>{t(`health.levels.${health}`)}: {count}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        {/* Startup tiles grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
          {workspaces.slice(0, 24).map(w => {
            const health = (w.health_score_override || w.health_score || 'stable') as string;
            const bgColors: Record<string, string> = {
              critical: 'bg-health-critical',
              at_risk: 'bg-health-at-risk',
              stable: 'bg-health-stable',
              healthy: 'bg-health-healthy',
              thriving: 'bg-health-thriving',
            };
            return (
              <Tooltip key={w.id}>
                <TooltipTrigger asChild>
                  <div 
                    className={`h-8 rounded-md cursor-pointer transition-all hover:scale-110 hover:shadow-sm flex items-center justify-center text-[9px] font-bold text-primary-foreground ${bgColors[health] || 'bg-muted'}`}
                    onClick={() => navigate(`/workspace/${w.id}`)}
                  >
                    {w.startup?.name?.slice(0, 2).toUpperCase()}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{w.startup?.name} — {t(`health.levels.${health}`)}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </Card>

      {/* SECTION 3: Main Grid - Pipeline (Primary) + Agenda + Actions */}
      {/* UX EMPHASIS: CRM Pipeline is NOW FIRST for consultants - their main operational view */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pipeline Snapshot - NOW PRIMARY for Consultants */}
        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {t('consultor.pipeline.title')}
              </CardTitle>
              <Button 
                variant="default" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => navigate('/crm')}
              >
                {t('consultor.pipeline.open')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!pipelineSnapshot ? (
              <div className="text-center py-6">
                <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t('consultor.pipeline.empty')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-background/80">
                    <p className="text-2xl font-bold">{pipelineSnapshot.total}</p>
                    <p className="text-xs text-muted-foreground">{t('consultor.pipeline.totalLeads')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-health-healthy/10">
                    <p className="text-2xl font-bold text-health-healthy">{pipelineSnapshot.contracted}</p>
                    <p className="text-xs text-muted-foreground">{t('consultor.pipeline.contracted')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('consultor.pipeline.newLeads')}</span>
                  <Badge variant="secondary">{pipelineSnapshot.newLeads}</Badge>
                </div>
                {pipelineSnapshot.needsAction > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-health-at-risk/10 border border-health-at-risk/30">
                    <AlertCircle className="h-4 w-4 text-health-at-risk" />
                    <span className="text-xs text-health-at-risk">
                      {t('consultor.pipeline.needsAction', { count: pipelineSnapshot.needsAction })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agenda (7 dias) */}
        <Card className="rounded-2xl border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t('consultor.agenda.title')}
              </CardTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">{upcomingSessions.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t('consultor.agenda.empty')}
                </p>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate('/my-workspaces')}
                >
                  {t('consultor.agenda.schedule')}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingSessions.map(w => (
                  <div
                    key={w.id}
                    className="relative flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/workspace/${w.id}?tab=agenda`)}
                  >
                    <Avatar className="h-7 w-7 rounded">
                      <AvatarImage src={w.startup?.logo_url || undefined} alt={w.startup?.name || 'Startup logo'} />
                      <AvatarFallback className="rounded bg-primary/10 text-primary text-[10px] font-semibold">
                        {w.startup?.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{w.startup?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(w.nextMeetingDate!), "EEE, d MMM 'às' HH:mm", { locale: pt })}
                      </p>
                    </div>
                    <AiBriefingButton workspaceId={w.id} />
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      {t('consultor.agenda.prep')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações Críticas */}
        <Card className="rounded-2xl border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-health-at-risk" />
                {t('consultor.actions.title')}
              </CardTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full border-health-critical/30 text-health-critical bg-health-critical/10">{criticalActions.reduce((sum, w) => sum + w.overdueActionsCount, 0)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {criticalActions.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-8 w-8 text-health-healthy/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t('consultor.actions.allClear')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {criticalActions.map(w => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border-l-2 border-l-health-critical"
                    onClick={() => navigate(`/workspace/${w.id}?tab=actions`)}
                  >
                    <Avatar className="h-7 w-7 rounded">
                      <AvatarImage src={w.startup?.logo_url || undefined} alt={w.startup?.name || 'Startup logo'} />
                      <AvatarFallback className="rounded bg-primary/10 text-primary text-[10px] font-semibold">
                        {w.startup?.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{w.startup?.name}</p>
                      <p className="text-xs text-health-critical">
                        {t('consultor.actions.overdueCount', { count: w.overdueActionsCount })}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      {t('consultor.actions.resolve')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION 4: Weekly Impact Summary - Hidden in Focus mode */}
      {!isFocused && (
        <section>
          {/* Weekly Impact Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t('consultor.weeklyImpact.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{upcomingSessions.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('consultor.weeklyImpact.sessionsCompleted')}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{criticalActions.reduce((sum, w) => sum + w.overdueActionsCount, 0)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('consultor.weeklyImpact.actionsCreated')}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-health-healthy/10">
                  <p className="text-2xl font-bold text-health-healthy">{pipelineSnapshot?.contracted || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('consultor.weeklyImpact.leadsConverted')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* SECTION 5: Data Quality Alerts - Hidden in Focus mode */}
      {!isFocused && dataAlerts.length > 0 && (
        <section>
          <Card className="border-health-at-risk/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-health-at-risk" />
                {t('consultor.dataQuality.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {dataAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-health-at-risk/5">
                    <div className="flex items-center gap-2">
                      {alert.type === 'kpi' ? (
                        <TrendingUp className="h-4 w-4 text-health-at-risk" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-health-at-risk" />
                      )}
                      <span className="text-sm">{alert.message}</span>
                    </div>
                    <Badge variant="outline" className="text-health-at-risk border-health-at-risk/30">
                      {alert.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* SECTION 6: Calendar - Hidden in Focus mode */}
      {!isFocused && (
        <section>
          <CalendarWidget />
        </section>
      )}

      {/* First Contact Prep Sheet */}
      {prepSheetWorkspaceId && (
        <FirstContactPrepSheet
          open={!!prepSheetWorkspaceId}
          onOpenChange={(open) => { if (!open) setPrepSheetWorkspaceId(null); }}
          workspaceId={prepSheetWorkspaceId}
        />
      )}
    </div>
  );
}

/** Inline AI Briefing button — calls generate-relationship-recap for a workspace */
function AiBriefingButton({ workspaceId }: { workspaceId: string }) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [recap, setRecap] = useState<{ summary: string; key_points: string[]; next_best_actions: string[] } | null>(null);
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [cooldownSec, setCooldownSec] = useState(0);

  // Cooldown ticker
  useEffect(() => {
    if (!cooldownEnd) { setCooldownSec(0); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
      setCooldownSec(left);
      if (left <= 0) setCooldownEnd(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownEnd]);

  const handleGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cooldownSec > 0) return;
    setLoading(true);
    try {
      const { data, error } = await invokeWithAuth('generate-relationship-recap', {
        body: { workspace_id: workspaceId, language: i18n.language === 'pt' ? 'pt' : 'en' },
      });
      if (error) throw error;
      setRecap(data as any);
      setCooldownEnd(Date.now() + 60000); // 60s cooldown
    } catch {
      toast.error(t('consultor.aiBriefing.error', { defaultValue: 'Could not generate briefing.' }));
    } finally {
      setLoading(false);
    }
  };

  if (recap) {
    return (
      <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-sm rounded-md p-3 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            {t('consultor.aiBriefing.title', { defaultValue: '30-Day Briefing' })}
          </span>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setRecap(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{recap.summary}</p>
        {recap.key_points?.length > 0 && (
          <ul className="text-xs space-y-1 mb-2">
            {recap.key_points.slice(0, 3).map((p, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
        {recap.next_best_actions?.length > 0 && (
          <div className="border-t pt-1.5 mt-1.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">{t('consultor.aiBriefing.nextActions', { defaultValue: 'Next Actions' })}</span>
            <ul className="text-xs space-y-0.5 mt-0.5">
              {recap.next_best_actions.slice(0, 2).map((a, i) => (
                <li key={i} className="text-muted-foreground">→ {a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs h-7 gap-1"
      onClick={handleGenerate}
      disabled={loading || cooldownSec > 0}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      {cooldownSec > 0
        ? `${cooldownSec}s`
        : t('consultor.aiBriefing.cta', { defaultValue: 'Briefing' })}
    </Button>
  );
}
