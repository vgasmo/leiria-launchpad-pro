import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';

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
 * @param durationMinutes - optional duration filter (sent to backend for correctness)
 */
export function useConsultantAvailability(
  workspaceId: string | undefined,
  date: string | undefined,
  durationMinutes?: number
) {
  return useQuery({
    queryKey: ['consultant-availability', workspaceId, date, durationMinutes],
    queryFn: async (): Promise<FreeBusyResult | null> => {
      if (!workspaceId || !date) return null;

      // Always ask backend; it will gracefully degrade (and can return warnings/reasons)
      const { data, error } = await supabase.functions.invoke('check-consultant-availability', {
        body: { workspaceId, date, durationMinutes },
      });

      if (error) {
        logger.error('[useConsultantAvailability] Failed to check availability', {}, error);
        return null;
      }

      return data;
    },
    enabled: !!workspaceId && !!date,
    staleTime: 30000,
    gcTime: 60000,
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
        logger.error('Validation error', {}, error);
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
