import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  Target,
  Clock,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Plus,
  Rocket,
  FileText,
  AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isPast } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkspaceWithDetails, PendingWorkspace } from '@/hooks/useWorkspaces';
import { HealthScore } from '@/types/database';

interface FounderDashboardProps {
  workspaces: WorkspaceWithDetails[];
  pendingWorkspaces: PendingWorkspace[];
  isLoading: boolean;
  onCreateStartup: () => void;
}

export function FounderDashboard({ 
  workspaces, 
  pendingWorkspaces,
  isLoading, 
  onCreateStartup 
}: FounderDashboardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Get the primary workspace (founders typically have 1)
  const workspace = workspaces[0];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending state
  if (pendingWorkspaces.length > 0 && workspaces.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
                  {t('founder.applicationUnderReview')}
                </h3>
                <p className="text-amber-700 dark:text-amber-300 mb-4">
                  {t('founder.applicationBeingReviewed')}
                </p>
                
                <div className="space-y-3">
                  {pendingWorkspaces.map(pw => (
                    <div key={pw.id} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-background/50 rounded-lg">
                      <Rocket className="h-5 w-5 text-amber-600" />
                      <div className="flex-1">
                        <span className="font-medium">{pw.startup?.name}</span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{pw.program?.name}</Badge>
                          <span>•</span>
                          <StageBadge stage={pw.stage} size="sm" />
                        </div>
                      </div>
                      <Badge variant="secondary">{t('founder.pending')}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center text-muted-foreground">
          <p>{t('founder.responseTime')}</p>
        </div>
      </div>
    );
  }

  // No workspace yet
  if (!workspace) {
    return (
      <Card className="p-12 text-center">
        <Rocket className="h-16 w-16 mx-auto text-primary mb-6" />
        <h3 className="text-2xl font-bold mb-2">{t('founder.startYourJourney')}</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {t('founder.startYourJourneyDesc')}
        </p>
        <Button size="lg" onClick={onCreateStartup}>
          <Plus className="mr-2 h-5 w-5" />
          {t('founder.createYourStartup')}
        </Button>
      </Card>
    );
  }

  const health = workspace.health_score_override || workspace.health_score;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Startup Header Card - Mobile Optimized */}
      <Card className="overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-5">
            <Avatar className="h-16 w-16 md:h-20 md:w-20 rounded-2xl border-4 border-background shadow-lg">
              <AvatarImage src={workspace.startup?.logo_url || undefined} className="object-cover" />
              <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground text-xl md:text-2xl font-bold">
                {workspace.startup?.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                <h1 className="text-xl md:text-2xl font-bold truncate">{workspace.startup?.name}</h1>
                <HealthBadge score={health as HealthScore | null} />
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <Badge variant="outline" className="text-xs md:text-sm">
                  {workspace.program?.name}
                </Badge>
                <StageBadge stage={workspace.stage} />
              </div>
              {workspace.startup?.description && (
                <p className="text-muted-foreground mt-2 md:mt-3 line-clamp-2 text-sm md:text-base">
                  {workspace.startup.description}
                </p>
              )}
            </div>
            <Button 
              onClick={() => navigate(`/workspace/${workspace.id}`)}
              className="w-full sm:w-auto mt-3 sm:mt-0"
            >
              {t('founder.openWorkspace')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Stats - Mobile Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="animate-fade-in" style={{ animationDelay: '50ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              {t('dashboard.pendingActions')}
            </CardTitle>
            <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{workspace.pendingActionsCount}</div>
            {workspace.overdueActionsCount > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {workspace.overdueActionsCount} {t('common.overdue')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              {t('founder.nextMeeting')}
            </CardTitle>
            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {workspace.nextMeetingDate ? (
              <>
                <div className={`text-lg md:text-xl font-bold ${isToday(new Date(workspace.nextMeetingDate)) ? 'text-primary' : ''}`}>
                  {isToday(new Date(workspace.nextMeetingDate)) 
                    ? t('common.today') 
                    : format(new Date(workspace.nextMeetingDate), 'MMM d')
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(workspace.nextMeetingDate), 'h:mm a')}
                </p>
              </>
            ) : (
              <div className="text-sm md:text-lg text-muted-foreground">{t('common.notScheduled')}</div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '150ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              {t('founder.kpiStatus')}
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className={`text-sm md:text-lg font-bold ${workspace.hasCurrentMonthKpi ? 'text-green-600' : 'text-amber-600'}`}>
              {workspace.hasCurrentMonthKpi ? t('common.upToDate') : t('common.needsUpdate')}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {workspace.lastKpiMonth 
                ? `${t('common.last')}: ${format(new Date(workspace.lastKpiMonth), 'MMM yyyy')}`
                : t('common.noEntriesYet')
              }
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              {t('founder.lastSession')}
            </CardTitle>
            <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {workspace.lastSession ? (
              <>
                <div className="text-sm md:text-lg font-medium truncate">{workspace.lastSession.title}</div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(workspace.lastSession.scheduled_at), { addSuffix: true })}
                </p>
              </>
            ) : (
              <div className="text-sm md:text-lg text-muted-foreground">{t('founder.noSessionsYet')}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <Card className="animate-fade-in" style={{ animationDelay: '250ms' }}>
        <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
          <CardTitle className="text-base md:text-lg">{t('founder.quickActions')}</CardTitle>
          <CardDescription className="text-xs md:text-sm">{t('founder.commonTasks')}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="grid gap-2 md:gap-3 grid-cols-2 md:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 text-xs md:text-sm" 
              onClick={() => navigate(`/workspace/${workspace.id}?tab=kpis`)}
            >
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span>{t('founder.updateKpis')}</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 text-xs md:text-sm" 
              onClick={() => navigate(`/workspace/${workspace.id}?tab=actions`)}
            >
              <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span>{t('founder.viewActions')}</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 text-xs md:text-sm" 
              onClick={() => navigate(`/workspace/${workspace.id}?tab=milestones`)}
            >
              <Target className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span>{t('milestones.title')}</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 md:py-4 flex-col gap-1 md:gap-2 text-xs md:text-sm" 
              onClick={() => navigate(`/workspace/${workspace.id}?tab=documents`)}
            >
              <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span>{t('documents.title')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
