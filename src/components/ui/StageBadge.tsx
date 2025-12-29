import { cn } from '@/lib/utils';
import { StartupStage } from '@/types/database';

export interface StageBadgeProps {
  stage: StartupStage;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const stageConfig: Record<StartupStage, { label: string; className: string }> = {
  ideation: { label: 'Ideation', className: 'bg-stage-ideation/10 text-stage-ideation border-stage-ideation/30' },
  validation: { label: 'Validation', className: 'bg-stage-validation/10 text-stage-validation border-stage-validation/30' },
  mvp: { label: 'MVP', className: 'bg-stage-mvp/10 text-stage-mvp border-stage-mvp/30' },
  growth: { label: 'Growth', className: 'bg-stage-growth/10 text-stage-growth border-stage-growth/30' },
  scale: { label: 'Scale', className: 'bg-stage-scale/10 text-stage-scale border-stage-scale/30' },
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export function StageBadge({ stage, size = 'md', className }: StageBadgeProps) {
  const config = stageConfig[stage];
  
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium border",
      sizeStyles[size],
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
