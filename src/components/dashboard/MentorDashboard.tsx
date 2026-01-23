import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Clock,
  FileText,
  Briefcase,
  Users,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { MentorNextSessionPrep } from '@/components/dashboard/MentorNextSessionPrep';
import { WorkspaceWithDetails } from '@/hooks/useWorkspaces';
import { HealthScore } from '@/types/database';

interface MentorDashboardProps {
  workspaces: WorkspaceWithDetails[];
  isLoading: boolean;
}

/**
 * Gold-Standard Mentor Dashboard - "Mentor Companion" OS
 * Focused on session prep, context, and impact - NO staff panels
 */
export function MentorDashboard({ workspaces, isLoading }: MentorDashboardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Sort by next meeting for relationship depth
  const sortedWorkspaces = useMemo(() => {
    if (!workspaces) return [];
    return [...workspaces].sort((a, b) => {
      if (a.nextMeetingDate && !b.nextMeetingDate) return -1;
      if (!a.nextMeetingDate && b.nextMeetingDate) return 1;
      if (a.nextMeetingDate && b.nextMeetingDate) {
        return new Date(a.nextMeetingDate).getTime() - new Date(b.nextMeetingDate).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [workspaces]);

  // Get upcoming meetings this week
  const upcomingMeetings = useMemo(() => {
    if (!workspaces) return [];
    return workspaces
      .filter(w => w.nextMeetingDate)
      .sort((a, b) => 
        new Date(a.nextMeetingDate!).getTime() - new Date(b.nextMeetingDate!).getTime()
      )
      .slice(0, 5);
  }, [workspaces]);

  // Calculate mentor impact stats
  const impactStats = useMemo(() => {
    if (!workspaces) return { sessionsCompleted: 0, actionsCreated: 0, healthyCount: 0 };
    
    const healthyCount = workspaces.filter(w => {
      const health = w.health_score_override || w.health_score;
      return health === 'healthy' || health === 'thriving';
    }).length;
    
    return {
      sessionsCompleted: workspaces.filter(w => w.lastSession).length,
      actionsCreated: workspaces.reduce((sum, w) => sum + w.pendingActionsCount, 0),
      healthyCount,
    };
  }, [workspaces]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4">
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty state - guide to connection requests
  if (workspaces.length === 0) {
    return (
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <CardContent className="relative p-8 md:p-12 text-center">
          <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-6">
            <Briefcase className="h-10 w-10 text-primary" />
          </div>
          <h3 className="font-heading text-xl md:text-2xl font-bold mb-3">
            {t('mentor.welcomeTitle', 'Bem-vindo ao Painel de Mentor')}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {t('mentor.noStartupsAssignedDesc', 'Ainda não tens startups atribuídas. Verifica os pedidos de conexão ou aguarda que te sejam atribuídas startups.')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={() => navigate('/mentors')} className="gap-2">
              <Users className="h-4 w-4" />
              {t('mentor.viewConnectionRequests', 'Ver Pedidos de Conexão')}
            </Button>
            <Button variant="outline" onClick={() => navigate('/settings')}>
              {t('mentor.updateAvailability', 'Atualizar Disponibilidade')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* P0 HERO: Next Session Prep - Only shows when session is within 24h */}
      <MentorNextSessionPrep workspaces={workspaces} />

      {/* Quick Stats - Mentor-focused, calmer design */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="p-4 rounded-2xl border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('mentor.myStartups')}</p>
              <p className="text-3xl font-semibold">{workspaces.length}</p>
            </div>
            <Briefcase className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('mentor.upcomingMeetings')}</p>
              <p className="text-3xl font-semibold">{upcomingMeetings.length}</p>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground/50" />
          </div>
          {workspaces.filter(w => w.nextMeetingDate && isToday(new Date(w.nextMeetingDate))).length > 0 && (
            <p className="text-xs text-primary mt-1">
              {workspaces.filter(w => w.nextMeetingDate && isToday(new Date(w.nextMeetingDate))).length} {t('common.today')}
            </p>
          )}
        </Card>

        <Card className="p-4 rounded-2xl border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('mentor.startupsHealthy')}</p>
              <p className="text-3xl font-semibold text-health-healthy">{impactStats.healthyCount}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-health-healthy/50" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('mentor.pendingActions')}</p>
              <p className="text-3xl font-semibold">{impactStats.actionsCreated}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </Card>
      </div>

      {/* Two-column layout: Startups + Calendar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Startup Cards - Main focus */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('mentor.myStartups')}</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/mentors')} className="gap-1 text-xs text-muted-foreground hover:text-foreground">
              {t('mentor.manageConnections')}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          <div className="grid gap-3">
            {sortedWorkspaces.map((workspace) => {
              const health = workspace.health_score_override || workspace.health_score;
              const hasUpcomingMeeting = workspace.nextMeetingDate && isToday(new Date(workspace.nextMeetingDate));
              
              return (
                <Card 
                  key={workspace.id}
                  className={`cursor-pointer transition-all hover:shadow-sm rounded-2xl border-border/60 ${
                    hasUpcomingMeeting ? 'border-primary/30 bg-primary/5' : ''
                  }`}
                  onClick={() => navigate(`/workspace/${workspace.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <Avatar className="h-12 w-12 rounded-xl shrink-0">
                        <AvatarImage src={workspace.startup?.logo_url || undefined} className="object-cover" alt={workspace.startup?.name || 'Startup logo'} />
                        <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold">
                          {workspace.startup?.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{workspace.startup?.name}</h3>
                          <HealthBadge score={health as HealthScore | null} size="sm" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <StageBadge stage={workspace.stage} size="sm" />
                          {workspace.lastSession && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {t('mentor.lastSession', 'Última sessão')}: {formatDistanceToNow(new Date(workspace.lastSession.scheduled_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Next meeting indicator */}
                      <div className="text-right shrink-0">
                        {workspace.nextMeetingDate ? (
                          <div className={hasUpcomingMeeting ? 'text-primary' : 'text-muted-foreground'}>
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <Calendar className="h-3.5 w-3.5" />
                              {hasUpcomingMeeting
                                ? format(new Date(workspace.nextMeetingDate), 'HH:mm')
                                : format(new Date(workspace.nextMeetingDate), 'dd MMM')
                              }
                            </div>
                            {hasUpcomingMeeting && (
                              <Badge variant="default" className="text-[10px] mt-1">
                                {t('common.today', 'Hoje')}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/workspace/${workspace.id}?tab=sessions`);
                            }}
                          >
                            {t('mentor.scheduleSession', 'Agendar')}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Pending actions indicator */}
                    {workspace.pendingActionsCount > 0 && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {workspace.pendingActionsCount} {t('mentor.pendingActionsCount', 'ações pendentes')}
                        </span>
                        {workspace.overdueActionsCount > 0 && (
                          <Badge variant="outline" className="text-[10px] border-destructive/50 text-destructive">
                            {workspace.overdueActionsCount} {t('common.overdue', 'atrasadas')}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Calendar Widget - Compact */}
        <div className="space-y-4">
          <CalendarWidget />
          
          {/* Your Impact Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t('mentor.yourImpact', 'O Teu Impacto')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('mentor.startupsSupported', 'Startups apoiadas')}</span>
                  <span className="font-semibold">{workspaces.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('mentor.sessionsHeld', 'Sessões realizadas')}</span>
                  <span className="font-semibold">{impactStats.sessionsCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('mentor.healthyStartups', 'Startups saudáveis')}</span>
                  <span className="font-semibold text-success">{impactStats.healthyCount}/{workspaces.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
