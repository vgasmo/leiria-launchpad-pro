import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import {
  Plus,
  CheckCircle2,
  Clock,
  Users,
  Phone,
  Building2,
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  useMyStaffTasks,
  useCreateStaffTask,
  useCompleteStaffTask,
  useDeleteStaffTask,
  type StaffTask,
} from '@/hooks/useStaffTasks';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TASK_TYPES = [
  { value: 'general', label: 'General Task', icon: FileText },
  { value: 'connect_startup', label: 'Connect Startup', icon: Users },
  { value: 'contact_investor', label: 'Contact Investor', icon: Phone },
  { value: 'follow_up', label: 'Follow Up', icon: Clock },
  { value: 'review', label: 'Review Template', icon: FileText },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  urgent: 'bg-destructive/10 text-destructive',
};

interface StaffTasksPanelProps {
  showCreateButton?: boolean;
  compact?: boolean;
}

export function StaffTasksPanel({ showCreateButton = true, compact = false }: StaffTasksPanelProps) {
  const { data: tasks, isLoading } = useMyStaffTasks();
  const { user } = useAuth();
  const completeMutation = useCompleteStaffTask();
  const deleteMutation = useDeleteStaffTask();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const handleComplete = async (task: StaffTask) => {
    try {
      await completeMutation.mutateAsync(task.id);
      toast.success('Task completed');
    } catch {
      toast.error('Failed to complete task');
    }
  };

  const handleDelete = async () => {
    if (!deleteTaskId) return;
    try {
      await deleteMutation.mutateAsync(deleteTaskId);
      toast.success('Task deleted');
      setDeleteTaskId(null);
    } catch {
      toast.error('Failed to delete task');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              My Tasks
            </CardTitle>
            {showCreateButton && (
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!tasks?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pending tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, compact ? 5 : undefined).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={() => handleComplete(task)}
                  onDelete={() => setDeleteTaskId(task.id)}
                />
              ))}
              {compact && tasks.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{tasks.length - 5} more tasks
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <CreateStaffTaskDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        assigneeId={user?.id || ''}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TaskItem({
  task,
  onComplete,
  onDelete,
}: {
  task: StaffTask;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const TaskIcon = TASK_TYPES.find((t) => t.value === task.task_type)?.icon || FileText;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={() => onComplete()}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TaskIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="font-medium text-sm truncate">{task.title}</p>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.due_date && (
            <span
              className={`text-xs ${
                isOverdue
                  ? 'text-destructive font-medium'
                  : isDueToday
                  ? 'text-amber-600 font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {isOverdue ? 'Overdue: ' : isDueToday ? 'Today' : ''}
              {!isDueToday && format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          {task.priority && task.priority !== 'medium' && (
            <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </Badge>
          )}
          {task.workspace?.startup?.name && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <Building2 className="h-3 w-3 mr-1" />
              {task.workspace.startup.name}
            </Badge>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onComplete}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark Complete
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CreateStaffTaskDialog({
  open,
  onOpenChange,
  assigneeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assigneeId: string;
}) {
  const createMutation = useCreateStaffTask();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'general',
    priority: 'medium',
    due_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        task_type: formData.task_type,
        priority: formData.priority,
        due_date: formData.due_date || null,
        assignee_id: assigneeId,
      });
      toast.success('Task created');
      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        task_type: 'general',
        priority: 'medium',
        due_date: '',
      });
    } catch {
      toast.error('Failed to create task');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Contact investor about Series A"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Add details..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.task_type}
                onValueChange={(v) => setFormData((p) => ({ ...p, task_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData((p) => ({ ...p, priority: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData((p) => ({ ...p, due_date: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
