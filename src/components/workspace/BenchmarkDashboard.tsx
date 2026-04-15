import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, BarChart3, Activity, Users, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface BenchmarkData {
  program_id: string;
  stage: string;
  startup_count: number;
  avg_health_score: number | null;
  avg_milestones_completed: number | null;
  avg_actions_completed: number | null;
  avg_kpi_entries: number | null;
}

interface BenchmarkDashboardProps {
  workspaceId: string;
  programId?: string;
  currentStage?: string;
  myHealthScore?: number | null;
  myMilestonesCompleted?: number;
  myActionsCompleted?: number;
}

function useBenchmarks(programId?: string) {
  return useQuery({
    queryKey: ['program-benchmarks', programId],
    queryFn: async (): Promise<BenchmarkData[]> => {
      let query = supabase.from('program_benchmarks').select('*');
      if (programId) query = query.eq('program_id', programId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BenchmarkData[];
    },
  });
}

function ComparisonIndicator({ myValue, avgValue, unit }: { myValue: number; avgValue: number; unit?: string }) {
  const diff = myValue - avgValue;
  const pct = avgValue > 0 ? Math.round((diff / avgValue) * 100) : 0;
  
  if (Math.abs(pct) < 5) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> Na média
      </span>
    );
  }
  
  return diff > 0 ? (
    <span className="flex items-center gap-1 text-xs text-green-600">
      <ArrowUp className="h-3 w-3" /> +{pct}% {unit || ''}
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-amber-600">
      <ArrowDown className="h-3 w-3" /> {pct}% {unit || ''}
    </span>
  );
}

export function BenchmarkDashboard({
  workspaceId,
  programId,
  currentStage,
  myHealthScore,
  myMilestonesCompleted = 0,
  myActionsCompleted = 0,
}: BenchmarkDashboardProps) {
  const { t } = useTranslation();
  const { data: benchmarks, isLoading } = useBenchmarks(programId);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36" />)}
      </div>
    );
  }

  const stageBenchmark = benchmarks?.find(b => b.stage === currentStage);
  const allStages = benchmarks || [];

  if (!stageBenchmark && allStages.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {t('benchmark.noData', 'Dados de benchmark ainda não disponíveis. Serão apresentados quando houver startups suficientes no programa.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const avg = stageBenchmark || { avg_health_score: 0, avg_milestones_completed: 0, avg_actions_completed: 0, avg_kpi_entries: 0, startup_count: 0 };

  const metrics = [
    {
      icon: Activity,
      label: t('benchmark.healthScore', 'Health Score'),
      myValue: myHealthScore ?? 0,
      avgValue: avg.avg_health_score ?? 0,
      max: 100,
      color: 'text-primary',
    },
    {
      icon: Target,
      label: t('benchmark.milestones', 'Milestones Concluídos'),
      myValue: myMilestonesCompleted,
      avgValue: avg.avg_milestones_completed ?? 0,
      max: Math.max(myMilestonesCompleted, (avg.avg_milestones_completed ?? 0)) * 1.5 || 10,
      color: 'text-green-600',
    },
    {
      icon: TrendingUp,
      label: t('benchmark.actions', 'Ações Concluídas'),
      myValue: myActionsCompleted,
      avgValue: avg.avg_actions_completed ?? 0,
      max: Math.max(myActionsCompleted, (avg.avg_actions_completed ?? 0)) * 1.5 || 20,
      color: 'text-blue-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">
                {t('benchmark.title', 'Benchmark do Programa')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('benchmark.description', 'Comparação anónima com startups na mesma fase')}
              </p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {avg.startup_count} {t('benchmark.startups', 'startups')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Metrics comparison */}
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const myPct = metric.max > 0 ? Math.min((metric.myValue / metric.max) * 100, 100) : 0;
          const avgPct = metric.max > 0 ? Math.min((metric.avgValue / metric.max) * 100, 100) : 0;

          return (
            <Card key={metric.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold">{Math.round(metric.myValue)}</p>
                    <p className="text-xs text-muted-foreground">{t('benchmark.you', 'Tu')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg text-muted-foreground">{Math.round(metric.avgValue)}</p>
                    <p className="text-xs text-muted-foreground">{t('benchmark.avg', 'Média')}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-12 text-muted-foreground">{t('benchmark.you', 'Tu')}</span>
                    <Progress value={myPct} className="flex-1 h-2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-12 text-muted-foreground">{t('benchmark.avg', 'Média')}</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-muted-foreground/40 rounded-full" style={{ width: `${avgPct}%` }} />
                    </div>
                  </div>
                </div>
                <ComparisonIndicator myValue={metric.myValue} avgValue={metric.avgValue} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stage progression overview */}
      {allStages.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('benchmark.stageOverview', 'Visão por Fase')}</CardTitle>
            <CardDescription>{t('benchmark.stageDesc', 'Métricas médias de cada fase do programa')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allStages.map(stage => (
                <div
                  key={stage.stage}
                  className={`flex items-center gap-4 p-2 rounded-lg ${stage.stage === currentStage ? 'bg-primary/5 border border-primary/20' : ''}`}
                >
                  <Badge variant={stage.stage === currentStage ? 'default' : 'secondary'} className="min-w-[80px] justify-center">
                    {t(`stages.${stage.stage}`, stage.stage)}
                  </Badge>
                  <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">{t('benchmark.healthScore', 'Health Score')}</span>
                      <p className="font-medium">{stage.avg_health_score ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t('benchmark.milestones', 'Milestones')}</span>
                      <p className="font-medium">{stage.avg_milestones_completed ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t('benchmark.actions', 'Actions')}</span>
                      <p className="font-medium">{stage.avg_actions_completed ?? '—'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{stage.startup_count} startups</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}