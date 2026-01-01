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
import { cn } from '@/lib/utils';
import { useMeetings, Meeting } from '@/hooks/useMeetings';

interface CalendarTabProps {
  workspaceId: string;
  canWrite: boolean;
}

export function CalendarTab({ workspaceId, canWrite }: CalendarTabProps) {
  const { meetings, isLoading, createMeeting, updateMeeting, deleteMeeting } = useMeetings(workspaceId);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    joinUrl: '',
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
    });
  };

  const handleAddMeeting = async () => {
    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime) return;

    const starts_at = new Date(`${formData.date}T${formData.startTime}`).toISOString();
    const ends_at = new Date(`${formData.date}T${formData.endTime}`).toISOString();

    await createMeeting.mutateAsync({
      title: formData.title,
      description: formData.description || undefined,
      workspace_id: workspaceId,
      starts_at,
      ends_at,
      location: formData.location || undefined,
      join_url: formData.joinUrl || undefined,
    });

    resetForm();
    setIsAddDialogOpen(false);
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
    });
    setEditingMeeting(meeting);
    setIsEditDialogOpen(true);
  };

  const openAddDialogWithDate = (date: Date) => {
    setFormData((prev) => ({
      ...prev,
      date: format(date, 'yyyy-MM-dd'),
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

  const MeetingForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Meeting title"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Optional description"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="startTime">Start *</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endTime">End *</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
          placeholder="Meeting room or address"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="joinUrl">Meeting Link</Label>
        <Input
          id="joinUrl"
          value={formData.joinUrl}
          onChange={(e) => setFormData((prev) => ({ ...prev, joinUrl: e.target.value }))}
          placeholder="https://meet.google.com/..."
        />
      </div>
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
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
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
                <MeetingForm />
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddMeeting}
                    disabled={createMeeting.isPending || !formData.title || !formData.date || !formData.startTime || !formData.endTime}
                  >
                    {createMeeting.isPending ? 'Scheduling...' : 'Schedule'}
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
          <MeetingForm isEdit />
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
    </div>
  );
}
