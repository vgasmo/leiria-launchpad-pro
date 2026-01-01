import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, FileText, BarChart3, Rocket, Briefcase, Clock } from 'lucide-react';
import { AdminTemplatesManager } from '@/components/admin/AdminTemplatesManager';
import { AdminProgramsManager } from '@/components/admin/AdminProgramsManager';
import { AdminUsersManager } from '@/components/admin/AdminUsersManager';
import { AdminKpisManager } from '@/components/admin/AdminKpisManager';
import { AdminStartupsManager } from '@/components/admin/AdminStartupsManager';
import { AdminWorkspacesManager } from '@/components/admin/AdminWorkspacesManager';
import { PendingApprovalsManager } from '@/components/admin/PendingApprovalsManager';

export default function Admin() {
  return (
    <AppLayout title="Admin Panel" subtitle="Manage programs, users, and settings">
      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
          <TabsTrigger value="approvals" className="gap-2">
            <Clock className="h-4 w-4" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2">
            <Building2 className="h-4 w-4" />
            Programs
          </TabsTrigger>
          <TabsTrigger value="startups" className="gap-2">
            <Rocket className="h-4 w-4" />
            Startups
          </TabsTrigger>
          <TabsTrigger value="workspaces" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Workspaces
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="kpis" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            KPIs
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          <PendingApprovalsManager />
        </TabsContent>

        <TabsContent value="programs">
          <AdminProgramsManager />
        </TabsContent>

        <TabsContent value="startups">
          <AdminStartupsManager />
        </TabsContent>

        <TabsContent value="workspaces">
          <AdminWorkspacesManager />
        </TabsContent>

        <TabsContent value="users">
          <AdminUsersManager />
        </TabsContent>

        <TabsContent value="kpis">
          <AdminKpisManager />
        </TabsContent>

        <TabsContent value="templates">
          <AdminTemplatesManager />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
