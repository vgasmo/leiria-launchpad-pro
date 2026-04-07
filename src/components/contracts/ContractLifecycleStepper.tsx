/**
 * ContractLifecycleStepper — Visual step indicator for contract lifecycle
 * Shows canonical contract states with timestamps from contract_lifecycle_events
 */
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Circle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LifecycleEvent {
  id: string;
  contract_id: string;
  event_type: string;
  event_date: string;
  details: { from_status?: string; to_status?: string } | null;
  performed_by: string | null;
  created_at: string;
}

// Canonical contract lifecycle states (simplified from startup_contracts.status)
const CONTRACT_STATES = [
  'draft',
  'pending_signature',
  'active',
] as const;

const TERMINAL_STATES = ['suspended', 'terminated', 'expired'] as const;

type ContractStatus = typeof CONTRACT_STATES[number] | typeof TERMINAL_STATES[number];

const STATE_ORDER: Record<string, number> = {
  draft: 0,
  pending_signature: 1,
  active: 2,
};

interface ContractLifecycleStepperProps {
  contractId: string;
  currentStatus: string;
  startDate?: string;
  signedAt?: string | null;
  createdAt?: string;
}

export function ContractLifecycleStepper({
  contractId,
  currentStatus,
  startDate,
  signedAt,
  createdAt,
}: ContractLifecycleStepperProps) {
  const { t } = useTranslation();

  // Fetch lifecycle events for this contract
  const { data: events, isLoading } = useQuery({
    queryKey: ['contract-lifecycle-events', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_lifecycle_events')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as LifecycleEvent[];
    },
    enabled: !!contractId,
  });

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  // Build timestamp map from events
  const statusTimestamps: Record<string, string> = {};
  
  // Use createdAt as draft timestamp
  if (createdAt) statusTimestamps['draft'] = createdAt;
  if (signedAt) statusTimestamps['active'] = signedAt;
  
  // Extract timestamps from lifecycle events
  events?.forEach(event => {
    if (event.event_type === 'status_change' && event.details?.to_status) {
      statusTimestamps[event.details.to_status] = event.created_at || event.event_date;
    }
  });

  const currentOrder = STATE_ORDER[currentStatus] ?? -1;
  const isTerminal = (TERMINAL_STATES as readonly string[]).includes(currentStatus);

  return (
    <div className="space-y-3">
      {/* Main flow */}
      <div className="flex items-center gap-0">
        {CONTRACT_STATES.map((state, idx) => {
          const order = STATE_ORDER[state];
          const isPast = order < currentOrder && !isTerminal;
          const isCurrent = state === currentStatus;
          const isFuture = order > currentOrder || (isTerminal && state !== currentStatus);
          const timestamp = statusTimestamps[state];

          return (
            <div key={state} className="flex items-center flex-1 min-w-0">
              {/* Step */}
              <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all',
                    isPast && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'bg-primary/10 border-primary text-primary ring-2 ring-primary/20',
                    isFuture && 'bg-muted border-muted-foreground/20 text-muted-foreground',
                  )}
                >
                  {isPast ? (
                    <Check className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Circle className="h-3 w-3 fill-primary" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium text-center truncate max-w-full px-1',
                    isCurrent && 'text-primary font-semibold',
                    isFuture && 'text-muted-foreground',
                    isPast && 'text-foreground',
                  )}
                >
                  {t(`lifecycle.stepper.${state}`)}
                </span>
                {timestamp && (
                  <span className="text-[9px] text-muted-foreground">
                    {format(new Date(timestamp), 'dd/MM/yy')}
                  </span>
                )}
              </div>

              {/* Connector */}
              {idx < CONTRACT_STATES.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-6 shrink-0 -mx-1',
                    order < currentOrder && !isTerminal
                      ? 'bg-primary'
                      : 'bg-muted-foreground/20',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Terminal state indicator */}
      {isTerminal && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
          currentStatus === 'terminated' && 'bg-destructive/10 text-destructive',
          currentStatus === 'suspended' && 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
          currentStatus === 'expired' && 'bg-muted text-muted-foreground',
        )}>
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">{t(`lifecycle.stepper.${currentStatus}`)}</span>
          {statusTimestamps[currentStatus] && (
            <span className="ml-auto opacity-70">
              {format(new Date(statusTimestamps[currentStatus]), 'dd/MM/yyyy')}
            </span>
          )}
        </div>
      )}

      {/* Event history (compact) */}
      {events && events.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground text-[11px]">
            {t('lifecycle.stepper.eventHistory')} ({events.length})
          </summary>
          <div className="mt-2 space-y-1 pl-2 border-l-2 border-muted ml-1">
            {events.map(event => (
              <div key={event.id} className="flex items-center gap-2 py-0.5">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{format(new Date(event.created_at), 'dd/MM/yy HH:mm')}</span>
                {event.details?.from_status && event.details?.to_status && (
                  <span className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {t(`admin.backoffice.contractStatus.${event.details.from_status}`, { defaultValue: event.details.from_status })}
                    </Badge>
                    <ArrowRight className="h-3 w-3" />
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {t(`admin.backoffice.contractStatus.${event.details.to_status}`, { defaultValue: event.details.to_status })}
                    </Badge>
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
