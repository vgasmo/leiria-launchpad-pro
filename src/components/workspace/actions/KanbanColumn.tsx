import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionItemCard } from './ActionItemCard';
import type { ActionItem } from '@/hooks/useActionItems';
import type { Database } from '@/integrations/supabase/types';

type ActionStatus = Database['public']['Enums']['action_status'];

const STATUS_CONFIG: Record<ActionStatus, { labelKey: string; color: string }> = {
  pending: { labelKey: 'actions.statusOpen', color: 'bg-muted text-muted-foreground' },
  in_progress: { labelKey: 'actions.statusDoing', color: 'bg-primary/20 text-primary' },
  completed: { labelKey: 'actions.statusDone', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { labelKey: 'actions.statusCancelled', color: 'bg-muted text-muted-foreground line-through' },
};

export interface KanbanColumnProps {
  title: string;
  count: number;
  items: ActionItem[];
  status: ActionStatus;
  canWrite: boolean;
  members: Array<{ user_id: string; profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null }>;
  onStatusChange: (item: ActionItem, status: ActionStatus) => void;
  onDueDateChange: (item: ActionItem, date: Date | undefined) => void;
  onOwnerChange: (item: ActionItem, ownerId: string) => void;
  onDelete: (item: ActionItem) => void;
}

export const KanbanColumn = memo(function KanbanColumn({ 
  title, count, items, status, canWrite, members, onStatusChange, onDueDateChange, onOwnerChange, onDelete,
}: KanbanColumnProps) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status];
  
  return (
    <Card className="bg-muted/20">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${config.color}`}>{title}</span>
          </span>
          <span className="text-muted-foreground font-normal">{count}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3 space-y-2 max-h-[600px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">{t('actions.noItems', 'Sem ações')}</div>
        ) : (
          items.map(item => (
            <ActionItemCard key={item.id} item={item} canWrite={canWrite} members={members}
              onStatusChange={onStatusChange} onDueDateChange={onDueDateChange} onOwnerChange={onOwnerChange} onDelete={onDelete}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
});
