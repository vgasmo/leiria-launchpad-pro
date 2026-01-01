import React, { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { useConsultantNotes, useCreateConsultantNote, useDeleteConsultantNote } from '@/hooks/useConsultantNotes';
import {
  useWorkspaceStaffTasks,
  useCreateStaffTask,
  useCompleteStaffTask,
  useDeleteStaffTask,
  type StaffTask,
} from '@/hooks/useStaffTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Lock,
  Unlock,
  Trash2,
  Plus,
  CheckCircle2,
  Clock,
  Users,
  Phone,
  FileText,
  MoreVertical,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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

interface NotesAndTasksTabProps {
  workspaceId: string;
  startupId?: string;
}

export function NotesAndTasksTab({ workspaceId, startupId }: NotesAndTasksTabProps) {
  const { isConsultor, isAdmin, isMentor, user } = useAuth();
  const canManage = isConsultor || isAdmin || isMentor;

  return (
    <Tabs defaultValue="tasks" className="space-y-4">
      <TabsList>
        <TabsTrigger value="tasks" className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Tasks
        </TabsTrigger>
        <TabsTrigger value="notes" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Notes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tasks">
        <TasksSection 
          workspaceId={workspaceId} 
          startupId={startupId}
          canManage={canManage}
          userId={user?.id}
        />
      </TabsContent>

      <TabsContent value="notes">
        <NotesSection workspaceId={workspaceId} canManage={canManage} />
      </TabsContent>
    </Tabs>
  );
}

// Tasks Section
function TasksSection({ 
  workspaceId, 
  startupId,
  canManage,
  userId,
}: { 
  workspaceId: string;
  startupId?: string;
  canManage: boolean;
  userId?: string;
}) {
  const { data: tasks, isLoading } = useWorkspaceStaffTasks(workspaceId);
  const completeMutation = useCompleteStaffTask();
  const deleteMutation = useDeleteStaffTask();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const pendingTasks = tasks?.filter(t => t.status !== 'completed') || [];
  const completedTasks = tasks?.filter(t => t.status === 'completed') || [];

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
        <CardContent className="py-6">
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
              Tasks for this Startup
            </CardTitle>
            {canManage && (
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No tasks yet</p>
              {canManage && <p className="text-sm">Create a task to get started</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Pending ({pendingTasks.length})</h4>
                  {pendingTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      canManage={canManage}
                      onComplete={() => handleComplete(task)}
                      onDelete={() => setDeleteTaskId(task.id)}
                    />
                  ))}
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Completed ({completedTasks.length})</h4>
                  {completedTasks.slice(0, 5).map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      canManage={canManage}
                      onComplete={() => {}}
                      onDelete={() => setDeleteTaskId(task.id)}
                      isCompleted
                    />
                  ))}
                  {completedTasks.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{completedTasks.length - 5} more completed
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      {canManage && userId && (
        <CreateWorkspaceTaskDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          workspaceId={workspaceId}
          startupId={startupId}
          assigneeId={userId}
        />
      )}

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
  canManage,
  onComplete,
  onDelete,
  isCompleted = false,
}: {
  task: StaffTask;
  canManage: boolean;
  onComplete: () => void;
  onDelete: () => void;
  isCompleted?: boolean;
}) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !isCompleted;
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const TaskIcon = TASK_TYPES.find((t) => t.value === task.task_type)?.icon || FileText;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group ${isCompleted ? 'opacity-60' : ''}`}>
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => !isCompleted && onComplete()}
        className="mt-1"
        disabled={isCompleted || !canManage}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TaskIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className={`font-medium text-sm truncate ${isCompleted ? 'line-through' : ''}`}>{task.title}</p>
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
          {task.assignee && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={task.assignee.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {task.assignee.full_name?.[0] || task.assignee.email?.[0]}
                </AvatarFallback>
              </Avatar>
              {task.assignee.full_name || task.assignee.email}
            </span>
          )}
        </div>
      </div>
      {canManage && (
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
            {!isCompleted && (
              <DropdownMenuItem onClick={onComplete}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Complete
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function CreateWorkspaceTaskDialog({
  open,
  onOpenChange,
  workspaceId,
  startupId,
  assigneeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  startupId?: string;
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
        workspace_id: workspaceId,
        related_startup_id: startupId || null,
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
              placeholder="e.g., Follow up on investor meeting"
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

// Notes Section (existing consultant notes functionality)
function NotesSection({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) {
  const [newNote, setNewNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);

  const { data: notes, isLoading } = useConsultantNotes(workspaceId);
  const createNote = useCreateConsultantNote();
  const deleteNote = useDeleteConsultantNote();

  const handleSubmit = async () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    try {
      await createNote.mutateAsync({
        workspaceId,
        content: newNote,
        isPrivate,
      });
      setNewNote('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Add Internal Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Write your internal note about this startup..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={4}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="private-toggle"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
                <Label htmlFor="private-toggle" className="flex items-center gap-1">
                  {isPrivate ? (
                    <>
                      <Lock className="h-4 w-4" />
                      Private (consultants only)
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      Visible to workspace members
                    </>
                  )}
                </Label>
              </div>
              <Button onClick={handleSubmit} disabled={createNote.isPending || !newNote.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                {createNote.isPending ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 bg-muted rounded" />
                      <div className="h-16 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !notes?.length ? (
              <p className="text-center text-muted-foreground py-8">
                No notes yet. {canManage && 'Add the first note above.'}
              </p>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={note.author?.avatar_url || undefined} />
                      <AvatarFallback>
                        {note.author?.full_name?.[0] || note.author?.email?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {note.author?.full_name || note.author?.email || 'Unknown'}
                          </span>
                          {note.is_private && (
                            <Badge variant="secondary" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                          </span>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDelete(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}