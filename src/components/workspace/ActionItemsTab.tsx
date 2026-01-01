import { useState, useMemo } from 'react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { Plus, AlertTriangle, Calendar, User, Trash2, GripVertical, Target, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useActionItems, useUpdateActionItem, useDeleteActionItem, useCreateActionItemFull, type ActionItem } from '@/hooks/useActionItems';
import { useMilestones, type Milestone } from '@/hooks/useMilestones';
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
  const { data: milestones, isLoading: milestonesLoading } = useMilestones(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const updateAction = useUpdateActionItem(workspaceId);
  const deleteAction = useDeleteActionItem(workspaceId);
  const createAction = useCreateActionItemFull(workspaceId);

  const [filters, setFilters] = useState({
    owner: 'all',
    overdue: false,
    priority: 'all',
  });
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedMilestoneForCreate, setSelectedMilestoneForCreate] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<ActionItem | null>(null);
  const [newAction, setNewAction] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    owner_user_id: '',
    milestone_id: '',
  });


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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !canWrite) return;
    try {
      await deleteAction.mutateAsync(deleteTarget.id);
      toast.success('Action item deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete action item');
    }
  };

  const handleCreate = async () => {
    if (!newAction.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!newAction.milestone_id) {
      toast.error('Please select a milestone');
      return;
    }
    try {
      await createAction.mutateAsync({
        title: newAction.title,
        description: newAction.description || undefined,
        due_date: newAction.due_date || null,
        priority: newAction.priority,
        owner_user_id: newAction.owner_user_id || null,
        milestone_id: newAction.milestone_id,
      });
      toast.success('Action item created');
      setCreateDialogOpen(false);
      setNewAction({ title: '', description: '', due_date: '', priority: 'medium', owner_user_id: '', milestone_id: '' });
    } catch {
      toast.error('Failed to create action item');
    }
  };

  const openCreateDialogForMilestone = (milestoneId: string) => {
    setNewAction(prev => ({ ...prev, milestone_id: milestoneId }));
    setCreateDialogOpen(true);
  };

  // Group actions by milestone
  const actionsByMilestone = useMemo(() => {
    const grouped = new Map<string, ActionItem[]>();
    const unassigned: ActionItem[] = [];
    
    (actionItems || []).forEach(item => {
      let passesFilters = true;
      
      if (filters.owner !== 'all' && item.owner_user_id !== filters.owner) {
        passesFilters = false;
      }
      if (filters.priority !== 'all' && item.priority !== filters.priority) {
        passesFilters = false;
      }
      if (filters.overdue) {
        const isOverdue = item.due_date && 
          isPast(parseISO(item.due_date)) && 
          !isToday(parseISO(item.due_date)) &&
          item.status !== 'completed';
        if (!isOverdue) passesFilters = false;
      }
      
      if (!passesFilters) return;
      
      if (item.milestone_id) {
        const existing = grouped.get(item.milestone_id) || [];
        existing.push(item);
        grouped.set(item.milestone_id, existing);
      } else {
        unassigned.push(item);
      }
    });
    
    return { grouped, unassigned };
  }, [actionItems, filters]);

  const toggleMilestoneExpanded = (milestoneId: string) => {
    setExpandedMilestones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId);
      } else {
        newSet.add(milestoneId);
      }
      return newSet;
    });
  };

  if (isLoading || milestonesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
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

  const totalActions = actionItems?.length || 0;
  const completedActions = actionItems?.filter(a => a.status === 'completed').length || 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
        {canWrite && milestones && milestones.length > 0 && (
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

        <div className="ml-auto text-sm text-muted-foreground">
          {completedActions}/{totalActions} completed
        </div>
      </div>

      {/* Milestones with nested actions */}
      {(!milestones || milestones.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No milestones yet. Create milestones first to add actions.</p>
            <p className="text-xs mt-1">Actions belong to milestones to track progress toward goals.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {milestones.map(milestone => {
            const milestoneActions = actionsByMilestone.grouped.get(milestone.id) || [];
            const completedCount = milestoneActions.filter(a => a.status === 'completed').length;
            const progress = milestoneActions.length > 0 
              ? Math.round((completedCount / milestoneActions.length) * 100) 
              : 0;
            const isExpanded = expandedMilestones.has(milestone.id);

            return (
              <MilestoneActionGroup
                key={milestone.id}
                milestone={milestone}
                actions={milestoneActions}
                progress={progress}
                completedCount={completedCount}
                isExpanded={isExpanded}
                onToggle={() => toggleMilestoneExpanded(milestone.id)}
                onAddAction={() => openCreateDialogForMilestone(milestone.id)}
                canWrite={canWrite}
                members={members || []}
                onStatusChange={handleStatusChange}
                onDueDateChange={handleDueDateChange}
                onOwnerChange={handleOwnerChange}
                onDelete={(item) => setDeleteTarget(item)}
              />
            );
          })}

          {/* Unassigned actions (legacy) */}
          {actionsByMilestone.unassigned.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Unassigned Actions ({actionsByMilestone.unassigned.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {actionsByMilestone.unassigned.map(item => (
                  <ActionItemCard
                    key={item.id}
                    item={item}
                    canWrite={canWrite}
                    members={members || []}
                    onStatusChange={handleStatusChange}
                    onDueDateChange={handleDueDateChange}
                    onOwnerChange={handleOwnerChange}
                    onDelete={(item) => setDeleteTarget(item)}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="milestone">Milestone *</Label>
              <Select 
                value={newAction.milestone_id} 
                onValueChange={v => setNewAction(a => ({ ...a, milestone_id: v }))}
              >
                <SelectTrigger id="milestone">
                  <Target className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select milestone..." />
                </SelectTrigger>
                <SelectContent>
                  {milestones?.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <Button onClick={handleCreate} disabled={createAction.isPending || !newAction.milestone_id}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// New component for milestone with nested actions
interface MilestoneActionGroupProps {
  milestone: Milestone;
  actions: ActionItem[];
  progress: number;
  completedCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  onAddAction: () => void;
  canWrite: boolean;
  members: Array<{ user_id: string; profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null }>;
  onStatusChange: (item: ActionItem, status: ActionStatus) => void;
  onDueDateChange: (item: ActionItem, date: Date | undefined) => void;
  onOwnerChange: (item: ActionItem, ownerId: string) => void;
  onDelete: (item: ActionItem) => void;
}

function MilestoneActionGroup({
  milestone,
  actions,
  progress,
  completedCount,
  isExpanded,
  onToggle,
  onAddAction,
  canWrite,
  members,
  onStatusChange,
  onDueDateChange,
  onOwnerChange,
  onDelete,
}: MilestoneActionGroupProps) {
  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Target className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{milestone.title}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {completedCount}/{actions.length} actions
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={progress} className="h-1.5 flex-1 max-w-[200px]" />
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                </div>
              </div>
              {canWrite && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAction();
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            {actions.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No actions yet. Add actions to track progress.
              </div>
            ) : (
              actions.map(item => (
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
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
