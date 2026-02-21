import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  FileText,
  AlertTriangle,
  Building2,
  ArrowRight,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAdminDashboardStats } from '@/hooks/useAdminDashboardStats';
import { useEcosystemInsights } from '@/hooks/useEcosystemInsights';
import { EcosystemInsights } from '@/components/dashboard/EcosystemInsights';
import type { WorkspaceWithDetails } from '@/hooks/useWorkspaces';

interface AdminDashboardProps {
  workspaces: WorkspaceWithDetails[];
  isLoading: boolean;
  programsCount: number;
  onSwitchToPortfolio: () => void;
}

export function AdminDashboard({ workspaces, isLoading: workspacesLoading, programsCount, onSwitchToPortfolio }: AdminDashboardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();

  const isLoading = workspacesLoading || statsLoading;

  // Compute health distribution from workspaces
  const healthDistribution = { critical: 0, at_risk: 0, stable: 0, healthy: 0, thriving: 0 };
  const overdueCount = workspaces.filter(w => w.overdueActionsCount > 0).length;
  const totalOverdueActions = workspaces.reduce((sum, w) => sum + (w.overdueActionsCount || 0), 0);

  workspaces.forEach(w => {
    const h = (w.health_score_override || w.health_score || 'stable') as keyof typeof healthDistribution;
    if (h in healthDistribution) healthDistribution[h]++;
  });

  const needsAttention = healthDistribution.critical + healthDistribution.at_risk;

  // Smart insights
  const insights = useEcosystemInsights({
    totalStartups: workspaces.length,
    activeStartups: workspaces.length,
    healthDistribution,
    overdueActionsCount: totalOverdueActions,
    missingKpisCount: 0, // TODO: compute from workspaces
    sessionsThisWeek: 0, // TODO: add to stats hook
    pendingApprovals: stats?.pendingApprovalsCount ?? 0,
    totalMentors: 0,
    activeMentors: 0,
    totalConsultants: 0,
  });

  const signals = [
    {
      key: 'approvals',
      label: t('admin.pendingApprovals'),
      value: stats?.pendingApprovalsCount ?? 0,
      icon: Users,
      href: '/admin?tab=users',
      variant: 'warning' as const,
    },
    {
      key: 'renewals',
      label: t('admin.contractRenewals'),
      value: stats?.contractRenewals30d ?? 0,
      icon: FileText,
      href: '/admin?tab=backoffice',
      variant: 'info' as const,
    },
    {
      key: 'overdue',
      label: t('admin.overdueInvoices'),
      value: stats?.overdueInvoicesCount ?? 0,
      icon: AlertTriangle,
      href: '/admin?tab=backoffice',
      variant: 'destructive' as const,
    },
    {
      key: 'occupancy',
      label: t('admin.occupancy'),
      value: stats ? `${stats.occupiedSpaces}/${stats.totalSpaces}` : '—',
      icon: Building2,
      href: '/admin?tab=backoffice',
      variant: 'default' as const,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  // Exception alerts that need immediate action
  const exceptionAlerts = signals.filter(s => typeof s.value === 'number' && s.value > 0 && s.variant !== 'default');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HERO: Exception-Based Alerts — actionable items FIRST */}
      {exceptionAlerts.length > 0 && (
        <Card className="rounded-2xl border-amber-300/50 bg-amber-50/30 dark:border-amber-700/30 dark:bg-amber-900/10">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3">
              {t('admin.exceptionsTitle', { defaultValue: 'Requires Your Attention' })}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {exceptionAlerts.map((alert) => {
                const Icon = alert.icon;
                return (
                  <div
                    key={alert.key}
                    className="flex items-center gap-3 p-3 rounded-xl bg-background/80 cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => navigate(alert.href)}
                  >
                    <div className={cn(
                      'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
                      alert.variant === 'destructive' ? 'bg-destructive/10' : 'bg-amber-100 dark:bg-amber-900/30'
                    )}>
                      <Icon className={cn(
                        'h-4 w-4',
                        alert.variant === 'destructive' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{alert.value as number}</p>
                      <p className="text-xs text-muted-foreground truncate">{alert.label}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Switch to portfolio view */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('admin.commandCenter')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('admin.ecosystemSummary', {
              startups: workspaces.length,
              programs: programsCount,
            })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onSwitchToPortfolio} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">{t('admin.portfolioView')}</span>
        </Button>
      </div>

      {/* Signal Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {signals.map((signal) => {
          const Icon = signal.icon;
          const hasAlert = typeof signal.value === 'number' && signal.value > 0 && signal.variant !== 'default';

          return (
            <Card
              key={signal.key}
              className={cn(
                'cursor-pointer hover:shadow-md transition-shadow rounded-2xl',
                hasAlert && signal.variant === 'destructive' && 'border-destructive/30 bg-destructive/5',
                hasAlert && signal.variant === 'warning' && 'border-amber-300/50 bg-amber-50/30 dark:border-amber-700/30 dark:bg-amber-900/10',
              )}
              onClick={() => navigate(signal.href)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{signal.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className={cn(
                    'text-2xl font-bold',
                    hasAlert && signal.variant === 'destructive' && 'text-destructive',
                    hasAlert && signal.variant === 'warning' && 'text-amber-600 dark:text-amber-400',
                  )}>
                    {signal.value}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Smart Insights */}
      <EcosystemInsights insights={insights} />

      {/* Portfolio Health Summary */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {t('admin.portfolioHealth')}
            {needsAttention > 0 && (
              <Badge variant="destructive" className="text-xs">
                {needsAttention} {t('admin.needAttention')}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(healthDistribution).map(([health, count]) => {
              const colors: Record<string, string> = {
                critical: 'bg-health-critical',
                at_risk: 'bg-health-at-risk',
                stable: 'bg-health-stable',
                healthy: 'bg-health-healthy',
                thriving: 'bg-health-thriving',
              };
              return (
                <div key={health} className="text-center">
                  <div className={cn('h-2 rounded-full mb-2', colors[health])} />
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {t(`health.levels.${health}`, health)}
                  </p>
                </div>
              );
            })}
          </div>
          {overdueCount > 0 && (
            <div className="mt-4 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => navigate('/my-workspaces?filter=attention')}
              >
                <Clock className="h-4 w-4 mr-2" />
                {t('admin.overdueStartups', { count: overdueCount })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: t('admin.crmPipeline'), href: '/crm', icon: Users },
          { label: t('admin.operations'), href: '/admin?tab=backoffice', icon: Building2 },
          { label: t('admin.programs'), href: '/admin?tab=programs-setup', icon: FileText },
          { label: t('admin.reports'), href: '/admin?tab=reports', icon: AlertTriangle },
        ].map((link) => {
          const Icon = link.icon;
          return (
            <Button
              key={link.href}
              variant="outline"
              className="h-auto py-3 justify-start gap-3 rounded-xl"
              onClick={() => navigate(link.href)}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {link.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
