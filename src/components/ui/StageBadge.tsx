import { cn } from '@/lib/utils';
import { StartupStage } from '@/types/database';

interface StageBadgeProps {
  stage: StartupStage;
  className?: string;
}

const stageConfig: Record<StartupStage, { label: string; className: string }> = {
  ideation: { label: 'Ideation', className: 'bg-stage-ideation/10 text-stage-ideation border-stage-ideation/30' },
  validation: { label: 'Validation', className: 'bg-stage-validation/10 text-stage-validation border-stage-validation/30' },
  mvp: { label: 'MVP', className: 'bg-stage-mvp/10 text-stage-mvp border-stage-mvp/30' },
  growth: { label: 'Growth', className: 'bg-stage-growth/10 text-stage-growth border-stage-growth/30' },
  scale: { label: 'Scale', className: 'bg-stage-scale/10 text-stage-scale border-stage-scale/30' },
};

export function StageBadge({ stage, className }: StageBadgeProps) {
  const config = stageConfig[stage];
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
