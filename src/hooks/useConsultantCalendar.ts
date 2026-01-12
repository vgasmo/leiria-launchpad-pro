import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface FreeBusyResult {
  slots: TimeSlot[];
  consultantEmail?: string;
  consultantName?: string;
  warning?: string;
  success?: boolean;
  reason?: string;
}

/**
 * Hook to check consultant's calendar availability via Graph API integration
 */
export function useConsultantAvailability(
  workspaceId: string | undefined,
  date: string | undefined
) {
  return useQuery({
    queryKey: ['consultant-availability', workspaceId, date],
    queryFn: async (): Promise<FreeBusyResult | null> => {
      if (!workspaceId || !date) return null;

      console.log('[useConsultantAvailability] Checking availability for', { workspaceId, date });

      // Always ask backend; it will gracefully degrade (and can return warnings/reasons)
      const { data, error } = await supabase.functions.invoke('check-consultant-availability', {
        body: { workspaceId, date },
      });

      if (error) {
        console.error('[useConsultantAvailability] Failed to check availability:', error);
        return null;
      }

      console.log('[useConsultantAvailability] Got availability result:', data);
      return data;
    },
    enabled: !!workspaceId && !!date,
    staleTime: 30000, // 30 seconds (was 1 minute)
    gcTime: 60000, // garbage collect after 1 minute
    retry: 1,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to validate a specific time slot is available
 */
export function useValidateBookingSlot() {
  return useMutation({
    mutationFn: async ({
      workspaceId,
      startTime,
      endTime,
    }: {
      workspaceId: string;
      startTime: string;
      endTime: string;
    }): Promise<{ available: boolean; checked: boolean; conflict?: string; reason?: string }> => {
      const { data, error } = await supabase.functions.invoke('validate-booking-slot', {
        body: { workspaceId, startTime, endTime },
      });

      if (error) {
        console.error('Validation error:', error);
        // Fail open (checked=false) so UI may warn but not block in case of temporary issues
        return { available: true, checked: false, reason: 'validation_error' };
      }

      return data;
    },
  });
}

/**
 * Generate available time slots for a given date based on working hours
 */
export function generateTimeSlots(date: string, durationMinutes: number = 60): string[] {
  const slots: string[] = [];
  const workStart = 9; // 9 AM
  const workEnd = 18; // 6 PM
  
  for (let hour = workStart; hour < workEnd; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      // Check if slot + duration fits within working hours
      const slotEndHour = hour + Math.floor((minute + durationMinutes) / 60);
      const slotEndMinute = (minute + durationMinutes) % 60;
      
      if (slotEndHour < workEnd || (slotEndHour === workEnd && slotEndMinute === 0)) {
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(`${date}T${slotTime}`);
      }
    }
  }
  
  return slots;
}
