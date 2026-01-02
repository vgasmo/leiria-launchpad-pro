import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, XCircle, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useWorkspaceAlerts, useResolveAlert, useIgnoreAlert, getSeverityConfig, getRuleTypeLabel, getAlertCTA } from '@/hooks/useWorkspaceAlerts';
import { useAuth } from '@/contexts/AuthContext';

interface WorkspaceAlertsSectionProps {
  workspaceId: string;
}

export function WorkspaceAlertsSection({ workspaceId }: WorkspaceAlertsSectionProps) {
  const { data: alerts, isLoading } = useWorkspaceAlerts(workspaceId);
  const resolveAlert = useResolveAlert();
  const ignoreAlert = useIgnoreAlert();
  const { roles } = useAuth();
  const isStaff = roles?.includes('admin') || roles?.includes('consultor') || roles?.includes('mentor_externo');

  const [isOpen, setIsOpen] = useState(true);

  if (isLoading) {
    return <div className="animate-pulse h-16 bg-muted rounded-lg" />;
  }

  if (!alerts || alerts.length === 0) {
    return null;
  }

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`rounded-lg border p-4 ${criticalCount > 0 ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20' : 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'}`}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${criticalCount > 0 ? 'text-red-500' : 'text-amber-500'}`} />
              <span className="font-medium">
                {alerts.length} Alerta{alerts.length !== 1 ? 's' : ''} Ativo{alerts.length !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-1">
                {criticalCount > 0 && <Badge variant="destructive">{criticalCount} crítico</Badge>}
                {warningCount > 0 && <Badge variant="secondary" className="bg-amber-100 text-amber-800">{warningCount} atenção</Badge>}
              </div>
            </div>
            <Button variant="ghost" size="sm">
              {isOpen ? 'Esconder' : 'Mostrar'}
            </Button>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-3">
          {alerts.map(alert => {
            const severityConfig = getSeverityConfig(alert.severity);
            const cta = getAlertCTA(alert.rule_type, workspaceId);

            return (
              <div key={alert.id} className="flex items-start justify-between gap-3 p-3 bg-background/80 rounded-lg border">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-lg">{severityConfig.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getRuleTypeLabel(alert.rule_type)}
                      </Badge>
                    </div>
                    <p className="text-sm mt-1">{alert.reason}</p>
                    
                    {/* Evidence tooltip */}
                    {alert.evidence_json && Object.keys(alert.evidence_json).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                          <Info className="h-3 w-3" /> Porquê?
                        </summary>
                        <div className="mt-1 text-xs text-muted-foreground bg-muted p-2 rounded">
                          {Object.entries(alert.evidence_json).map(([key, value]) => (
                            <div key={key}>
                              <strong>{key}:</strong> {JSON.stringify(value)}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {cta && (
                    <Button asChild size="sm" variant="default">
                      <Link to={cta.href}>
                        {cta.label}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                  {isStaff && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => resolveAlert.mutate(alert.id)}
                        disabled={resolveAlert.isPending}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => ignoreAlert.mutate(alert.id)}
                        disabled={ignoreAlert.isPending}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default WorkspaceAlertsSection;
