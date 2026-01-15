import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/dateUtils';
import { useCrmPipeline, PIPELINE_STAGES } from '@/hooks/useCrmPipeline';
import type { CrmInboxItem } from '@/hooks/useCrmInbox';
import type { FunnelStage } from '@/hooks/useFunnel';

const STAGE_CONFIG: Record<FunnelStage, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  first_contact_booked: { label: 'Meeting Booked', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
  met: { label: 'Met', color: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-50 dark:bg-indigo-900/30' },
  qualified: { label: 'Qualified', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-50 dark:bg-purple-900/30' },
  proposal_sent: { label: 'Proposal Sent', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-50 dark:bg-amber-900/30' },
  negotiating: { label: 'Negotiating', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-50 dark:bg-orange-900/30' },
  contracted: { label: 'Contracted', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-50 dark:bg-green-900/30' },
  incubating: { label: 'Incubating', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30' },
  accelerating: { label: 'Accelerating', color: 'text-primary', bgColor: 'bg-primary/10' },
  rejected: { label: 'Rejected', color: 'text-destructive', bgColor: 'bg-destructive/10' },
  archived: { label: 'Archived', color: 'text-muted-foreground', bgColor: 'bg-muted' },
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
  
  const { data: pipeline, isLoading } = useCrmPipeline({
    programId: programFilter !== 'all' ? programFilter : undefined,
    assigneeId: assigneeFilter !== 'all' ? assigneeFilter : undefined,
    search: searchQuery || undefined,
    myItemsOnly,
    currentUserId,
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>;
  }

  const totalItems = PIPELINE_STAGES.reduce((sum, stage) => sum + (pipeline?.[stage]?.length || 0), 0);

  return (
    <div className="space-y-4">
      {/* Pipeline header with totals */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('crm.totalLeads')}: {totalItems}</span>
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
  );
}

interface PipelineColumnProps {
  stage: FunnelStage;
  items: CrmInboxItem[];
  config: { label: string; color: string; bgColor: string };
  onOpenDrawer: (item: CrmInboxItem) => void;
}

function PipelineColumn({ items, config, onOpenDrawer }: PipelineColumnProps) {
  const { t } = useTranslation();
  const now = new Date();

  return (
    <div className="w-72 flex-shrink-0">
      <Card className={cn('h-full', config.bgColor, 'border-0 shadow-sm')}>
        <CardHeader className="py-3 px-4">
          <CardTitle className={cn('text-sm font-semibold flex items-center justify-between', config.color)}>
            <span>{config.label}</span>
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
              <div className="p-4 text-center text-xs text-muted-foreground">
                {t('crm.noItems')}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map(item => {
                  const isOverdue = item.next_action_at && new Date(item.next_action_at) < now;
                  
                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5',
                        'bg-background border shadow-sm',
                        isOverdue && 'border-l-2 border-l-amber-500'
                      )}
                      onClick={() => onOpenDrawer(item)}
                    >
                      <CardContent className="p-3">
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
