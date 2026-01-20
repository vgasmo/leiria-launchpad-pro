import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { 
  Users, Building2, FileText, BarChart3, Clock, Activity, TrendingUp, 
  Heart, ShieldCheck, Users2, Plug, BookOpen, ClipboardList, Bell, Flag, Filter,
  ChevronDown, Stethoscope, Database, Tag, GitBranch
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AdminTemplatesManager } from '@/components/admin/AdminTemplatesManager';
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
import { DataQualityDashboard } from '@/components/admin/DataQualityDashboard';
import { ContractLifecycleHub } from '@/components/admin/ContractLifecycleHub';

// Tab group definitions - SIMPLIFIED P1 IA
// Groups: Operações | CRM | Programas & Cohorts | Relatórios | Utilizadores & Permissões | Sistema
const TAB_GROUPS: Record<string, string[]> = {
  operations: ['approvals', 'compliance', 'lifecycle', 'backoffice', 'announcements', 'data-quality'],
  crm: ['funnel'],
  programs: ['kpis', 'templates', 'support-materials', 'surveys', 'tags'],
  reports: ['activity', 'analytics', 'health'],
  users: ['users', 'mentors'],
  system: ['integrations', 'crm-diagnostics', 'data-import', 'flags'],
};

export default function Admin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const validTabs = useMemo(() => {
    const tabs = new Set<string>();
    for (const groupTabs of Object.values(TAB_GROUPS)) {
      groupTabs.forEach((tab) => tabs.add(tab));
    }
    return tabs;
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    const fromUrl = searchParams.get('tab');
    return fromUrl && validTabs.has(fromUrl) ? fromUrl : 'approvals';
  });

  // Keep internal tab state in sync with URL (?tab=...)
  useEffect(() => {
    const fromUrl = searchParams.get('tab');
    if (fromUrl && validTabs.has(fromUrl) && fromUrl !== activeTab) {
      setActiveTab(fromUrl);
      return;
    }

    // If URL has no tab, ensure we don't show stale deep-linked state after navigation.
    if (!fromUrl && activeTab !== 'approvals') {
      setActiveTab('approvals');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, validTabs]);

  const setActiveTabAndUrl = (tab: string) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };
  
  const getTabIcon = (tab: string) => {
    const icons: Record<string, React.ReactNode> = {
      approvals: <Clock className="h-4 w-4" />,
      compliance: <ShieldCheck className="h-4 w-4" />,
      lifecycle: <GitBranch className="h-4 w-4" />,
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
      approvals: t('admin.approvals', 'Aprovações'),
      compliance: t('admin.compliance', 'Conformidade'),
      lifecycle: t('admin.lifecycle', 'Ciclo de Contratos'),
      backoffice: t('admin.backoffice.tab', 'Backoffice'),
      announcements: t('admin.announcements.tab', 'Anúncios'),
      'data-quality': t('dataQuality.title', 'Qualidade de Dados'),
      users: t('admin.users', 'Utilizadores'),
      mentors: t('admin.externalMentors', 'Mentores Externos'),
      kpis: t('admin.kpis', 'KPIs'),
      templates: t('admin.templates', 'Templates'),
      'support-materials': t('admin.supportMaterials.title', 'Materiais'),
      surveys: t('admin.surveys.title', 'Inquéritos'),
      tags: t('admin.tags.title', 'Tags'),
      activity: t('admin.activityLog', 'Registo de Atividade'),
      analytics: t('admin.analytics', 'Analytics'),
      health: t('admin.healthModels', 'Modelos de Saúde'),
      integrations: t('admin.integrations', 'Integrações'),
      'crm-diagnostics': t('admin.crmDiagnostics', 'Diagnóstico CRM'),
      'data-import': t('admin.dataImport.tab', 'Importação'),
      flags: t('admin.featureFlags.tab', 'Flags'),
      funnel: t('admin.funnel.tab', 'Funil'),
    };
    return labels[tab];
  };

  const getGroupLabel = (group: string) => {
    const labels: Record<string, string> = {
      operations: t('admin.groups.operations', 'Operações'),
      crm: t('nav.crm', 'CRM'),
      programs: t('admin.groups.programs', 'Programas & Cohorts'),
      reports: t('admin.groups.reports', 'Relatórios'),
      users: t('admin.groups.users', 'Utilizadores'),
      system: t('admin.groups.system', 'Sistema'),
    };
    return labels[group];
  };

  const getActiveGroup = () => {
    for (const [group, tabs] of Object.entries(TAB_GROUPS)) {
      if (tabs.includes(activeTab as any)) return group;
    }
    return 'operations';
  };

  return (
    <AppLayout title={t('admin.title')} subtitle={t('admin.subtitle')}>
      <Tabs value={activeTab} onValueChange={setActiveTabAndUrl} className="space-y-6">
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
                         setActiveTabAndUrl(tab);
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

        <TabsContent value="lifecycle">
          <ContractLifecycleHub />
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
