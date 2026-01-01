import { useState, useEffect } from 'react';
import { useMyAvailability, useSetAvailability, MentorAvailability } from '@/hooks/useMentorAvailability';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Clock, Plus, Trash2, Save, Loader2 } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return [
    { value: `${hour}:00`, label: `${hour}:00` },
    { value: `${hour}:30`, label: `${hour}:30` },
  ];
}).flat();

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export function MentorAvailabilitySettings() {
  const { data: savedAvailability, isLoading } = useMyAvailability();
  const setAvailability = useSetAvailability();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize slots from saved data
  useEffect(() => {
    if (savedAvailability) {
      setSlots(savedAvailability.map(s => ({
        id: s.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        is_active: s.is_active,
      })));
      setHasChanges(false);
    }
  }, [savedAvailability]);

  const addSlot = () => {
    const newSlot: AvailabilitySlot = {
      id: `temp-${Date.now()}`,
      day_of_week: 1, // Default to Monday
      start_time: '09:00',
      end_time: '17:00',
      is_active: true,
    };
    setSlots([...slots, newSlot]);
    setHasChanges(true);
  };

  const removeSlot = (id: string) => {
    setSlots(slots.filter(s => s.id !== id));
    setHasChanges(true);
  };

  const updateSlot = (id: string, field: keyof AvailabilitySlot, value: any) => {
    setSlots(slots.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validate slots
    for (const slot of slots) {
      if (slot.start_time >= slot.end_time) {
        toast.error('Start time must be before end time');
        return;
      }
    }

    try {
      await setAvailability.mutateAsync(
        slots.map(s => ({
          mentor_id: '', // Will be set by the mutation
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_active: s.is_active,
        }))
      );
      toast.success('Availability saved successfully');
      setHasChanges(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save availability');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Availability Settings
        </CardTitle>
        <CardDescription>
          Configure your weekly availability for mentor sessions. Founders will be able to book sessions during these time slots.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {slots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No availability configured yet.</p>
            <p className="text-sm">Add time slots to let founders book sessions with you.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {slots.map((slot, index) => (
              <div 
                key={slot.id} 
                className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-2">
                  <Switch
                    checked={slot.is_active}
                    onCheckedChange={(checked) => updateSlot(slot.id, 'is_active', checked)}
                  />
                  <span className="text-sm text-muted-foreground">Active</span>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Label className="sr-only">Day</Label>
                  <Select
                    value={slot.day_of_week.toString()}
                    onValueChange={(value) => updateSlot(slot.id, 'day_of_week', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-28">
                    <Label className="sr-only">Start Time</Label>
                    <Select
                      value={slot.start_time}
                      onValueChange={(value) => updateSlot(slot.id, 'start_time', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map(time => (
                          <SelectItem key={time.value} value={time.value}>
                            {time.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-muted-foreground">to</span>
                  <div className="w-28">
                    <Label className="sr-only">End Time</Label>
                    <Select
                      value={slot.end_time}
                      onValueChange={(value) => updateSlot(slot.id, 'end_time', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map(time => (
                          <SelectItem key={time.value} value={time.value}>
                            {time.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSlot(slot.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button variant="outline" onClick={addSlot}>
            <Plus className="h-4 w-4 mr-2" />
            Add Time Slot
          </Button>
          
          {hasChanges && (
            <Button onClick={handleSave} disabled={setAvailability.isPending}>
              {setAvailability.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
