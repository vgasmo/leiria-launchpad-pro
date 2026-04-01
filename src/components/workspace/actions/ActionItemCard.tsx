import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { AlertTriangle, Calendar, User, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import type { ActionItem } from '@/hooks/useActionItems';
import type { Database } from '@/integrations/supabase/types';

type ActionStatus = Database['public']['Enums']['action_status'];

const STATUS_CONFIG: Record<ActionStatus, { labelKey: string; color: string }> = {
  pending: { labelKey: 'actions.statusOpen', color: 'bg-muted text-muted-foreground' },
  in_progress: { labelKey: 'actions.statusDoing', color: 'bg-primary/20 text-primary' },
  completed: { labelKey: 'actions.statusDone', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { labelKey: 'actions.statusCancelled', color: 'bg-muted text-muted-foreground line-through' },
};

const PRIORITY_CONFIG: Record<string, { labelKey: string; color: string }> = {
  low: { labelKey: 'actions.priorityLow', color: 'text-muted-foreground' },
  medium: { labelKey: 'actions.priorityMedium', color: 'text-yellow-600 dark:text-yellow-400' },
  high: { labelKey: 'actions.priorityHigh', color: 'text-destructive' },
};

export interface ActionItemCardProps {
  item: ActionItem;
  canWrite: boolean;
  members: Array<{ user_id: string; profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null }>;
  onStatusChange: (item: ActionItem, status: ActionStatus) => void;
  onDueDateChange: (item: ActionItem, date: Date | undefined) => void;
  onOwnerChange: (item: ActionItem, ownerId: string) => void;
  onDelete: (item: ActionItem) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const ActionItemCard = memo(function ActionItemCard({ 
  item, canWrite, members, onStatusChange, onDueDateChange, onOwnerChange, onDelete, isSelected, onToggleSelect,
}: ActionItemCardProps) {
  const { t } = useTranslation();
  const isOverdue = item.due_date && isPast(parseISO(item.due_date)) && !isToday(parseISO(item.due_date)) && item.status !== 'completed';
  const isDueToday = item.due_date && isToday(parseISO(item.due_date)) && item.status !== 'completed';
  const priorityConfig = PRIORITY_CONFIG[item.priority || 'medium'] || PRIORITY_CONFIG.medium;

  return (
    <div className={`
      group bg-background rounded-lg border p-3 space-y-2 transition-all
      ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}
      ${isDueToday ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10' : ''}
      ${isSelected ? 'ring-2 ring-primary/50 bg-primary/5' : ''}
    `}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {onToggleSelect && (
            <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(item.id)} className="mt-0.5 shrink-0" />
          )}
          <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
          <span className={`text-sm font-medium leading-tight break-words ${item.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{item.title}</span>
        </div>
        {canWrite && (
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => onDelete(item)}>
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>

      {isOverdue && (
        <div className="flex items-center gap-1 text-xs text-destructive font-medium">
          <AlertTriangle className="h-3 w-3" />
          {t('actions.overdue', 'Atrasada')}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {canWrite ? (
          <Select value={item.status} onValueChange={(v) => onStatusChange(item, v as ActionStatus)}>
            <SelectTrigger className="h-6 w-auto px-2 text-xs border-dashed"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{t('status.open', 'Aberta')}</SelectItem>
              <SelectItem value="in_progress">{t('status.doing', 'A Fazer')}</SelectItem>
              <SelectItem value="completed">{t('status.done', 'Concluída')}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="text-xs">{t(STATUS_CONFIG[item.status].labelKey)}</Badge>
        )}

        {canWrite ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={`h-6 px-2 text-xs border-dashed ${isOverdue ? 'text-destructive border-destructive' : isDueToday ? 'text-yellow-600 border-yellow-500' : ''}`}>
                <Calendar className="h-3 w-3 mr-1" />
                {item.due_date ? format(parseISO(item.due_date), 'd MMM') : t('actions.dueDate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={item.due_date ? parseISO(item.due_date) : undefined} onSelect={(date) => onDueDateChange(item, date)} initialFocus />
            </PopoverContent>
          </Popover>
        ) : item.due_date ? (
          <Badge variant="outline" className={`text-xs ${isOverdue ? 'text-destructive border-destructive' : ''}`}>
            <Calendar className="h-3 w-3 mr-1" />
            {format(parseISO(item.due_date), 'd MMM')}
          </Badge>
        ) : null}

        {canWrite ? (
          <Select value={item.owner_user_id || 'none'} onValueChange={(v) => onOwnerChange(item, v)}>
            <SelectTrigger className="h-6 w-auto px-2 text-xs border-dashed max-w-[140px]">
              <User className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate">{item.owner?.full_name || t('actions.assign', 'Atribuir')}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('actions.unassigned', 'Não atribuído')}</SelectItem>
              {members.map(m => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.email || t('common.unknown')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : item.owner ? (
          <Badge variant="outline" className="text-xs max-w-[140px]">
            <User className="h-3 w-3 mr-1 shrink-0" />
            <span className="truncate">{item.owner.full_name}</span>
          </Badge>
        ) : null}

        <span className={`text-xs ${priorityConfig.color}`}>{t(priorityConfig.labelKey)}</span>
      </div>
    </div>
  );
});
