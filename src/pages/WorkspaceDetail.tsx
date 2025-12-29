import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/hooks/useWorkspaces';

export default function WorkspaceDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: workspace, isLoading } = useWorkspace(id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!workspace) {
    return (
      <AppLayout>
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold mb-2">Workspace not found</h3>
            <Link to="/my-workspaces">
              <Button variant="outline">Back to Workspaces</Button>
            </Link>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const startup = workspace.startup as { name: string; description: string | null } | null;
  const program = workspace.program as { name: string } | null;
  const effectiveHealth = workspace.health_score_override || workspace.health_score;

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
      {/* Status badges */}
      <div className="flex gap-3 mb-6">
        <StageBadge stage={workspace.stage} />
        <HealthBadge score={effectiveHealth} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle>About</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {startup?.description || 'No description available.'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Health Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {workspace.health_notes || 'No health notes recorded.'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
              <CardContent className="text-muted-foreground">
                Coming soon: action items, sessions, KPI summaries.
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Sessions management coming soon.</CardContent></Card>
        </TabsContent>
        <TabsContent value="actions">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Action items management coming soon.</CardContent></Card>
        </TabsContent>
        <TabsContent value="milestones">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Milestones tracking coming soon.</CardContent></Card>
        </TabsContent>
        <TabsContent value="kpis">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Monthly KPI check-ins coming soon.</CardContent></Card>
        </TabsContent>
        <TabsContent value="templates">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Templates library coming soon.</CardContent></Card>
        </TabsContent>
        <TabsContent value="calendar">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Calendar with Google sync coming soon.</CardContent></Card>
        </TabsContent>
        <TabsContent value="documents">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Documents and links coming soon.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
