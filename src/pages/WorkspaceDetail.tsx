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
import { useWorkspace } from '@/hooks/useWorkspaces';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function WorkspaceDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { data: workspace, isLoading, error } = useWorkspace(id);
  const { isAdmin, isConsultor, isMentor, isFounder } = useAuth();

  // Determine if user can write to this workspace
  // Admins, consultors, mentors, AND founders can write
  const canWrite = isAdmin || isConsultor || isMentor || isFounder;

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

  const startup = workspace.startup as { id: string; name: string; description: string | null; website: string | null; logo_url: string | null; founded_date: string | null; phone: string | null; address: string | null; nif: string | null; main_contact_name: string | null; main_contact_email: string | null; main_contact_phone: string | null; is_legally_recognized: boolean | null } | null;
  const program = workspace.program as { name: string } | null;
  
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyWorkspaceLink}>
            <Copy className="h-4 w-4 mr-2" />
            {t('common.copyLink')}
          </Button>
          <Link to="/my-workspaces">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
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
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">{t('workspace.overview')}</TabsTrigger>
          <TabsTrigger value="sessions">{t('workspace.sessions')}</TabsTrigger>
          <TabsTrigger value="actions">{t('workspace.actions')}</TabsTrigger>
          <TabsTrigger value="milestones">{t('workspace.milestones')}</TabsTrigger>
          <TabsTrigger value="kpis">{t('workspace.kpis')}</TabsTrigger>
          <TabsTrigger value="playbooks" className="gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            Playbooks
          </TabsTrigger>
          <TabsTrigger value="templates">{t('workspace.templates')}</TabsTrigger>
          <TabsTrigger value="calendar">{t('workspace.calendar')}</TabsTrigger>
          <TabsTrigger value="documents">{t('workspace.documents')}</TabsTrigger>
          {isFounder && startup && (
            <TabsTrigger value="team" className="gap-1">
              <Users className="h-3.5 w-3.5" />
              {t('workspace.team')}
            </TabsTrigger>
          )}
          <TabsTrigger value="dataroom" className="gap-1">
            <FolderLock className="h-3.5 w-3.5" />
            {t('dataroom.title')}
          </TabsTrigger>
          {isFounder && (
            <TabsTrigger value="funding" className="gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {t('workspace.funding')}
            </TabsTrigger>
          )}
          {(isAdmin || isConsultor || isMentor) && (
            <>
              <TabsTrigger value="notes" className="gap-1">
                <StickyNote className="h-3.5 w-3.5" />
                {t('workspace.notesAndTasks')}
              </TabsTrigger>
            </>
          )}
          {(isAdmin || isConsultor) && (
          <TabsTrigger value="time" className="gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t('workspace.time')}
            </TabsTrigger>
          )}
          <TabsTrigger value="governance" className="gap-1">
            <Shield className="h-3.5 w-3.5" />
            Governance
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <Settings className="h-3.5 w-3.5" />
            {t('workspace.settings')}
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </AppLayout>
  );
}
