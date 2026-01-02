import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  Calendar,
  BarChart3,
  ClipboardCheck,
  ChevronDown,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from 'lucide-react';
import { useWorkspaceHealth, getHealthScoreConfig, HealthExplanationFactor } from '@/hooks/useHealthScore';

interface HealthModelBreakdownProps {
  workspaceId: string;
  programId: string | null;
}

interface HealthModel {
  weights_json: {
    actions: number;
    sessions: number;
    kpis: number;
    checkins: number;
  };
  thresholds_json: {
    thriving: number;
    healthy: number;
    stable: number;
    at_risk: number;
  };
  is_enabled: boolean;
}

const DEFAULT_WEIGHTS = { actions: 30, sessions: 20, kpis: 30, checkins: 20 };
const DEFAULT_THRESHOLDS = { thriving: 85, healthy: 70, stable: 50, at_risk: 30 };

// Calculation windows explanation
const CALCULATION_WINDOWS = {
  actions: 'Last 30 days: completion rate + overdue penalty',
  sessions: 'Days since last session + upcoming bonus',
  kpis: 'Current month fill rate + trend adjustment',
  checkins: 'Last 30 days on-time submission rate',
};

export function HealthModelBreakdown({ workspaceId, programId }: HealthModelBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: health, isLoading: healthLoading } = useWorkspaceHealth(workspaceId);

  // Fetch program health model
  const { data: model, isLoading: modelLoading } = useQuery({
    queryKey: ['program-health-model', programId],
    queryFn: async () => {
      if (!programId) return null;
      const { data, error } = await supabase
        .from('program_health_model')
        .select('*')
        .eq('program_id', programId)
        .eq('is_enabled', true)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as HealthModel | null;
    },
    enabled: !!programId,
  });

  if (healthLoading || modelLoading) {
    return <Skeleton className="h-32" />;
  }

  const weights = model?.weights_json || DEFAULT_WEIGHTS;
  const thresholds = model?.thresholds_json || DEFAULT_THRESHOLDS;
  const components = (health?.health_score_components as { actions: number; sessions: number; kpis: number; checkins: number } | null) || null;
  const explanation = (health?.health_score_explanation as HealthExplanationFactor[]) || [];
  const numericScore = health?.health_score_numeric || 0;
  const effectiveScore = health?.health_score_override || health?.health_score;
  const config = getHealthScoreConfig(effectiveScore || null);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">
                  How Health is Calculated
                </CardTitle>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Current Score Summary */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className={`text-2xl font-bold p-3 rounded-lg ${config.color}`}>
                {config.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{config.label}</span>
                  {health?.health_score_override && (
                    <Badge variant="outline" className="text-xs">Manual override</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={numericScore} className="flex-1 h-2" />
                  <span className="text-sm font-medium">{numericScore}/100</span>
                </div>
              </div>
            </div>

            {/* Program Model Info */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4" />
                {model ? 'Program Health Model' : 'Default Health Model'}
              </div>
              
              {/* Weights */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-muted">
                  <Activity className="h-4 w-4 mx-auto mb-1" />
                  <div>Actions</div>
                  <div className="font-bold">{weights.actions}%</div>
                </div>
                <div className="p-2 rounded bg-muted">
                  <Calendar className="h-4 w-4 mx-auto mb-1" />
                  <div>Sessions</div>
                  <div className="font-bold">{weights.sessions}%</div>
                </div>
                <div className="p-2 rounded bg-muted">
                  <BarChart3 className="h-4 w-4 mx-auto mb-1" />
                  <div>KPIs</div>
                  <div className="font-bold">{weights.kpis}%</div>
                </div>
                <div className="p-2 rounded bg-muted">
                  <ClipboardCheck className="h-4 w-4 mx-auto mb-1" />
                  <div>Check-ins</div>
                  <div className="font-bold">{weights.checkins}%</div>
                </div>
              </div>

              {/* Thresholds */}
              <div className="text-xs text-muted-foreground">
                Thresholds: Thriving ≥{thresholds.thriving} | Healthy ≥{thresholds.healthy} | Stable ≥{thresholds.stable} | At Risk ≥{thresholds.at_risk}
              </div>
            </div>

            {/* Component Scores Breakdown */}
            {components && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Component Scores</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead className="text-right">Weighted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(['actions', 'sessions', 'kpis', 'checkins'] as const).map((key) => {
                      const score = components[key] || 0;
                      const weight = weights[key];
                      const weighted = (score * weight) / 100;
                      const Icon =
                        key === 'actions'
                          ? Activity
                          : key === 'sessions'
                          ? Calendar
                          : key === 'kpis'
                          ? BarChart3
                          : ClipboardCheck;
                      return (
                        <TableRow key={key}>
                          <TableCell className="flex items-center gap-2 capitalize">
                            <Icon className="h-4 w-4" />
                            {key}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={score} className="w-16 h-2" />
                              <span className="text-xs">{score}</span>
                            </div>
                          </TableCell>
                          <TableCell>{weight}%</TableCell>
                          <TableCell className="text-right font-medium">
                            {weighted.toFixed(1)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-bold">
                      <TableCell colSpan={3}>Final Score</TableCell>
                      <TableCell className="text-right">{numericScore}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Explanation Factors */}
            {explanation.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Detailed Breakdown</h4>
                <div className="space-y-1">
                  {explanation.map((factor, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {factor.impact === 'positive' && (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        )}
                        {factor.impact === 'negative' && (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        {factor.impact === 'neutral' && (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{factor.factor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{factor.details}</span>
                        <Badge variant="secondary" className="text-xs">
                          {factor.score}/{factor.maxScore}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calculation Windows */}
            <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
              <p className="font-medium">Calculation Windows:</p>
              <ul className="space-y-0.5 pl-4">
                <li>• <strong>Actions:</strong> {CALCULATION_WINDOWS.actions}</li>
                <li>• <strong>Sessions:</strong> {CALCULATION_WINDOWS.sessions}</li>
                <li>• <strong>KPIs:</strong> {CALCULATION_WINDOWS.kpis}</li>
                <li>• <strong>Check-ins:</strong> {CALCULATION_WINDOWS.checkins}</li>
              </ul>
            </div>

            {/* Last updated */}
            {health?.health_score_updated_at && (
              <p className="text-xs text-muted-foreground text-right">
                Last calculated:{' '}
                {new Date(health.health_score_updated_at).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
