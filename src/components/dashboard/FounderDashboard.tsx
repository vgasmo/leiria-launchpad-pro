import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Rocket,
  Plus,
  Clock,
  RotateCcw,
  BookOpenCheck,
  X,
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
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {t('founder.applicationUnderReview')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('founder.applicationBeingReviewed')}
                </p>
                
                <div className="space-y-2">
                  {pendingWorkspaces.map(pw => (
                    <div key={pw.id} className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-md">
                      <Rocket className="h-4 w-4 text-warning" />
                      <div className="flex-1">
                        <span className="font-medium text-sm">{pw.startup?.name}</span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{pw.program?.name}</Badge>
                          <span>•</span>
                          <StageBadge stage={pw.stage} size="sm" />
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">{t('founder.pending')}</Badge>
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
        <Card className="relative overflow-hidden border-0 shadow-card">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3" />
          <CardContent className="relative p-6 md:p-10 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-heading text-xl md:text-2xl font-semibold mb-2">
              {t('founder.startYourJourney')}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
              {t('founder.startYourJourneyDesc')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <Button size="default" onClick={onCreateStartup} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('founder.createYourStartup')}
              </Button>
              <Button variant="ghost" size="default" onClick={() => navigate('/help')}>
                {t('founder.learnMore')}
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
    <div className="space-y-6 max-w-5xl">
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

      {/* Quick Guide Banner for first-time founders */}
      <QuickGuideBanner />
      <section className="space-y-4">
        {/* One Thing Today - Single focus action */}
        <OneThingToday workspace={workspace} />

        {/* PRIMARY BOOKING CTA */}
        <FounderBookingCTA workspaceId={workspace.id} />
      </section>

      {/* MAIN BLOCK 1: Startup Card - Journey-first, Health secondary */}
      {/* UX EMPHASIS: Founders see their journey/phase prominently, health is informational not alarming */}
      <Card className="overflow-hidden border-border/60 rounded-2xl shadow-sm">
        <div className="bg-muted/40 p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 rounded-xl border border-border/50">
              <AvatarImage src={workspace.startup?.logo_url || undefined} className="object-cover" alt={workspace.startup?.name || 'Startup logo'} />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-sm font-semibold">
                {workspace.startup?.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-semibold truncate">{workspace.startup?.name}</h1>
              </div>
              {/* UX: Stage badge is PRIMARY for founders - their journey position */}
              <div className="flex items-center gap-2">
                <StageBadge stage={workspace.stage} size="sm" />
                <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full border border-border/50">
                  {workspace.program?.name}
                </Badge>
                {/* Health badge is shown but secondary - not the focus */}
                <HealthBadge score={health as HealthScore | null} size="sm" />
              </div>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate(`/workspace/${workspace.id}`)}
              className="text-xs shrink-0"
            >
              {t('founder.openWorkspace')}
            </Button>
          </div>
        </div>
      </Card>

      {/* MAIN BLOCKS 2 & 3: Progress + Calendar (max 3 visible) */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <StageProgressCard workspace={workspace} />
          <InvestorReadinessWidget workspaceId={workspace.id} compact />
        </div>
        <CalendarWidget />
      </div>

      {/* Streak (secondary - calm) */}
      <StreakHero streakWeeks={streakWeeks} />

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

function QuickGuideBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('shown_quickguide_founder') === 'true';
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('shown_quickguide_founder', 'true');
    setDismissed(true);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <BookOpenCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t('quickGuideBanner.title', { defaultValue: 'Novo aqui? Consulta o Guia Rápido' })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('quickGuideBanner.description', { defaultValue: 'Aprende a tirar o máximo partido da plataforma passo a passo.' })}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { handleDismiss(); navigate('/guide'); }}
            className="shrink-0 gap-1.5"
          >
            {t('quickGuideBanner.cta', { defaultValue: 'Abrir Guia' })}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-7 w-7 shrink-0 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
