import { useState } from 'react';
import { Calendar, Clock, Check, X, Loader2, MessageSquare } from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  useMentorAvailability, 
  useMyBookings, 
  useCreateBooking, 
  useUpdateBookingStatus,
  MentorBooking 
} from '@/hooks/useMentorAvailability';

interface MentorBookingPanelProps {
  mentorId?: string;
  mentorName?: string;
  mentorAvatar?: string;
  workspaceId?: string;
  mode: 'founder' | 'mentor';
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function MentorBookingPanel({ 
  mentorId, 
  mentorName, 
  mentorAvatar, 
  workspaceId,
  mode 
}: MentorBookingPanelProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [message, setMessage] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);

  const { data: availability, isLoading: loadingAvailability } = useMentorAvailability(mentorId);
  const { data: bookings, isLoading: loadingBookings } = useMyBookings();
  const createBooking = useCreateBooking();
  const updateStatus = useUpdateBookingStatus();

  const getInitials = (name: string | null) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const getAvailableSlotsForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    return availability?.filter(a => a.day_of_week === dayOfWeek) || [];
  };

  const isDateAvailable = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return false;
    const dayOfWeek = date.getDay();
    return availability?.some(a => a.day_of_week === dayOfWeek) || false;
  };

  const handleBookSession = () => {
    if (!selectedDate || !selectedSlot || !mentorId) {
      toast.error('Please select a date and time slot');
      return;
    }

    const [startTime, endTime] = selectedSlot.split('-');

    createBooking.mutate({
      mentor_id: mentorId,
      workspace_id: workspaceId,
      requested_date: format(selectedDate, 'yyyy-MM-dd'),
      requested_start_time: startTime,
      requested_end_time: endTime,
      message: message.trim() || undefined,
    }, {
      onSuccess: () => {
        toast.success('Booking request sent!');
        setShowBookingForm(false);
        setSelectedDate(undefined);
        setSelectedSlot('');
        setMessage('');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create booking');
      },
    });
  };

  const handleUpdateStatus = (booking: MentorBooking, status: 'accepted' | 'declined') => {
    updateStatus.mutate({ id: booking.id, status }, {
      onSuccess: () => {
        toast.success(`Booking ${status}`);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update booking');
      },
    });
  };

  const pendingBookings = bookings?.filter(b => b.status === 'pending') || [];
  const confirmedBookings = bookings?.filter(b => b.status === 'accepted') || [];
  const myMentorBookings = bookings?.filter(b => 
    mode === 'founder' ? b.mentor_id === mentorId : true
  ) || [];

  if (mode === 'founder' && mentorId) {
    // Founder view: Book a session with specific mentor
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={mentorAvatar || undefined} />
              <AvatarFallback>{getInitials(mentorName || null)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">Book Session with {mentorName}</CardTitle>
              <CardDescription>Select an available time slot</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingAvailability ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !availability?.length ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>This mentor hasn't set their availability yet.</p>
            </div>
          ) : showBookingForm ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => !isDateAvailable(date)}
                      fromDate={new Date()}
                      toDate={addDays(new Date(), 60)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {selectedDate && (
                <div className="space-y-2">
                  <Label>Select Time Slot</Label>
                  <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableSlotsForDate(selectedDate).map(slot => (
                        <SelectItem key={slot.id} value={`${slot.start_time}-${slot.end_time}`}>
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What would you like to discuss?"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowBookingForm(false)} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBookSession} 
                  disabled={!selectedDate || !selectedSlot || createBooking.isPending}
                  className="flex-1"
                >
                  {createBooking.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Request Booking
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Available on:</p>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(availability.map(a => a.day_of_week))].sort().map(day => (
                    <Badge key={day} variant="secondary">
                      {DAYS_OF_WEEK[day]}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={() => setShowBookingForm(true)} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule a Session
              </Button>

              {/* Show existing bookings with this mentor */}
              {myMentorBookings.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Your Bookings</p>
                  <div className="space-y-2">
                    {myMentorBookings.map(booking => (
                      <div key={booking.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                        <div>
                          <span>{format(new Date(booking.requested_date), 'MMM d')}</span>
                          <span className="text-muted-foreground ml-2">
                            {booking.requested_start_time.slice(0, 5)}
                          </span>
                        </div>
                        <Badge variant={
                          booking.status === 'accepted' ? 'default' :
                          booking.status === 'declined' ? 'destructive' : 'secondary'
                        }>
                          {booking.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Mentor view: See and manage incoming booking requests
  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Requests
            {pendingBookings.length > 0 && (
              <Badge>{pendingBookings.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBookings ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : pendingBookings.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pending booking requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingBookings.map(booking => (
                <div key={booking.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={booking.founder?.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(booking.founder?.full_name || null)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{booking.founder?.full_name || booking.founder?.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.requested_date), 'EEEE, MMMM d')} at{' '}
                      {booking.requested_start_time.slice(0, 5)}
                    </p>
                    {booking.message && (
                      <p className="text-sm mt-1 text-muted-foreground italic">
                        "{booking.message}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleUpdateStatus(booking, 'declined')}
                      disabled={updateStatus.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleUpdateStatus(booking, 'accepted')}
                      disabled={updateStatus.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmed Bookings */}
      {confirmedBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Confirmed Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {confirmedBookings.map(booking => (
                <div key={booking.id} className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={booking.founder?.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(booking.founder?.full_name || null)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{booking.founder?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(booking.requested_date), 'MMM d')} at {booking.requested_start_time.slice(0, 5)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600">Confirmed</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
