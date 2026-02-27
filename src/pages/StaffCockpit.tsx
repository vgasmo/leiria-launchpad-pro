import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { CockpitQuickActions } from '@/components/staff/CockpitQuickActions';
import { WorkQueuePanel } from '@/components/staff/WorkQueuePanel';
import { StaffTasksPanel } from '@/components/staff/StaffTasksPanel';
import { CockpitPortfolioOverview } from '@/components/staff/CockpitPortfolioOverview';
import { PendingApprovalsManager } from '@/components/admin/PendingApprovalsManager';
import { IntakeRoutingManager } from '@/components/admin/IntakeRoutingManager';
import { LayoutDashboard, Inbox, ListTodo, Zap, Building2 } from 'lucide-react';

export default function StaffCockpit() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data: workspaces = [] } = useWorkspaces();

  const greeting = profile?.full_name
    ? t('staffCockpit.greeting', { defaultValue: 'Olá, {{name}}', name: profile.full_name.split(' ')[0] })
    : t('staffCockpit.greetingGeneric', { defaultValue: 'Bem-vindo ao Centro de Comando' });

  return (
    <AppLayout
      title={t('staffCockpit.title', { defaultValue: 'Centro de Comando' })}
      subtitle={greeting}
    >
      <div className="space-y-6">
        {/* Quick Actions Bar */}
        <CockpitQuickActions workspaces={workspaces} compact={false} />

        {/* Main Grid: Triage + Daily Work */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT: Smart Triage & Intake */}
          <div className="space-y-0">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 px-6 pt-5 pb-3">
                <Inbox className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold font-heading">
                  {t('staffCockpit.triage', { defaultValue: 'Triagem & Intake' })}
                </h2>
              </div>
              <CardContent className="p-0">
                <Tabs defaultValue="approvals" className="w-full">
                  <div className="px-6">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="approvals" className="text-xs">
                        {t('staffCockpit.pendingApprovals', { defaultValue: 'Aprovações Pendentes' })}
                      </TabsTrigger>
                      <TabsTrigger value="routing" className="text-xs">
                        {t('staffCockpit.intakeRouting', { defaultValue: 'Encaminhamento' })}
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <div className="px-6 pb-6 pt-4 max-h-[600px] overflow-y-auto">
                    <TabsContent value="approvals" className="mt-0">
                      <PendingApprovalsManager />
                    </TabsContent>
                    <TabsContent value="routing" className="mt-0">
                      <IntakeRoutingManager />
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Daily Work Queue & Tasks */}
          <div className="space-y-6">
            {/* Work Queue */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ListTodo className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold font-heading">
                  {t('staffCockpit.dailyWork', { defaultValue: 'Trabalho do Dia' })}
                </h2>
              </div>
              <WorkQueuePanel compact={false} />
            </div>

            {/* Staff Tasks */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold font-heading">
                  {t('staffCockpit.myTasks', { defaultValue: 'As Minhas Tarefas' })}
                </h2>
              </div>
              <StaffTasksPanel compact={false} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
