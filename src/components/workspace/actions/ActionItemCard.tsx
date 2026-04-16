import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { AlertTriangle, Calendar, Trash2, GripVertical, Paperclip, FileText, Plus, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { ActionItem } from '@/hooks/useActionItems';
import type { ActionDeliverable } from '@/hooks/useActionDeliverables';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

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

export interface PlatformDocument {
  id: string;
  name: string;
  type: 'template_instance' | 'document';
}

export interface ActionItemCardProps {
  item: ActionItem;
  canWrite: boolean;
  isStaff: boolean;
  deliverables?: ActionDeliverable[];
  platformDocuments?: PlatformDocument[];
  onStatusChange: (item: ActionItem, status: ActionStatus) => void;
  onDueDateChange: (item: ActionItem, date: Date | undefined) => void;
  onDelete: (item: ActionItem) => void;
  onAddDeliverable?: (actionId: string, deliverable: { title: string; type: string; external_url?: string; document_id?: string }) => void;
  onCompleteDeliverable?: (id: string, actionId: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const ActionItemCard = memo(function ActionItemCard({ 
  item, canWrite, isStaff, deliverables = [], platformDocuments = [], onStatusChange, onDueDateChange, onDelete,
  onAddDeliverable, onCompleteDeliverable, isSelected, onToggleSelect,
}: ActionItemCardProps) {
  const { t } = useTranslation();
  const isOverdue = item.due_date && isPast(parseISO(item.due_date)) && !isToday(parseISO(item.due_date)) && item.status !== 'completed';
  const isDueToday = item.due_date && isToday(parseISO(item.due_date)) && item.status !== 'completed';
  const priorityConfig = PRIORITY_CONFIG[item.priority || 'medium'] || PRIORITY_CONFIG.medium;

  const [addDeliverableOpen, setAddDeliverableOpen] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState({ title: '', type: 'link', external_url: '', document_id: '' });

  const totalDeliverables = deliverables.length;
  const completedDeliverables = deliverables.filter(d => d.completed_at).length;
  const allDeliverablesCompleted = totalDeliverables > 0 && completedDeliverables === totalDeliverables;

  // Status options: founders can only set pending/in_progress; staff can also set completed
  const statusOptions = isStaff
    ? [
        { value: 'pending', label: t('status.open', 'Aberta') },
        { value: 'in_progress', label: t('status.doing', 'A Fazer') },
        { value: 'completed', label: t('status.done', 'Concluída') },
      ]
    : [
        { value: 'pending', label: t('status.open', 'Aberta') },
        { value: 'in_progress', label: t('status.doing', 'A Fazer') },
      ];

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'completed' && !isStaff) {
      toast.error(t('actions.onlyStaffCanComplete', 'Apenas o consultor pode marcar como concluída'));
      return;
    }
    if (newStatus === 'completed' && totalDeliverables > 0 && !allDeliverablesCompleted) {
      toast.error(t('actions.deliverablesRequired', 'Todos os entregáveis devem estar concluídos antes de concluir a ação'));
      return;
    }
    onStatusChange(item, newStatus as ActionStatus);
  };

  const handleAddDeliverable = () => {
    if (newDeliverable.type === 'platform_document') {
      if (!newDeliverable.document_id) {
        toast.error(t('actions.selectPlatformDoc', 'Selecione um documento da plataforma'));
        return;
      }
      const doc = platformDocuments.find(d => d.id === newDeliverable.document_id);
      onAddDeliverable?.(item.id, {
        title: doc?.name || 'Documento',
        type: 'platform_document',
        document_id: newDeliverable.document_id,
      });
    } else {
      if (!newDeliverable.title.trim()) {
        toast.error(t('actions.deliverableTitleRequired', 'O título do entregável é obrigatório'));
        return;
      }
      onAddDeliverable?.(item.id, {
        title: newDeliverable.title,
        type: newDeliverable.type,
        external_url: newDeliverable.type === 'link' ? newDeliverable.external_url : undefined,
      });
    }
    setNewDeliverable({ title: '', type: 'link', external_url: '', document_id: '' });
    setAddDeliverableOpen(false);
  };

  return (
    <>
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

        {item.description && (
          <p className="text-xs text-muted-foreground pl-10 line-clamp-2">{item.description}</p>
        )}

        {isOverdue && (
          <div className="flex items-center gap-1 text-xs text-destructive font-medium">
            <AlertTriangle className="h-3 w-3" />
            {t('actions.overdue', 'Atrasada')}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {canWrite ? (
            <Select value={item.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-6 w-auto px-2 text-xs border-dashed"><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
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

          <span className={`text-xs ${priorityConfig.color}`}>{t(priorityConfig.labelKey)}</span>

          {/* Deliverables count badge */}
          {totalDeliverables > 0 && (
            <Badge variant={allDeliverablesCompleted ? 'default' : 'outline'} className="text-xs gap-1">
              <Paperclip className="h-3 w-3" />
              {completedDeliverables}/{totalDeliverables}
            </Badge>
          )}
        </div>

        {/* Deliverables section */}
        {(totalDeliverables > 0 || canWrite) && (
          <div className="pl-10 space-y-1 pt-1">
            {deliverables.map(d => (
              <div key={d.id} className="flex items-center gap-2 text-xs group/del">
                {d.type === 'link' ? <Link2 className="h-3 w-3 text-muted-foreground shrink-0" /> 
                  : d.type === 'platform_document' ? <Paperclip className="h-3 w-3 text-primary shrink-0" />
                  : <FileText className="h-3 w-3 text-muted-foreground shrink-0" />}
                <span className={`flex-1 truncate ${d.completed_at ? 'line-through text-muted-foreground' : ''}`}>
                  {d.title}
                </span>
                {d.external_url && (
                  <a href={d.external_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline shrink-0" onClick={e => e.stopPropagation()}>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {d.completed_at ? (
                  <Check className="h-3 w-3 text-green-600 shrink-0" />
                ) : isStaff && onCompleteDeliverable ? (
                  <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover/del:opacity-100" onClick={() => onCompleteDeliverable(d.id, item.id)}>
                    <Check className="h-3 w-3 text-green-600" />
                  </Button>
                ) : null}
              </div>
            ))}
            {canWrite && (
              <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground px-1 gap-1" onClick={() => setAddDeliverableOpen(true)}>
                <Plus className="h-3 w-3" />
                {t('actions.addDeliverable', 'Adicionar entregável')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add Deliverable Dialog */}
      <Dialog open={addDeliverableOpen} onOpenChange={setAddDeliverableOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('actions.addDeliverable', 'Adicionar entregável')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('actions.deliverableType', 'Tipo')}</Label>
              <Select value={newDeliverable.type} onValueChange={v => setNewDeliverable(d => ({ ...d, type: v, title: '', document_id: '', external_url: '' }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="link"><span className="flex items-center gap-1.5"><Link2 className="h-3 w-3" /> Link</span></SelectItem>
                  <SelectItem value="file"><span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> {t('actions.deliverableFile', 'Ficheiro')}</span></SelectItem>
                  <SelectItem value="platform_document"><span className="flex items-center gap-1.5"><Paperclip className="h-3 w-3" /> {t('actions.deliverablePlatform', 'Doc. Plataforma')}</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newDeliverable.type === 'platform_document' ? (
              <div className="space-y-1.5">
                <Label className="text-xs">{t('actions.selectDocument', 'Documento')} *</Label>
                <Select value={newDeliverable.document_id} onValueChange={v => setNewDeliverable(d => ({ ...d, document_id: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={t('actions.selectPlatformDocPlaceholder', 'Selecionar documento...')} /></SelectTrigger>
                  <SelectContent>
                    {platformDocuments.length === 0 ? (
                      <div className="px-2 py-3 text-xs text-muted-foreground text-center">{t('actions.noPlatformDocs', 'Sem documentos disponíveis')}</div>
                    ) : (
                      platformDocuments.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('actions.deliverableTitle', 'Título')} *</Label>
                  <Input value={newDeliverable.title} onChange={e => setNewDeliverable(d => ({ ...d, title: e.target.value }))} placeholder={t('actions.deliverableTitlePlaceholder', 'Ex: Business Model Canvas')} className="h-8 text-sm" />
                </div>
                {newDeliverable.type === 'link' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">URL</Label>
                    <Input value={newDeliverable.external_url} onChange={e => setNewDeliverable(d => ({ ...d, external_url: e.target.value }))} placeholder="https://..." className="h-8 text-sm" />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddDeliverableOpen(false)}>{t('common.cancel')}</Button>
            <Button size="sm" onClick={handleAddDeliverable}>{t('common.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
