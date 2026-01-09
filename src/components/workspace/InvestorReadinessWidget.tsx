import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, HelpCircle, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDocuments } from '@/hooks/useDocuments';
import { useInvestorUpdates } from '@/hooks/useInvestorUpdates';
import { useDataroomShareLinks, useDataroom } from '@/hooks/useDataroom';

interface InvestorReadinessWidgetProps {
  workspaceId: string;
  compact?: boolean;
}

export function InvestorReadinessWidget({ workspaceId, compact = false }: InvestorReadinessWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: documents } = useDocuments(workspaceId);
  const { data: updates } = useInvestorUpdates(workspaceId);
  const { data: dataroom } = useDataroom(workspaceId);
  const { data: shareLinks } = useDataroomShareLinks(dataroom?.id);

  const { progress, nextStep, completedItems, totalItems } = useMemo(() => {
    let completed = 0;
    const total = 3;
    let next: { label: string; tab: string } | null = null;

    // Check for pitch deck
    const hasPitchDeck = documents?.some(d =>
      d.category?.toLowerCase().includes('pitch') ||
      d.name.toLowerCase().includes('pitch') ||
      d.name.toLowerCase().includes('deck')
    ) || false;
    
    if (hasPitchDeck) {
      completed++;
    } else if (!next) {
      next = { label: t('investorReadiness.uploadDeck'), tab: 'documents' };
    }

    // Check for recent investor update
    const hasRecentUpdate = updates?.some(u => {
      const updateDate = new Date(u.month);
      const now = new Date();
      const monthsAgo = (now.getFullYear() - updateDate.getFullYear()) * 12 + (now.getMonth() - updateDate.getMonth());
      return monthsAgo <= 2;
    }) || false;

    if (hasRecentUpdate) {
      completed++;
    } else if (!next) {
      next = { label: t('investorReadiness.createUpdate'), tab: 'dataroom' };
    }

    // Check for active share link
    const hasActiveShareLink = shareLinks?.some(link =>
      !link.revoked_at && (!link.expires_at || new Date(link.expires_at) > new Date())
    ) || false;

    if (hasActiveShareLink) {
      completed++;
    } else if (!next) {
      next = { label: t('investorReadiness.createLink'), tab: 'dataroom' };
    }

    return {
      progress: (completed / total) * 100,
      nextStep: next,
      completedItems: completed,
      totalItems: total,
    };
  }, [documents, updates, shareLinks, t]);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{t('investorReadiness.title')}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">{t('investorReadiness.whyMatters')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <Progress value={progress} className="h-2 flex-1 max-w-[100px]" />
          <span className="text-xs text-muted-foreground">{completedItems}/{totalItems}</span>
        </div>
        {nextStep && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7 px-2"
            onClick={() => navigate(`/workspace/${workspaceId}?tab=${nextStep.tab}`)}
          >
            {nextStep.label}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="font-medium">{t('investorReadiness.title')}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-sm font-medium mb-1">{t('investorReadiness.whyMattersTitle')}</p>
              <p className="text-xs">{t('investorReadiness.whyMatters')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="text-lg font-bold text-primary">{Math.round(progress)}%</span>
      </div>
      
      <Progress value={progress} className="h-2 mb-3" />
      
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {completedItems}/{totalItems} {t('investorReadiness.itemsComplete')}
        </p>
        {nextStep && (
          <Button 
            variant="link" 
            size="sm" 
            className="text-sm h-auto p-0"
            onClick={() => navigate(`/workspace/${workspaceId}?tab=${nextStep.tab}`)}
          >
            {nextStep.label}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}