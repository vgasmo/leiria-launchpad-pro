import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, AlertTriangle, GripVertical, Flame, ThermometerSun, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/dateUtils';
import { useCrmPipeline, PIPELINE_STAGES } from '@/hooks/useCrmPipeline';
import { calculateLeadScore } from './LeadScoreCard';
import { useUpdateFunnelItem } from '@/hooks/useFunnel';
import { useState } from 'react';
import { STAGE_LABELS } from '@/constants/funnelStages';
import { toast } from 'sonner';
import type { CrmInboxItem } from '@/hooks/useCrmInbox';
import type { FunnelStage } from '@/hooks/useFunnel';

// Stage config with i18n keys - labels resolved via t() at render time
const STAGE_CONFIG: Record<FunnelStage, { labelKey: string; color: string; bgColor: string }> = {
  new: { labelKey: 'pipeline.stages.new', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  first_contact_booked: { labelKey: 'pipeline.stages.first_contact_booked', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
  met: { labelKey: 'pipeline.stages.met', color: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-50 dark:bg-indigo-900/30' },
  qualified: { labelKey: 'pipeline.stages.qualified', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-50 dark:bg-purple-900/30' },
  proposal_sent: { labelKey: 'pipeline.stages.proposal_sent', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-50 dark:bg-amber-900/30' },
  negotiating: { labelKey: 'pipeline.stages.negotiating', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-50 dark:bg-orange-900/30' },
  intake_requested: { labelKey: 'pipeline.stages.intake_requested', color: 'text-cyan-700 dark:text-cyan-300', bgColor: 'bg-cyan-50 dark:bg-cyan-900/30' },
  intake_filling: { labelKey: 'pipeline.stages.intake_filling', color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-900/20' },
  intake_submitted: { labelKey: 'pipeline.stages.intake_submitted', color: 'text-teal-700 dark:text-teal-300', bgColor: 'bg-teal-50 dark:bg-teal-900/30' },
  intake_review: { labelKey: 'pipeline.stages.intake_review', color: 'text-teal-800 dark:text-teal-200', bgColor: 'bg-teal-100 dark:bg-teal-900/40' },
  intake_changes_requested: { labelKey: 'pipeline.stages.intake_changes_requested', color: 'text-yellow-700 dark:text-yellow-300', bgColor: 'bg-yellow-50 dark:bg-yellow-900/30' },
  approved_for_signature: { labelKey: 'pipeline.stages.approved_for_signature', color: 'text-lime-700 dark:text-lime-300', bgColor: 'bg-lime-50 dark:bg-lime-900/30' },
  sent_for_signature: { labelKey: 'pipeline.stages.sent_for_signature', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  contracted: { labelKey: 'pipeline.stages.contracted', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-50 dark:bg-green-900/30' },
  incubating: { labelKey: 'pipeline.stages.incubating', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30' },
  accelerating: { labelKey: 'pipeline.stages.accelerating', color: 'text-primary', bgColor: 'bg-primary/10' },
  rejected: { labelKey: 'pipeline.stages.rejected', color: 'text-destructive', bgColor: 'bg-destructive/10' },
  archived: { labelKey: 'pipeline.stages.archived', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

interface PipelineViewProps {
  programFilter?: string;
  assigneeFilter?: string;
  searchQuery?: string;
  myItemsOnly?: boolean;
  currentUserId?: string;
  onOpenDrawer: (item: CrmInboxItem) => void;
}

export function PipelineView({
  programFilter,
  assigneeFilter,
  searchQuery,
  myItemsOnly,
  currentUserId,
  onOpenDrawer,
}: PipelineViewProps) {
  const { t } = useTranslation();
  const [activeItem, setActiveItem] = useState<CrmInboxItem | null>(null);
  
  const { data: pipeline, isLoading } = useCrmPipeline({
    programId: programFilter !== 'all' ? programFilter : undefined,
    assigneeId: assigneeFilter !== 'all' ? assigneeFilter : undefined,
    search: searchQuery || undefined,
    myItemsOnly,
    currentUserId,
  });

  const updateFunnelItem = useUpdateFunnelItem();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Find the item being dragged
    for (const stage of PIPELINE_STAGES) {
      const items = pipeline?.[stage] || [];
      const item = items.find(i => i.id === active.id);
      if (item) {
        setActiveItem(item);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const itemId = active.id as string;
    const newStage = over.id as FunnelStage;

    // Find current stage
    let currentStage: FunnelStage | null = null;
    for (const stage of PIPELINE_STAGES) {
      const items = pipeline?.[stage] || [];
      if (items.find(i => i.id === itemId)) {
        currentStage = stage;
        break;
      }
    }

    if (!currentStage || currentStage === newStage) return;

    try {
      await updateFunnelItem.mutateAsync({
        id: itemId,
        stage: newStage,
      });
      toast.success(t('crm.stageMoved', { stage: STAGE_LABELS[newStage] }));
    } catch (error) {
      toast.error(t('crm.stageMoveFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-3 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="w-72 flex-shrink-0">
                <div className="h-[500px] bg-muted/30 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalItems = PIPELINE_STAGES.reduce((sum, stage) => sum + (pipeline?.[stage]?.length || 0), 0);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Pipeline header with totals */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t('crm.totalLeads')}: {totalItems}</span>
          <span className="text-xs">{t('crm.dragDropHint', 'Drag cards to change stage')}</span>
        </div>

        {/* Horizontal scrollable pipeline board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {PIPELINE_STAGES.map(stage => (
              <PipelineColumn
                key={stage}
                stage={stage}
                items={pipeline?.[stage] || []}
                config={STAGE_CONFIG[stage]}
                onOpenDrawer={onOpenDrawer}
              />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeItem && (
          <DragCard item={activeItem} />
        )}
      </DragOverlay>
    </DndContext>
  );
}

interface PipelineColumnProps {
  stage: FunnelStage;
  items: CrmInboxItem[];
  config: { labelKey: string; color: string; bgColor: string };
  onOpenDrawer: (item: CrmInboxItem) => void;
}

function PipelineColumn({ stage, items, config, onOpenDrawer }: PipelineColumnProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  return (
    <div className="w-72 flex-shrink-0">
      <Card 
        ref={setNodeRef}
        className={cn(
          'h-full border-0 shadow-sm transition-all',
          config.bgColor,
          isOver && 'ring-2 ring-primary ring-offset-2'
        )}
      >
        <CardHeader className="py-3 px-4">
          <CardTitle className={cn('text-sm font-semibold flex items-center justify-between', config.color)}>
            <span>{STAGE_LABELS[stage] || t(config.labelKey)}</span>
            <Badge 
              variant="secondary" 
              className={cn('text-xs font-medium', config.color, 'bg-background/80')}
            >
              {items.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
            {items.length === 0 ? (
              <div className="p-6 text-center">
                <div className="h-8 w-8 mx-auto mb-2 rounded-full bg-muted/50 flex items-center justify-center">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground">{t('crm.emptyColumn', 'Arraste leads para aqui')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map(item => (
                  <DraggableCard 
                    key={item.id} 
                    item={item} 
                    onOpenDrawer={onOpenDrawer}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface DraggableCardProps {
  item: CrmInboxItem;
  onOpenDrawer: (item: CrmInboxItem) => void;
}

function DraggableCard({ item, onOpenDrawer }: DraggableCardProps) {
  const { t } = useTranslation();
  const now = new Date();
  const isOverdue = item.next_action_at && new Date(item.next_action_at) < now;
  const { temperature, totalScore } = calculateLeadScore(item);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        'bg-background border shadow-sm',
        isOverdue && 'border-l-2 border-l-amber-500',
        isDragging && 'opacity-50 shadow-lg'
      )}
      data-testid="crm-record"
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div 
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 hover:bg-muted rounded shrink-0"
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0" onClick={() => onOpenDrawer(item)}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium line-clamp-2 flex-1">
                {item.organization_name || item.contact_name || t('crm.unnamed')}
              </p>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            </div>
            
            {item.contact_email && (
              <p className="text-xs text-muted-foreground truncate mt-1">
                {item.contact_email}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Lead Score Temperature */}
              <div className={cn(
                'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                temperature === 'hot' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                temperature === 'warm' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                temperature === 'cold' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              )}>
                {temperature === 'hot' && <Flame className="h-3 w-3" />}
                {temperature === 'warm' && <ThermometerSun className="h-3 w-3" />}
                {temperature === 'cold' && <Snowflake className="h-3 w-3" />}
                {totalScore}
              </div>

              {item.owner && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                  {item.owner.full_name?.split(' ')[0] || t('crm.unassigned')}
                </Badge>
              )}
              
              {item.next_action_at && (
                <span className={cn(
                  'text-[10px] flex items-center gap-1',
                  isOverdue ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'
                )}>
                  {isOverdue && <AlertTriangle className="h-3 w-3" />}
                  {formatRelativeTime(item.next_action_at)}
                </span>
              )}
            </div>

            {item.next_action_description && (
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-2 italic">
                "{item.next_action_description}"
              </p>
            )}

            {item.program && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1 mt-2">
                {item.program.name}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DragCard({ item }: { item: CrmInboxItem }) {
  const { t } = useTranslation();
  const now = new Date();
  const isOverdue = item.next_action_at && new Date(item.next_action_at) < now;

  return (
    <Card
      className={cn(
        'w-72 cursor-grabbing shadow-xl rotate-2',
        'bg-background border',
        isOverdue && 'border-l-2 border-l-amber-500'
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-2">
              {item.organization_name || item.contact_name || t('crm.unnamed')}
            </p>
            {item.contact_email && (
              <p className="text-xs text-muted-foreground truncate mt-1">
                {item.contact_email}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
