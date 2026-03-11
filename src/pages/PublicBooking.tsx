import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

interface BookingToken {
  id: string;
  program_id: string | null;
  consultant_id: string | null;
  program_name: string | null;
  consultant_name: string | null;
  expires_at: string | null;
}

export default function PublicBooking() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState<'loading' | 'slots' | 'form' | 'success' | 'error'>('loading');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    message: '',
  });

  // Validate token
  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useQuery({
    queryKey: ['booking-token', token],
    queryFn: async (): Promise<BookingToken | null> => {
      if (!token) return null;
      
      const { data, error } = await supabase.functions.invoke('public-get-availability', {
        body: { token, action: 'validate' },
      });
      
      if (error) throw error;
      if (!data?.valid) throw new Error('Invalid or expired booking link');
      
      return data.tokenData as BookingToken;
    },
    retry: false,
  });

  // Fetch available slots
  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ['public-slots', token],
    queryFn: async (): Promise<TimeSlot[]> => {
      if (!token) return [];
      
      const { data, error } = await supabase.functions.invoke('public-get-availability', {
        body: { token, action: 'get_slots' },
      });
      
      if (error) throw error;
      return data?.slots || [];
    },
    enabled: !!tokenData,
  });

  // Book mutation
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!token || !selectedSlot) throw new Error('Missing data');
      
      const { data, error } = await supabase.functions.invoke('public-book-first-contact', {
        body: {
          token,
          slot: selectedSlot,
          contact: formData,
        },
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Booking failed');
      
      return data;
    },
    onSuccess: () => {
      setStep('success');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  useEffect(() => {
    if (tokenError) {
      setStep('error');
    } else if (tokenData && !slotsLoading) {
      setStep('slots');
    }
  }, [tokenData, tokenError, slotsLoading]);

  // Group slots by date, filtering out days with no available slots
  const slotsByDate = slots?.reduce((acc, slot) => {
    if (!slot.available) return acc;
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>) || {};

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error(t('publicBooking.fillRequired', { defaultValue: 'Please fill in your name and email' }));
      return;
    }
    bookMutation.mutate();
  };

  if (step === 'loading' || tokenLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">{t('publicBooking.invalidLink')}</h1>
            <p className="text-muted-foreground">
              {t('publicBooking.invalidLinkDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">{t('publicBooking.bookingConfirmed')}</h1>
            <p className="text-muted-foreground">
              {t('publicBooking.bookingConfirmedDesc')}
            </p>
            {selectedSlot && (
              <div className="bg-muted rounded-lg p-4 mt-4">
                <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedSlot.date), 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-foreground mt-1">
                  <Clock className="h-4 w-4" />
                  {selectedSlot.time}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <Building2 className="h-10 w-10 mx-auto text-primary mb-2" />
          <h1 className="text-2xl font-bold text-foreground">{t('publicBooking.bookFirstMeeting')}</h1>
          {tokenData?.program_name && (
            <p className="text-muted-foreground mt-1">{tokenData.program_name}</p>
          )}
        </div>

        {step === 'slots' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">{t('publicBooking.selectTime')}</CardTitle>
              <CardDescription>{t('publicBooking.selectTimeDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(slotsByDate).length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {t('publicBooking.noSlotsAvailable')}
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(slotsByDate).slice(0, 5).map(([date, daySlots]) => (
                    <div key={date}>
                      <h3 className="font-medium mb-2 text-foreground">
                        {format(new Date(date), 'EEEE, MMMM d')}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {daySlots.map((slot) => (
                          <Button
                            key={`${slot.date}-${slot.time}`}
                            variant={selectedSlot?.date === slot.date && selectedSlot?.time === slot.time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedSlot && (
                <Button 
                  className="w-full mt-6" 
                  onClick={() => setStep('form')}
                >
                  {t('common.continue', { defaultValue: 'Continue' })}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {step === 'form' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">{t('publicBooking.yourDetails')}</CardTitle>
              <CardDescription>
                {selectedSlot && (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedSlot.date), 'MMMM d')} at {selectedSlot.time}
                    <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setStep('slots')}>
                      {t('publicBooking.change')}
                    </Button>
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('publicBooking.fullName')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('login.fullNamePlaceholder', { defaultValue: 'Your name' })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('common.email', { defaultValue: 'Email' })} *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('common.phone', { defaultValue: 'Phone' })}</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+351 900 000 000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization">{t('publicBooking.organization')}</Label>
                    <Input
                      id="organization"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      placeholder={t('publicBooking.organizationPlaceholder')}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">{t('publicBooking.whatToDiscuss')}</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t('publicBooking.discussPlaceholder')}
                    rows={3}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={bookMutation.isPending}
                >
                  {bookMutation.isPending ? t('publicBooking.booking') : t('publicBooking.confirmBooking')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
