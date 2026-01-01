import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { WorkspaceOverview } from '@/components/workspace/WorkspaceOverview';
import { SessionsTab } from '@/components/workspace/SessionsTab';
import { ActionItemsTab } from '@/components/workspace/ActionItemsTab';
import { MilestonesTab } from '@/components/workspace/MilestonesTab';
import { KpisTab } from '@/components/workspace/KpisTab';
import { TemplatesTab } from '@/components/workspace/TemplatesTab';
import { CalendarTab } from '@/components/workspace/CalendarTab';
import { DocumentsTab } from '@/components/workspace/DocumentsTab';
import { StartupSettingsTab } from '@/components/workspace/StartupSettingsTab';
import { useWorkspace } from '@/hooks/useWorkspaces';
import { useAuth } from '@/contexts/AuthContext';

export default function WorkspaceDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: workspace, isLoading, error } = useWorkspace(id);
  const { isAdmin, isConsultor, isMentor, isFounder } = useAuth();

  // Determine if user can write to this workspace
  // Admins, consultors, mentors, AND founders can write
  const canWrite = isAdmin || isConsultor || isMentor || isFounder;

  if (isLoading) {
    return (
      <AppLayout title="Loading...">
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
          title="Workspace Not Accessible"
          message="This workspace doesn't exist or you don't have permission to view it. If you believe you should have access, please contact an administrator."
        />
      </AppLayout>
    );
  }

  const startup = workspace.startup as { id: string; name: string; description: string | null; website: string | null; logo_url: string | null; founded_date: string | null; phone: string | null; address: string | null } | null;
  const program = workspace.program as { name: string } | null;
  
  // Get the current tab from URL params
  const currentTab = searchParams.get('tab') || 'overview';
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <AppLayout
      title={startup?.name || 'Workspace'}
      subtitle={program?.name}
      actions={
        <Link to="/my-workspaces">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      }
    >
      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <Settings className="h-3.5 w-3.5" />
            Settings
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
        <TabsContent value="templates">
          <TemplatesTab workspaceId={workspace.id} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarTab workspaceId={workspace.id} canWrite={canWrite} startupName={startup?.name} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab workspaceId={workspace.id} canWrite={canWrite} />
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
