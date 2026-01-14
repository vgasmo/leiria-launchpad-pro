import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isThisWeek, isThisMonth, subDays } from 'date-fns';
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
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  FileText,
  Calendar,
  CheckSquare,
  Sparkles,
  RefreshCw,
  Plus,
  MoreVertical,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  Lightbulb,
  Target,
  Clock,
} from 'lucide-react';
import { FunnelItem, FunnelStage } from '@/hooks/useFunnel';
import { useActivityTimeline, useRelationshipRecap, useGenerateRecap, useSyncEmails, useAddActivity, ActivityType, ActivityEntry } from '@/hooks/useActivityTimeline';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/dateUtils';

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
  const language = i18n.language.startsWith('pt') ? 'pt' : 'en';
  const dateLocale = language === 'pt' ? pt : enUS;
  
  const [recapExpanded, setRecapExpanded] = useState(false);
  const [addActivityDialog, setAddActivityDialog] = useState<ActivityType | null>(null);
  
  const emailSyncEnabled = useFeatureFlag('crm_graph_email_sync');
  const aiRecapEnabled = useFeatureFlag('crm_ai_recap');
  
  const { data: activities, isLoading: loadingActivities } = useActivityTimeline({
    funnelItemId: item?.id,
    limit: 50,
  });
  
  const { data: recap, isLoading: loadingRecap } = useRelationshipRecap({
    funnelItemId: item?.id,
    language,
  });
  
  const generateRecap = useGenerateRecap();
  const syncEmails = useSyncEmails();
  const addActivity = useAddActivity();

  // Group activities by time period
  const groupedActivities = useMemo(() => {
    if (!activities?.length) return {};
    
    const groups: Record<string, ActivityEntry[]> = {};
    const now = new Date();
    
    activities.forEach(activity => {
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
  }, [activities, t, dateLocale]);

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

  if (!item) return null;

  const stageConfig = STAGE_CONFIG[item.stage];

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
              <Button size="sm" variant="outline" className="h-8" onClick={() => setAddActivityDialog('task')}>
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

          <TabsContent value="overview" className="flex-1 p-4 space-y-4">
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
      </SheetContent>
    </Sheet>
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
