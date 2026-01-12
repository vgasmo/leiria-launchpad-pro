import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Lightbulb, 
  Search, 
  Hammer, 
  TrendingUp, 
  Rocket,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StageBadge } from '@/components/ui/StageBadge';
import { WorkspaceWithDetails } from '@/hooks/useWorkspaces';
import { useMilestones } from '@/hooks/useMilestones';
import { StartupStage } from '@/types/database';

interface StageProgressCardProps {
  workspace: WorkspaceWithDetails;
  className?: string;
}

const STAGE_ORDER: StartupStage[] = ['ideation', 'validation', 'mvp', 'growth', 'scale'];

const STAGE_CONFIG: Record<StartupStage, { icon: typeof Lightbulb; color: string; label: string }> = {
  ideation: { icon: Lightbulb, color: 'text-purple-500', label: 'Ideation' },
  validation: { icon: Search, color: 'text-blue-500', label: 'Validation' },
  mvp: { icon: Hammer, color: 'text-amber-500', label: 'MVP' },
  growth: { icon: TrendingUp, color: 'text-green-500', label: 'Growth' },
  scale: { icon: Rocket, color: 'text-primary', label: 'Scale' },
};

export function StageProgressCard({ workspace, className }: StageProgressCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: milestones } = useMilestones(workspace.id);

  const currentStageIndex = STAGE_ORDER.indexOf(workspace.stage);
  const progressPercent = ((currentStageIndex + 1) / STAGE_ORDER.length) * 100;

  // Calculate milestone completion for current stage
  const milestoneStats = useMemo(() => {
    if (!milestones) return { completed: 0, total: 0, percent: 0 };
    const total = milestones.length;
    const completed = milestones.filter(m => m.status === 'completed').length;
    return { 
      completed, 
      total, 
      percent: total > 0 ? Math.round((completed / total) * 100) : 0 
    };
  }, [milestones]);

  const currentConfig = STAGE_CONFIG[workspace.stage];
  const CurrentIcon = currentConfig.icon;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CurrentIcon className={`h-4 w-4 ${currentConfig.color}`} />
            {t('stageProgress.yourJourney', 'Your Journey')}
          </CardTitle>
          <StageBadge stage={workspace.stage} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stage Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('stageProgress.stageProgress', 'Stage Progress')}</span>
            <span>{currentStageIndex + 1} / {STAGE_ORDER.length}</span>
          </div>
          <div className="relative">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between mt-1">
              {STAGE_ORDER.map((stage, index) => {
                const config = STAGE_CONFIG[stage];
                const Icon = config.icon;
                const isPast = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                
                return (
                  <div 
                    key={stage}
                    className={`flex flex-col items-center ${
                      isPast ? 'text-muted-foreground' : isCurrent ? config.color : 'text-muted-foreground/50'
                    }`}
                  >
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${
                      isPast 
                        ? 'bg-primary/20' 
                        : isCurrent 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {isPast ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Icon className="h-3 w-3" />
                      )}
                    </div>
                    <span className="text-[10px] mt-1 hidden sm:block">{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Milestone Progress */}
        {milestones && milestones.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('stageProgress.milestones', 'Milestones')}</span>
              <Badge variant="secondary" className="text-xs">
                {milestoneStats.completed}/{milestoneStats.total}
              </Badge>
            </div>
            <Progress value={milestoneStats.percent} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {milestoneStats.percent}% {t('stageProgress.complete', 'complete')}
            </p>
          </div>
        )}

        {/* Quick link to milestones/playbooks */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between text-muted-foreground hover:text-foreground"
          onClick={() => navigate(`/workspace/${workspace.id}?tab=milestones`)}
        >
          <span>{t('stageProgress.viewMilestones', 'View milestones & playbooks')}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
