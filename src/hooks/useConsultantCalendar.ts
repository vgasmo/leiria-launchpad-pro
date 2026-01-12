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

      // Check if Graph API is configured for this workspace
      const { data: settings } = await supabase
        .from('outlook_calendar_settings')
        .select('enabled, graph_client_id, calendar_user_email')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (!settings?.enabled || !settings.graph_client_id) {
        // No calendar integration - return null, booking will proceed without validation
        return null;
      }

      // Call the free/busy check edge function
      const { data, error } = await supabase.functions.invoke('check-consultant-availability', {
        body: { workspaceId, date }
      });

      if (error) {
        console.error('Failed to check availability:', error);
        return null;
      }

      return data;
    },
    enabled: !!workspaceId && !!date,
    staleTime: 60000, // 1 minute
    retry: false,
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
      endTime 
    }: { 
      workspaceId: string; 
      startTime: string; 
      endTime: string;
    }): Promise<{ available: boolean; conflict?: string }> => {
      const { data, error } = await supabase.functions.invoke('validate-booking-slot', {
        body: { workspaceId, startTime, endTime }
      });

      if (error) {
        console.error('Validation error:', error);
        // If validation fails, allow booking with warning
        return { available: true };
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
