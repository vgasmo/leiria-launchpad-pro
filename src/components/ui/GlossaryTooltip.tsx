import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

export type GlossaryTerm = 
  | 'unitEconomics'
  | 'mvp'
  | 'cac'
  | 'ltv'
  | 'ltvCacRatio'
  | 'arpu'
  | 'churnRate'
  | 'mrr'
  | 'paybackPeriod'
  | 'runway'
  | 'burnRate'
  | 'grossMargin'
  | 'pmf'
  | 'nps'
  | 'tam'
  | 'sam'
  | 'som'
  | 'b2b'
  | 'b2c'
  | 'saas'
  | 'preemption'
  | 'dilution'
  | 'capTable'
  | 'vesting'
  | 'cliff';

interface GlossaryTooltipProps {
  term: GlossaryTerm;
  children?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
  variant?: 'tooltip' | 'hoverCard';
}

export function GlossaryTooltip({ 
  term, 
  children, 
  showIcon = true,
  className,
  variant = 'tooltip'
}: GlossaryTooltipProps) {
  const { t } = useTranslation();
  
  const title = t(`glossary.${term}`);
  const description = t(`glossary.${term}Desc`);

  const trigger = children || (
    <span className={cn("inline-flex items-center gap-1 cursor-help", className)}>
      {title}
      {showIcon && <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />}
    </span>
  );

  if (variant === 'hoverCard') {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          {trigger}
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {trigger}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Quick inline help icon that shows tooltip on hover
interface QuickHelpProps {
  term: GlossaryTerm;
  className?: string;
}

export function QuickHelp({ term, className }: QuickHelpProps) {
  const { t } = useTranslation();
  
  const title = t(`glossary.${term}`);
  const description = t(`glossary.${term}Desc`);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={cn("h-4 w-4 text-muted-foreground cursor-help inline-block", className)} />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
