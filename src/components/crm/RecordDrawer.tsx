import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, isThisWeek, isThisMonth } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  CheckSquare,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Target,
  Clock,
  Briefcase,
} from 'lucide-react';
import { FunnelItem, FunnelStage, useUpdateFunnelItem } from '@/hooks/useFunnel';
import { useActivityTimeline, useRelationshipRecap, useGenerateRecap, useSyncEmails, useAddActivity, ActivityType, ActivityEntry } from '@/hooks/useActivityTimeline';
import { useAddTask, useCompleteTask, useReopenTask, useCancelTask, useUpdateTask, TaskPriority } from '@/hooks/useCrmTasks';
import { useUpdateNextAction, useClearNextAction } from '@/hooks/useNextAction';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { useAuth } from '@/contexts/AuthContext';
import { useConsultors } from '@/hooks/useWorkspaceOwner';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/dateUtils';

// Extracted sub-components
import {
  RecordDrawerHeader,
  OverviewTab,
  QuickActions,
  NextActionDialog,
  AddActivityDialog,
  AddTaskDialog,
  ActivityItem,
  TaskRow,
  LinkedContextPanel,
  EmailHistoryPanel,
} from './drawer';

type TaskStatusFilter = 'open' | 'done' | 'canceled';

interface RecordDrawerProps {
  item: FunnelItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordDrawer({ item, open, onOpenChange }: RecordDrawerProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const language = i18n.language.startsWith('pt') ? 'pt' : 'en';
  const dateLocale = language === 'pt' ? pt : enUS;
  
  const [recapExpanded, setRecapExpanded] = useState(false);
  const [addActivityDialog, setAddActivityDialog] = useState<ActivityType | null>(null);
  const [addTaskDialog, setAddTaskDialog] = useState(false);
  const [nextActionDialog, setNextActionDialog] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('open');
  
  // Local overrides for optimistic updates on next action
  const [localNextAction, setLocalNextAction] = useState<{ at: string | null; desc: string | null } | null>(null);
  
  // Reset local overrides when item changes
  useEffect(() => {
    setLocalNextAction(null);
  }, [item?.id]);
  
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
  const updateFunnelItem = useUpdateFunnelItem();

  const handleStageChange = async (newStage: FunnelStage) => {
    if (!item) return;
    await updateFunnelItem.mutateAsync({
      id: item.id,
      stage: newStage,
    });
  };

  // Separate tasks from other activities and group by status
  const { openTasks, doneTasks, canceledTasks, otherActivities } = useMemo(() => {
    if (!activities?.length) return { openTasks: [], doneTasks: [], canceledTasks: [], otherActivities: [] };
    
    const open = activities.filter(a => a.activity_type === 'task' && a.status === 'open');
    const done = activities.filter(a => a.activity_type === 'task' && a.status === 'done');
    const canceled = activities.filter(a => a.activity_type === 'task' && a.status === 'canceled');
    const others = activities.filter(a => a.activity_type !== 'task');
    
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
  
  const filteredTasks = useMemo(() => {
    switch (taskStatusFilter) {
      case 'open': return openTasks;
      case 'done': return doneTasks;
      case 'canceled': return canceledTasks;
      default: return openTasks;
    }
  }, [taskStatusFilter, openTasks, doneTasks, canceledTasks]);

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
    
    try {
      await updateNextAction.mutateAsync({
        funnelItemId: item.id,
        next_action_at: data.date,
        next_action_description: data.description,
      });
      
      // Optimistic local state update so drawer reflects change immediately
      setLocalNextAction({ at: data.date, desc: data.description });
      setNextActionDialog(false);
    } catch (err) {
      // Error toast is already handled by the mutation's onError
    }
  };

  const handleClearNextAction = async () => {
    if (!item) return;
    try {
      await clearNextAction.mutateAsync(item.id);
      setLocalNextAction({ at: null, desc: null });
    } catch (err) {
      // Error toast is already handled by the mutation's onError
    }
  };

  if (!item) return null;

  const nextActionAt = localNextAction !== null ? localNextAction.at : (item.next_action_at ?? null);
  const nextActionDescription = localNextAction !== null ? localNextAction.desc : (item.next_action_description ?? null);
  const lastActivityAt = item.last_activity_at ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] p-0 flex flex-col overflow-hidden" data-testid="record-drawer">
        <RecordDrawerHeader
          item={item}
          onStageChange={handleStageChange}
          isUpdating={updateFunnelItem.isPending}
        />

        <Tabs defaultValue="overview" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2 w-auto grid grid-cols-4 shrink-0">
            <TabsTrigger value="overview" className="text-xs px-1">{t('crm.overview')}</TabsTrigger>
            <TabsTrigger value="context" className="text-xs px-1">{t('crm.context', { defaultValue: 'Contexto' })}</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs px-1">{t('crm.timeline', 'Timeline')}</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs px-1">{t('crm.tasks')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab - Contact details + AI Recap + Next Action */}
          <TabsContent value="overview" className="flex-1 overflow-y-auto">
            <div className="p-4 pt-2 space-y-4">
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
                                  {recap.key_points.map((p: string, i: number) => (
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
                                  {recap.open_loops.map((p: string, i: number) => (
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
                                  {recap.risks.map((p: string, i: number) => (
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
                                  {recap.next_best_actions.map((p: string, i: number) => (
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

              {/* Overview details */}
              <OverviewTab
                item={item}
                nextActionAt={nextActionAt}
                nextActionDescription={nextActionDescription}
                lastActivityAt={lastActivityAt}
                onSetNextAction={() => setNextActionDialog(true)}
                onClearNextAction={handleClearNextAction}
                isClearingNextAction={clearNextAction.isPending}
              />
            </div>
          </TabsContent>

          {/* Context Tab - Linked Workspace, Contract, Emails */}
          <TabsContent value="context" className="flex-1 overflow-y-auto p-4 pt-2 space-y-4">
            <LinkedContextPanel
              linkedWorkspaceId={item.linked_workspace_id}
              linkedStartupId={item.linked_startup_id}
              linkedContractId={item.linked_contract_id}
              funnelItemId={item.id}
              onInitiateContract={() => {
                const params = new URLSearchParams({
                  tab: 'backoffice',
                  subtab: 'contracts',
                  action: 'create',
                  funnel: item.id,
                  contact: item.contact_name || '',
                  email: item.contact_email || '',
                  org: item.organization_name || '',
                });
                if (item.linked_workspace_id) {
                  params.set('workspace', item.linked_workspace_id);
                }
                onOpenChange(false);
                navigate(`/admin?${params.toString()}`);
              }}
              onSendContract={async (contractId) => {
                try {
                  const { data, error } = await supabase.functions.invoke('public-contract-onboarding', {
                    body: { action: 'generate_token', contractId },
                  });
                  if (error) throw error;
                  if (data?.error) throw new Error(data.error);
                  const url = data.url || `${window.location.origin}/contract-signing/${data.token}`;
                  await navigator.clipboard.writeText(url);
                  toast.success(t('crm.contractLinkCopied', { defaultValue: 'Link público do contrato copiado! Envie ao founder por email.' }));
                } catch (err: any) {
                  toast.error(err?.message || 'Erro ao gerar link');
                }
              }}
            />

            {!item.linked_workspace_id && !item.linked_startup_id && !item.linked_contract_id && (
              <div className="text-center py-6 space-y-3">
                <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('crm.noLinkedContext', { defaultValue: 'Este lead ainda não está vinculado a um workspace ou contrato.' })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('crm.linkHint', { defaultValue: 'O vínculo é criado automaticamente ao converter o lead ou pode ser feito manualmente.' })}
                  </p>
                </div>
                {/* Direct contract initiation for advanced-stage leads without workspace */}
                {['qualified', 'proposal_sent', 'negotiating', 'contracted'].includes(item.stage) && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const params = new URLSearchParams({
                        tab: 'backoffice',
                        subtab: 'contracts',
                        action: 'create',
                        funnel: item.id,
                        contact: item.contact_name || '',
                        email: item.contact_email || '',
                        org: item.organization_name || '',
                      });
                      onOpenChange(false);
                      navigate(`/admin?${params.toString()}`);
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {t('crm.initiateContract', { defaultValue: 'Iniciar Contrato' })}
                  </Button>
                )}
              </div>
            )}

            <EmailHistoryPanel
              funnelItemId={item.id}
              onSyncEmails={() => syncEmails.mutate({ funnelItemId: item.id })}
              isSyncing={syncEmails.isPending}
              emailSyncEnabled={emailSyncEnabled}
            />
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="flex-1 flex flex-col p-4 pt-2 space-y-4 overflow-y-auto" data-testid="timeline">
            {/* Quick Actions */}
            <QuickActions
              onAddActivity={(type) => setAddActivityDialog(type)}
              onAddTask={() => setAddTaskDialog(true)}
              onSyncEmails={() => syncEmails.mutate({ funnelItemId: item.id })}
              emailSyncEnabled={emailSyncEnabled}
              isSyncingEmails={syncEmails.isPending}
            />

            {/* Activity Timeline */}
            <ScrollArea className="flex-1 -mx-4 px-4">
              {loadingActivities ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : Object.keys(groupedActivities).length === 0 ? (
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

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="flex-1 flex flex-col p-4 pt-2 space-y-4 overflow-y-auto" data-testid="task-list">
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
                        onComplete={(clearNA) => completeTask.mutate({ 
                          taskId: task.id, 
                          clearNextAction: clearNA, 
                          funnelItemId: item.id 
                        })}
                        onReopen={() => reopenTask.mutate(task.id)}
                        onCancel={() => cancelTask.mutate(task.id)}
                        onUpdate={(updates) => updateTask.mutate({ id: task.id, ...updates })}
                        hasWorkspace={!!item.linked_workspace_id}
                        nextActionAt={nextActionAt}
                        nextActionDescription={nextActionDescription}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setAddTaskDialog(true)}
            >
              <CheckSquare className="h-3.5 w-3.5 mr-2" />
              {t('crm.addTask')}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <AddActivityDialog
          type={addActivityDialog}
          open={!!addActivityDialog}
          onOpenChange={(open) => !open && setAddActivityDialog(null)}
          onSubmit={handleAddActivity}
          isPending={addActivity.isPending}
          hasWorkspace={!!item.linked_workspace_id}
        />

        <AddTaskDialog
          open={addTaskDialog}
          onOpenChange={setAddTaskDialog}
          onSubmit={handleAddTask}
          isPending={addTask.isPending}
          hasWorkspace={!!item.linked_workspace_id}
        />

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
