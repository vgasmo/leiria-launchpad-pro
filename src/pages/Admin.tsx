import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, FileText, BarChart3 } from 'lucide-react';
import { AdminTemplatesManager } from '@/components/admin/AdminTemplatesManager';

export default function Admin() {
  return (
    <AppLayout title="Admin Panel" subtitle="Manage programs, users, and settings">
      <Tabs defaultValue="programs" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="programs" className="gap-2">
            <Building2 className="h-4 w-4" />
            Programs & Stages
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            User Assignments
          </TabsTrigger>
          <TabsTrigger value="kpis" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            KPI Definitions
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="programs">
          <Card>
            <CardHeader>
              <CardTitle>Programs Management</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Create, edit, and manage incubation programs. Coming soon.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Assignments</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Assign users to workspaces with specific roles. Coming soon.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis">
          <Card>
            <CardHeader>
              <CardTitle>KPI Definitions</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Define global and program-specific KPIs for startups to track. Coming soon.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <AdminTemplatesManager />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
