import { useState } from 'react';
import { AlertTriangle, Bell, BellOff, Check, Clock, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useHealthAlerts, useAcknowledgeAlert, useSnoozeAlert, HealthAlert } from '@/hooks/useHealthHistory';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HealthAlertsCardProps {
  workspaceId: string;
  canManage?: boolean;
  className?: string;
}

export function HealthAlertsCard({ workspaceId, canManage = false, className }: HealthAlertsCardProps) {
  const { data: alerts, isLoading } = useHealthAlerts(workspaceId);
  const acknowledgeAlert = useAcknowledgeAlert();
  const snoozeAlert = useSnoozeAlert();

  const activeAlerts = alerts?.filter(a => a.status === 'active') || [];
  const recentAlerts = alerts?.slice(0, 5) || [];

  const handleAcknowledge = async (alert: HealthAlert) => {
    try {
      await acknowledgeAlert.mutateAsync({ alertId: alert.id, workspaceId });
      toast.success('Alerta reconhecido');
    } catch (error) {
      toast.error('Erro ao reconhecer alerta');
    }
  };

  const handleSnooze = async (alert: HealthAlert, days: number) => {
    try {
      await snoozeAlert.mutateAsync({ alertId: alert.id, workspaceId, days });
      toast.success(`Alerta silenciado por ${days} dias`);
    } catch (error) {
      toast.error('Erro ao silenciar alerta');
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Alertas de Saúde</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getAlertIcon = (alert: HealthAlert) => {
    if (alert.status === 'snoozed') return <BellOff className="h-4 w-4 text-muted-foreground" />;
    if (alert.status === 'acknowledged') return <Check className="h-4 w-4 text-green-600" />;
    if (alert.status === 'resolved') return <Check className="h-4 w-4 text-muted-foreground" />;
    if (alert.severity === 'critical') return <AlertTriangle className="h-4 w-4 text-destructive" />;
    return <Bell className="h-4 w-4 text-amber-500" />;
  };

  const getAlertStyles = (alert: HealthAlert) => {
    if (alert.status !== 'active') return 'bg-muted/50 opacity-60';
    if (alert.severity === 'critical') return 'bg-red-50 border-red-200';
    return 'bg-amber-50 border-amber-200';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Alertas de Saúde
          </CardTitle>
          {activeAlerts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {activeAlerts.length} ativo{activeAlerts.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recentAlerts.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Sem alertas recentes
          </div>
        ) : (
          <div className="space-y-2">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  getAlertStyles(alert)
                )}
              >
                {getAlertIcon(alert)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.reason}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: pt })}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {alert.status}
                    </Badge>
                  </div>
                </div>
                {canManage && alert.status === 'active' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Clock className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAcknowledge(alert)}>
                        <Check className="h-4 w-4 mr-2" />
                        Reconhecer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSnooze(alert, 1)}>
                        <BellOff className="h-4 w-4 mr-2" />
                        Silenciar 1 dia
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSnooze(alert, 7)}>
                        <BellOff className="h-4 w-4 mr-2" />
                        Silenciar 7 dias
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
