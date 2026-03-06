import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { StartupStage } from '@/types/database';

export interface StageBadgeProps {
  stage: StartupStage;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const stageConfig: Record<StartupStage, { labelKey: string; className: string }> = {
  ideation: { labelKey: 'stages.ideation', className: 'bg-stage-ideation/10 text-stage-ideation border-stage-ideation/30' },
  validation: { labelKey: 'stages.validation', className: 'bg-stage-validation/10 text-stage-validation border-stage-validation/30' },
  mvp: { labelKey: 'stages.mvp', className: 'bg-stage-mvp/10 text-stage-mvp border-stage-mvp/30' },
  growth: { labelKey: 'stages.growth', className: 'bg-stage-growth/10 text-stage-growth border-stage-growth/30' },
  scale: { labelKey: 'stages.scale', className: 'bg-stage-scale/10 text-stage-scale border-stage-scale/30' },
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

export function StageBadge({ stage, size = 'md', className }: StageBadgeProps) {
  const { t } = useTranslation();
  const config = stageConfig[stage];

  if (!config) {
    return (
      <span className={cn(
        "inline-flex items-center rounded-full font-medium border bg-muted text-muted-foreground border-border",
        sizeStyles[size],
        className
      )}>
        {stage ?? '—'}
      </span>
    );
  }
  
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium border",
      sizeStyles[size],
      config.className,
      className
    )}>
      {t(config.labelKey, { defaultValue: stage })}
    </span>
  );
}
