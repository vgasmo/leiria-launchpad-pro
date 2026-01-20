import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  Users,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaybookStat {
  playbookId: string;
  title: string;
  deploymentsCount: number;
  avgCompletionRate: number;
  avgDaysToComplete: number;
  trend: 'up' | 'down' | 'stable';
}

interface StageMetric {
  stage: string;
  playbooksAvailable: number;
  playbooksDeployed: number;
  avgProgress: number;
}

// Mock data - in production, this would come from hooks
const MOCK_PLAYBOOK_STATS: PlaybookStat[] = [
  { playbookId: '1', title: 'Problem Validation Sprint', deploymentsCount: 24, avgCompletionRate: 78, avgDaysToComplete: 14, trend: 'up' },
  { playbookId: '2', title: 'Customer Discovery', deploymentsCount: 18, avgCompletionRate: 65, avgDaysToComplete: 21, trend: 'stable' },
  { playbookId: '3', title: 'MVP Launch Checklist', deploymentsCount: 12, avgCompletionRate: 42, avgDaysToComplete: 35, trend: 'down' },
  { playbookId: '4', title: 'Pitch Deck Builder', deploymentsCount: 31, avgCompletionRate: 89, avgDaysToComplete: 7, trend: 'up' },
  { playbookId: '5', title: 'Unit Economics Workshop', deploymentsCount: 8, avgCompletionRate: 55, avgDaysToComplete: 10, trend: 'stable' },
];

const MOCK_STAGE_METRICS: StageMetric[] = [
  { stage: 'Ideation', playbooksAvailable: 5, playbooksDeployed: 18, avgProgress: 72 },
  { stage: 'Validation', playbooksAvailable: 4, playbooksDeployed: 24, avgProgress: 58 },
  { stage: 'MVP', playbooksAvailable: 3, playbooksDeployed: 12, avgProgress: 45 },
  { stage: 'Growth', playbooksAvailable: 4, playbooksDeployed: 8, avgProgress: 32 },
];

export function PlaybookAnalyticsTab() {
  const { t } = useTranslation();

  const totalDeployments = MOCK_PLAYBOOK_STATS.reduce((sum, p) => sum + p.deploymentsCount, 0);
  const avgCompletionRate = Math.round(
    MOCK_PLAYBOOK_STATS.reduce((sum, p) => sum + p.avgCompletionRate, 0) / MOCK_PLAYBOOK_STATS.length
  );
  const avgDaysToComplete = Math.round(
    MOCK_PLAYBOOK_STATS.reduce((sum, p) => sum + p.avgDaysToComplete, 0) / MOCK_PLAYBOOK_STATS.length
  );

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-3 w-3 text-green-500" />;
      case 'down': return <ArrowDown className="h-3 w-3 text-red-500" />;
      default: return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 75) return 'text-green-600';
    if (rate >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('consultorTools.playbooks.totalDeployments', 'Total Deployments')}</p>
                <p className="text-2xl font-bold">{totalDeployments}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('consultorTools.playbooks.avgCompletion', 'Avg Completion')}</p>
                <p className="text-2xl font-bold">{avgCompletionRate}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('consultorTools.playbooks.avgDays', 'Avg Days to Complete')}</p>
                <p className="text-2xl font-bold">{avgDaysToComplete}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('consultorTools.playbooks.activeStartups', 'Active Startups')}</p>
                <p className="text-2xl font-bold">42</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Playbook Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('consultorTools.playbooks.performanceTitle', 'Playbook Performance')}
          </CardTitle>
          <CardDescription>
            {t('consultorTools.playbooks.performanceDesc', 'Track completion rates and identify improvement opportunities')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MOCK_PLAYBOOK_STATS.map((playbook) => (
              <div 
                key={playbook.playbookId}
                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{playbook.title}</p>
                    {getTrendIcon(playbook.trend)}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{playbook.deploymentsCount} {t('consultorTools.playbooks.deployments', 'deployments')}</span>
                    <span>~{playbook.avgDaysToComplete} {t('consultorTools.playbooks.days', 'days')}</span>
                  </div>
                </div>
                <div className="w-32">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{t('consultorTools.playbooks.completion', 'Completion')}</span>
                    <span className={cn('font-medium', getCompletionColor(playbook.avgCompletionRate))}>
                      {playbook.avgCompletionRate}%
                    </span>
                  </div>
                  <Progress value={playbook.avgCompletionRate} className="h-2" />
                </div>
                <Badge 
                  variant={playbook.avgCompletionRate >= 75 ? 'default' : playbook.avgCompletionRate >= 50 ? 'secondary' : 'outline'}
                  className={cn(
                    playbook.avgCompletionRate < 50 && 'border-amber-500 text-amber-600'
                  )}
                >
                  {playbook.avgCompletionRate >= 75 
                    ? t('consultorTools.playbooks.excellent', 'Excellent')
                    : playbook.avgCompletionRate >= 50 
                    ? t('consultorTools.playbooks.good', 'Good')
                    : t('consultorTools.playbooks.needsWork', 'Needs Work')
                  }
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stage Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            {t('consultorTools.playbooks.stageCoverage', 'Stage Coverage')}
          </CardTitle>
          <CardDescription>
            {t('consultorTools.playbooks.stageCoverageDesc', 'Playbook deployment and progress by startup stage')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {MOCK_STAGE_METRICS.map((stage) => (
              <div key={stage.stage} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{stage.stage}</h4>
                  <Badge variant="outline">{stage.playbooksAvailable} available</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('consultorTools.playbooks.deployed', 'Deployed')}</span>
                    <span className="font-medium">{stage.playbooksDeployed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('consultorTools.playbooks.avgProgress', 'Avg Progress')}</span>
                    <span className={cn('font-medium', getCompletionColor(stage.avgProgress))}>
                      {stage.avgProgress}%
                    </span>
                  </div>
                  <Progress value={stage.avgProgress} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                {t('consultorTools.playbooks.insightTitle', 'Improvement Opportunity')}
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {t('consultorTools.playbooks.insightText', 
                  'MVP Launch Checklist has a 42% completion rate. Consider breaking it into smaller phases or scheduling mid-playbook check-ins with founders.'
                )}
              </p>
              <div className="flex gap-2 mt-3">
                <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {t('consultorTools.playbooks.reviewPlaybook', 'Review Playbook')}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
