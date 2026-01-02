import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isPast, isToday, formatDistanceToNow } from 'date-fns';
import { useConsultantNotes, useCreateConsultantNote, useDeleteConsultantNote } from '@/hooks/useConsultantNotes';
import {
  useWorkspaceStaffTasks,
  useCreateStaffTask,
  useCompleteStaffTask,
  useDeleteStaffTask,
  type StaffTask,
} from '@/hooks/useStaffTasks';
import { useSessions } from '@/hooks/useSessions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Sparkles,
  ChevronDown,
  Lightbulb,
  AlertTriangle,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  const { t } = useTranslation();
  const { isConsultor, isAdmin, isMentor, user } = useAuth();
  const canManage = isConsultor || isAdmin || isMentor;

  return (
    <Tabs defaultValue="tasks" className="space-y-4">
      <TabsList>
        <TabsTrigger value="tasks" className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {t('notes.tasks')}
        </TabsTrigger>
        <TabsTrigger value="insights" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Session Insights
        </TabsTrigger>
        <TabsTrigger value="notes" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          {t('notes.notes')}
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

      <TabsContent value="insights">
        <SessionInsightsSection 
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
  const { t } = useTranslation();
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
      toast.success(t('notes.taskCompleted'));
    } catch {
      toast.error(t('notes.failedToComplete'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTaskId) return;
    try {
      await deleteMutation.mutateAsync(deleteTaskId);
      toast.success(t('notes.taskDeleted'));
      setDeleteTaskId(null);
    } catch {
      toast.error(t('notes.failedToDelete'));
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
              {t('notes.tasksForStartup')}
            </CardTitle>
            {canManage && (
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('notes.addTask')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('notes.noTasksYet')}</p>
              {canManage && <p className="text-sm">{t('notes.createTaskToStart')}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{t('notes.pending')} ({pendingTasks.length})</h4>
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
                  <h4 className="text-sm font-medium text-muted-foreground">{t('notes.completed')} ({completedTasks.length})</h4>
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
                      {t('notes.moreCompleted', { count: completedTasks.length - 5 })}
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
            <AlertDialogTitle>{t('notes.deleteTask')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('notes.deleteTaskConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
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
  const { t } = useTranslation();
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !isCompleted;
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const TASK_TYPES: Record<string, { label: string; icon: typeof FileText }> = {
    general: { label: t('notes.generalTask'), icon: FileText },
    connect_startup: { label: t('notes.connectStartup'), icon: Users },
    contact_investor: { label: t('notes.contactInvestor'), icon: Phone },
    follow_up: { label: t('notes.followUp'), icon: Clock },
    review: { label: t('notes.reviewTemplate'), icon: FileText },
  };

  const TaskIcon = TASK_TYPES[task.task_type]?.icon || FileText;

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
              {isOverdue ? `${t('common.overdue')}: ` : isDueToday ? t('common.today') : ''}
              {!isDueToday && format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          {task.priority && task.priority !== 'medium' && (
            <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority]}`}>
              {t(`notes.${task.priority}`)}
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
                {t('notes.markComplete')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
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
  const { t } = useTranslation();
  const createMutation = useCreateStaffTask();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'general',
    priority: 'medium',
    due_date: '',
  });

  const TASK_TYPES = [
    { value: 'general', label: t('notes.generalTask'), icon: FileText },
    { value: 'connect_startup', label: t('notes.connectStartup'), icon: Users },
    { value: 'contact_investor', label: t('notes.contactInvestor'), icon: Phone },
    { value: 'follow_up', label: t('notes.followUp'), icon: Clock },
    { value: 'review', label: t('notes.reviewTemplate'), icon: FileText },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error(t('notes.titleRequired'));
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
      toast.success(t('notes.taskCreated'));
      onOpenChange(false);
      setFormData({
        title: '',
        description: '',
        task_type: 'general',
        priority: 'medium',
        due_date: '',
      });
    } catch {
      toast.error(t('notes.failedToCreate'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('notes.createTask')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('notes.taskTitle')} *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              placeholder={t('notes.taskTitlePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('notes.description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder={t('notes.descriptionPlaceholder')}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('notes.taskType')}</Label>
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
              <Label>{t('actions.priority')}</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData((p) => ({ ...p, priority: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('notes.low')}</SelectItem>
                  <SelectItem value="medium">{t('notes.medium')}</SelectItem>
                  <SelectItem value="high">{t('notes.high')}</SelectItem>
                  <SelectItem value="urgent">{t('notes.urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date">{t('notes.dueDate')}</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData((p) => ({ ...p, due_date: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? t('common.creating') : t('notes.createTask')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Session Insights Section - Shows AI-generated content from sessions
function SessionInsightsSection({ 
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
  const { t } = useTranslation();
  const { data: sessions, isLoading } = useSessions(workspaceId);
  const createNote = useCreateConsultantNote();
  const createTask = useCreateStaffTask();

  // Filter sessions with AI content
  const sessionsWithAI = sessions?.filter(s => 
    s.ai_summary || (s.ai_decisions && s.ai_decisions.length > 0) || 
    (s.ai_action_suggestions && s.ai_action_suggestions.length > 0) ||
    (s.ai_risks && s.ai_risks.length > 0)
  ).slice(0, 5) || [];

  const handleSaveAsNote = async (content: string, sessionTitle: string) => {
    try {
      await createNote.mutateAsync({
        workspaceId,
        content: `[From session: ${sessionTitle}]\n\n${content}`,
        isPrivate: false,
      });
      toast.success('Saved as note');
    } catch {
      toast.error('Failed to save note');
    }
  };

  const handleCreateTask = async (suggestion: { title: string; description: string; priority: string }) => {
    if (!userId) return;
    try {
      await createTask.mutateAsync({
        title: suggestion.title,
        description: suggestion.description,
        task_type: 'follow_up',
        priority: suggestion.priority || 'medium',
        due_date: null,
        assignee_id: userId,
        workspace_id: workspaceId,
        related_startup_id: startupId || null,
      });
      toast.success('Task created');
    } catch {
      toast.error('Failed to create task');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessionsWithAI.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No AI insights yet</p>
          <p className="text-sm mt-1">
            Session insights will appear here after running AI analysis on your sessions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              AI insights from your sessions can be saved as notes or converted to tasks.
            </span>
          </div>
        </CardContent>
      </Card>

      {sessionsWithAI.map(session => (
        <SessionInsightCard 
          key={session.id}
          session={session}
          canManage={canManage}
          onSaveAsNote={handleSaveAsNote}
          onCreateTask={handleCreateTask}
        />
      ))}
    </div>
  );
}

interface SessionInsightCardProps {
  session: {
    id: string;
    title: string;
    scheduled_at: string;
    ai_summary: string | null;
    ai_decisions: string[] | null;
    ai_action_suggestions: { title: string; description: string; priority: string }[] | null;
    ai_risks: { risk: string; severity: string }[] | null;
    ai_generated_at: string | null;
  };
  canManage: boolean;
  onSaveAsNote: (content: string, sessionTitle: string) => void;
  onCreateTask: (suggestion: { title: string; description: string; priority: string }) => void;
}

function SessionInsightCard({ session, canManage, onSaveAsNote, onCreateTask }: SessionInsightCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{session.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(session.scheduled_at), 'MMM d, yyyy')}
                    {session.ai_generated_at && (
                      <span className="text-xs">
                        • AI generated {formatDistanceToNow(new Date(session.ai_generated_at), { addSuffix: true })}
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* AI Summary */}
            {session.ai_summary && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Summary
                  </h4>
                  {canManage && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onSaveAsNote(session.ai_summary!, session.title)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Save as Note
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {session.ai_summary}
                </p>
              </div>
            )}

            {/* AI Decisions */}
            {session.ai_decisions && session.ai_decisions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Decisions ({session.ai_decisions.length})
                  </h4>
                  {canManage && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onSaveAsNote(
                        `Decisions:\n${session.ai_decisions!.map((d, i) => `${i + 1}. ${d}`).join('\n')}`,
                        session.title
                      )}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Save as Note
                    </Button>
                  )}
                </div>
                <ul className="space-y-1">
                  {session.ai_decisions.map((decision, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      {decision}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Risks */}
            {session.ai_risks && session.ai_risks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Risks Identified ({session.ai_risks.length})
                </h4>
                <ul className="space-y-1">
                  {session.ai_risks.map((risk, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="flex-1">{risk.risk}</span>
                      <Badge variant="outline" className="text-xs">
                        {risk.severity}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Action Suggestions */}
            {session.ai_action_suggestions && session.ai_action_suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Suggested Actions ({session.ai_action_suggestions.length})
                </h4>
                <ul className="space-y-2">
                  {session.ai_action_suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm bg-primary/5 border border-primary/20 p-3 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium">{suggestion.title}</p>
                          {suggestion.description && (
                            <p className="text-muted-foreground text-xs mt-1">{suggestion.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.priority}
                          </Badge>
                          {canManage && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onCreateTask(suggestion)}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Create Task
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Notes Section (existing consultant notes functionality)
function NotesSection({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) {
  const { t } = useTranslation();
  const [newNote, setNewNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);

  const { data: notes, isLoading } = useConsultantNotes(workspaceId);
  const createNote = useCreateConsultantNote();
  const deleteNote = useDeleteConsultantNote();

  const handleSubmit = async () => {
    if (!newNote.trim()) {
      toast.error(t('notes.enterNote'));
      return;
    }

    try {
      await createNote.mutateAsync({
        workspaceId,
        content: newNote,
        isPrivate,
      });
      setNewNote('');
      toast.success(t('notes.noteAdded'));
    } catch {
      toast.error(t('notes.failedToAddNote'));
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      toast.success(t('notes.noteDeleted'));
    } catch {
      toast.error(t('notes.failedToDeleteNote'));
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('notes.addInternalNote')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={t('notes.notePlaceholder')}
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
                      {t('notes.privateLabel')}
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      {t('notes.visibleLabel')}
                    </>
                  )}
                </Label>
              </div>
              <Button onClick={handleSubmit} disabled={createNote.isPending || !newNote.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                {createNote.isPending ? t('notes.adding') : t('notes.addNote')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('notes.notesHistory')}</CardTitle>
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
                {t('notes.noNotesYet')} {canManage && t('notes.addFirstNote')}
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
                              {t('notes.private')}
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
