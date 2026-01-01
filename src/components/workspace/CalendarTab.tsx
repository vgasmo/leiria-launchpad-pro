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
  Link as LinkIcon,
  Trash2,
  Edit2,
  Video,
  Mail,
  Send,
  Users,
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
  DialogTrigger,
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
import { cn } from '@/lib/utils';
import { useMeetings, Meeting } from '@/hooks/useMeetings';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CalendarTabProps {
  workspaceId: string;
  canWrite: boolean;
  startupName?: string;
}

export function CalendarTab({ workspaceId, canWrite, startupName }: CalendarTabProps) {
  const { meetings, isLoading, createMeeting, updateMeeting, deleteMeeting } = useMeetings(workspaceId);
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId);
  const { profile, user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [sendInviteMeeting, setSendInviteMeeting] = useState<Meeting | null>(null);
  const [quickInviteEmails, setQuickInviteEmails] = useState('');

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
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    joinUrl: '',
    sendInvites: true,
    inviteEmails: '',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      joinUrl: '',
      sendInvites: true,
      inviteEmails: '',
    });
  };

  // Send meeting invite
  const sendMeetingInvite = async (meeting: Meeting, emails: string[]) => {
    if (emails.length === 0) return;

    try {
      setIsSendingInvite(true);
      const { data, error } = await supabase.functions.invoke('send-meeting-invite', {
        body: {
          meetingId: meeting.id,
          workspaceId: meeting.workspace_id,
          title: meeting.title,
          startsAt: meeting.starts_at,
          endsAt: meeting.ends_at,
          description: meeting.description,
          location: meeting.location,
          joinUrl: meeting.join_url,
          recipientEmails: emails,
          organizerName: profile?.full_name || 'Team Member',
          startupName: startupName || 'Startup',
        },
      });

      if (error) throw error;

      const results = (data as any)?.results as Array<{ email: string; success: boolean; error?: string }> | undefined;
      const failed = (results || []).filter((r) => r && r.success === false);

      if (failed.length > 0) {
        const firstError = failed[0]?.error;
        toast.error(
          `Invites failed for ${failed.length} recipient(s)${firstError ? `: ${firstError}` : ''}`
        );
      } else {
        toast.success(`Calendar invites sent to ${emails.length} recipient(s)`);
      }

      return data;
    } catch (error) {
      console.error('Error sending meeting invite:', error);
      toast.error('Failed to send calendar invites');
      throw error;
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleAddMeeting = async () => {
    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime) return;

    try {
      const starts_at = new Date(`${formData.date}T${formData.startTime}`).toISOString();
      const ends_at = new Date(`${formData.date}T${formData.endTime}`).toISOString();

      const newMeeting = await createMeeting.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        workspace_id: workspaceId,
        starts_at,
        ends_at,
        location: formData.location || undefined,
        join_url: formData.joinUrl || undefined,
      });

      // Send invites if checkbox is checked and emails are provided
      if (formData.sendInvites && formData.inviteEmails.trim() && newMeeting) {
        const emails = formData.inviteEmails
          .split(/[,;\n]/)
          .map(e => e.trim())
          .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
        
        if (emails.length > 0) {
          try {
            await sendMeetingInvite(newMeeting as Meeting, emails);
          } catch (inviteError) {
            console.error('Failed to send invites but meeting was created:', inviteError);
            // Meeting was still created, just invites failed
          }
        }
      }

      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error creating meeting:', error);
      // Toast already shown by mutation
    }
  };

  const handleEditMeeting = async () => {
    if (!editingMeeting || !formData.title || !formData.date || !formData.startTime || !formData.endTime) return;

    const starts_at = new Date(`${formData.date}T${formData.startTime}`).toISOString();
    const ends_at = new Date(`${formData.date}T${formData.endTime}`).toISOString();

    await updateMeeting.mutateAsync({
      id: editingMeeting.id,
      title: formData.title,
      description: formData.description || undefined,
      starts_at,
      ends_at,
      location: formData.location || undefined,
      join_url: formData.joinUrl || undefined,
    });

    resetForm();
    setEditingMeeting(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteMeeting = async (id: string) => {
    await deleteMeeting.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  const openEditDialog = (meeting: Meeting) => {
    const startDate = parseISO(meeting.starts_at);
    const endDate = parseISO(meeting.ends_at);
    
    setFormData({
      title: meeting.title,
      description: meeting.description || '',
      date: format(startDate, 'yyyy-MM-dd'),
      startTime: format(startDate, 'HH:mm'),
      endTime: format(endDate, 'HH:mm'),
      location: meeting.location || '',
      joinUrl: meeting.join_url || '',
      sendInvites: false,
      inviteEmails: '',
    });
    setEditingMeeting(meeting);
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

  // Get meetings for a specific day
  const getMeetingsForDay = (date: Date) => {
    return meetings.filter((meeting) => isSameDay(parseISO(meeting.starts_at), date));
  };

  // Get meetings for selected date
  const selectedDayMeetings = selectedDate ? getMeetingsForDay(selectedDate) : [];

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Form fields JSX - inline to avoid re-render issues
  const renderMeetingFormFields = (isEdit: boolean) => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor={isEdit ? "edit-title" : "title"}>Title *</Label>
        <Input
          id={isEdit ? "edit-title" : "title"}
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Meeting title"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={isEdit ? "edit-description" : "description"}>Description</Label>
        <Textarea
          id={isEdit ? "edit-description" : "description"}
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Optional description"
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
          <Label htmlFor={isEdit ? "edit-endTime" : "endTime"}>End *</Label>
          <Input
            id={isEdit ? "edit-endTime" : "endTime"}
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
          />
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
      
      {/* Send Invites Section - only for new meetings */}
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
                if (open) {
                  setFormData((prev) => ({
                    ...prev,
                    inviteEmails: prev.inviteEmails.trim() ? prev.inviteEmails : defaultInviteEmails(),
                  }));
                } else {
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule New Meeting</DialogTitle>
                  <DialogDescription>
                    Add a new meeting to the calendar
                  </DialogDescription>
                </DialogHeader>
                {renderMeetingFormFields(false)}
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddMeeting}
                    disabled={createMeeting.isPending || isSendingInvite || !formData.title || !formData.date || !formData.startTime || !formData.endTime}
                  >
                    {isSendingInvite ? (
                      <>
                        <Send className="h-4 w-4 mr-2 animate-pulse" />
                        Sending Invites...
                      </>
                    ) : createMeeting.isPending ? (
                      'Scheduling...'
                    ) : formData.sendInvites && formData.inviteEmails.trim() ? (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Schedule & Send
                      </>
                    ) : (
                      'Schedule'
                    )}
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
              const dayMeetings = getMeetingsForDay(day);
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
                    {dayMeetings.slice(0, 2).map((meeting) => (
                      <div
                        key={meeting.id}
                        className="text-xs truncate px-1 py-0.5 rounded bg-primary/20 text-primary font-medium"
                      >
                        {format(parseISO(meeting.starts_at), 'HH:mm')} {meeting.title}
                      </div>
                    ))}
                    {dayMeetings.length > 2 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayMeetings.length - 2} more
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
              {selectedDayMeetings.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm">{meeting.title}</h4>
                        {canWrite && (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Send calendar invite"
                              onClick={() => {
                                setSendInviteMeeting(meeting);
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
                              onClick={() => openEditDialog(meeting)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(meeting.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(meeting.starts_at), 'HH:mm')} - {format(parseISO(meeting.ends_at), 'HH:mm')}
                      </div>
                      {meeting.description && (
                        <p className="text-xs text-muted-foreground mt-2">{meeting.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {meeting.location && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <MapPin className="h-3 w-3" />
                            {meeting.location}
                          </Badge>
                        )}
                        {meeting.join_url && (
                          <a
                            href={meeting.join_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex"
                          >
                            <Badge variant="outline" className="text-xs gap-1 hover:bg-primary/10">
                              <Video className="h-3 w-3" />
                              Join Meeting
                            </Badge>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No meetings scheduled</p>
                  {canWrite && (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2"
                      onClick={() => openAddDialogWithDate(selectedDate)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add meeting
                    </Button>
                  )}
                </div>
              )}
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Click on a date to view meetings
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) { resetForm(); setEditingMeeting(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
            <DialogDescription>
              Update meeting details
            </DialogDescription>
          </DialogHeader>
          {renderMeetingFormFields(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); setEditingMeeting(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleEditMeeting}
              disabled={updateMeeting.isPending || !formData.title || !formData.date || !formData.startTime || !formData.endTime}
            >
              {updateMeeting.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this meeting? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteMeeting(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Invite Dialog */}
      <Dialog open={!!sendInviteMeeting} onOpenChange={(open) => { if (!open) { setSendInviteMeeting(null); setQuickInviteEmails(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Calendar Invite</DialogTitle>
            <DialogDescription>
              Send a calendar invite (.ics) to participants for "{sendInviteMeeting?.title}"
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
            <Button variant="outline" onClick={() => { setSendInviteMeeting(null); setQuickInviteEmails(''); }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!sendInviteMeeting) return;
                const emails = quickInviteEmails
                  .split(/[,;\n]/)
                  .map(e => e.trim())
                  .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
                
                if (emails.length > 0) {
                  await sendMeetingInvite(sendInviteMeeting, emails);
                  setSendInviteMeeting(null);
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
