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
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  BarChart3,
  Target,
  MessageSquare,
} from 'lucide-react';
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

export function ConsultorDashboard({ workspaces, isLoading, programsCount }: ConsultorDashboardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

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
    const now = new Date();
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
    <div className="space-y-6">
      {/* SECTION 1: HERO - "Risco e Prioridades de Hoje" */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t('consultor.hero.title', 'Risco e Prioridades de Hoje')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('consultor.hero.subtitle', 'Startups que precisam da sua atenção imediata')}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/my-workspaces?filter=attention')}
          >
            {t('consultor.hero.viewAll', 'Ver Todas')}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {riskItems.length === 0 ? (
          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  {t('consultor.hero.allClear', 'Tudo sob controlo!')}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {t('consultor.hero.noPriorities', 'Nenhuma startup em estado crítico ou de risco.')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {riskItems.map((item) => {
              const health = item.workspace.health_score_override || item.workspace.health_score;
              return (
                <Card 
                  key={item.workspace.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    item.priority === 'critical' ? 'border-l-4 border-l-destructive' :
                    item.priority === 'high' ? 'border-l-4 border-l-amber-500' :
                    'border-l-4 border-l-blue-400'
                  }`}
                  onClick={() => navigate(`/workspace/${item.workspace.id}`)}
                >
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 rounded">
                        <AvatarImage src={item.workspace.startup?.logo_url || undefined} />
                        <AvatarFallback className="rounded bg-primary/10 text-primary text-xs font-semibold">
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
                    <Button variant="ghost" size="sm" className="shrink-0">
                      {t('consultor.hero.openWorkspace', 'Abrir')}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: Stats Bar (Compact) */}
      <section className="grid gap-2 grid-cols-2 lg:grid-cols-5">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.totalStartups')}</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>

        <Card 
          className={`p-3 cursor-pointer transition-all hover:shadow-md ${
            stats.needsAttention > 0 ? 'border-amber-300 dark:border-amber-700' : ''
          }`}
          onClick={() => navigate('/my-workspaces?filter=attention')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.needsAttention')}</p>
              <p className={`text-xl font-bold ${stats.needsAttention > 0 ? 'text-amber-600' : ''}`}>
                {stats.needsAttention}
              </p>
            </div>
            <AlertCircle className={`h-4 w-4 ${stats.needsAttention > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.meetingsThisWeek')}</p>
              <p className="text-xl font-bold">{stats.upcomingMeetingsCount}</p>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.overdueActions')}</p>
              <p className={`text-xl font-bold ${stats.overdueActionsCount > 0 ? 'text-destructive' : ''}`}>
                {stats.overdueActionsCount}
              </p>
            </div>
            <AlertTriangle className={`h-4 w-4 ${stats.overdueActionsCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </div>
        </Card>

        <Card className="p-3 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground mb-1.5">{t('dashboard.healthDistribution')}</p>
          <div className="flex gap-1 h-3">
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
      </section>

      {/* SECTION 3: Main Grid - Agenda + Actions + Pipeline */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agenda (7 dias) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t('consultor.agenda.title', 'Agenda (7 dias)')}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">{upcomingSessions.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t('consultor.agenda.empty', 'Sem sessões agendadas')}
                </p>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate('/my-workspaces')}
                >
                  {t('consultor.agenda.schedule', 'Agendar sessão')}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingSessions.map(w => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/workspace/${w.id}?tab=sessions`)}
                  >
                    <Avatar className="h-7 w-7 rounded">
                      <AvatarImage src={w.startup?.logo_url || undefined} />
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
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      {t('consultor.agenda.prep', 'Prep')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações Críticas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {t('consultor.actions.title', 'Ações Críticas')}
              </CardTitle>
              <Badge variant="destructive" className="text-xs">{criticalActions.reduce((sum, w) => sum + w.overdueActionsCount, 0)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {criticalActions.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-8 w-8 text-green-500/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t('consultor.actions.allClear', 'Sem ações atrasadas')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {criticalActions.map(w => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border-l-2 border-l-destructive"
                    onClick={() => navigate(`/workspace/${w.id}?tab=actions`)}
                  >
                    <Avatar className="h-7 w-7 rounded">
                      <AvatarImage src={w.startup?.logo_url || undefined} />
                      <AvatarFallback className="rounded bg-primary/10 text-primary text-[10px] font-semibold">
                        {w.startup?.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{w.startup?.name}</p>
                      <p className="text-xs text-destructive">
                        {t('consultor.actions.overdueCount', '{{count}} ação atrasada', { count: w.overdueActionsCount })}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      {t('consultor.actions.resolve', 'Resolver')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {t('consultor.pipeline.title', 'Pipeline (CRM)')}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => navigate('/crm')}
              >
                {t('consultor.pipeline.open', 'Abrir CRM')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!pipelineSnapshot ? (
              <div className="text-center py-6">
                <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t('consultor.pipeline.empty', 'Sem dados de pipeline')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{pipelineSnapshot.total}</p>
                    <p className="text-xs text-muted-foreground">{t('consultor.pipeline.totalLeads', 'Leads ativos')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <p className="text-2xl font-bold text-green-600">{pipelineSnapshot.contracted}</p>
                    <p className="text-xs text-muted-foreground">{t('consultor.pipeline.contracted', 'Contratados')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('consultor.pipeline.newLeads', 'Novos leads')}</span>
                  <Badge variant="secondary">{pipelineSnapshot.newLeads}</Badge>
                </div>
                {pipelineSnapshot.needsAction > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-xs text-amber-700 dark:text-amber-300">
                      {t('consultor.pipeline.needsAction', '{{count}} leads precisam de ação', { count: pipelineSnapshot.needsAction })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION 4: Work Queue */}
      <section>
        <WorkQueuePanel compact />
      </section>

      {/* SECTION 5: Data Quality Alerts */}
      {dataAlerts.length > 0 && (
        <section>
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" />
                {t('consultor.dataQuality.title', 'Alertas de Qualidade de Dados')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {dataAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2">
                      {alert.type === 'kpi' ? (
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-amber-600" />
                      )}
                      <span className="text-sm">{alert.message}</span>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      {alert.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* SECTION 6: Calendar */}
      <section>
        <CalendarWidget />
      </section>
    </div>
  );
}
