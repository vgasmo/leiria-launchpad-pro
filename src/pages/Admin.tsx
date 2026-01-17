import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Building2, FileText, BarChart3, Clock, Activity, TrendingUp, 
  Heart, ShieldCheck, Users2, Plug, BookOpen, ClipboardList, Bell, Flag, Filter,
  ChevronDown, Stethoscope, Database, Tag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AdminTemplatesManager } from '@/components/admin/AdminTemplatesManager';
import { AdminProgramsManager } from '@/components/admin/AdminProgramsManager';
import { AdminUsersManager } from '@/components/admin/AdminUsersManager';
import { AdminKpisManager } from '@/components/admin/AdminKpisManager';
import { AdminBackoffice } from '@/components/admin/AdminBackoffice';
import { AdminAnnouncementsManager } from '@/components/admin/AdminAnnouncementsManager';
import { PendingApprovalsManager } from '@/components/admin/PendingApprovalsManager';
import { ActivityLogViewerEnhanced } from '@/components/admin/ActivityLogViewerEnhanced';
import { ComplianceDashboard } from '@/components/admin/ComplianceDashboard';
import { CohortAnalytics } from '@/components/analytics/CohortAnalytics';
import { BulkReportGenerator } from '@/components/analytics/BulkReportGenerator';
import { HealthModelViewer } from '@/components/admin/HealthModelViewer';
import { AdminExternalMentorsManager } from '@/components/admin/AdminExternalMentorsManager';
import { IntegrationErrorsPanel } from '@/components/admin/IntegrationErrorsPanel';
import { WorkflowIntegrations } from '@/components/settings/WorkflowIntegrations';
import { AdminSupportMaterialsManager } from '@/components/admin/AdminSupportMaterialsManager';
import { AdminTeamsTestPanel } from '@/components/admin/AdminTeamsTestPanel';
import { AdminSurveysManager } from '@/components/admin/AdminSurveysManager';
import { AdminFeatureFlagsManager } from '@/components/admin/AdminFeatureFlagsManager';
import { IntegrationTestHarness } from '@/components/admin/IntegrationTestHarness';
import { AdminFunnelManager } from '@/components/admin/AdminFunnelManager';
import { BookingLinksManager } from '@/components/admin/BookingLinksManager';
import { AdminTagCategoriesManager } from '@/components/admin/AdminTagCategoriesManager';
import { DataQualityDashboard } from '@/components/admin/DataQualityDashboard';

// Tab group definitions for cleaner navigation
const TAB_GROUPS: Record<string, string[]> = {
  operations: ['approvals', 'compliance', 'backoffice', 'announcements', 'data-quality'],
  people: ['users', 'mentors'],
  content: ['kpis', 'templates', 'support-materials', 'surveys', 'tags'],
  insights: ['activity', 'analytics', 'health'],
  system: ['integrations', 'crm-diagnostics', 'data-import', 'flags', 'funnel'],
};

export default function Admin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('approvals');
  
  const getTabIcon = (tab: string) => {
    const icons: Record<string, React.ReactNode> = {
      approvals: <Clock className="h-4 w-4" />,
      compliance: <ShieldCheck className="h-4 w-4" />,
      backoffice: <Building2 className="h-4 w-4" />,
      announcements: <Bell className="h-4 w-4" />,
      'data-quality': <Database className="h-4 w-4" />,
      users: <Users className="h-4 w-4" />,
      mentors: <Users2 className="h-4 w-4" />,
      kpis: <BarChart3 className="h-4 w-4" />,
      templates: <FileText className="h-4 w-4" />,
      'support-materials': <BookOpen className="h-4 w-4" />,
      surveys: <ClipboardList className="h-4 w-4" />,
      tags: <Tag className="h-4 w-4" />,
      activity: <Activity className="h-4 w-4" />,
      analytics: <TrendingUp className="h-4 w-4" />,
      health: <Heart className="h-4 w-4" />,
      integrations: <Plug className="h-4 w-4" />,
      'crm-diagnostics': <Stethoscope className="h-4 w-4" />,
      'data-import': <Database className="h-4 w-4" />,
      flags: <Flag className="h-4 w-4" />,
      funnel: <Filter className="h-4 w-4" />,
    };
    return icons[tab];
  };

  const getTabLabel = (tab: string) => {
    const labels: Record<string, string> = {
      approvals: t('admin.approvals'),
      compliance: t('admin.compliance'),
      backoffice: t('admin.backoffice.tab', 'Backoffice'),
      announcements: t('admin.announcements.tab'),
      'data-quality': t('dataQuality.title', 'Data Quality'),
      users: t('admin.users'),
      mentors: t('admin.externalMentors'),
      kpis: t('admin.kpis'),
      templates: t('admin.templates'),
      'support-materials': t('admin.supportMaterials.title', 'Materials'),
      surveys: t('admin.surveys.title', 'Surveys'),
      tags: t('admin.tags.title', 'Tags'),
      activity: t('admin.activityLog'),
      analytics: t('admin.analytics'),
      health: t('admin.healthModels'),
      integrations: t('admin.integrations', 'Integrations'),
      'crm-diagnostics': t('admin.crmDiagnostics', 'CRM Diagnostics'),
      'data-import': t('admin.dataImport.tab', 'Data Import'),
      flags: t('admin.featureFlags.tab', 'Flags'),
      funnel: t('admin.funnel.tab', 'Funnel'),
    };
    return labels[tab];
  };

  const getGroupLabel = (group: string) => {
    const labels: Record<string, string> = {
      operations: t('admin.groups.operations', 'Operations'),
      people: t('admin.groups.people', 'People'),
      content: t('admin.groups.content', 'Content'),
      insights: t('admin.groups.insights', 'Insights'),
      system: t('admin.groups.system', 'System'),
    };
    return labels[group];
  };

  const isTabInGroup = (tab: string, group: keyof typeof TAB_GROUPS) => {
    return TAB_GROUPS[group].includes(tab as any);
  };

  const getActiveGroup = () => {
    for (const [group, tabs] of Object.entries(TAB_GROUPS)) {
      if (tabs.includes(activeTab as any)) return group;
    }
    return 'operations';
  };

  return (
    <AppLayout title={t('admin.title')} subtitle={t('admin.subtitle')}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Grouped Tab Navigation - Desktop: dropdowns, Mobile: horizontal scroll */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
          {Object.entries(TAB_GROUPS).map(([group, tabs]) => (
            <DropdownMenu key={group}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={getActiveGroup() === group ? 'secondary' : 'ghost'} 
                  size="sm"
                  className="gap-1.5"
                >
                  {getGroupLabel(group)}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {tabs.map((tab) => (
                  <DropdownMenuItem 
                    key={tab}
                    onClick={() => {
                      if (tab === 'crm-diagnostics') {
                        navigate('/admin/crm-diagnostics');
                      } else if (tab === 'data-import') {
                        navigate('/admin/data-import');
                      } else {
                        setActiveTab(tab);
                      }
                    }}
                    className={activeTab === tab ? 'bg-accent' : ''}
                  >
                    <span className="flex items-center gap-2">
                      {getTabIcon(tab)}
                      {getTabLabel(tab)}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>

        {/* Active Tab Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{getTabIcon(activeTab)}</span>
          <span className="font-medium text-foreground">{getTabLabel(activeTab)}</span>
        </div>

        <TabsContent value="approvals">
          <PendingApprovalsManager />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceDashboard />
        </TabsContent>

        <TabsContent value="backoffice">
          <AdminBackoffice />
        </TabsContent>

        <TabsContent value="announcements">
          <AdminAnnouncementsManager />
        </TabsContent>

        <TabsContent value="data-quality">
          <DataQualityDashboard />
        </TabsContent>

        <TabsContent value="users">
          <AdminUsersManager />
        </TabsContent>

        <TabsContent value="mentors">
          <AdminExternalMentorsManager />
        </TabsContent>

        <TabsContent value="kpis">
          <AdminKpisManager />
        </TabsContent>

        <TabsContent value="templates">
          <AdminTemplatesManager />
        </TabsContent>

        <TabsContent value="support-materials">
          <AdminSupportMaterialsManager />
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

        <TabsContent value="surveys">
          <AdminSurveysManager />
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-6">
            <IntegrationTestHarness />
            <AdminTeamsTestPanel />
            <IntegrationErrorsPanel maxHeight="400px" />
            <WorkflowIntegrations />
          </div>
        </TabsContent>

        <TabsContent value="flags">
          <AdminFeatureFlagsManager />
        </TabsContent>

        <TabsContent value="funnel">
          <div className="space-y-6">
            <BookingLinksManager />
            <AdminFunnelManager />
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
