import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Trash2,
  Edit2,
  Video,
  Mail,
  Send,
  Users,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCalendarSessions, useCreateSession, useUpdateSession, useDeleteSession, useWorkspaceMembers, Session } from '@/hooks/useSessions';
import { useSessionTemplates } from '@/hooks/useSessionTemplates';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CalendarTabProps {
  workspaceId: string;
  canWrite: boolean;
  startupName?: string;
}

export function CalendarTab({ workspaceId, canWrite, startupName }: CalendarTabProps) {
  const { data: sessions = [], isLoading } = useCalendarSessions(workspaceId);
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId);
  const { data: sessionTemplates } = useSessionTemplates();
  const { profile, user } = useAuth();
  const createSession = useCreateSession(workspaceId);
  const updateSession = useUpdateSession(workspaceId);
  const deleteSession = useDeleteSession(workspaceId);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [sendInviteSession, setSendInviteSession] = useState<Session | null>(null);
  const [quickInviteEmails, setQuickInviteEmails] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Get member emails for auto-complete (exclude current user)
  const memberEmails = workspaceMembers
    .filter((m) => m.profile?.email && m.user_id !== user?.id)
    .map((m) => ({
      email: m.profile!.email,
      name: m.profile?.full_name || m.profile!.email,
      avatar: m.profile?.avatar_url,
      role: m.role,
    }));

  const defaultInviteEmails = () => {
    const preferredRoles = new Set(['founder', 'consultor', 'mentor_externo']);
    const emails = memberEmails
      .filter((m) => preferredRoles.has(m.role))
      .map((m) => m.email);
    return [...new Set(emails)].join(', ');
  };

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    agenda: '',
    date: '',
    startTime: '',
    duration: '60',
    location: '',
    joinUrl: '',
    sendInvites: true,
    inviteEmails: '',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      agenda: '',
      date: '',
      startTime: '',
      duration: '60',
      location: '',
      joinUrl: '',
      sendInvites: true,
      inviteEmails: '',
    });
    setSelectedTemplate('');
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = sessionTemplates?.find(t => t.id === templateId);
    if (template) {
      if (template.name && !formData.title) {
        setFormData(prev => ({ ...prev, title: template.name }));
      }
      if (template.agenda_template) {
        setFormData(prev => ({ ...prev, agenda: template.agenda_template || '' }));
      }
    }
  };

  // Compute end time from start + duration for display
  const computeEndTime = (startTime: string, duration: number): string => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  };

  // Send session invite
  const sendSessionInvite = async (session: Session, emails: string[]) => {
    if (emails.length === 0) return;

    try {
      setIsSendingInvite(true);
      const duration = session.duration || 60;
      const endsAt = new Date(new Date(session.scheduled_at).getTime() + duration * 60000).toISOString();
      
      const { data, error } = await supabase.functions.invoke('send-session-invite', {
        body: {
          sessionId: session.id,
          workspaceId: session.workspace_id,
          title: session.title,
          scheduledAt: session.scheduled_at,
          duration: duration,
          agenda: session.agenda,
          location: session.location,
          joinUrl: session.join_url,
          recipientEmails: emails,
          organizerName: profile?.full_name || 'Team Member',
          startupName: startupName || 'Startup',
        },
      });

      if (error) throw error;

      toast.success(`Calendar invites sent to ${emails.length} recipient(s)`);
      return data;
    } catch (error) {
      console.error('Error sending session invite:', error);
      toast.error('Failed to send calendar invites');
      throw error;
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleAddSession = async () => {
    if (!formData.title || !formData.date || !formData.startTime) return;

    try {
      const scheduled_at = new Date(`${formData.date}T${formData.startTime}`).toISOString();
      const duration = parseInt(formData.duration);

      const newSession = await createSession.mutateAsync({
        title: formData.title,
        agenda: formData.agenda || null,
        scheduled_at,
        duration,
        notes: null,
        decisions: null,
        location: formData.location || null,
        join_url: formData.joinUrl || null,
      });

      // Send invites if checkbox is checked and emails are provided
      if (formData.sendInvites && formData.inviteEmails.trim() && newSession) {
        const emails = formData.inviteEmails
          .split(/[,;\n]/)
          .map(e => e.trim())
          .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
        
        if (emails.length > 0) {
          try {
            await sendSessionInvite(newSession, emails);
          } catch (inviteError) {
            console.error('Failed to send invites but session was created:', inviteError);
          }
        }
      }

      toast.success('Session scheduled');
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to schedule session');
    }
  };

  const handleEditSession = async () => {
    if (!editingSession || !formData.title || !formData.date || !formData.startTime) return;

    const scheduled_at = new Date(`${formData.date}T${formData.startTime}`).toISOString();
    const duration = parseInt(formData.duration);

    try {
      await updateSession.mutateAsync({
        id: editingSession.id,
        title: formData.title,
        agenda: formData.agenda || null,
        scheduled_at,
        duration,
        location: formData.location || null,
        join_url: formData.joinUrl || null,
      });

      toast.success('Session updated');
      resetForm();
      setEditingSession(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteSession.mutateAsync(id);
      toast.success('Session deleted');
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const openEditDialog = (session: Session) => {
    const startDate = parseISO(session.scheduled_at);
    
    setFormData({
      title: session.title,
      agenda: session.agenda || '',
      date: format(startDate, 'yyyy-MM-dd'),
      startTime: format(startDate, 'HH:mm'),
      duration: String(session.duration || 60),
      location: session.location || '',
      joinUrl: session.join_url || '',
      sendInvites: false,
      inviteEmails: '',
    });
    setEditingSession(session);
    setIsEditDialogOpen(true);
  };

  const openAddDialogWithDate = (date: Date) => {
    setFormData((prev) => ({
      ...prev,
      date: format(date, 'yyyy-MM-dd'),
      inviteEmails: prev.inviteEmails.trim() ? prev.inviteEmails : defaultInviteEmails(),
    }));
    setIsAddDialogOpen(true);
  };

  // Calendar grid calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get sessions for a specific day
  const getSessionsForDay = (date: Date) => {
    return sessions.filter((session) => isSameDay(parseISO(session.scheduled_at), date));
  };

  // Get sessions for selected date
  const selectedDaySessions = selectedDate ? getSessionsForDay(selectedDate) : [];

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Form fields JSX
  const renderSessionFormFields = (isEdit: boolean) => (
    <div className="grid gap-4 py-4">
      {/* Session Template Selector - only for new sessions */}
      {!isEdit && sessionTemplates && sessionTemplates.length > 0 && (
        <div className="grid gap-2">
          <Label>Use Template (optional)</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template..." />
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
      
      <div className="grid gap-2">
        <Label htmlFor={isEdit ? "edit-title" : "title"}>Title *</Label>
        <Input
          id={isEdit ? "edit-title" : "title"}
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Session title"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={isEdit ? "edit-agenda" : "agenda"}>Agenda</Label>
        <Textarea
          id={isEdit ? "edit-agenda" : "agenda"}
          value={formData.agenda}
          onChange={(e) => setFormData((prev) => ({ ...prev, agenda: e.target.value }))}
          placeholder="Topics to discuss"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="grid gap-2">
          <Label htmlFor={isEdit ? "edit-date" : "date"}>Date *</Label>
          <Input
            id={isEdit ? "edit-date" : "date"}
            type="date"
            value={formData.date}
            onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={isEdit ? "edit-startTime" : "startTime"}>Start *</Label>
          <Input
            id={isEdit ? "edit-startTime" : "startTime"}
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={isEdit ? "edit-duration" : "duration"}>Duration</Label>
          <Select value={formData.duration} onValueChange={(v) => setFormData((prev) => ({ ...prev, duration: v }))}>
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
      <div className="grid gap-2">
        <Label htmlFor={isEdit ? "edit-location" : "location"}>Location</Label>
        <Input
          id={isEdit ? "edit-location" : "location"}
          value={formData.location}
          onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
          placeholder="Meeting room or address"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={isEdit ? "edit-joinUrl" : "joinUrl"}>Meeting Link</Label>
        <Input
          id={isEdit ? "edit-joinUrl" : "joinUrl"}
          value={formData.joinUrl}
          onChange={(e) => setFormData((prev) => ({ ...prev, joinUrl: e.target.value }))}
          placeholder="https://meet.google.com/..."
        />
      </div>
      
      {/* Send Invites Section - only for new sessions */}
      {!isEdit && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendInvites"
              checked={formData.sendInvites}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, sendInvites: checked === true }))}
            />
            <Label htmlFor="sendInvites" className="flex items-center gap-2 cursor-pointer">
              <Mail className="h-4 w-4" />
              Send calendar invites via email
            </Label>
          </div>
          
          {formData.sendInvites && (
            <div className="grid gap-2">
              <Label htmlFor="inviteEmails">Recipient Emails</Label>
              
              {/* Quick add workspace members */}
              {memberEmails.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>Quick add team members:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const allEmails = memberEmails.map(m => m.email).join(', ');
                        setFormData((prev) => ({
                          ...prev,
                          inviteEmails: prev.inviteEmails 
                            ? `${prev.inviteEmails}, ${allEmails}` 
                            : allEmails
                        }));
                      }}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Add all ({memberEmails.length})
                    </Button>
                    {memberEmails.slice(0, 5).map((member) => (
                      <Button
                        key={member.email}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          const currentEmails = formData.inviteEmails
                            .split(/[,;\n]/)
                            .map(e => e.trim())
                            .filter(Boolean);
                          
                          if (!currentEmails.includes(member.email)) {
                            setFormData((prev) => ({
                              ...prev,
                              inviteEmails: prev.inviteEmails 
                                ? `${prev.inviteEmails}, ${member.email}` 
                                : member.email
                            }));
                          }
                        }}
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={member.avatar || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {member.name.split(' ')[0]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <Textarea
                id="inviteEmails"
                value={formData.inviteEmails}
                onChange={(e) => setFormData((prev) => ({ ...prev, inviteEmails: e.target.value }))}
                placeholder="Enter email addresses (separated by commas or new lines)"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Recipients will receive an email with an .ics calendar attachment
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendar View */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {canWrite && (
            <Dialog
              open={isAddDialogOpen}
              onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <Button onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  date: format(new Date(), 'yyyy-MM-dd'),
                  inviteEmails: defaultInviteEmails(),
                }));
                setIsAddDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Session
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Session</DialogTitle>
                  <DialogDescription>
                    Create a new mentoring session
                  </DialogDescription>
                </DialogHeader>
                {renderSessionFormFields(false)}
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddSession}
                    disabled={createSession.isPending || !formData.title || !formData.date || !formData.startTime}
                  >
                    {createSession.isPending ? 'Scheduling...' : 'Schedule Session'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {/* Week day headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const daySessions = getSessionsForDay(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'relative min-h-[80px] p-1 text-left rounded-lg border transition-colors',
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground',
                    isToday && 'ring-2 ring-primary',
                    isSelected && 'bg-primary/10 border-primary',
                    !isSelected && 'hover:bg-muted/50',
                    canWrite && 'cursor-pointer'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-sm',
                      isToday && 'bg-primary text-primary-foreground font-semibold'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {daySessions.slice(0, 2).map((session) => (
                      <div
                        key={session.id}
                        className="text-xs truncate px-1 py-0.5 rounded bg-primary/20 text-primary font-medium"
                      >
                        {format(parseISO(session.scheduled_at), 'HH:mm')} {session.title}
                      </div>
                    ))}
                    {daySessions.length > 2 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{daySessions.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDate ? (
            <ScrollArea className="h-[400px]">
              {selectedDaySessions.length > 0 ? (
                <div className="space-y-3">
                  {selectedDaySessions.map((session) => {
                    const endTime = new Date(new Date(session.scheduled_at).getTime() + (session.duration || 60) * 60000);
                    return (
                      <div
                        key={session.id}
                        className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm">{session.title}</h4>
                          {canWrite && (
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                title="Send calendar invite"
                                onClick={() => {
                                  setSendInviteSession(session);
                                  if (!quickInviteEmails.trim()) {
                                    setQuickInviteEmails(defaultInviteEmails());
                                  }
                                }}
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => openEditDialog(session)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirmId(session.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(session.scheduled_at), 'HH:mm')} - {format(endTime, 'HH:mm')}
                        </div>
                        {session.agenda && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                            <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{session.agenda}</span>
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {session.location && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.location}
                            </Badge>
                          )}
                          {session.join_url && (
                            <a
                              href={session.join_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Badge variant="outline" className="text-xs gap-1 hover:bg-primary/10">
                                <Video className="h-3 w-3" />
                                Join Call
                              </Badge>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No sessions scheduled</p>
                  {canWrite && (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2"
                      onClick={() => openAddDialogWithDate(selectedDate)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add session
                    </Button>
                  )}
                </div>
              )}
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Click on a date to view sessions
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) { resetForm(); setEditingSession(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>
              Update session details
            </DialogDescription>
          </DialogHeader>
          {renderSessionFormFields(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); setEditingSession(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSession}
              disabled={updateSession.isPending || !formData.title || !formData.date || !formData.startTime}
            >
              {updateSession.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteSession(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Invite Dialog */}
      <Dialog open={!!sendInviteSession} onOpenChange={(open) => { if (!open) { setSendInviteSession(null); setQuickInviteEmails(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Calendar Invite</DialogTitle>
            <DialogDescription>
              Send a calendar invite (.ics) to participants for "{sendInviteSession?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quickEmails">Recipient Emails</Label>
              
              {/* Quick add workspace members */}
              {memberEmails.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>Quick add team members:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const allEmails = memberEmails.map(m => m.email).join(', ');
                        setQuickInviteEmails((prev) => prev ? `${prev}, ${allEmails}` : allEmails);
                      }}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Add all ({memberEmails.length})
                    </Button>
                    {memberEmails.slice(0, 5).map((member) => (
                      <Button
                        key={member.email}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          const currentEmails = quickInviteEmails
                            .split(/[,;\n]/)
                            .map(e => e.trim())
                            .filter(Boolean);
                          
                          if (!currentEmails.includes(member.email)) {
                            setQuickInviteEmails((prev) => prev ? `${prev}, ${member.email}` : member.email);
                          }
                        }}
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={member.avatar || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {member.name.split(' ')[0]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <Textarea
                id="quickEmails"
                value={quickInviteEmails}
                onChange={(e) => setQuickInviteEmails(e.target.value)}
                placeholder="Enter email addresses (separated by commas or new lines)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Recipients will receive an email with an .ics calendar attachment they can add to their calendar
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSendInviteSession(null); setQuickInviteEmails(''); }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!sendInviteSession) return;
                const emails = quickInviteEmails
                  .split(/[,;\n]/)
                  .map(e => e.trim())
                  .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
                
                if (emails.length > 0) {
                  await sendSessionInvite(sendInviteSession, emails);
                  setSendInviteSession(null);
                  setQuickInviteEmails('');
                } else {
                  toast.error('Please enter at least one valid email address');
                }
              }}
              disabled={isSendingInvite || !quickInviteEmails.trim()}
            >
              {isSendingInvite ? (
                <>
                  <Send className="h-4 w-4 mr-2 animate-pulse" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
