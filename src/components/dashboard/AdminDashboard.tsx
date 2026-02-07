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

  workspaces.forEach(w => {
    const h = (w.health_score_override || w.health_score || 'stable') as keyof typeof healthDistribution;
    if (h in healthDistribution) healthDistribution[h]++;
  });

  const needsAttention = healthDistribution.critical + healthDistribution.at_risk;

  const signals = [
    {
      key: 'approvals',
      label: t('admin.pendingApprovals', 'Pending Approvals'),
      value: stats?.pendingApprovalsCount ?? 0,
      icon: Users,
      href: '/admin?tab=users',
      variant: 'warning' as const,
    },
    {
      key: 'renewals',
      label: t('admin.contractRenewals', 'Contract Renewals (30d)'),
      value: stats?.contractRenewals30d ?? 0,
      icon: FileText,
      href: '/admin?tab=backoffice',
      variant: 'info' as const,
    },
    {
      key: 'overdue',
      label: t('admin.overdueInvoices', 'Overdue Invoices'),
      value: stats?.overdueInvoicesCount ?? 0,
      icon: AlertTriangle,
      href: '/admin?tab=backoffice',
      variant: 'destructive' as const,
    },
    {
      key: 'occupancy',
      label: t('admin.occupancy', 'Space Occupancy'),
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Switch to portfolio view */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('admin.commandCenter', 'Command Center')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('admin.ecosystemSummary', '{{startups}} startups · {{programs}} programs', {
              startups: workspaces.length,
              programs: programsCount,
            })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onSwitchToPortfolio} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">{t('admin.portfolioView', 'Portfolio View')}</span>
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

      {/* Portfolio Health Summary */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {t('admin.portfolioHealth', 'Portfolio Health')}
            {needsAttention > 0 && (
              <Badge variant="destructive" className="text-xs">
                {needsAttention} {t('admin.needAttention', 'need attention')}
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
                {t('admin.overdueStartups', '{{count}} startups with overdue actions', { count: overdueCount })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: t('admin.crmPipeline', 'CRM Pipeline'), href: '/crm', icon: Users },
          { label: t('admin.operations', 'Operations'), href: '/admin?tab=backoffice', icon: Building2 },
          { label: t('admin.programs', 'Programs'), href: '/admin?tab=programs-setup', icon: FileText },
          { label: t('admin.reports', 'Reports'), href: '/admin?tab=reports', icon: AlertTriangle },
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
