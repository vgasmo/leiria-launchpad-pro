import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Target, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ActionItemCard } from './ActionItemCard';
import type { ActionItem } from '@/hooks/useActionItems';
import type { ActionDeliverable } from '@/hooks/useActionDeliverables';
import type { Milestone } from '@/hooks/useMilestones';
import type { Database } from '@/integrations/supabase/types';

type ActionStatus = Database['public']['Enums']['action_status'];

export interface MilestoneActionGroupProps {
  milestone: Milestone;
  actions: ActionItem[];
  progress: number;
  completedCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onAddAction: () => void;
  canWrite: boolean;
  isStaff: boolean;
  deliverablesByAction?: Record<string, ActionDeliverable[]>;
  onStatusChange: (item: ActionItem, status: ActionStatus) => void;
  onDueDateChange: (item: ActionItem, date: Date | undefined) => void;
  onDelete: (item: ActionItem) => void;
  onAddDeliverable?: (actionId: string, deliverable: { title: string; type: string; external_url?: string }) => void;
  onCompleteDeliverable?: (id: string, actionId: string) => void;
  isSelected: (id: string) => boolean;
  onToggleSelect: (id: string) => void;
}

export const MilestoneActionGroup = memo(function MilestoneActionGroup({
  milestone, actions, progress, completedCount, isExpanded, onToggle, onAddAction, canWrite, isStaff,
  deliverablesByAction, onStatusChange, onDueDateChange, onDelete, onAddDeliverable, onCompleteDeliverable, isSelected, onToggleSelect,
}: MilestoneActionGroupProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <Target className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{milestone.title}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {completedCount}/{actions.length} {t('actions.actionsLabel', 'ações')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={progress} className="h-1.5 flex-1 max-w-[200px]" />
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                </div>
              </div>
              {canWrite && (
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); onAddAction(); }}>
                  <Plus className="h-3 w-3 mr-1" />
                  {t('common.add', 'Adicionar')}
                </Button>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            {actions.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                {t('actions.noActionsYet', 'Ainda sem ações. Adicione ações para acompanhar o progresso.')}
              </div>
            ) : (
              actions.map(item => (
                <ActionItemCard key={item.id} item={item} canWrite={canWrite} isStaff={isStaff}
                  deliverables={deliverablesByAction?.[item.id] || []}
                  onStatusChange={onStatusChange} onDueDateChange={onDueDateChange}
                  onDelete={onDelete} onAddDeliverable={onAddDeliverable} onCompleteDeliverable={onCompleteDeliverable}
                  isSelected={isSelected(item.id)} onToggleSelect={onToggleSelect}
                />
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});
