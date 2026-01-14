import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isThisWeek, isThisMonth } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  FileText,
  Calendar,
  CheckSquare,
  Sparkles,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  Lightbulb,
  Target,
  Clock,
  CircleCheck,
  Circle,
  Plus,
  X,
  Ban,
  Pencil,
  Save,
} from 'lucide-react';
import { FunnelItem, FunnelStage } from '@/hooks/useFunnel';
import { useActivityTimeline, useRelationshipRecap, useGenerateRecap, useSyncEmails, useAddActivity, ActivityType, ActivityEntry } from '@/hooks/useActivityTimeline';
import { useAddTask, useCompleteTask, useReopenTask, useCancelTask, useUpdateTask, TaskPriority } from '@/hooks/useCrmTasks';
import { useUpdateNextAction, useClearNextAction } from '@/hooks/useNextAction';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { useAuth } from '@/contexts/AuthContext';
import { useConsultors } from '@/hooks/useWorkspaceOwner';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/dateUtils';

type TaskStatusFilter = 'open' | 'done' | 'canceled';

const STAGE_CONFIG: Record<FunnelStage, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-slate-500' },
  first_contact_booked: { label: 'Meeting Booked', color: 'bg-blue-500' },
  met: { label: 'Met', color: 'bg-indigo-500' },
  qualified: { label: 'Qualified', color: 'bg-purple-500' },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-amber-500' },
  negotiating: { label: 'Negotiating', color: 'bg-orange-500' },
  contracted: { label: 'Contracted', color: 'bg-green-500' },
  incubating: { label: 'Incubating', color: 'bg-emerald-600' },
  accelerating: { label: 'Accelerating', color: 'bg-primary' },
  rejected: { label: 'Rejected', color: 'bg-destructive' },
  archived: { label: 'Archived', color: 'bg-muted-foreground' },
};

interface RecordDrawerProps {
  item: FunnelItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordDrawer({ item, open, onOpenChange }: RecordDrawerProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const language = i18n.language.startsWith('pt') ? 'pt' : 'en';
  const dateLocale = language === 'pt' ? pt : enUS;
  
  const [recapExpanded, setRecapExpanded] = useState(false);
  const [addActivityDialog, setAddActivityDialog] = useState<ActivityType | null>(null);
  const [addTaskDialog, setAddTaskDialog] = useState(false);
  const [nextActionDialog, setNextActionDialog] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('open');
  
  const emailSyncEnabled = useFeatureFlag('crm_graph_email_sync');
  const aiRecapEnabled = useFeatureFlag('crm_ai_recap');
  
  const { data: activities, isLoading: loadingActivities } = useActivityTimeline({
    funnelItemId: item?.id,
    limit: 100,
  });
  
  const { data: recap, isLoading: loadingRecap } = useRelationshipRecap({
    funnelItemId: item?.id,
    language,
  });
  
  const { data: consultors } = useConsultors();
  
  const generateRecap = useGenerateRecap();
  const syncEmails = useSyncEmails();
  const addActivity = useAddActivity();
  const addTask = useAddTask();
  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const cancelTask = useCancelTask();
  const updateTask = useUpdateTask();
  const updateNextAction = useUpdateNextAction();
  const clearNextAction = useClearNextAction();

  // Separate tasks from other activities and group by status
  const { openTasks, doneTasks, canceledTasks, otherActivities } = useMemo(() => {
    if (!activities?.length) return { openTasks: [], doneTasks: [], canceledTasks: [], otherActivities: [] };
    
    const open = activities.filter(a => a.activity_type === 'task' && a.status === 'open');
    const done = activities.filter(a => a.activity_type === 'task' && a.status === 'done');
    const canceled = activities.filter(a => a.activity_type === 'task' && a.status === 'canceled');
    const others = activities.filter(a => a.activity_type !== 'task');
    
    // Sort tasks by due_at (nulls last), then by created_at
    const sortTasks = (tasks: ActivityEntry[]) => {
      return [...tasks].sort((a, b) => {
        if (!a.due_at && !b.due_at) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      });
    };
    
    return { 
      openTasks: sortTasks(open), 
      doneTasks: sortTasks(done), 
      canceledTasks: sortTasks(canceled), 
      otherActivities: others 
    };
  }, [activities]);
  
  // Get current filtered tasks
  const filteredTasks = useMemo(() => {
    switch (taskStatusFilter) {
      case 'open': return openTasks;
      case 'done': return doneTasks;
      case 'canceled': return canceledTasks;
      default: return openTasks;
    }
  }, [taskStatusFilter, openTasks, doneTasks, canceledTasks]);

  // Group other activities by time period
  const groupedActivities = useMemo(() => {
    if (!otherActivities?.length) return {};
    
    const groups: Record<string, ActivityEntry[]> = {};
    
    otherActivities.forEach(activity => {
      const date = new Date(activity.occurred_at);
      let key: string;
      
      if (isThisWeek(date)) {
        key = t('crm.thisWeek');
      } else if (isThisMonth(date)) {
        key = t('crm.thisMonth');
      } else {
        key = format(date, 'MMMM yyyy', { locale: dateLocale });
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(activity);
    });
    
    return groups;
  }, [otherActivities, t, dateLocale]);

  const handleAddActivity = async (type: ActivityType, data: { subject: string; preview: string; shareWithFounder?: boolean }) => {
    if (!item) return;
    
    await addActivity.mutateAsync({
      funnel_item_id: item.id,
      activity_type: type,
      subject: data.subject,
      preview: data.preview,
      visibility: data.shareWithFounder ? 'shared' : 'staff',
    });
    
    setAddActivityDialog(null);
  };

  const handleAddTask = async (data: {
    subject: string;
    preview?: string;
    due_at?: string;
    priority?: TaskPriority;
    shareWithFounder?: boolean;
  }) => {
    if (!item) return;
    
    await addTask.mutateAsync({
      funnel_item_id: item.id,
      subject: data.subject,
      preview: data.preview,
      due_at: data.due_at,
      priority: data.priority,
      assigned_to: user?.id,
      visibility: data.shareWithFounder ? 'shared' : 'staff',
    });
    
    setAddTaskDialog(false);
  };

  const handleUpdateNextAction = async (data: { date: string; description: string }) => {
    if (!item) return;
    
    await updateNextAction.mutateAsync({
      funnelItemId: item.id,
      next_action_at: data.date,
      next_action_description: data.description,
    });
    
    setNextActionDialog(false);
  };

  const handleClearNextAction = async () => {
    if (!item) return;
    await clearNextAction.mutateAsync(item.id);
  };

  if (!item) return null;

  const stageConfig = STAGE_CONFIG[item.stage];
  // Get next action from the item (need to cast as the type might not have these fields yet)
  const nextActionAt = (item as any).next_action_at as string | null;
  const nextActionDescription = (item as any).next_action_description as string | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <SheetTitle className="text-lg truncate">
                {item.organization_name || item.contact_name || t('crm.unnamedLead')}
              </SheetTitle>
              {item.contact_email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" />
                  {item.contact_email}
                </p>
              )}
            </div>
            <Badge className={cn('shrink-0', stageConfig.color, 'text-white')}>
              {stageConfig.label}
            </Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="activity" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2 w-auto grid grid-cols-2">
            <TabsTrigger value="activity">{t('crm.activity')}</TabsTrigger>
            <TabsTrigger value="overview">{t('crm.overview')}</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="flex-1 flex flex-col p-4 pt-2 space-y-4 overflow-hidden">
            {/* AI Recap Card */}
            {aiRecapEnabled && (
              <Collapsible open={recapExpanded} onOpenChange={setRecapExpanded}>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-3">
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{t('crm.aiRecap')}</span>
                      </div>
                      {recapExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </CollapsibleTrigger>
                    
                    {loadingRecap ? (
                      <Skeleton className="h-12 w-full mt-2" />
                    ) : recap ? (
                      <>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {recap.summary}
                        </p>
                        <CollapsibleContent className="mt-3 space-y-3">
                          {recap.key_points?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium flex items-center gap-1 mb-1">
                                <Target className="h-3 w-3" /> {t('crm.keyPoints')}
                              </p>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {recap.key_points.map((p, i) => (
                                  <li key={i}>• {p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {recap.open_loops?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium flex items-center gap-1 mb-1">
                                <Clock className="h-3 w-3" /> {t('crm.openLoops')}
                              </p>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {recap.open_loops.map((p, i) => (
                                  <li key={i}>• {p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {recap.risks?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium flex items-center gap-1 mb-1 text-destructive">
                                <AlertTriangle className="h-3 w-3" /> {t('crm.risks')}
                              </p>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {recap.risks.map((p, i) => (
                                  <li key={i}>• {p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {recap.next_best_actions?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium flex items-center gap-1 mb-1 text-primary">
                                <Lightbulb className="h-3 w-3" /> {t('crm.nextActions')}
                              </p>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {recap.next_best_actions.map((p, i) => (
                                  <li key={i}>• {p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            {t('crm.itemsAnalyzed', { count: recap.items_analyzed })} • {formatRelativeTime(recap.generated_at)}
                          </p>
                        </CollapsibleContent>
                      </>
                    ) : (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => generateRecap.mutate({ funnelItemId: item.id, language })}
                          disabled={generateRecap.isPending}
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          {generateRecap.isPending ? t('common.generating') : t('crm.generateRecap')}
                        </Button>
                      </div>
                    )}
                    
                    {recap && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] mt-2 text-muted-foreground"
                        onClick={() => generateRecap.mutate({ funnelItemId: item.id, language })}
                        disabled={generateRecap.isPending}
                      >
                        <RefreshCw className={cn('h-3 w-3 mr-1', generateRecap.isPending && 'animate-spin')} />
                        {t('crm.regenerate')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Collapsible>
            )}

            {/* Tasks Section */}
            <Card>
              <CardHeader className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    {t('crm.tasks')}
                  </CardTitle>
                  <div className="flex gap-1 ml-auto">
                    <Button
                      variant={taskStatusFilter === 'open' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setTaskStatusFilter('open')}
                    >
                      {t('crm.open')} ({openTasks.length})
                    </Button>
                    <Button
                      variant={taskStatusFilter === 'done' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setTaskStatusFilter('done')}
                    >
                      {t('crm.done')} ({doneTasks.length})
                    </Button>
                    <Button
                      variant={taskStatusFilter === 'canceled' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setTaskStatusFilter('canceled')}
                    >
                      {t('crm.canceled')} ({canceledTasks.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredTasks.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t('crm.noTasksYet')}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredTasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        funnelItemId={item.id}
                        consultors={consultors || []}
                        onComplete={(clearNextAction) => completeTask.mutate({ 
                          taskId: task.id, 
                          clearNextAction, 
                          funnelItemId: item.id 
                        })}
                        onReopen={() => reopenTask.mutate(task.id)}
                        onCancel={() => cancelTask.mutate(task.id)}
                        onUpdate={(updates) => updateTask.mutate({ id: task.id, ...updates })}
                        hasWorkspace={!!item.linked_workspace_id}
                        nextActionAt={(item as any).next_action_at}
                        nextActionDescription={(item as any).next_action_description}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="h-8" onClick={() => setAddActivityDialog('note')}>
                <FileText className="h-3 w-3 mr-1" />
                {t('crm.addNote')}
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => setAddActivityDialog('call')}>
                <Phone className="h-3 w-3 mr-1" />
                {t('crm.logCall')}
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => setAddActivityDialog('meeting')}>
                <Calendar className="h-3 w-3 mr-1" />
                {t('crm.logMeeting')}
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => setAddTaskDialog(true)}>
                <CheckSquare className="h-3 w-3 mr-1" />
                {t('crm.addTask')}
              </Button>
              {emailSyncEnabled && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => syncEmails.mutate({ funnelItemId: item.id })}
                  disabled={syncEmails.isPending}
                >
                  <Mail className={cn('h-3 w-3 mr-1', syncEmails.isPending && 'animate-pulse')} />
                  {t('crm.syncEmails')}
                </Button>
              )}
            </div>

            {/* Activity Timeline */}
            <ScrollArea className="flex-1 -mx-4 px-4">
              {loadingActivities ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : Object.keys(groupedActivities).length === 0 && openTasks.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('crm.noActivityYet')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('crm.noActivityHint')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedActivities).map(([period, items]) => (
                    <div key={period}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        {period}
                      </p>
                      <div className="space-y-2">
                        {items.map((activity) => (
                          <ActivityItem key={activity.id} activity={activity} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="overview" className="flex-1 p-4 space-y-4 overflow-auto">
            {/* Next Action Card */}
            <Card className={cn(
              nextActionAt && new Date(nextActionAt) < new Date() && 'border-destructive/50 bg-destructive/5'
            )}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {t('crm.nextAction')}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                {nextActionAt ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className={cn(
                        'h-4 w-4',
                        new Date(nextActionAt) < new Date() ? 'text-destructive' : 'text-muted-foreground'
                      )} />
                      <span className={cn(
                        'text-sm',
                        new Date(nextActionAt) < new Date() && 'text-destructive font-medium'
                      )}>
                        {formatRelativeTime(nextActionAt)}
                      </span>
                    </div>
                    {nextActionDescription && (
                      <p className="text-sm text-muted-foreground">{nextActionDescription}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setNextActionDialog(true)}>
                        {t('crm.updateNextAction')}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-xs text-muted-foreground"
                        onClick={handleClearNextAction}
                        disabled={clearNextAction.isPending}
                      >
                        <X className="h-3 w-3 mr-1" />
                        {t('crm.clearNextAction')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{t('crm.noNextActionSet')}</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setNextActionDialog(true)}>
                      <Plus className="h-3 w-3 mr-1" />
                      {t('crm.setNextAction')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Details */}
            <div className="grid gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('crm.stage')}</span>
                <Badge className={cn(stageConfig.color, 'text-white')}>{stageConfig.label}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('crm.owner')}</span>
                <span>{item.owner?.full_name || t('crm.unassigned')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('crm.created')}</span>
                <span>{formatRelativeTime(item.created_at)}</span>
              </div>
              {item.source && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('crm.source')}</span>
                  <span>{item.source}</span>
                </div>
              )}
              {item.contact_phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('crm.phone')}</span>
                  <span>{item.contact_phone}</span>
                </div>
              )}
            </div>
            
            {item.notes && (
              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{t('crm.notes')}</p>
                <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Activity Dialog */}
        <AddActivityDialog
          type={addActivityDialog}
          open={!!addActivityDialog}
          onOpenChange={(open) => !open && setAddActivityDialog(null)}
          onSubmit={handleAddActivity}
          isPending={addActivity.isPending}
          hasWorkspace={!!item.linked_workspace_id}
        />

        {/* Add Task Dialog */}
        <AddTaskDialog
          open={addTaskDialog}
          onOpenChange={setAddTaskDialog}
          onSubmit={handleAddTask}
          isPending={addTask.isPending}
          hasWorkspace={!!item.linked_workspace_id}
        />

        {/* Next Action Dialog */}
        <NextActionDialog
          open={nextActionDialog}
          onOpenChange={setNextActionDialog}
          onSubmit={handleUpdateNextAction}
          isPending={updateNextAction.isPending}
          currentDate={nextActionAt}
          currentDescription={nextActionDescription}
        />
      </SheetContent>
    </Sheet>
  );
}

function TaskRow({ 
  task, 
  funnelItemId,
  consultors,
  onComplete, 
  onReopen,
  onCancel,
  onUpdate,
  hasWorkspace,
  nextActionAt,
  nextActionDescription,
}: { 
  task: ActivityEntry; 
  funnelItemId: string;
  consultors: { id: string; full_name: string | null }[];
  onComplete: (clearNextAction: boolean) => void;
  onReopen: () => void;
  onCancel: () => void;
  onUpdate: (updates: { subject?: string; due_at?: string | null; priority?: TaskPriority | null; assigned_to?: string | null }) => void;
  hasWorkspace: boolean;
  nextActionAt?: string | null;
  nextActionDescription?: string | null;
}) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState(task.subject || '');
  const [editDueAt, setEditDueAt] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority | ''>(task.priority || '');
  const [editAssignedTo, setEditAssignedTo] = useState(task.assigned_to || '');
  const [showClearNextAction, setShowClearNextAction] = useState(false);
  const [clearNextActionChecked, setClearNextActionChecked] = useState(true);
  
  const isOpen = task.status === 'open';
  const isCompleted = task.status === 'done';
  const isCanceled = task.status === 'canceled';
  const isOverdue = task.due_at && new Date(task.due_at) < new Date() && isOpen;
  
  // Check if this task matches the next action
  const matchesNextAction = nextActionAt && task.due_at && 
    Math.abs(new Date(nextActionAt).getTime() - new Date(task.due_at).getTime()) < 60000;

  useEffect(() => {
    if (isEditing && task.due_at) {
      const d = new Date(task.due_at);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      setEditDueAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [isEditing, task.due_at]);

  const handleSave = () => {
    onUpdate({
      subject: editSubject,
      due_at: editDueAt ? new Date(editDueAt).toISOString() : null,
      priority: editPriority || null,
      assigned_to: editAssignedTo || null,
    });
    setIsEditing(false);
  };

  const handleCompleteClick = () => {
    if (matchesNextAction) {
      setShowClearNextAction(true);
    } else {
      onComplete(false);
    }
  };

  const handleConfirmComplete = () => {
    onComplete(clearNextActionChecked);
    setShowClearNextAction(false);
  };
  
  if (isEditing) {
    return (
      <div className="p-3 space-y-3 bg-muted/30">
        <div className="space-y-2">
          <Label className="text-xs">{t('crm.title')}</Label>
          <Input
            value={editSubject}
            onChange={(e) => setEditSubject(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">{t('crm.dueDate')}</Label>
            <Input
              type="datetime-local"
              value={editDueAt}
              onChange={(e) => setEditDueAt(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('crm.priority')}</Label>
            <Select value={editPriority} onValueChange={(v) => setEditPriority(v as TaskPriority | '')}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('crm.low')}</SelectItem>
                <SelectItem value="medium">{t('crm.medium')}</SelectItem>
                <SelectItem value="high">{t('crm.high')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {consultors.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">{t('crm.assignedTo')}</Label>
            <Select value={editAssignedTo} onValueChange={setEditAssignedTo}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                {consultors.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name || 'Unnamed'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
            <Save className="h-3 w-3 mr-1" />
            {t('common.save')}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditing(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    );
  }

  if (showClearNextAction) {
    return (
      <div className="p-3 space-y-3 bg-muted/30">
        <p className="text-sm">{t('crm.taskCompleted')}</p>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`clear-next-${task.id}`}
            checked={clearNextActionChecked}
            onCheckedChange={(checked) => setClearNextActionChecked(!!checked)}
          />
          <Label htmlFor={`clear-next-${task.id}`} className="text-sm font-normal cursor-pointer">
            {t('crm.clearNextActionAlso')}
          </Label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-7 text-xs" onClick={handleConfirmComplete}>
            {t('common.confirm')}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowClearNextAction(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-muted/50 group">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 shrink-0"
        onClick={isCompleted ? onReopen : isCanceled ? onReopen : handleCompleteClick}
      >
        {isCompleted ? (
          <CircleCheck className="h-4 w-4 text-green-500" />
        ) : isCanceled ? (
          <Ban className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-sm font-medium truncate',
          (isCompleted || isCanceled) && 'line-through text-muted-foreground'
        )}>
          {task.subject}
        </p>
        {task.due_at && (
          <p className={cn(
            'text-xs',
            isOverdue ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {formatRelativeTime(task.due_at)}
          </p>
        )}
      </div>
      {task.priority && (
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs shrink-0',
            task.priority === 'high' && 'border-destructive text-destructive',
            task.priority === 'medium' && 'border-amber-500 text-amber-500',
          )}
        >
          {t(`crm.${task.priority}`)}
        </Badge>
      )}
      {task.visibility === 'shared' && (
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {t('crm.shared')}
        </Badge>
      )}
      {isOpen && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsEditing(true)}
            title={t('common.edit')}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={onCancel}
            title={t('crm.cancelTask')}
          >
            <Ban className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: ActivityEntry }) {
  const { t } = useTranslation();
  
  const iconMap: Record<ActivityType, typeof Mail> = {
    email: Mail,
    call: Phone,
    meeting: Calendar,
    task: CheckSquare,
    note: FileText,
    system: Sparkles,
  };
  
  const Icon = iconMap[activity.activity_type] || FileText;
  
  return (
    <div className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="shrink-0 mt-0.5">
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium truncate">{activity.subject || t(`crm.activityType.${activity.activity_type}`)}</p>
          {activity.direction && (
            <span className="shrink-0">
              {activity.direction === 'inbound' ? (
                <ArrowDownRight className="h-3 w-3 text-blue-500" />
              ) : (
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              )}
            </span>
          )}
        </div>
        {activity.preview && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{activity.preview}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatRelativeTime(activity.occurred_at)}
          {activity.external_source && ` • ${activity.external_source}`}
        </p>
      </div>
    </div>
  );
}

function AddActivityDialog({
  type,
  open,
  onOpenChange,
  onSubmit,
  isPending,
  hasWorkspace,
}: {
  type: ActivityType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (type: ActivityType, data: { subject: string; preview: string; shareWithFounder?: boolean }) => void;
  isPending: boolean;
  hasWorkspace: boolean;
}) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [preview, setPreview] = useState('');
  const [shareWithFounder, setShareWithFounder] = useState(false);

  const handleSubmit = () => {
    if (!type || !subject.trim()) return;
    onSubmit(type, { subject, preview, shareWithFounder });
    setSubject('');
    setPreview('');
    setShareWithFounder(false);
  };

  const titles: Record<ActivityType, string> = {
    note: t('crm.addNote'),
    call: t('crm.logCall'),
    meeting: t('crm.logMeeting'),
    task: t('crm.addTask'),
    email: t('crm.logEmail'),
    system: t('crm.system'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{type ? titles[type] : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('crm.title')}</Label>
            <Input
              placeholder={t('crm.titlePlaceholder')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('crm.details')}</Label>
            <Textarea
              placeholder={t('crm.detailsPlaceholder')}
              value={preview}
              onChange={(e) => setPreview(e.target.value)}
              rows={3}
            />
          </div>
          {hasWorkspace && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="share"
                checked={shareWithFounder}
                onCheckedChange={(checked) => setShareWithFounder(!!checked)}
              />
              <Label htmlFor="share" className="text-sm font-normal cursor-pointer">
                {t('crm.shareWithFounder')}
              </Label>
            </div>
          )}
          <Button onClick={handleSubmit} disabled={isPending || !subject.trim()} className="w-full">
            {isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  hasWorkspace,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    subject: string;
    preview?: string;
    due_at?: string;
    priority?: TaskPriority;
    shareWithFounder?: boolean;
  }) => void;
  isPending: boolean;
  hasWorkspace: boolean;
}) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [preview, setPreview] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [shareWithFounder, setShareWithFounder] = useState(false);

  const handleSubmit = () => {
    if (!subject.trim()) return;
    onSubmit({
      subject,
      preview: preview || undefined,
      due_at: dueDate ? new Date(dueDate).toISOString() : undefined,
      priority: priority || undefined,
      shareWithFounder,
    });
    setSubject('');
    setPreview('');
    setDueDate('');
    setPriority('');
    setShareWithFounder(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('crm.addTask')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('crm.title')}</Label>
            <Input
              placeholder={t('crm.titlePlaceholder')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('crm.details')}</Label>
            <Textarea
              placeholder={t('crm.detailsPlaceholder')}
              value={preview}
              onChange={(e) => setPreview(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('crm.dueDate')}</Label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('crm.priority')}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority | '')}>
                <SelectTrigger>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('crm.low')}</SelectItem>
                  <SelectItem value="medium">{t('crm.medium')}</SelectItem>
                  <SelectItem value="high">{t('crm.high')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasWorkspace && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="share-task"
                checked={shareWithFounder}
                onCheckedChange={(checked) => setShareWithFounder(!!checked)}
              />
              <Label htmlFor="share-task" className="text-sm font-normal cursor-pointer">
                {t('crm.shareWithFounder')}
              </Label>
            </div>
          )}
          <Button onClick={handleSubmit} disabled={isPending || !subject.trim()} className="w-full">
            {isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NextActionDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  currentDate,
  currentDescription,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { date: string; description: string }) => void;
  isPending: boolean;
  currentDate?: string | null;
  currentDescription?: string | null;
}) {
  const { t } = useTranslation();
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  // Prefill fields when dialog opens with current values
  useEffect(() => {
    if (open) {
      if (currentDate) {
        // Convert ISO to local datetime-local format: YYYY-MM-DDTHH:mm
        const d = new Date(currentDate);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        setDate(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setDate('');
      }
      setDescription(currentDescription || '');
    }
  }, [open, currentDate, currentDescription]);

  const handleSubmit = () => {
    if (!date) return;
    onSubmit({
      date: new Date(date).toISOString(),
      description,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('crm.setNextAction')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('crm.nextActionDate')}</Label>
            <Input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('crm.nextActionDescription')}</Label>
            <Textarea
              placeholder={t('crm.detailsPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <Button onClick={handleSubmit} disabled={isPending || !date} className="w-full">
            {isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
