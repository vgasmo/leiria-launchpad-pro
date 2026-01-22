import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Settings, Copy, DollarSign, StickyNote, Users, Clock, BookOpen, Shield, FolderLock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { WorkspaceOverview } from '@/components/workspace/WorkspaceOverview';
import { SessionsTab } from '@/components/workspace/SessionsTab';
import { ActionItemsTab } from '@/components/workspace/ActionItemsTab';
import { MilestonesTab } from '@/components/workspace/MilestonesTab';
import { KpisTab } from '@/components/workspace/KpisTab';
import { TemplatesTab } from '@/components/workspace/TemplatesTab';
import { CalendarTab } from '@/components/workspace/CalendarTab';
import { DocumentsTab } from '@/components/workspace/DocumentsTab';
import { StartupSettingsTab } from '@/components/workspace/StartupSettingsTab';
import { FundingTrackerTab } from '@/components/workspace/FundingTrackerTab';
import { NotesAndTasksTab } from '@/components/workspace/NotesAndTasksTab';
import { TeamTab } from '@/components/workspace/TeamTab';
import { DataroomTab } from '@/components/workspace/DataroomTab';
import { TimeTrackingTab } from '@/components/workspace/TimeTrackingTab';
import { PlaybooksTab } from '@/components/workspace/PlaybooksTab';
import { GovernanceTab } from '@/components/workspace/GovernanceTab';
import { PendingWorkspaceView } from '@/components/workspace/PendingWorkspaceView';
import { WorkspaceOnboardingWizard } from '@/components/workspace/WorkspaceOnboardingWizard';
import { useWorkspace } from '@/hooks/useWorkspaces';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function WorkspaceDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { data: workspace, isLoading, error } = useWorkspace(id);
  const { isAdmin, isConsultor, isMentor, isFounder } = useAuth();
  
  // Handle onboarding wizard auto-open for invited founders
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const shouldShowOnboarding = searchParams.get('onboarding') === 'true';

  // Determine if user can write to this workspace
  // Admins, consultors, mentors, AND founders can write
  const canWrite = isAdmin || isConsultor || isMentor || isFounder;
  
  // Auto-open onboarding wizard when redirected from invite acceptance
  useEffect(() => {
    if (shouldShowOnboarding && workspace && isFounder) {
      setShowOnboardingWizard(true);
      // Remove the query param after reading it
      searchParams.delete('onboarding');
      setSearchParams(searchParams, { replace: true });
    }
  }, [shouldShowOnboarding, workspace, isFounder, searchParams, setSearchParams]);

  if (isLoading) {
    return (
      <AppLayout title={t('common.loading')}>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Handle access denied or workspace not found
  if (!workspace || error) {
    return (
      <AppLayout title="Workspace">
        <AccessDenied 
          title={t('workspace.notAccessible')}
          message={t('workspace.noPermission')}
        />
      </AppLayout>
    );
  }

  const startup = workspace.startup as { id: string; name: string; description: string | null; website: string | null; logo_url: string | null; founded_date: string | null; phone: string | null; address: string | null; nif: string | null; main_contact_name: string | null; main_contact_email: string | null; main_contact_phone: string | null; has_startup_portugal_status: boolean | null; startup_portugal_document_path: string | null } | null;
  const program = workspace.program as { name: string } | null;
  const workspaceStatus = (workspace as any).status as string | undefined;
  
  // Check if workspace is pending and user is founder (not staff)
  const isPendingWorkspace = workspaceStatus === 'pending';
  const isStaff = isAdmin || isConsultor;
  
  // If workspace is pending and user is founder (not staff), show restricted view
  if (isPendingWorkspace && !isStaff && isFounder) {
    return (
      <AppLayout title={startup?.name || 'Workspace'}>
        <PendingWorkspaceView 
          workspace={{
            id: workspace.id,
            stage: workspace.stage,
            created_at: workspace.created_at,
            startup: startup ? { name: startup.name, description: startup.description } : null,
            program: program,
          }}
        />
      </AppLayout>
    );
  }
  
  // Get the current tab from URL params
  const currentTab = searchParams.get('tab') || 'overview';
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const copyWorkspaceLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(t('common.linkCopied'));
  };

  return (
    <AppLayout
      title={startup?.name || 'Workspace'}
      subtitle={program?.name}
      actions={
        <div className="flex gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={copyWorkspaceLink} className="px-2 sm:px-3">
            <Copy className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('common.copyLink')}</span>
          </Button>
          <Link to="/my-workspaces">
            <Button variant="outline" size="sm" className="px-2 sm:px-3">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('common.back')}</span>
            </Button>
          </Link>
        </div>
      }
    >
      {/* Breadcrumbs */}
      <Breadcrumbs 
        className="mb-4"
        items={[
          { label: t('nav.workspaces'), href: '/my-workspaces' },
          { label: startup?.name || 'Workspace' },
        ]}
      />
      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        {/* Responsive scrollable tabs with fade indicators */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent pointer-events-none z-10 lg:hidden" />
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 lg:hidden" />
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted -mx-4 px-4 lg:mx-0 lg:px-0">
            <TabsList className="bg-muted/30 inline-flex h-auto gap-0.5 p-1 min-w-max">
              {/* Core tabs - always visible */}
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-3">{t('workspace.overview')}</TabsTrigger>
              <TabsTrigger value="sessions" className="text-xs sm:text-sm px-2 sm:px-3">{t('workspace.sessions')}</TabsTrigger>
              <TabsTrigger value="actions" className="text-xs sm:text-sm px-2 sm:px-3">{t('workspace.actions')}</TabsTrigger>
              <TabsTrigger value="milestones" className="text-xs sm:text-sm px-2 sm:px-3">{t('workspace.milestones')}</TabsTrigger>
              <TabsTrigger value="kpis" className="text-xs sm:text-sm px-2 sm:px-3">{t('workspace.kpis')}</TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs sm:text-sm px-2 sm:px-3">{t('workspace.calendar')}</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs sm:text-sm px-2 sm:px-3">{t('workspace.documents')}</TabsTrigger>
              {/* Secondary tabs - icon-only on mobile */}
              <TabsTrigger value="playbooks" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('workspace.playbooks')}</span>
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                <span className="md:hidden">📄</span>
                <span className="hidden md:inline">{t('workspace.templates')}</span>
              </TabsTrigger>
              {isFounder && startup && (
                <TabsTrigger value="team" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <Users className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t('workspace.team')}</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="dataroom" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                <FolderLock className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('dataroom.title')}</span>
              </TabsTrigger>
              {isFounder && (
                <TabsTrigger value="funding" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t('workspace.funding')}</span>
                </TabsTrigger>
              )}
              {(isAdmin || isConsultor || isMentor) && (
                <TabsTrigger value="notes" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <StickyNote className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t('workspace.notesAndTasks')}</span>
                </TabsTrigger>
              )}
              {(isAdmin || isConsultor) && (
                <TabsTrigger value="time" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t('workspace.time')}</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="governance" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('workspace.governance')}</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('workspace.settings')}</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="animate-fade-in">
        <TabsContent value="overview">
          <WorkspaceOverview 
            workspace={{
              id: workspace.id,
              startup_id: workspace.startup_id,
              program_id: workspace.program_id,
              stage: workspace.stage,
              stage_id: workspace.stage_id || null,
              health_score: workspace.health_score,
              health_score_override: workspace.health_score_override,
              health_status: workspace.health_status || null,
              health_notes: workspace.health_notes,
              startup: startup,
              program: program,
            }}
            canWrite={canWrite}
          />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsTab workspaceId={workspace.id} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="actions">
          <ActionItemsTab workspaceId={workspace.id} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="milestones">
          <MilestonesTab workspaceId={workspace.id} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="kpis">
          <KpisTab workspaceId={workspace.id} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="playbooks">
          <PlaybooksTab 
            workspaceId={workspace.id} 
            programId={workspace.program_id} 
            currentStage={workspace.stage} 
            canWrite={canWrite} 
          />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab workspaceId={workspace.id} canWrite={canWrite} isFounder={isFounder} />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarTab workspaceId={workspace.id} canWrite={canWrite} startupName={startup?.name} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab workspaceId={workspace.id} canWrite={canWrite} />
        </TabsContent>
        {isFounder && startup && (
          <TabsContent value="team">
            <TeamTab startupId={startup.id} canEdit={canWrite} />
          </TabsContent>
        )}
        <TabsContent value="dataroom">
          <DataroomTab workspaceId={workspace.id} canWrite={canWrite} />
        </TabsContent>
        {isFounder && startup && (
          <TabsContent value="funding">
            <FundingTrackerTab startupId={startup.id} />
          </TabsContent>
        )}
        {(isAdmin || isConsultor || isMentor) && (
          <TabsContent value="notes">
            <NotesAndTasksTab workspaceId={workspace.id} startupId={startup?.id} />
          </TabsContent>
        )}
        {(isAdmin || isConsultor) && (
          <TabsContent value="time">
            <TimeTrackingTab workspaceId={workspace.id} />
          </TabsContent>
        )}
        <TabsContent value="governance">
          <GovernanceTab 
            workspaceId={workspace.id} 
            programId={workspace.program_id}
            currentStage={workspace.stage}
            canWrite={canWrite}
          />
        </TabsContent>
        <TabsContent value="settings">
          {startup && (
            <StartupSettingsTab
              workspaceId={workspace.id}
              startupId={workspace.startup_id}
              startup={startup}
              canEdit={canWrite}
            />
          )}
        </TabsContent>
        </div>
      </Tabs>
      
      {/* Founder Onboarding Wizard - auto-opens after invite acceptance */}
      {startup && (
        <WorkspaceOnboardingWizard
          open={showOnboardingWizard}
          onOpenChange={setShowOnboardingWizard}
          workspaceId={workspace.id}
          startupId={startup.id}
          stage={workspace.stage}
          startupName={startup.name}
          website={startup.website || ''}
          mainContactName={startup.main_contact_name || ''}
          mainContactEmail={startup.main_contact_email || ''}
          nif={startup.nif || ''}
          isFounderOnboarding={isFounder}
        />
      )}
    </AppLayout>
  );
}
