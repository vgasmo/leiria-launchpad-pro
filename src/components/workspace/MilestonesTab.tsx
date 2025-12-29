import { useState } from 'react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { Plus, ChevronUp, ChevronDown, Trash2, Calendar, Target, Clock, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone, useReorderMilestones, type Milestone } from '@/hooks/useMilestones';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type MilestoneStatus = Database['public']['Enums']['milestone_status'];

interface MilestonesTabProps {
  workspaceId: string;
  canWrite: boolean;
}

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; color: string; icon: typeof Circle }> = {
  not_started: { label: 'Planned', color: 'bg-muted text-muted-foreground', icon: Circle },
  in_progress: { label: 'In Progress', color: 'bg-primary/20 text-primary', icon: Clock },
  completed: { label: 'Done', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  delayed: { label: 'Delayed', color: 'bg-destructive/20 text-destructive', icon: AlertTriangle },
};

export function MilestonesTab({ workspaceId, canWrite }: MilestonesTabProps) {
  const { data: milestones, isLoading, error } = useMilestones(workspaceId);
  const createMilestone = useCreateMilestone(workspaceId);
  const updateMilestone = useUpdateMilestone(workspaceId);
  const deleteMilestone = useDeleteMilestone(workspaceId);
  const reorderMilestones = useReorderMilestones(workspaceId);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    target_date: '',
  });

  const handleCreate = async () => {
    if (!newMilestone.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      await createMilestone.mutateAsync({
        title: newMilestone.title,
        description: newMilestone.description || undefined,
        target_date: newMilestone.target_date || null,
      });
      toast.success('Milestone created');
      setCreateDialogOpen(false);
      setNewMilestone({ title: '', description: '', target_date: '' });
    } catch {
      toast.error('Failed to create milestone');
    }
  };

  const handleStatusChange = async (milestone: Milestone, status: MilestoneStatus) => {
    if (!canWrite) return;
    try {
      await updateMilestone.mutateAsync({ id: milestone.id, status });
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (milestone: Milestone) => {
    if (!canWrite) return;
    try {
      await deleteMilestone.mutateAsync(milestone.id);
      toast.success('Milestone deleted');
    } catch {
      toast.error('Failed to delete milestone');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (!canWrite || !milestones || index === 0) return;
    const updated = [...milestones];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    const reordered = updated.map((m, i) => ({ id: m.id, position: i }));
    try {
      await reorderMilestones.mutateAsync(reordered);
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (!canWrite || !milestones || index === milestones.length - 1) return;
    const updated = [...milestones];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    const reordered = updated.map((m, i) => ({ id: m.id, position: i }));
    try {
      await reorderMilestones.mutateAsync(reordered);
    } catch {
      toast.error('Failed to reorder');
    }
  };

  if (isLoading) {
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
          Failed to load milestones
        </CardContent>
      </Card>
    );
  }

  const sortedMilestones = milestones || [];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {canWrite && (
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Milestone
          </Button>
        )}
        <div className="text-sm text-muted-foreground">
          {sortedMilestones.filter(m => m.status === 'completed').length}/{sortedMilestones.length} completed
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-2">
          {sortedMilestones.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No milestones yet. Add your first milestone to track progress.
              </CardContent>
            </Card>
          ) : (
            sortedMilestones.map((milestone, index) => (
              <MilestoneListItem
                key={milestone.id}
                milestone={milestone}
                index={index}
                total={sortedMilestones.length}
                canWrite={canWrite}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineView milestones={sortedMilestones} />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newMilestone.title}
                onChange={e => setNewMilestone(m => ({ ...m, title: e.target.value }))}
                placeholder="e.g., Launch MVP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newMilestone.description}
                onChange={e => setNewMilestone(m => ({ ...m, description: e.target.value }))}
                placeholder="What does this milestone involve?"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_date">Target Date</Label>
              <Input
                id="target_date"
                type="date"
                value={newMilestone.target_date}
                onChange={e => setNewMilestone(m => ({ ...m, target_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMilestone.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MilestoneListItemProps {
  milestone: Milestone;
  index: number;
  total: number;
  canWrite: boolean;
  onStatusChange: (milestone: Milestone, status: MilestoneStatus) => void;
  onDelete: (milestone: Milestone) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function MilestoneListItem({
  milestone,
  index,
  total,
  canWrite,
  onStatusChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: MilestoneListItemProps) {
  const config = STATUS_CONFIG[milestone.status];
  const StatusIcon = config.icon;
  
  const isOverdue = milestone.target_date && 
    isPast(parseISO(milestone.target_date)) && 
    !isToday(parseISO(milestone.target_date)) &&
    milestone.status !== 'completed';

  return (
    <Card className={`transition-all ${isOverdue ? 'border-destructive/50' : ''}`}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          {/* Order controls */}
          {canWrite && (
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => onMoveDown(index)}
                disabled={index === total - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Status icon */}
          <StatusIcon className={`h-5 w-5 mt-0.5 shrink-0 ${
            milestone.status === 'completed' ? 'text-green-600' :
            milestone.status === 'in_progress' ? 'text-primary' :
            milestone.status === 'delayed' ? 'text-destructive' :
            'text-muted-foreground'
          }`} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className={`font-medium ${milestone.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                  {milestone.title}
                </h4>
                {milestone.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {milestone.description}
                  </p>
                )}
              </div>
              {canWrite && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onDelete(milestone)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {canWrite ? (
                <Select 
                  value={milestone.status} 
                  onValueChange={(v) => onStatusChange(milestone, v as MilestoneStatus)}
                >
                  <SelectTrigger className="h-7 w-auto px-2 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Done</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className={`text-xs ${config.color}`}>
                  {config.label}
                </Badge>
              )}

              {milestone.target_date && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${isOverdue ? 'text-destructive border-destructive' : ''}`}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(parseISO(milestone.target_date), 'MMM d, yyyy')}
                  {isOverdue && ' (overdue)'}
                </Badge>
              )}

              {milestone.completed_at && (
                <span className="text-xs text-muted-foreground">
                  Completed {format(parseISO(milestone.completed_at), 'MMM d')}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TimelineViewProps {
  milestones: Milestone[];
}

function TimelineView({ milestones }: TimelineViewProps) {
  if (milestones.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No milestones to display in timeline.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Milestone Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {milestones.map((milestone, index) => {
              const config = STATUS_CONFIG[milestone.status];
              const StatusIcon = config.icon;
              const isLast = index === milestones.length - 1;
              
              return (
                <div key={milestone.id} className="relative flex items-start gap-4 pl-8">
                  {/* Timeline dot */}
                  <div className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    milestone.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
                    milestone.status === 'in_progress' ? 'bg-primary/20' :
                    milestone.status === 'delayed' ? 'bg-destructive/20' :
                    'bg-muted'
                  }`}>
                    <StatusIcon className={`h-3.5 w-3.5 ${
                      milestone.status === 'completed' ? 'text-green-600' :
                      milestone.status === 'in_progress' ? 'text-primary' :
                      milestone.status === 'delayed' ? 'text-destructive' :
                      'text-muted-foreground'
                    }`} />
                  </div>
                  
                  {/* Content */}
                  <div className={`flex-1 pb-4 ${isLast ? '' : 'border-b border-dashed'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className={`text-sm font-medium ${
                          milestone.status === 'completed' ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {milestone.title}
                        </h4>
                        {milestone.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {milestone.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${config.color}`}>
                        {config.label}
                      </Badge>
                    </div>
                    {milestone.target_date && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(milestone.target_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
