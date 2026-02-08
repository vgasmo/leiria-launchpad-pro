import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, FileText, Clock, AlertTriangle, CalendarClock, 
  TrendingUp, Users, ArrowRight, Cake, AlertCircle, CheckCircle2,
  Timer, MapPin
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInMonths, differenceInDays, isBefore, addYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface ContractWithDetails {
  id: string;
  workspace_id: string;
  start_date: string;
  end_date: string | null;
  status: string;
  monthly_fee: number;
  incubation_type: { name: string; contract_type: string | null } | null;
  building: { name: string; city: string | null } | null;
  workspace: { id: string; startup: { name: string } | null } | null;
}

interface AnniversaryAlert {
  id: string;
  startupName: string;
  startDate: string;
  yearsIncubated: number;
  monthsIncubated: number;
  daysUntilAnniversary: number;
  alertType: 'anniversary' | 'year3' | 'expiring' | 'renewal';
  severity: 'info' | 'warning' | 'critical';
}

export function BackofficeDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Fetch comprehensive dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['backoffice-full-dashboard'],
    queryFn: async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Fetch active contracts with all details
      const { data: contracts } = await supabase
        .from('startup_contracts')
        .select(`
          id,
          workspace_id,
          start_date,
          end_date,
          status,
          monthly_fee,
          incubation_type:incubation_types(name, contract_type),
          building:buildings(name, city),
          workspace:workspaces(id, startup:startups(name))
        `)
        .eq('status', 'active') as { data: ContractWithDetails[] | null };
      
      // Fetch room allocations for occupancy stats
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, status');
      
      // Fetch waiting list
      const { data: waitingList } = await supabase
        .from('space_waiting_list')
        .select('id, status, priority')
        .eq('status', 'waiting');

      // Calculate anniversaries and alerts
      const alerts: AnniversaryAlert[] = [];
      const contractsByAge: Record<string, number> = {
        'under1year': 0,
        '1to2years': 0,
        '2to3years': 0,
        'over3years': 0,
      };

      contracts?.forEach(contract => {
        const startDate = new Date(contract.start_date);
        const startupName = contract.workspace?.startup?.name || 'Unknown';
        const monthsIncubated = differenceInMonths(today, startDate);
        const yearsIncubated = Math.floor(monthsIncubated / 12);
        
        // Categorize by age
        if (monthsIncubated < 12) {
          contractsByAge['under1year']++;
        } else if (monthsIncubated < 24) {
          contractsByAge['1to2years']++;
        } else if (monthsIncubated < 36) {
          contractsByAge['2to3years']++;
        } else {
          contractsByAge['over3years']++;
        }
        
        // Calculate next anniversary
        const nextAnniversary = addYears(startDate, yearsIncubated + 1);
        const daysUntilAnniversary = differenceInDays(nextAnniversary, today);
        
        // Year 3 alert (critical - price increase or exit)
        if (yearsIncubated === 2 && monthsIncubated >= 33) {
          alerts.push({
            id: contract.id,
            startupName,
            startDate: contract.start_date,
            yearsIncubated: 3,
            monthsIncubated,
            daysUntilAnniversary: differenceInDays(addYears(startDate, 3), today),
            alertType: 'year3',
            severity: 'critical',
          });
        }
        // Over 3 years - should have been addressed
        else if (yearsIncubated >= 3) {
          alerts.push({
            id: contract.id,
            startupName,
            startDate: contract.start_date,
            yearsIncubated,
            monthsIncubated,
            daysUntilAnniversary,
            alertType: 'year3',
            severity: 'critical',
          });
        }
        // Upcoming anniversary within 30 days
        else if (daysUntilAnniversary <= 30 && daysUntilAnniversary > 0) {
          alerts.push({
            id: contract.id,
            startupName,
            startDate: contract.start_date,
            yearsIncubated: yearsIncubated + 1,
            monthsIncubated,
            daysUntilAnniversary,
            alertType: 'anniversary',
            severity: yearsIncubated >= 2 ? 'warning' : 'info',
          });
        }
        
        // Contract expiring soon
        if (contract.end_date) {
          const endDate = new Date(contract.end_date);
          const daysUntilExpiry = differenceInDays(endDate, today);
          if (daysUntilExpiry <= 60 && daysUntilExpiry > 0) {
            alerts.push({
              id: contract.id,
              startupName,
              startDate: contract.start_date,
              yearsIncubated,
              monthsIncubated,
              daysUntilAnniversary: daysUntilExpiry,
              alertType: 'expiring',
              severity: daysUntilExpiry <= 30 ? 'critical' : 'warning',
            });
          }
        }
      });

      // Sort alerts by severity and days
      alerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return a.daysUntilAnniversary - b.daysUntilAnniversary;
      });

      // Calculate total monthly revenue
      const totalMonthlyRevenue = contracts?.reduce((sum, c) => sum + (c.monthly_fee || 0), 0) || 0;

      // Occupancy stats
      const occupiedRooms = rooms?.filter(r => r.status === 'occupied').length || 0;
      const totalRooms = rooms?.length || 0;
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

      return {
        totalActiveContracts: contracts?.length || 0,
        totalMonthlyRevenue,
        contractsByAge,
        alerts: alerts.slice(0, 10), // Top 10 alerts
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        occupancyRate,
        occupiedRooms,
        totalRooms,
        waitingListCount: waitingList?.length || 0,
        highPriorityWaiting: waitingList?.filter(w => w.priority >= 80).length || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-4">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const data = dashboardData!;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{data.totalActiveContracts}</div>
                <p className="text-sm text-muted-foreground">{t('admin.backoffice.dashboardPanel.activeContracts', 'Active Contracts')}</p>
              </div>
              <FileText className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">€{data.totalMonthlyRevenue.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">{t('admin.backoffice.dashboardPanel.monthlyRevenue', 'Monthly Revenue')}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(data.occupancyRate < 70 && 'border-yellow-500/50')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{data.occupancyRate}%</div>
                <p className="text-sm text-muted-foreground">
                  {t('admin.backoffice.dashboardPanel.occupancy', 'Occupancy')} ({data.occupiedRooms}/{data.totalRooms})
                </p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(data.waitingListCount > 0 && 'border-orange-500/50')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{data.waitingListCount}</div>
                <p className="text-sm text-muted-foreground">
                  {t('admin.backoffice.dashboardPanel.waitingList', 'Waiting List')}
                  {data.highPriorityWaiting > 0 && (
                    <span className="text-orange-600 ml-1">({data.highPriorityWaiting} {t('admin.backoffice.dashboardPanel.urgent', 'urgent')})</span>
                  )}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Incubation Tenure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Alerts */}
        <Card className={cn(data.criticalAlerts > 0 && 'border-red-500/50')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={cn('h-5 w-5', data.criticalAlerts > 0 ? 'text-red-500' : 'text-muted-foreground')} />
              {t('admin.backoffice.dashboardPanel.alerts', 'Alerts & Anniversaries')}
              {data.criticalAlerts > 0 && (
                <Badge variant="destructive" className="ml-2">{data.criticalAlerts} {t('admin.backoffice.dashboardPanel.critical', 'critical')}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {t('admin.backoffice.dashboardPanel.alertsDesc', 'Upcoming anniversaries, contract renewals, and 3-year milestones')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.alerts.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                {t('admin.backoffice.dashboardPanel.noAlerts', 'No upcoming alerts')}
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-3">
                  {data.alerts.map((alert, idx) => (
                    <div 
                      key={`${alert.id}-${idx}`}
                      className={cn(
                        'p-3 rounded-lg border flex items-start gap-3',
                        alert.severity === 'critical' && 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
                        alert.severity === 'warning' && 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800',
                        alert.severity === 'info' && 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
                      )}
                    >
                      <div className={cn(
                        'mt-0.5',
                        alert.severity === 'critical' && 'text-red-600',
                        alert.severity === 'warning' && 'text-yellow-600',
                        alert.severity === 'info' && 'text-blue-600',
                      )}>
                        {alert.alertType === 'year3' ? (
                          <AlertCircle className="h-5 w-5" />
                        ) : alert.alertType === 'expiring' ? (
                          <CalendarClock className="h-5 w-5" />
                        ) : (
                          <Cake className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{alert.startupName}</div>
                        <div className="text-sm text-muted-foreground">
                          {alert.alertType === 'year3' && (
                            <>
                              <span className="font-medium text-red-600">
                                {alert.yearsIncubated >= 3 
                                  ? t('admin.backoffice.dashboardPanel.over3Years', '3+ years incubated')
                                  : t('admin.backoffice.dashboardPanel.approaching3Years', 'Approaching 3-year mark')}
                              </span>
                              {' — '}
                              {t('admin.backoffice.dashboardPanel.priceIncreaseOrExit', 'Review for price increase or graduation')}
                            </>
                          )}
                          {alert.alertType === 'anniversary' && (
                            <>
                              {t('admin.backoffice.dashboardPanel.yearAnniversary', 'Year {{year}} anniversary', { year: alert.yearsIncubated })}
                              {' — '}
                              {alert.daysUntilAnniversary} {t('admin.backoffice.dashboardPanel.daysAway', 'days away')}
                            </>
                          )}
                          {alert.alertType === 'expiring' && (
                            <>
                              {t('admin.backoffice.dashboardPanel.contractExpiring', 'Contract expiring')}
                              {' — '}
                              {alert.daysUntilAnniversary} {t('admin.backoffice.dashboardPanel.daysRemaining', 'days remaining')}
                            </>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t('admin.backoffice.dashboardPanel.incubatedSince', 'Incubated since')} {format(new Date(alert.startDate), 'MMM yyyy')} 
                          {' '}({alert.monthsIncubated} {t('admin.backoffice.dashboardPanel.months', 'months')})
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/workspaces/${alert.id}`)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Incubation Tenure Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              {t('admin.backoffice.dashboardPanel.tenureBreakdown', 'Incubation Tenure')}
            </CardTitle>
            <CardDescription>
              {t('admin.backoffice.dashboardPanel.tenureDesc', 'Distribution of startups by time incubated')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { key: 'under1year', label: t('admin.backoffice.dashboardPanel.under1Year', '< 1 year'), color: 'bg-green-500' },
                { key: '1to2years', label: t('admin.backoffice.dashboardPanel.1to2Years', '1-2 years'), color: 'bg-blue-500' },
                { key: '2to3years', label: t('admin.backoffice.dashboardPanel.2to3Years', '2-3 years'), color: 'bg-yellow-500' },
                { key: 'over3years', label: t('admin.backoffice.dashboardPanel.over3Years', '3+ years'), color: 'bg-red-500' },
              ].map(item => {
                const count = data.contractsByAge[item.key] || 0;
                const percentage = data.totalActiveContracts > 0 
                  ? Math.round((count / data.totalActiveContracts) * 100) 
                  : 0;
                
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="font-medium">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn('h-full rounded-full transition-all', item.color)}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {data.contractsByAge['over3years'] > 0 && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-red-700 dark:text-red-400">
                      {data.contractsByAge['over3years']} {t('admin.backoffice.dashboardPanel.startupsOver3Years', 'startups over 3 years')}
                    </span>
                    <p className="text-muted-foreground mt-0.5">
                      {t('admin.backoffice.dashboardPanel.reviewRecommended', 'Review recommended for price adjustment or graduation')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
