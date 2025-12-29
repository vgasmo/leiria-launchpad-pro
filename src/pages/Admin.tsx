import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, FileText, BarChart3 } from 'lucide-react';
import { AdminTemplatesManager } from '@/components/admin/AdminTemplatesManager';
import { AdminProgramsManager } from '@/components/admin/AdminProgramsManager';
import { AdminUsersManager } from '@/components/admin/AdminUsersManager';
import { AdminKpisManager } from '@/components/admin/AdminKpisManager';

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
            User Management
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
          <AdminProgramsManager />
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
