import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isPast } from 'date-fns';
import { 
  Search, 
  Plus, 
  FileText, 
  Clock, 
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Download,
  Star,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSessions, useCreateSession, useUpdateSession, useDeleteSession, useSessionActionItems, useCreateActionItem, useWorkspaceMembers } from '@/hooks/useSessions';
import { useSessionTemplates } from '@/hooks/useSessionTemplates';
import { useExportSessions, exportSessionsToCsv } from '@/hooks/useExportData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SessionFeedbackCard } from '@/components/sessions/SessionFeedbackCard';
import { SessionAIPanel } from '@/components/sessions/SessionAIPanel';
import { SessionPrepCard } from '@/components/sessions/SessionPrepCard';
import { CollaborativeNotesEditor } from '@/components/sessions/CollaborativeNotesEditor';
import { VoiceToTextButton } from '@/components/sessions/VoiceToTextButton';

interface SessionsTabProps {
  workspaceId: string;
  canWrite: boolean;
}

export function SessionsTab({ workspaceId, canWrite }: SessionsTabProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const { data: sessions, isLoading } = useSessions(workspaceId);
  const deleteMutation = useDeleteSession(workspaceId);
  const { refetch: fetchExportData } = useExportSessions(workspaceId);

  const handleExport = async () => {
    const { data } = await fetchExportData();
    if (data && data.length > 0) {
      exportSessionsToCsv(data, `sessions-${workspaceId}`);
      toast.success(t('sessions.exportedSuccess'));
    } else {
      toast.error(t('sessions.noDataToExport'));
    }
  };

  const filteredSessions = sessions?.filter(session =>
    session.title.toLowerCase().includes(search.toLowerCase()) ||
    session.agenda?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteMutation.mutateAsync(sessionToDelete);
      toast.success(t('sessions.sessionDeleted'));
      setShowDeleteAlert(false);
      setSessionToDelete(null);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('sessions.searchSessions')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('sessions.export')}
          </Button>
          {canWrite && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('sessions.createSession')}
            </Button>
          )}
        </div>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : filteredSessions?.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold mb-2">{t('sessions.noSessions')}</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {search ? t('sessions.tryAdjustingSearch') : t('sessions.createFirstSession')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSessions?.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              canWrite={canWrite}
              onEdit={() => setSelectedSession(session)}
              onDelete={() => {
                setSessionToDelete(session.id);
                setShowDeleteAlert(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Session Dialog */}
      <CreateSessionDialog
        workspaceId={workspaceId}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Edit Session Dialog */}
      {selectedSession && (
        <SessionDetailDialog
          workspaceId={workspaceId}
          session={selectedSession}
          canWrite={canWrite}
          open={!!selectedSession}
          onOpenChange={(open) => !open && setSelectedSession(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sessions.deleteSession')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sessions.deleteSessionConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SessionCard({ session, canWrite, onEdit, onDelete }: { 
  session: any; 
  canWrite: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const isPastSession = isPast(new Date(session.scheduled_at));
  const hasNotes = !!session.notes;
  const hasDecisions = !!session.decisions;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onEdit}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-xs text-primary font-medium">
                {format(new Date(session.scheduled_at), 'MMM')}
              </span>
              <span className="text-lg font-bold text-primary leading-none">
                {format(new Date(session.scheduled_at), 'd')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{session.title}</h3>
                {isPastSession && !hasNotes && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                    {t('sessions.needsNotes')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(session.scheduled_at), 'h:mm a')}
                </span>
                {session.duration && (
                  <span>{session.duration} min</span>
                )}
              </div>
              {session.agenda && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                  {session.agenda}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {hasNotes && (
                  <Badge variant="secondary" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    {t('sessions.notes')}
                  </Badge>
                )}
                {hasDecisions && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t('sessions.decisions')}
                  </Badge>
                )}
                {session.ai_generated_at && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {canWrite && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateSessionDialog({ workspaceId, open, onOpenChange }: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('60');
  const [agenda, setAgenda] = useState('');
  const [location, setLocation] = useState('');
  const [joinUrl, setJoinUrl] = useState('');
  const [sendInvites, setSendInvites] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const createMutation = useCreateSession(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { data: sessionTemplates } = useSessionTemplates();

  // Get workspace and startup info for the email
  const getWorkspaceInfo = async () => {
    const { data } = await supabase
      .from('workspaces')
      .select(`
        id,
        startup:startups(name),
        program:programs(name)
      `)
      .eq('id', workspaceId)
      .maybeSingle();
    return data;
  };

  const getCurrentUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) {
      toast.error(t('common.error'));
      return;
    }

    setIsSending(true);
    try {
      const session = await createMutation.mutateAsync({
        title: title.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration: parseInt(duration),
        agenda: agenda.trim() || null,
        notes: null,
        decisions: null,
        location: location.trim() || null,
        join_url: joinUrl.trim() || null,
      });

      // Send email invites if enabled
      if (sendInvites && members && members.length > 0) {
        try {
          const [workspaceInfo, currentUser] = await Promise.all([
            getWorkspaceInfo(),
            getCurrentUserProfile(),
          ]);

          const recipientEmails = members
            .filter(m => m.profile?.email)
            .map(m => m.profile!.email);

          if (recipientEmails.length > 0) {
            const { error } = await supabase.functions.invoke('send-session-invite', {
              body: {
                sessionId: session.id,
                workspaceId,
                title: title.trim(),
                scheduledAt: new Date(scheduledAt).toISOString(),
                duration: parseInt(duration),
                agenda: agenda.trim() || undefined,
                location: location.trim() || undefined,
                joinUrl: joinUrl.trim() || undefined,
                recipientEmails,
                organizerName: currentUser?.full_name || currentUser?.email || 'Mentor',
                startupName: (workspaceInfo?.startup as { name: string } | null)?.name || 'Startup',
              },
            });

            if (error) {
              console.error('Failed to send invites:', error);
              toast.success(t('sessions.sessionCreated'));
            } else {
              toast.success(t('sessions.sessionCreated'));
            }
          } else {
            toast.success(t('sessions.sessionCreated'));
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError);
          toast.success(t('sessions.sessionCreated'));
        }
      } else {
        toast.success(t('sessions.sessionCreated'));
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setScheduledAt('');
    setDuration('60');
    setAgenda('');
    setLocation('');
    setJoinUrl('');
    setSendInvites(true);
    setSelectedTemplate('');
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = sessionTemplates?.find(t => t.id === templateId);
    if (template) {
      if (template.name && !title) setTitle(template.name);
      if (template.agenda_template) setAgenda(template.agenda_template);
    }
  };

  const memberCount = members?.filter(m => m.profile?.email).length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('sessions.scheduleSession', 'Schedule Session')}</DialogTitle>
          <DialogDescription>
            {t('sessions.scheduleSessionDesc', 'Schedule a new mentoring session')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Session Template Selector */}
          {sessionTemplates && sessionTemplates.length > 0 && (
            <div className="space-y-2">
              <Label>{t('sessions.useTemplateOptional', 'Use Template (optional)')}</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={t('sessions.selectTemplate', 'Select a template...')} />
                </SelectTrigger>
                <SelectContent>
                  {sessionTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="title">{t('sessions.titleRequired', 'Title *')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('sessions.titlePlaceholder', 'Weekly check-in')}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">{t('sessions.dateTime', 'Date & Time *')}</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="120">120 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="agenda">Agenda</Label>
            <Textarea
              id="agenda"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Topics to discuss..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Meeting room or address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="joinUrl">Meeting Link</Label>
            <Input
              id="joinUrl"
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>
          
          {/* Email invite option */}
          <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
            <Checkbox
              id="send-invites"
              checked={sendInvites}
              onCheckedChange={(checked) => setSendInvites(!!checked)}
            />
            <div className="flex-1">
              <Label htmlFor="send-invites" className="cursor-pointer font-medium">
                Send calendar invites
              </Label>
              <p className="text-xs text-muted-foreground">
                {memberCount > 0 
                  ? `Email ${memberCount} workspace member${memberCount > 1 ? 's' : ''} with calendar invite`
                  : 'No workspace members to invite'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || isSending}>
              {(createMutation.isPending || isSending) ? 'Scheduling...' : 'Schedule Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SessionDetailDialog({ workspaceId, session, canWrite, open, onOpenChange }: {
  workspaceId: string;
  session: any;
  canWrite: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState(session.notes || '');
  const [decisions, setDecisions] = useState(session.decisions || '');
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [refreshKey, setRefreshKey] = useState(0);

  const updateMutation = useUpdateSession(workspaceId);
  const { data: actionItems, isLoading: actionsLoading, refetch: refetchActions } = useSessionActionItems(session.id);
  const { data: members } = useWorkspaceMembers(workspaceId);

  const handleRefreshAI = () => {
    setRefreshKey(prev => prev + 1);
    refetchActions();
  };

  const handleResendInvites = async () => {
    const recipientEmails = members
      ?.filter(m => m.profile?.email)
      .map(m => m.profile!.email) || [];

    if (recipientEmails.length === 0) {
      toast.error('No workspace members with email addresses');
      return;
    }

    setIsResending(true);
    try {
      // Get workspace info
      const { data: workspaceInfo } = await supabase
        .from('workspaces')
        .select(`startup:startups(name)`)
        .eq('id', workspaceId)
        .maybeSingle();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      let organizerName = 'Mentor';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .maybeSingle();
        organizerName = profile?.full_name || profile?.email || 'Mentor';
      }

      const { error } = await supabase.functions.invoke('send-session-invite', {
        body: {
          sessionId: session.id,
          workspaceId,
          title: session.title,
          scheduledAt: session.scheduled_at,
          duration: session.duration || 60,
          agenda: session.agenda || undefined,
          recipientEmails,
          organizerName,
          startupName: (workspaceInfo?.startup as { name: string } | null)?.name || 'Startup',
        },
      });

      if (error) {
        console.error('Failed to resend invites:', error);
        toast.error('Failed to resend invites');
      } else {
        toast.success(`Sent ${recipientEmails.length} invite(s)`);
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast.error('Failed to resend invites');
    } finally {
      setIsResending(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: session.id,
        notes: notes.trim() || null,
        decisions: decisions.trim() || null,
      });
      toast.success('Session updated');
    } catch (error) {
      toast.error('Failed to update session');
    }
  };

  const isPastSession = isPast(new Date(session.scheduled_at));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{session.title}</DialogTitle>
            <DialogDescription>
              {format(new Date(session.scheduled_at), 'EEEE, MMMM d, yyyy')} at {format(new Date(session.scheduled_at), 'h:mm a')}
              {session.duration && ` • ${session.duration} min`}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="prep">Prep</TabsTrigger>
              <TabsTrigger value="details">Details & Notes</TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI
              </TabsTrigger>
            </TabsList>
            
            {/* Session Prep Tab */}
            <TabsContent value="prep" className="mt-4">
              <SessionPrepCard sessionId={session.id} workspaceId={workspaceId} />
            </TabsContent>
            
            <TabsContent value="details" className="space-y-6 mt-4">
              {/* Resend Invites */}
              {canWrite && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Calendar Invites</p>
                      <p className="text-xs text-muted-foreground">
                        {members?.filter(m => m.profile?.email).length || 0} workspace members
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResendInvites}
                    disabled={isResending}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    {isResending ? 'Sending...' : 'Resend Invites'}
                  </Button>
                </div>
              )}

              {/* Agenda */}
              {session.agenda && (
                <div>
                  <Label className="text-muted-foreground">Agenda</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{session.agenda}</p>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notes">Session Notes</Label>
                  {canWrite && (
                    <VoiceToTextButton 
                      onTranscript={(text) => setNotes(prev => prev ? `${prev}\n\n${text}` : text)} 
                    />
                  )}
                </div>
                {canWrite ? (
                  <CollaborativeNotesEditor
                    value={notes}
                    onChange={setNotes}
                    workspaceId={workspaceId}
                    sessionId={session.id}
                    placeholder="Add notes from this session..."
                    members={members || []}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                    {notes || 'No notes recorded'}
                  </p>
                )}
              </div>

              {/* Decisions */}
              <div className="space-y-2">
                <Label htmlFor="decisions">Key Decisions</Label>
                {canWrite ? (
                  <Textarea
                    id="decisions"
                    value={decisions}
                    onChange={(e) => setDecisions(e.target.value)}
                    placeholder="Key decisions made during this session..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                    {decisions || 'No decisions recorded'}
                  </p>
                )}
              </div>

              {/* Action Items from this session */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Action Items from this Session</Label>
                  {canWrite && (
                    <Button variant="outline" size="sm" onClick={() => setShowActionDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Action Item
                    </Button>
                  )}
                </div>
                {actionsLoading ? (
                  <Skeleton className="h-20" />
                ) : actionItems?.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No action items from this session</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {actionItems?.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className={`h-2 w-2 rounded-full ${
                          item.status === 'completed' ? 'bg-green-500' :
                          item.status === 'in_progress' ? 'bg-blue-500' : 'bg-muted-foreground'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          {item.due_date && (
                            <p className="text-xs text-muted-foreground">
                              Due: {format(new Date(item.due_date), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        <Badge variant={
                          item.status === 'completed' ? 'default' :
                          item.status === 'in_progress' ? 'secondary' : 'outline'
                        } className="text-xs">
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Session Feedback */}
              {isPastSession && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Session Feedback
                  </Label>
                  <SessionFeedbackCard sessionId={session.id} sessionTitle={session.title} />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="ai" className="mt-4">
              <SessionAIPanel 
                key={refreshKey}
                workspaceId={workspaceId}
                sessionId={session.id}
                session={session}
                canWrite={canWrite}
                onRefresh={handleRefreshAI}
              />
            </TabsContent>
          </Tabs>

          {canWrite && (
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Action Item Dialog */}
      <AddActionItemDialog
        workspaceId={workspaceId}
        sessionId={session.id}
        open={showActionDialog}
        onOpenChange={setShowActionDialog}
      />
    </>
  );
}

function AddActionItemDialog({ workspaceId, sessionId, open, onOpenChange }: {
  workspaceId: string;
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [ownerId, setOwnerId] = useState('');

  const { data: members } = useWorkspaceMembers(workspaceId);
  const createMutation = useCreateActionItem(workspaceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        priority,
        session_id: sessionId,
        owner_user_id: ownerId || undefined,
      });
      toast.success('Action item created');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create action item');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('medium');
    setOwnerId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Action Item</DialogTitle>
          <DialogDescription>
            Create an action item from this session
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="action-title">Title *</Label>
            <Input
              id="action-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-description">Description</Label>
            <Textarea
              id="action-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="action-due-date">Due Date</Label>
              <Input
                id="action-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
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
            <Label htmlFor="action-owner">Assign to</Label>
            <Select value={ownerId} onValueChange={(val) => setOwnerId(val === 'unassigned' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members?.filter(m => m.user_id).map(member => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.profile?.full_name || member.profile?.email || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Action Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
