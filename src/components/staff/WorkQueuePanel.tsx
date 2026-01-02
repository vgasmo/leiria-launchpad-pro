import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday, addDays } from 'date-fns';
import { 
  ListTodo, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  ChevronRight,
  Filter,
  RefreshCw,
  Bell,
  Loader2,
  MessageSquare,
  TrendingUp,
  Shield,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useWorkQueue, useMarkWorkQueueItemDone, useSnoozeWorkQueueItem, useRecomputeWorkQueue } from '@/hooks/useWorkQueue';
import { toast } from 'sonner';

interface WorkQueuePanelProps {
  compact?: boolean;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  triage: <Users className="h-4 w-4" />,
  outreach: <MessageSquare className="h-4 w-4" />,
  schedule_session: <Calendar className="h-4 w-4" />,
  post_session_followup: <CheckCircle2 className="h-4 w-4" />,
  overdue_actions: <AlertTriangle className="h-4 w-4" />,
  missing_kpis: <TrendingUp className="h-4 w-4" />,
  stage_gate_review: <Shield className="h-4 w-4" />,
  escalation: <Bell className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  triage: 'Triage',
  outreach: 'Outreach',
  schedule_session: 'Schedule Session',
  post_session_followup: 'Follow-up',
  overdue_actions: 'Overdue Actions',
  missing_kpis: 'Missing KPIs',
  stage_gate_review: 'Stage Review',
  escalation: 'Escalation',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-destructive text-destructive-foreground',
  high: 'bg-amber-500 text-white',
  medium: 'bg-blue-500 text-white',
  low: 'bg-muted text-muted-foreground',
};

export function WorkQueuePanel({ compact = false }: WorkQueuePanelProps) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: workQueueItems, isLoading } = useWorkQueue({ status: statusFilter !== 'all' ? statusFilter : undefined });
  const markAsDone = useMarkWorkQueueItemDone();
  const snoozeItem = useSnoozeWorkQueueItem();
  const recomputeWorkQueue = useRecomputeWorkQueue();

  const [isRecomputing, setIsRecomputing] = useState(false);

  const handleRecompute = async () => {
    setIsRecomputing(true);
    try {
      await recomputeWorkQueue.mutateAsync();
      toast.success('Work queue updated');
    } catch (error) {
      toast.error('Failed to update work queue');
    } finally {
      setIsRecomputing(false);
    }
  };

  const handleMarkDone = async (itemId: string) => {
    try {
      await markAsDone.mutateAsync(itemId);
      toast.success('Marked as done');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleSnooze = async (itemId: string, days: number) => {
    try {
      await snoozeItem.mutateAsync({ id: itemId, days });
      toast.success(`Snoozed for ${days} days`);
    } catch (error) {
      toast.error('Failed to snooze');
    }
  };


  // Filter items
  const filteredItems = workQueueItems?.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    return true;
  }) || [];

  // Stats
  const openCount = workQueueItems?.filter(i => i.status === 'open').length || 0;
  const overdueCount = workQueueItems?.filter(i => 
    i.status === 'open' && i.due_at && isPast(new Date(i.due_at))
  ).length || 0;
  const dueThisWeekCount = workQueueItems?.filter(i => {
    if (i.status !== 'open' || !i.due_at) return false;
    const dueDate = new Date(i.due_at);
    const weekFromNow = addDays(new Date(), 7);
    return dueDate <= weekFromNow && !isPast(dueDate);
  }).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </CardContent>
      </Card>
    );
  }

  const displayItems = compact ? filteredItems.slice(0, 5) : filteredItems;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            Work Queue
          </CardTitle>
          <div className="flex items-center gap-2">
            {!compact && (
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="snoozed">Snoozed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {Object.entries(TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleRecompute}
              disabled={isRecomputing}
            >
              {isRecomputing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        {!compact && (
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm">{openCount} open</span>
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">{overdueCount} overdue</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-sm">{dueThisWeekCount} due this week</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No items in queue</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item) => {
              const isOverdue = item.due_at && isPast(new Date(item.due_at));
              const isDueToday = item.due_at && isToday(new Date(item.due_at));

              return (
                <div 
                  key={item.id}
                  className={`p-3 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer ${
                    isOverdue ? 'border-destructive/30 bg-destructive/5' : ''
                  }`}
                  onClick={() => item.workspace_id && navigate(`/workspace/${item.workspace_id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-muted'
                      }`}>
                        {TYPE_ICONS[item.type] || <ListTodo className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <Badge className={`text-xs ${PRIORITY_COLORS[item.priority] || ''}`}>
                            {item.priority}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[item.type] || item.type}
                          </Badge>
                          {item.due_at && (
                            <span className={`text-xs ${
                              isOverdue ? 'text-destructive font-medium' : 
                              isDueToday ? 'text-amber-600 font-medium' : 
                              'text-muted-foreground'
                            }`}>
                              {isOverdue ? 'Overdue: ' : isDueToday ? 'Today' : ''}
                              {!isDueToday && format(new Date(item.due_at), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8">
                          Actions
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleMarkDone(item.id);
                        }}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark Done
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleSnooze(item.id, 1);
                        }}>
                          <Clock className="h-4 w-4 mr-2" />
                          Snooze 1 day
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleSnooze(item.id, 7);
                        }}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Snooze 7 days
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}

            {compact && filteredItems.length > 5 && (
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => navigate('/my-workspaces?tab=queue')}
              >
                View all {filteredItems.length} items
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
