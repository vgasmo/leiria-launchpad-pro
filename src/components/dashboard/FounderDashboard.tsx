import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Rocket,
  Plus,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { FounderWelcomePanel } from '@/components/founder/FounderWelcomePanel';
import { StreakHero } from '@/components/dashboard/StreakHero';
import { FounderBookingCTA } from '@/components/dashboard/FounderBookingCTA';
import { OneThingToday } from '@/components/dashboard/OneThingToday';
import { StageProgressCard } from '@/components/dashboard/StageProgressCard';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { InvestorReadinessWidget } from '@/components/workspace/InvestorReadinessWidget';
import { QuickActionsFab } from '@/components/workspace/QuickActionsFab';
import { WorkspaceWithDetails, PendingWorkspace } from '@/hooks/useWorkspaces';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { HealthScore } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useProgressStreak } from '@/hooks/useProgressStreak';
import { useChecklistRecovery } from '@/hooks/useChecklistRecovery';
import { toast } from 'sonner';

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
  const { profile } = useAuth();
  const { streakWeeks, recordActivity } = useProgressStreak();
  const { canRestore, restoreChecklist } = useChecklistRecovery();

  const handleRestoreChecklist = () => {
    restoreChecklist();
    toast.success(t('checklistRecovery.restored', 'Checklist restored'));
  };

  // Record activity on dashboard view
  useEffect(() => {
    recordActivity();
  }, []);

  // Get the primary workspace (founders typically have 1)
  const workspace = workspaces[0];
  
  // P0 FIX: Compute hasMentor from real workspace_users data (not hardcoded)
  const { data: workspaceMembers } = useWorkspaceMembers(workspace?.id);
  const hasMentor = useMemo(() => {
    if (!workspaceMembers) return false;
    return workspaceMembers.some(m => m.role === 'mentor_externo');
  }, [workspaceMembers]);
  
  // Calculate checklist progress
  const hasProfile = Boolean(profile?.full_name);
  const hasStartup = Boolean(workspace);
  const hasKpis = Boolean(workspace?.hasCurrentMonthKpi);
  const hasDocuments = Boolean(workspace?.lastSession);

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

  // No workspace yet - show welcome panel with getting started
  if (!workspace) {
    return (
      <div className="space-y-6">
        <FounderWelcomePanel
          hasStartup={false}
          hasProfile={hasProfile}
          hasKpis={false}
          hasMentor={false}
          hasDocuments={false}
          onCreateStartup={onCreateStartup}
        />
        
        {/* Motivational empty state */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <CardContent className="relative p-8 md:p-12 text-center">
            <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-6 shadow-xl shadow-primary/20">
              <Rocket className="h-10 w-10 text-primary-foreground" />
            </div>
            <h3 className="font-heading text-2xl md:text-3xl font-bold mb-3">
              {t('founder.startYourJourney', 'Inicie a Sua Jornada Startup')}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-base">
              {t('founder.startYourJourneyDesc', 'Registe a sua startup para aceder a mentoria, acompanhar o progresso e preparar a próxima ronda de financiamento.')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={onCreateStartup} className="gap-2 shadow-lg">
                <Plus className="h-5 w-5" />
                {t('founder.createYourStartup', 'Criar a Sua Startup')}
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/help')}>
                {t('founder.learnMore', 'Saber Mais')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const health = workspace.health_score_override || workspace.health_score;

  // FAB handlers
  const handleUpdateKpis = () => navigate(`/workspace/${workspace.id}?tab=kpis`);
  const handleAddAction = () => navigate(`/workspace/${workspace.id}?tab=actions`);
  const handleScheduleSession = () => navigate(`/workspace/${workspace.id}?tab=sessions`);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Welcome Panel with Checklist (dismissible) - only show if not complete */}
      <FounderWelcomePanel
        hasStartup={hasStartup}
        hasProfile={hasProfile}
        hasKpis={hasKpis}
        hasMentor={hasMentor}
        hasDocuments={hasDocuments}
        onCreateStartup={onCreateStartup}
        workspaceId={workspace.id}
      />

      {/* P1: PRIMARY BOOKING CTA - ABOVE THE FOLD */}
      <FounderBookingCTA workspaceId={workspace.id} />

      {/* Streak Hero - Show momentum */}
      <StreakHero streakWeeks={streakWeeks} />

      {/* One Thing Today - Single focus action */}
      <OneThingToday workspace={workspace} />

      {/* Startup Header Card - Compact */}
      <Card className="overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 rounded-xl border-2 border-background shadow-lg">
              <AvatarImage src={workspace.startup?.logo_url || undefined} className="object-cover" />
              <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-lg font-bold">
                {workspace.startup?.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-bold truncate">{workspace.startup?.name}</h1>
                <HealthBadge score={health as HealthScore | null} />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {workspace.program?.name}
                </Badge>
                <StageBadge stage={workspace.stage} size="sm" />
              </div>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate(`/workspace/${workspace.id}`)}
            >
              {t('founder.openWorkspace')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Two-column layout for progress and calendar */}
      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        {/* Stage Progress + Investor Readiness */}
        <div className="space-y-4">
          <StageProgressCard workspace={workspace} />
          <InvestorReadinessWidget workspaceId={workspace.id} compact />
        </div>
        
        {/* Upcoming Sessions Calendar */}
        <CalendarWidget />
      </div>

      {/* Checklist Recovery Footer */}
      {canRestore && (
        <div className="flex justify-center pt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRestoreChecklist}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="h-3 w-3" />
            {t('checklistRecovery.restoreChecklist', 'Show onboarding checklist')}
          </Button>
        </div>
      )}

      {/* Mobile Quick Actions FAB */}
      <QuickActionsFab
        onUpdateKpis={handleUpdateKpis}
        onAddAction={handleAddAction}
        onScheduleSession={handleScheduleSession}
      />
    </div>
  );
}
