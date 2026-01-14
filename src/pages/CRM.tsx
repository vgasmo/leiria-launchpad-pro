import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  CheckSquare,
  ChevronRight,
  Inbox,
  ListTodo,
  Search,
  Ghost,
} from 'lucide-react';
import { useCrmInbox, useCrmTasksDue, CrmInboxItem } from '@/hooks/useCrmInbox';
import { usePrograms } from '@/hooks/useWorkspaces';
import { useConsultors } from '@/hooks/useWorkspaceOwner';
import { useCompleteTask } from '@/hooks/useCrmTasks';
import { useAuth } from '@/contexts/AuthContext';
import { RecordDrawer } from '@/components/crm/RecordDrawer';
import { formatRelativeTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import type { FunnelItem, FunnelStage } from '@/hooks/useFunnel';

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

const ACTIVE_STAGES: FunnelStage[] = ['new', 'first_contact_booked', 'met', 'qualified', 'proposal_sent', 'negotiating', 'contracted'];

export default function CRM() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState<FunnelItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [myItemsOnly, setMyItemsOnly] = useState(false);

  const { data: programs } = usePrograms();
  const { data: consultors } = useConsultors();
  const { data: inbox, isLoading: loadingInbox } = useCrmInbox({
    programId: programFilter !== 'all' ? programFilter : undefined,
    stage: stageFilter !== 'all' ? stageFilter as FunnelStage : undefined,
    assigneeId: assigneeFilter !== 'all' ? assigneeFilter : undefined,
    search: searchQuery || undefined,
    myItemsOnly,
    currentUserId: user?.id,
  });
  const { data: tasksDue, isLoading: loadingTasks } = useCrmTasksDue({
    assigneeId: assigneeFilter !== 'all' ? assigneeFilter : undefined,
    myItemsOnly,
    currentUserId: user?.id,
  });

  const completeTask = useCompleteTask();

  const handleOpenDrawer = (item: CrmInboxItem) => {
    const funnelItem: FunnelItem = {
      id: item.id,
      stage: item.stage,
      type: 'lead',
      owner_consultant_id: item.owner_consultant_id,
      contact_name: item.contact_name,
      contact_email: item.contact_email,
      contact_phone: null,
      organization_name: item.organization_name,
      source: null,
      tags: [],
      notes: null,
      linked_startup_id: null,
      linked_workspace_id: item.linked_workspace_id,
      linked_contract_id: null,
      program_id: item.program_id,
      first_contact_at: null,
      qualified_at: null,
      converted_at: null,
      created_at: item.created_at,
      updated_at: item.created_at,
      owner: item.owner ? { ...item.owner, email: '' } : null,
      program: item.program,
    };
    setSelectedItem(funnelItem);
    setDrawerOpen(true);
  };

  // Calculate total counts for tabs
  const inboxTotal = (inbox?.overdue.length || 0) + (inbox?.today.length || 0) + 
    (inbox?.upcoming.length || 0) + (inbox?.noNextAction.length || 0) + (inbox?.stale.length || 0);
  const tasksTotal = (tasksDue?.overdue.length || 0) + (tasksDue?.today.length || 0) + 
    (tasksDue?.upcoming.length || 0);

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('crm.crmDashboard')}</h1>
            <p className="text-muted-foreground">{t('crm.dashboardSubtitle')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('crm.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('crm.filterByProgram')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('crm.allPrograms')}</SelectItem>
              {programs?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('crm.filterByStage')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('crm.allStages')}</SelectItem>
              {ACTIVE_STAGES.map(s => (
                <SelectItem key={s} value={s}>{STAGE_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('crm.filterByAssignee')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('crm.allAssignees')}</SelectItem>
              {consultors?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.full_name || 'Unnamed'}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            <Switch
              id="my-items"
              checked={myItemsOnly}
              onCheckedChange={setMyItemsOnly}
            />
            <Label htmlFor="my-items" className="text-sm cursor-pointer whitespace-nowrap">
              {t('crm.myItemsOnly')}
            </Label>
          </div>
        </div>

        <Tabs defaultValue="inbox" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="h-4 w-4" />
              {t('crm.followUpInbox')}
              {inboxTotal > 0 && <Badge variant="secondary" className="ml-1">{inboxTotal}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="h-4 w-4" />
              {t('crm.tasksDue')}
              {tasksTotal > 0 && <Badge variant="secondary" className="ml-1">{tasksTotal}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-4">
            {loadingInbox ? (
              <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                <InboxGroup 
                  title={t('crm.overdue')} 
                  items={inbox?.overdue || []} 
                  icon={AlertTriangle}
                  iconColor="text-destructive"
                  onOpenDrawer={handleOpenDrawer}
                />
                <InboxGroup 
                  title={t('crm.today')} 
                  items={inbox?.today || []} 
                  icon={Clock}
                  iconColor="text-amber-500"
                  onOpenDrawer={handleOpenDrawer}
                />
                <InboxGroup 
                  title={t('crm.upcoming')} 
                  items={inbox?.upcoming || []} 
                  icon={Calendar}
                  iconColor="text-blue-500"
                  onOpenDrawer={handleOpenDrawer}
                />
                <InboxGroup 
                  title={t('crm.noNextAction')} 
                  items={inbox?.noNextAction || []} 
                  icon={CheckSquare}
                  iconColor="text-muted-foreground"
                  onOpenDrawer={handleOpenDrawer}
                />
                <InboxGroup 
                  title={t('crm.stale')} 
                  items={inbox?.stale || []} 
                  icon={Ghost}
                  iconColor="text-orange-500"
                  onOpenDrawer={handleOpenDrawer}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {loadingTasks ? (
              <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                <TaskGroup 
                  title={t('crm.overdue')} 
                  tasks={tasksDue?.overdue || []} 
                  iconColor="text-destructive"
                  onComplete={(id) => completeTask.mutate({ taskId: id })}
                />
                <TaskGroup 
                  title={t('crm.today')} 
                  tasks={tasksDue?.today || []} 
                  iconColor="text-amber-500"
                  onComplete={(id) => completeTask.mutate({ taskId: id })}
                />
                <TaskGroup 
                  title={t('crm.upcoming')} 
                  tasks={tasksDue?.upcoming || []} 
                  iconColor="text-blue-500"
                  onComplete={(id) => completeTask.mutate({ taskId: id })}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <RecordDrawer
          item={selectedItem}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </div>
    </AppLayout>
  );
}

function InboxGroup({ 
  title, 
  items, 
  icon: Icon, 
  iconColor,
  onOpenDrawer 
}: { 
  title: string; 
  items: CrmInboxItem[];
  icon: typeof AlertTriangle;
  iconColor: string;
  onOpenDrawer: (item: CrmInboxItem) => void;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={cn('h-4 w-4', iconColor)} />
          {title}
          <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {items.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t('crm.noItems')}
            </div>
          ) : (
            <div className="divide-y">
              {items.map(item => (
                <div 
                  key={item.id} 
                  className="p-3 hover:bg-muted/50 cursor-pointer flex items-center gap-3"
                  onClick={() => onOpenDrawer(item)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {item.organization_name || item.contact_name || 'Unnamed'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge className={cn('h-5 text-[10px]', STAGE_CONFIG[item.stage].color, 'text-white')}>
                        {STAGE_CONFIG[item.stage].label}
                      </Badge>
                      {item.next_action_at && (
                        <span className={cn(
                          new Date(item.next_action_at) < new Date() && 'text-destructive'
                        )}>
                          {formatRelativeTime(item.next_action_at)}
                        </span>
                      )}
                    </div>
                    {item.next_action_description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {item.next_action_description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function TaskGroup({ 
  title, 
  tasks, 
  iconColor,
  onComplete 
}: { 
  title: string; 
  tasks: any[];
  iconColor: string;
  onComplete: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckSquare className={cn('h-4 w-4', iconColor)} />
          {title}
          <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {tasks.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t('crm.noItems')}
            </div>
          ) : (
            <div className="divide-y">
              {tasks.map(task => (
                <div key={task.id} className="p-3 flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => onComplete(task.id)}
                  >
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.subject}</p>
                    {task.due_at && (
                      <p className="text-xs text-muted-foreground">
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
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function InboxGroup({ 
  title, 
  items, 
  icon: Icon, 
  iconColor,
  onOpenDrawer 
}: { 
  title: string; 
  items: CrmInboxItem[];
  icon: typeof AlertTriangle;
  iconColor: string;
  onOpenDrawer: (item: CrmInboxItem) => void;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={cn('h-4 w-4', iconColor)} />
          {title}
          <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {items.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t('crm.noItems')}
            </div>
          ) : (
            <div className="divide-y">
              {items.map(item => (
                <div 
                  key={item.id} 
                  className="p-3 hover:bg-muted/50 cursor-pointer flex items-center gap-3"
                  onClick={() => onOpenDrawer(item)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {item.organization_name || item.contact_name || 'Unnamed'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge className={cn('h-5 text-[10px]', STAGE_CONFIG[item.stage].color, 'text-white')}>
                        {STAGE_CONFIG[item.stage].label}
                      </Badge>
                      {item.next_action_at && (
                        <span>{formatRelativeTime(item.next_action_at)}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function TaskGroup({ 
  title, 
  tasks, 
  iconColor,
  onComplete 
}: { 
  title: string; 
  tasks: any[];
  iconColor: string;
  onComplete: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckSquare className={cn('h-4 w-4', iconColor)} />
          {title}
          <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {tasks.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t('crm.noItems')}
            </div>
          ) : (
            <div className="divide-y">
              {tasks.map(task => (
                <div key={task.id} className="p-3 flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => onComplete(task.id)}
                  >
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.subject}</p>
                    {task.due_at && (
                      <p className="text-xs text-muted-foreground">
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
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
