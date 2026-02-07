import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, AlertTriangle, Clock, ArrowRight, CheckCircle2, 
  Calendar, Building2, Users, TrendingUp, Bell, Rocket,
  ChevronRight, RefreshCw, Mail, Sparkles
} from 'lucide-react';
import { ContractIntelligenceCard } from '@/components/contracts/ContractIntelligenceCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContracts, useIncubationTypes, useBuildings, useCreateContract } from '@/hooks/useBackoffice';
import { useFunnelItems, useConvertToStartup } from '@/hooks/useFunnel';
import { usePrograms } from '@/hooks/useWorkspaces';
import { differenceInDays, addDays, format, differenceInMonths, addYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertType = 'pending_contract' | 'renewal_due' | 'anniversary' | 'missing_contract' | 'expired';

interface LifecycleAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  entityId: string;
  entityName: string;
  daysUntil?: number;
  actionLabel: string;
  actionType: 'create_contract' | 'convert' | 'renew' | 'review' | 'archive';
}

export function ContractLifecycleHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'pipeline'>('overview');
  const [convertDialogItem, setConvertDialogItem] = useState<any>(null);
  
  const { data: contracts } = useContracts();
  const { data: funnelItems } = useFunnelItems();
  const { data: programs } = usePrograms();
  const { data: incubationTypes } = useIncubationTypes();
  const { data: buildings } = useBuildings();
  const createContract = useCreateContract();
  const convertToStartup = useConvertToStartup();
  
  // Calculate lifecycle metrics and alerts
  const lifecycleData = useMemo(() => {
    if (!contracts || !funnelItems) return null;
    
    const now = new Date();
    const alerts: LifecycleAlert[] = [];
    
    // 1. Leads in "contracted" stage without linked contract
    const contractedLeadsWithoutContract = funnelItems.filter(item => 
      item.stage === 'contracted' && !item.linked_contract_id && !item.linked_workspace_id
    );
    
    contractedLeadsWithoutContract.forEach(item => {
      alerts.push({
        id: `pending-${item.id}`,
        type: 'pending_contract',
        severity: 'critical',
        title: t('lifecycle.pendingContract', 'Pending Contract Creation'),
        description: t('lifecycle.pendingContractDesc', 'Lead marked as contracted but no contract exists'),
        entityId: item.id,
        entityName: item.organization_name || item.contact_name || 'Unknown',
        actionLabel: t('lifecycle.createContract', 'Create Contract'),
        actionType: 'convert',
      });
    });
    
    // 2. Active contracts approaching end date (30/60/90 days)
    const activeContracts = contracts.filter(c => c.status === 'active' && c.end_date);
    
    activeContracts.forEach(contract => {
      if (!contract.end_date) return;
      
      const endDate = new Date(contract.end_date);
      const daysUntilEnd = differenceInDays(endDate, now);
      const startupName = contract.workspace?.startup?.name || 'Unknown';
      
      if (daysUntilEnd <= 0) {
        alerts.push({
          id: `expired-${contract.id}`,
          type: 'expired',
          severity: 'critical',
          title: t('lifecycle.expired', 'Contract Expired'),
          description: t('lifecycle.expiredDesc', 'Contract has passed its end date'),
          entityId: contract.id,
          entityName: startupName,
          daysUntil: daysUntilEnd,
          actionLabel: t('lifecycle.renew', 'Renew Contract'),
          actionType: 'renew',
        });
      } else if (daysUntilEnd <= 30) {
        alerts.push({
          id: `renewal-30-${contract.id}`,
          type: 'renewal_due',
          severity: 'critical',
          title: t('lifecycle.renewalCritical', 'Renewal Due Soon'),
          description: t('lifecycle.renewalCriticalDesc', 'Contract expires in {{days}} days', { days: daysUntilEnd }),
          entityId: contract.id,
          entityName: startupName,
          daysUntil: daysUntilEnd,
          actionLabel: t('lifecycle.initiateRenewal', 'Initiate Renewal'),
          actionType: 'renew',
        });
      } else if (daysUntilEnd <= 60) {
        alerts.push({
          id: `renewal-60-${contract.id}`,
          type: 'renewal_due',
          severity: 'warning',
          title: t('lifecycle.renewalWarning', 'Renewal Approaching'),
          description: t('lifecycle.renewalWarningDesc', 'Contract expires in {{days}} days', { days: daysUntilEnd }),
          entityId: contract.id,
          entityName: startupName,
          daysUntil: daysUntilEnd,
          actionLabel: t('lifecycle.scheduleReview', 'Schedule Review'),
          actionType: 'review',
        });
      } else if (daysUntilEnd <= 90) {
        alerts.push({
          id: `renewal-90-${contract.id}`,
          type: 'renewal_due',
          severity: 'info',
          title: t('lifecycle.renewalInfo', 'Renewal in 90 Days'),
          description: t('lifecycle.renewalInfoDesc', 'Start planning contract renewal'),
          entityId: contract.id,
          entityName: startupName,
          daysUntil: daysUntilEnd,
          actionLabel: t('lifecycle.planRenewal', 'Plan Renewal'),
          actionType: 'review',
        });
      }
    });
    
    // 3. Anniversary alerts (1, 2, 3+ years) for price review
    activeContracts.forEach(contract => {
      const startDate = new Date(contract.start_date);
      const months = differenceInMonths(now, startDate);
      const years = Math.floor(months / 12);
      const startupName = contract.workspace?.startup?.name || 'Unknown';
      
      // Check for upcoming anniversaries (within 30 days)
      const nextAnniversary = addYears(startDate, years + 1);
      const daysUntilAnniversary = differenceInDays(nextAnniversary, now);
      
      if (daysUntilAnniversary > 0 && daysUntilAnniversary <= 30) {
        const severity: AlertSeverity = years >= 2 ? 'warning' : 'info';
        alerts.push({
          id: `anniversary-${contract.id}`,
          type: 'anniversary',
          severity,
          title: t('lifecycle.anniversary', 'Year {{year}} Anniversary', { year: years + 1 }),
          description: years >= 2 
            ? t('lifecycle.anniversaryReview', 'Consider fee review after {{years}} years', { years: years + 1 })
            : t('lifecycle.anniversaryInfo', 'Incubation anniversary approaching'),
          entityId: contract.id,
          entityName: startupName,
          daysUntil: daysUntilAnniversary,
          actionLabel: t('lifecycle.reviewFees', 'Review Fees'),
          actionType: 'review',
        });
      }
      
      // Critical alert for 3+ years
      if (months >= 36) {
        alerts.push({
          id: `3year-${contract.id}`,
          type: 'anniversary',
          severity: 'critical',
          title: t('lifecycle.threeYearMark', '3+ Year Mark'),
          description: t('lifecycle.threeYearMarkDesc', 'Startup has been incubating for over 3 years - review required'),
          entityId: contract.id,
          entityName: startupName,
          actionLabel: t('lifecycle.conductReview', 'Conduct Review'),
          actionType: 'review',
        });
      }
    });
    
    // Sort alerts by severity
    const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return (a.daysUntil ?? 999) - (b.daysUntil ?? 999);
    });
    
    // Calculate stats
    const stats = {
      totalActive: contracts.filter(c => c.status === 'active').length,
      pendingSignature: contracts.filter(c => c.status === 'pending_signature').length,
      drafts: contracts.filter(c => c.status === 'draft').length,
      expiringIn30: contracts.filter(c => c.status === 'active' && c.end_date && differenceInDays(new Date(c.end_date), now) <= 30).length,
      expiringIn90: contracts.filter(c => c.status === 'active' && c.end_date && differenceInDays(new Date(c.end_date), now) <= 90).length,
      leadsReadyForContract: contractedLeadsWithoutContract.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      warningAlerts: alerts.filter(a => a.severity === 'warning').length,
    };
    
    // Pipeline stages
    const pipeline = {
      new: funnelItems.filter(i => i.stage === 'new').length,
      meeting: funnelItems.filter(i => i.stage === 'first_contact_booked' || i.stage === 'met').length,
      qualified: funnelItems.filter(i => i.stage === 'qualified' || i.stage === 'proposal_sent' || i.stage === 'negotiating').length,
      contracted: funnelItems.filter(i => i.stage === 'contracted').length,
      active: contracts.filter(c => c.status === 'active').length,
    };
    
    return { alerts, stats, pipeline, contractedLeadsWithoutContract };
  }, [contracts, funnelItems, t]);
  
  const handleAlertAction = (alert: LifecycleAlert) => {
    switch (alert.actionType) {
      case 'convert': {
        const item = funnelItems?.find(i => i.id === alert.entityId);
        if (item) setConvertDialogItem(item);
        break;
      }
      case 'renew':
      case 'review': {
        const contract = contracts?.find(c => c.id === alert.entityId);
        if (contract?.workspace_id) {
          navigate(`/workspace/${contract.workspace_id}`);
        }
        break;
      }
      case 'archive':
        toast.info(t('lifecycle.archiveNotImplemented', 'Archive functionality coming soon'));
        break;
    }
  };
  
  const handleConvert = async (data: any) => {
    if (!convertDialogItem) return;
    
    try {
      await convertToStartup.mutateAsync({
        funnelItemId: convertDialogItem.id,
        ...data,
      });
      setConvertDialogItem(null);
      toast.success(t('lifecycle.converted', 'Successfully converted to startup with contract'));
    } catch (err) {
      toast.error(t('lifecycle.convertError', 'Failed to convert lead'));
    }
  };
  
  if (!lifecycleData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const { alerts, stats, pipeline, contractedLeadsWithoutContract } = lifecycleData;
  
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {t('lifecycle.title', 'Contract Lifecycle Hub')}
            </h2>
            <p className="text-muted-foreground">
              {t('lifecycle.subtitle', 'Manage the complete journey from lead to renewal')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats.criticalAlerts > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {stats.criticalAlerts} {t('lifecycle.criticalAlerts', 'Critical')}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('lifecycle.activeContracts', 'Active Contracts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActive}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingSignature > 0 && `+${stats.pendingSignature} pending signature`}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('lifecycle.expiringContracts', 'Expiring in 30 Days')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.expiringIn30}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.expiringIn90} in 90 days
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('lifecycle.readyForContract', 'Ready for Contract')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.leadsReadyForContract}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Leads in contracted stage
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-slate-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('lifecycle.drafts', 'Draft Contracts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.drafts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting completion
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Pipeline Visualization */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {t('lifecycle.pipeline', 'Lead to Contract Pipeline')}
            </CardTitle>
            <CardDescription>
              {t('lifecycle.pipelineDesc', 'Visual overview of your conversion funnel')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              {[
                { label: 'New Leads', count: pipeline.new, color: 'bg-slate-500' },
                { label: 'In Meetings', count: pipeline.meeting, color: 'bg-blue-500' },
                { label: 'Qualified', count: pipeline.qualified, color: 'bg-purple-500' },
                { label: 'Contracted', count: pipeline.contracted, color: 'bg-green-500' },
                { label: 'Active', count: pipeline.active, color: 'bg-emerald-600' },
              ].map((stage, i, arr) => (
                <div key={stage.label} className="flex items-center flex-1">
                  <div className="flex-1 text-center">
                    <div className={cn('mx-auto w-12 h-12 rounded-full flex items-center justify-center text-white font-bold', stage.color)}>
                      {stage.count}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{stage.label}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Tabs for Details */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              {t('lifecycle.tabOverview', 'Overview')}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5">
              <Bell className="h-4 w-4" />
              {t('lifecycle.tabAlerts', 'Alerts')}
              {alerts.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{alerts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5">
              <Rocket className="h-4 w-4" />
              {t('lifecycle.tabPendingConversions', 'Pending Conversions')}
              {contractedLeadsWithoutContract.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{contractedLeadsWithoutContract.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Upcoming Renewals */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('lifecycle.upcomingRenewals', 'Upcoming Renewals')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {alerts.filter(a => a.type === 'renewal_due').length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                        <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
                        <p className="text-sm">{t('lifecycle.noUpcomingRenewals', 'No renewals due in the next 90 days')}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {alerts.filter(a => a.type === 'renewal_due').slice(0, 5).map(alert => (
                          <div 
                            key={alert.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleAlertAction(alert)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                'w-2 h-2 rounded-full',
                                alert.severity === 'critical' ? 'bg-red-500' :
                                alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                              )} />
                              <span className="text-sm font-medium">{alert.entityName}</span>
                            </div>
                            <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                              {alert.daysUntil} days
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
              
              {/* Anniversary Reviews */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('lifecycle.anniversaryReviews', 'Anniversary Reviews')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {alerts.filter(a => a.type === 'anniversary').length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                        <CheckCircle2 className="h-8 w-8 mb-2 text-green-500" />
                        <p className="text-sm">{t('lifecycle.noAnniversaries', 'No anniversaries requiring attention')}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {alerts.filter(a => a.type === 'anniversary').slice(0, 5).map(alert => (
                          <div 
                            key={alert.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleAlertAction(alert)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                'w-2 h-2 rounded-full',
                                alert.severity === 'critical' ? 'bg-red-500' :
                                alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                              )} />
                              <div>
                                <span className="text-sm font-medium">{alert.entityName}</span>
                                <p className="text-xs text-muted-foreground">{alert.title}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            
            {/* AI Contract Intelligence */}
            {contracts && contracts.filter(c => c.status === 'active').length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {t('lifecycle.aiAnalysis', 'AI Contract Intelligence')}
                  </CardTitle>
                  <CardDescription>
                    {t('lifecycle.aiAnalysisDesc', 'Select a contract to analyze with AI — extracts key dates, risks, and recommended actions')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {contracts.filter(c => c.status === 'active').slice(0, 6).map(contract => (
                      <div key={contract.id} className="flex items-center gap-2">
                        <ContractIntelligenceCard
                          contractId={contract.id}
                          contractLabel={contract.workspace?.startup?.name || 'Contract'}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="alerts" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t('lifecycle.allAlerts', 'All Lifecycle Alerts')}
                </CardTitle>
                <CardDescription>
                  {t('lifecycle.alertsDesc', 'Action items requiring your attention')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium">{t('lifecycle.noAlerts', 'All Clear!')}</h3>
                    <p className="text-muted-foreground">{t('lifecycle.noAlertsDesc', 'No lifecycle alerts at this time')}</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {alerts.map(alert => (
                        <div 
                          key={alert.id}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50',
                            alert.severity === 'critical' && 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20',
                            alert.severity === 'warning' && 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'p-2 rounded-full',
                              alert.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/50' :
                              alert.severity === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50' :
                              'bg-blue-100 text-blue-600 dark:bg-blue-900/50'
                            )}>
                              {alert.type === 'renewal_due' ? <Calendar className="h-4 w-4" /> :
                               alert.type === 'anniversary' ? <Clock className="h-4 w-4" /> :
                               alert.type === 'pending_contract' ? <FileText className="h-4 w-4" /> :
                               <AlertTriangle className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{alert.entityName}</span>
                                <Badge variant="outline" className="text-xs">{alert.title}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{alert.description}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant={alert.severity === 'critical' ? 'destructive' : 'outline'}
                            onClick={() => handleAlertAction(alert)}
                          >
                            {alert.actionLabel}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="pipeline" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Rocket className="h-4 w-4" />
                  {t('lifecycle.pendingConversions', 'Leads Ready for Conversion')}
                </CardTitle>
                <CardDescription>
                  {t('lifecycle.pendingConversionsDesc', 'These leads are in the contracted stage and need workspace + contract setup')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contractedLeadsWithoutContract.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium">{t('lifecycle.allConverted', 'All Caught Up!')}</h3>
                    <p className="text-muted-foreground">{t('lifecycle.allConvertedDesc', 'All contracted leads have been converted')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contractedLeadsWithoutContract.map(item => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-100 text-green-600 dark:bg-green-900/50">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-medium">{item.organization_name || item.contact_name || 'Unnamed'}</span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {item.contact_email && <span>{item.contact_email}</span>}
                              {item.program && <Badge variant="outline" className="text-xs">{item.program.name}</Badge>}
                            </div>
                          </div>
                        </div>
                        <Button 
                          onClick={() => setConvertDialogItem(item)}
                          className="gap-1"
                        >
                          <Rocket className="h-4 w-4" />
                          {t('lifecycle.convert', 'Convert to Startup')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Convert Dialog */}
        {convertDialogItem && (
          <ConvertDialog
            item={convertDialogItem}
            programs={programs || []}
            incubationTypes={incubationTypes || []}
            buildings={buildings || []}
            onConvert={handleConvert}
            onClose={() => setConvertDialogItem(null)}
            isLoading={convertToStartup.isPending}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

function ConvertDialog({
  item,
  programs,
  incubationTypes,
  buildings,
  onConvert,
  onClose,
  isLoading,
}: {
  item: any;
  programs: { id: string; name: string }[];
  incubationTypes: any[];
  buildings: any[];
  onConvert: (data: any) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [programId, setProgramId] = useState(item.program_id || '');
  const [stage, setStage] = useState('ideation');
  const [incubationTypeId, setIncubationTypeId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  
  const selectedType = incubationTypes.find(t => t.id === incubationTypeId);
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            {t('lifecycle.convertToStartup', 'Convert to Startup')}
          </DialogTitle>
          <DialogDescription>
            {t('lifecycle.convertDesc', 'Create workspace and contract for {{name}}', { 
              name: item.organization_name || item.contact_name 
            })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('lifecycle.program', 'Program')}</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger>
                <SelectValue placeholder={t('lifecycle.selectProgram', 'Select program')} />
              </SelectTrigger>
              <SelectContent>
                {programs.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>{t('lifecycle.stage', 'Stage')}</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ideation">Ideation</SelectItem>
                <SelectItem value="validation">Validation</SelectItem>
                <SelectItem value="product_development">Product Development</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>{t('lifecycle.incubationType', 'Incubation Type')}</Label>
            <Select value={incubationTypeId} onValueChange={setIncubationTypeId}>
              <SelectTrigger>
                <SelectValue placeholder={t('lifecycle.selectType', 'Select type')} />
              </SelectTrigger>
              <SelectContent>
                {incubationTypes.filter(t => t.is_active).map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} (€{type.base_monthly_fee}/mo)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedType?.requires_space && (
            <div className="space-y-2">
              <Label>{t('lifecycle.building', 'Building')}</Label>
              <Select value={buildingId} onValueChange={setBuildingId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('lifecycle.selectBuilding', 'Select building')} />
                </SelectTrigger>
                <SelectContent>
                  {buildings.filter(b => b.is_active).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {selectedType && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium">{t('lifecycle.contractPreview', 'Contract Preview')}</p>
              <div className="mt-2 space-y-1 text-muted-foreground">
                <p>Monthly Fee: €{selectedType.base_monthly_fee}</p>
                {selectedType.includes_mentoring_hours > 0 && (
                  <p>Mentoring: {selectedType.includes_mentoring_hours}h/month</p>
                )}
                {selectedType.equity_percentage && (
                  <p>Equity: {selectedType.equity_percentage}%</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={() => onConvert({ 
              programId, 
              stage, 
              incubationTypeId: incubationTypeId || undefined,
              buildingId: buildingId || undefined,
              monthlyFee: selectedType?.base_monthly_fee,
            })}
            disabled={!programId || isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('lifecycle.converting', 'Converting...')}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('lifecycle.createWorkspaceContract', 'Create Workspace & Contract')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
