import React, { useState } from 'react';
import { Info, Edit2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useWorkspaceHealth, useSetHealthOverride, useRecomputeHealthScores, getHealthScoreConfig, type HealthExplanationFactor } from '@/hooks/useHealthScore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface HealthScoreCardProps {
  workspaceId: string;
}

export function HealthScoreCard({ workspaceId }: HealthScoreCardProps) {
  const { data: health, isLoading } = useWorkspaceHealth(workspaceId);
  const setOverride = useSetHealthOverride();
  const recompute = useRecomputeHealthScores();
  const { roles } = useAuth();
  const isStaff = roles?.includes('admin') || roles?.includes('consultor');

  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Health Score</CardTitle></CardHeader>
        <CardContent><div className="animate-pulse h-20 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  const displayScore = health?.health_score_override || health?.health_score;
  const calculatedScore = health?.health_score_calculated;
  const numericScore = health?.health_score_numeric || 0;
  const config = getHealthScoreConfig(displayScore);
  const hasOverride = !!health?.health_score_override;

  const handleSetOverride = () => {
    if (selectedOverride && overrideReason) {
      setOverride.mutate({
        workspaceId,
        override: selectedOverride === 'remove' ? null : selectedOverride,
        reason: overrideReason,
      });
      setOverrideDialogOpen(false);
      setSelectedOverride('');
      setOverrideReason('');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Health Score</CardTitle>
        <div className="flex gap-1">
          {isStaff && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => recompute.mutate()}
                      disabled={recompute.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 ${recompute.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Recalcular scores</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Override Health Score</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Novo Score</Label>
                      <Select value={selectedOverride} onValueChange={setSelectedOverride}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar score" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="thriving">🌟 Excelente</SelectItem>
                          <SelectItem value="healthy">✅ Saudável</SelectItem>
                          <SelectItem value="stable">➡️ Estável</SelectItem>
                          <SelectItem value="at_risk">⚠️ Em risco</SelectItem>
                          <SelectItem value="critical">🚨 Crítico</SelectItem>
                          {hasOverride && <SelectItem value="remove">❌ Remover override</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Motivo</Label>
                      <Textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Explique o motivo do override..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSetOverride} disabled={!selectedOverride || !overrideReason || setOverride.isPending}>
                      Aplicar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score Display */}
        <div className="flex items-center gap-4">
          <div className={`text-4xl ${config.color} w-14 h-14 rounded-full flex items-center justify-center`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{config.label}</span>
              {hasOverride && (
                <Badge variant="outline" className="text-xs">
                  Override
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{numericScore}</div>
            <div className="text-xs text-muted-foreground">/100</div>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress value={numericScore} className="h-2" />

        {/* Calculated vs Override */}
        {hasOverride && calculatedScore && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Score calculado: <strong>{getHealthScoreConfig(calculatedScore).label}</strong> (override ativo)
          </div>
        )}

        {/* Last Updated */}
        {health?.health_score_updated_at && (
          <div className="text-xs text-muted-foreground">
            Atualizado {formatDistanceToNow(new Date(health.health_score_updated_at), { addSuffix: true, locale: pt })}
          </div>
        )}

        {/* Explanation */}
        {health?.health_score_explanation && health.health_score_explanation.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium">
              <Info className="h-4 w-4" />
              Porquê?
            </div>
            <div className="space-y-2">
              {health.health_score_explanation.slice(0, 4).map((factor, index) => (
                <ExplanationRow key={index} factor={factor} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExplanationRow({ factor }: { factor: HealthExplanationFactor }) {
  const impactColor = factor.impact === 'positive' 
    ? 'text-green-600 dark:text-green-400' 
    : factor.impact === 'negative' 
      ? 'text-red-600 dark:text-red-400' 
      : 'text-muted-foreground';

  return (
    <div className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
      <div className="flex items-center gap-2">
        <span className={impactColor}>
          {factor.impact === 'positive' ? '✓' : factor.impact === 'negative' ? '✗' : '•'}
        </span>
        <span className="font-medium">{factor.factor}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{factor.details}</span>
        <Badge variant="outline" className="text-xs">
          {factor.score}/{factor.maxScore}
        </Badge>
      </div>
    </div>
  );
}

export default HealthScoreCard;
