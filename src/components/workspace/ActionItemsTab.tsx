import { useState, useMemo } from 'react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { Plus, AlertTriangle, Calendar, User, Trash2, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useActionItems, useUpdateActionItem, useDeleteActionItem, useCreateActionItemFull, type ActionItem } from '@/hooks/useActionItems';
import { useWorkspaceMembers } from '@/hooks/useSessions';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ActionStatus = Database['public']['Enums']['action_status'];

interface ActionItemsTabProps {
  workspaceId: string;
  canWrite: boolean;
}

const STATUS_CONFIG: Record<ActionStatus, { label: string; color: string }> = {
  pending: { label: 'Open', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'Doing', color: 'bg-primary/20 text-primary' },
  completed: { label: 'Done', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground line-through' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-muted-foreground' },
  medium: { label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' },
  high: { label: 'High', color: 'text-destructive' },
};

export function ActionItemsTab({ workspaceId, canWrite }: ActionItemsTabProps) {
  const { data: actionItems, isLoading, error } = useActionItems(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const updateAction = useUpdateActionItem(workspaceId);
  const deleteAction = useDeleteActionItem(workspaceId);
  const createAction = useCreateActionItemFull(workspaceId);

  const [filters, setFilters] = useState({
    owner: 'all',
    overdue: false,
    priority: 'all',
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAction, setNewAction] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    owner_user_id: '',
  });

  const filteredItems = useMemo(() => {
    if (!actionItems) return { pending: [], in_progress: [], completed: [] };

    let filtered = [...actionItems];

    if (filters.owner !== 'all') {
      filtered = filtered.filter(item => item.owner_user_id === filters.owner);
    }

    if (filters.overdue) {
      filtered = filtered.filter(item => 
        item.due_date && 
        isPast(parseISO(item.due_date)) && 
        !isToday(parseISO(item.due_date)) &&
        item.status !== 'completed'
      );
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(item => item.priority === filters.priority);
    }

    return {
      pending: filtered.filter(i => i.status === 'pending'),
      in_progress: filtered.filter(i => i.status === 'in_progress'),
      completed: filtered.filter(i => i.status === 'completed'),
    };
  }, [actionItems, filters]);

  const handleStatusChange = async (item: ActionItem, newStatus: ActionStatus) => {
    if (!canWrite) return;
    try {
      await updateAction.mutateAsync({ id: item.id, status: newStatus });
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDueDateChange = async (item: ActionItem, date: Date | undefined) => {
    if (!canWrite) return;
    try {
      await updateAction.mutateAsync({ 
        id: item.id, 
        due_date: date ? format(date, 'yyyy-MM-dd') : null 
      });
    } catch {
      toast.error('Failed to update due date');
    }
  };

  const handleOwnerChange = async (item: ActionItem, ownerId: string) => {
    if (!canWrite) return;
    try {
      await updateAction.mutateAsync({ 
        id: item.id, 
        owner_user_id: ownerId === 'none' ? null : ownerId 
      });
    } catch {
      toast.error('Failed to update owner');
    }
  };

  const handleDelete = async (item: ActionItem) => {
    if (!canWrite) return;
    try {
      await deleteAction.mutateAsync(item.id);
      toast.success('Action item deleted');
    } catch {
      toast.error('Failed to delete action item');
    }
  };

  const handleCreate = async () => {
    if (!newAction.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      await createAction.mutateAsync({
        title: newAction.title,
        description: newAction.description || undefined,
        due_date: newAction.due_date || null,
        priority: newAction.priority,
        owner_user_id: newAction.owner_user_id || null,
      });
      toast.success('Action item created');
      setCreateDialogOpen(false);
      setNewAction({ title: '', description: '', due_date: '', priority: 'medium', owner_user_id: '' });
    } catch {
      toast.error('Failed to create action item');
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-96" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-8 text-center text-destructive">
          Failed to load action items
        </CardContent>
      </Card>
    );
  }

  const totalPending = filteredItems.pending.length;
  const totalInProgress = filteredItems.in_progress.length;
  const totalCompleted = filteredItems.completed.length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
        {canWrite && (
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Action
          </Button>
        )}
        
        <div className="h-6 w-px bg-border" />
        
        <Select value={filters.owner} onValueChange={v => setFilters(f => ({ ...f, owner: v }))}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <User className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            {members?.map(m => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.profile?.full_name || m.profile?.email || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.priority} onValueChange={v => setFilters(f => ({ ...f, priority: v }))}>
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant={filters.overdue ? "secondary" : "ghost"} 
          size="sm"
          className="h-8"
          onClick={() => setFilters(f => ({ ...f, overdue: !f.overdue }))}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Overdue
        </Button>

        {(filters.owner !== 'all' || filters.priority !== 'all' || filters.overdue) && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-muted-foreground"
            onClick={() => setFilters({ owner: 'all', overdue: false, priority: 'all' })}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Kanban Columns */}
      <div className="grid gap-4 md:grid-cols-3">
        <KanbanColumn
          title="Open"
          count={totalPending}
          items={filteredItems.pending}
          status="pending"
          canWrite={canWrite}
          members={members || []}
          onStatusChange={handleStatusChange}
          onDueDateChange={handleDueDateChange}
          onOwnerChange={handleOwnerChange}
          onDelete={handleDelete}
        />
        <KanbanColumn
          title="Doing"
          count={totalInProgress}
          items={filteredItems.in_progress}
          status="in_progress"
          canWrite={canWrite}
          members={members || []}
          onStatusChange={handleStatusChange}
          onDueDateChange={handleDueDateChange}
          onOwnerChange={handleOwnerChange}
          onDelete={handleDelete}
        />
        <KanbanColumn
          title="Done"
          count={totalCompleted}
          items={filteredItems.completed}
          status="completed"
          canWrite={canWrite}
          members={members || []}
          onStatusChange={handleStatusChange}
          onDueDateChange={handleDueDateChange}
          onOwnerChange={handleOwnerChange}
          onDelete={handleDelete}
        />
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newAction.title}
                onChange={e => setNewAction(a => ({ ...a, title: e.target.value }))}
                placeholder="What needs to be done?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newAction.description}
                onChange={e => setNewAction(a => ({ ...a, description: e.target.value }))}
                placeholder="Additional details..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newAction.due_date}
                  onChange={e => setNewAction(a => ({ ...a, due_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={newAction.priority} 
                  onValueChange={v => setNewAction(a => ({ ...a, priority: v }))}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Select 
                value={newAction.owner_user_id} 
                onValueChange={v => setNewAction(a => ({ ...a, owner_user_id: v }))}
              >
                <SelectTrigger id="owner">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  {members?.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.profile?.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createAction.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface KanbanColumnProps {
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

function KanbanColumn({ 
  title, 
  count, 
  items, 
  status,
  canWrite,
  members,
  onStatusChange,
  onDueDateChange,
  onOwnerChange,
  onDelete,
}: KanbanColumnProps) {
  const config = STATUS_CONFIG[status];
  
  return (
    <Card className="bg-muted/20">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${config.color}`}>
              {title}
            </span>
          </span>
          <span className="text-muted-foreground font-normal">{count}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3 space-y-2 max-h-[600px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No items
          </div>
        ) : (
          items.map(item => (
            <ActionItemCard
              key={item.id}
              item={item}
              canWrite={canWrite}
              members={members}
              onStatusChange={onStatusChange}
              onDueDateChange={onDueDateChange}
              onOwnerChange={onOwnerChange}
              onDelete={onDelete}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface ActionItemCardProps {
  item: ActionItem;
  canWrite: boolean;
  members: Array<{ user_id: string; profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null }>;
  onStatusChange: (item: ActionItem, status: ActionStatus) => void;
  onDueDateChange: (item: ActionItem, date: Date | undefined) => void;
  onOwnerChange: (item: ActionItem, ownerId: string) => void;
  onDelete: (item: ActionItem) => void;
}

function ActionItemCard({ 
  item, 
  canWrite,
  members,
  onStatusChange,
  onDueDateChange,
  onOwnerChange,
  onDelete,
}: ActionItemCardProps) {
  const isOverdue = item.due_date && 
    isPast(parseISO(item.due_date)) && 
    !isToday(parseISO(item.due_date)) && 
    item.status !== 'completed';
  
  const isDueToday = item.due_date && isToday(parseISO(item.due_date)) && item.status !== 'completed';
  const priorityConfig = PRIORITY_CONFIG[item.priority || 'medium'];

  return (
    <div className={`
      group bg-background rounded-lg border p-3 space-y-2 transition-all
      ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}
      ${isDueToday ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10' : ''}
    `}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
          <span className="text-sm font-medium leading-tight break-words">
            {item.title}
          </span>
        </div>
        {canWrite && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>

      {isOverdue && (
        <div className="flex items-center gap-1 text-xs text-destructive font-medium">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {canWrite ? (
          <Select value={item.status} onValueChange={(v) => onStatusChange(item, v as ActionStatus)}>
            <SelectTrigger className="h-6 w-auto px-2 text-xs border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Open</SelectItem>
              <SelectItem value="in_progress">Doing</SelectItem>
              <SelectItem value="completed">Done</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="text-xs">
            {STATUS_CONFIG[item.status].label}
          </Badge>
        )}

        {canWrite ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={`h-6 px-2 text-xs border-dashed ${isOverdue ? 'text-destructive border-destructive' : isDueToday ? 'text-yellow-600 border-yellow-500' : ''}`}>
                <Calendar className="h-3 w-3 mr-1" />
                {item.due_date ? format(parseISO(item.due_date), 'MMM d') : 'Due'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={item.due_date ? parseISO(item.due_date) : undefined}
                onSelect={(date) => onDueDateChange(item, date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        ) : item.due_date ? (
          <Badge variant="outline" className={`text-xs ${isOverdue ? 'text-destructive border-destructive' : ''}`}>
            <Calendar className="h-3 w-3 mr-1" />
            {format(parseISO(item.due_date), 'MMM d')}
          </Badge>
        ) : null}

        {canWrite ? (
          <Select 
            value={item.owner_user_id || 'none'} 
            onValueChange={(v) => onOwnerChange(item, v)}
          >
            <SelectTrigger className="h-6 w-auto px-2 text-xs border-dashed max-w-[100px]">
              <User className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate">
                {item.owner?.full_name?.split(' ')[0] || 'Assign'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {members.map(m => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.profile?.email || 'Unknown'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : item.owner ? (
          <Badge variant="outline" className="text-xs">
            <User className="h-3 w-3 mr-1" />
            {item.owner.full_name?.split(' ')[0]}
          </Badge>
        ) : null}

        <span className={`text-xs ${priorityConfig.color}`}>
          {priorityConfig.label}
        </span>
      </div>
    </div>
  );
}
