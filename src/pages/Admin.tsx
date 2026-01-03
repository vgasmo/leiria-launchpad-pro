import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, FileText, BarChart3, Rocket, Briefcase, Clock, Activity, TrendingUp, Heart, ShieldCheck } from 'lucide-react';
import { AdminTemplatesManager } from '@/components/admin/AdminTemplatesManager';
import { AdminProgramsManager } from '@/components/admin/AdminProgramsManager';
import { AdminUsersManager } from '@/components/admin/AdminUsersManager';
import { AdminKpisManager } from '@/components/admin/AdminKpisManager';
import { AdminStartupsManager } from '@/components/admin/AdminStartupsManager';
import { AdminWorkspacesManager } from '@/components/admin/AdminWorkspacesManager';
import { PendingApprovalsManager } from '@/components/admin/PendingApprovalsManager';
import { ActivityLogViewerEnhanced } from '@/components/admin/ActivityLogViewerEnhanced';
import { ComplianceDashboard } from '@/components/admin/ComplianceDashboard';
import { CohortAnalytics } from '@/components/analytics/CohortAnalytics';
import { BulkReportGenerator } from '@/components/analytics/BulkReportGenerator';
import { HealthModelViewer } from '@/components/admin/HealthModelViewer';

export default function Admin() {
  const { t } = useTranslation();
  
  return (
    <AppLayout title={t('admin.title')} subtitle={t('admin.subtitle')}>
      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
          <TabsTrigger value="approvals" className="gap-2">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {t('admin.approvals')}
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {t('admin.compliance')}
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            {t('admin.programs')}
          </TabsTrigger>
          <TabsTrigger value="startups" className="gap-2">
            <Rocket className="h-4 w-4" aria-hidden="true" />
            {t('admin.startups')}
          </TabsTrigger>
          <TabsTrigger value="workspaces" className="gap-2">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            {t('admin.workspaces')}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" aria-hidden="true" />
            {t('admin.users')}
          </TabsTrigger>
          <TabsTrigger value="kpis" className="gap-2">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            {t('admin.kpis')}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            {t('admin.templates')}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" aria-hidden="true" />
            {t('admin.activityLog')}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            {t('admin.analytics')}
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Heart className="h-4 w-4" aria-hidden="true" />
            {t('admin.healthModels')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          <PendingApprovalsManager />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceDashboard />
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

        <TabsContent value="activity">
          <ActivityLogViewerEnhanced maxHeight="600px" />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CohortAnalytics />
            </div>
            <div>
              <BulkReportGenerator />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="health">
          <HealthModelViewer />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
