import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useQualityCheckResult,
  useComputeQualityScore,
  useWorkspaceQualityMode,
} from '@/hooks/useQualityGates';
import { cn } from '@/lib/utils';

interface QualityGateCardProps {
  entityType: 'session' | 'proposal' | 'followup';
  entityId: string;
  entityData: Record<string, unknown>;
  workspaceId: string;
  onScoreComputed?: (score: number, isBlocking: boolean) => void;
}

export function QualityGateCard({
  entityType,
  entityId,
  entityData,
  workspaceId,
  onScoreComputed,
}: QualityGateCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const { data: result, isLoading } = useQualityCheckResult(entityType, entityId);
  const { data: qualityMode } = useWorkspaceQualityMode(workspaceId);
  const computeMutation = useComputeQualityScore();

  const isStrict = qualityMode === 'strict';

  // Auto-compute on mount if no result
  useEffect(() => {
    if (!result && !isLoading && entityId) {
      computeMutation.mutate({ entityType, entityId, entityData });
    }
  }, [entityId, result, isLoading]);

  // Notify parent of score
  useEffect(() => {
    if (result && onScoreComputed) {
      const isBlocking = isStrict && result.score < 70;
      onScoreComputed(result.score, isBlocking);
    }
  }, [result, isStrict, onScoreComputed]);

  const handleRecompute = () => {
    computeMutation.mutate({ entityType, entityId, entityData });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Needs work';
    return 'Incomplete';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle2;
    if (score >= 60) return AlertTriangle;
    return XCircle;
  };

  if (isLoading || !result) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4 flex items-center justify-center">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Checking quality...</span>
        </CardContent>
      </Card>
    );
  }

  const ScoreIcon = getScoreIcon(result.score);
  const isBlocking = isStrict && result.score < 70;

  return (
    <Card className={cn(
      'transition-colors',
      isBlocking && 'border-red-300 bg-red-50/50 dark:bg-red-950/20'
    )}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Quality Check</CardTitle>
              {isStrict && (
                <Badge variant="outline" className="text-xs">Strict Mode</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={cn('flex items-center gap-1.5', getScoreColor(result.score))}>
                <ScoreIcon className="h-4 w-4" />
                <span className="font-semibold">{result.score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <Progress
            value={result.score}
            className={cn(
              'h-1.5',
              result.score >= 80 && '[&>div]:bg-green-500',
              result.score >= 60 && result.score < 80 && '[&>div]:bg-amber-500',
              result.score < 60 && '[&>div]:bg-red-500'
            )}
          />
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Missing Items */}
            {result.missing_items.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Missing:</p>
                <div className="space-y-1.5">
                  {result.missing_items.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-950/30 text-sm"
                    >
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-300">{item.label}</p>
                        <p className="text-xs text-red-600/80 dark:text-red-400/80">{item.hint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Passed Items */}
            {result.passed_items.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Completed:</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.passed_items.map((item) => (
                    <Badge key={item.key} variant="secondary" className="bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {item.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Coach Hints */}
            {result.coach_hints.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Coach Tips</p>
                </div>
                <ul className="space-y-1">
                  {result.coach_hints.map((hint, i) => (
                    <li key={i} className="text-xs text-blue-800 dark:text-blue-200">
                      {hint}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Blocking Warning */}
            {isBlocking && (
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                  ⚠️ This {entityType} cannot be marked as ready until the score reaches 70+
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecompute}
                disabled={computeMutation.isPending}
              >
                <RefreshCw className={cn('h-3.5 w-3.5 mr-1', computeMutation.isPending && 'animate-spin')} />
                Recalculate
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
