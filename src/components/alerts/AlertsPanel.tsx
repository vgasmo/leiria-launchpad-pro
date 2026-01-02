import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllActiveAlerts, useResolveAlert, useIgnoreAlert, useRecomputeAlerts, getSeverityConfig, getRuleTypeLabel, getAlertCTA, type AlertWithWorkspace } from '@/hooks/useWorkspaceAlerts';
import { useAuth } from '@/contexts/AuthContext';

export function AlertsPanel() {
  const { data: alerts, isLoading } = useAllActiveAlerts();
  const resolveAlert = useResolveAlert();
  const ignoreAlert = useIgnoreAlert();
  const recomputeAlerts = useRecomputeAlerts();
  const { roles } = useAuth();
  const isStaff = roles?.includes('admin') || roles?.includes('consultor');

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const filteredAlerts = (alerts || []).filter(alert => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && alert.rule_type !== typeFilter) return false;
    return true;
  });

  const severityCounts = {
    critical: alerts?.filter(a => a.severity === 'critical').length || 0,
    warning: alerts?.filter(a => a.severity === 'warning').length || 0,
    info: alerts?.filter(a => a.severity === 'info').length || 0,
  };

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedAlerts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedAlerts(newSet);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Alertas</CardTitle></CardHeader>
        <CardContent><div className="animate-pulse h-20 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Alertas Ativos
          {alerts && alerts.length > 0 && (
            <Badge variant="secondary">{alerts.length}</Badge>
          )}
        </CardTitle>
        {isStaff && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => recomputeAlerts.mutate()}
            disabled={recomputeAlerts.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${recomputeAlerts.isPending ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Severity Summary */}
        <div className="flex gap-2 flex-wrap">
          {severityCounts.critical > 0 && (
            <Badge variant="destructive" className="gap-1">
              🔴 {severityCounts.critical} críticos
            </Badge>
          )}
          {severityCounts.warning > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
              🟠 {severityCounts.warning} atenção
            </Badge>
          )}
          {severityCounts.info > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 gap-1">
              🔵 {severityCounts.info} info
            </Badge>
          )}
        </div>

        {/* Filters */}
        {(alerts?.length || 0) > 3 && (
          <div className="flex gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="warning">Atenção</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="no_session_days">Sem sessão</SelectItem>
                <SelectItem value="overdue_actions_count">Ações atrasadas</SelectItem>
                <SelectItem value="missing_kpis_current_month">KPIs em falta</SelectItem>
                <SelectItem value="checkin_overdue_days">Check-in atrasado</SelectItem>
                <SelectItem value="milestone_overdue_count">Milestones atrasados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Alert List */}
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>Nenhum alerta ativo</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {filteredAlerts.map(alert => (
              <AlertItem
                key={alert.id}
                alert={alert}
                isExpanded={expandedAlerts.has(alert.id)}
                onToggle={() => toggleExpanded(alert.id)}
                onResolve={() => resolveAlert.mutate(alert.id)}
                onIgnore={() => ignoreAlert.mutate(alert.id)}
                isStaff={isStaff}
                isLoading={resolveAlert.isPending || ignoreAlert.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AlertItemProps {
  alert: AlertWithWorkspace;
  isExpanded: boolean;
  onToggle: () => void;
  onResolve: () => void;
  onIgnore: () => void;
  isStaff: boolean;
  isLoading: boolean;
}

function AlertItem({ alert, isExpanded, onToggle, onResolve, onIgnore, isStaff, isLoading }: AlertItemProps) {
  const severityConfig = getSeverityConfig(alert.severity);
  const cta = getAlertCTA(alert.rule_type, alert.workspace_id);
  const startupName = alert.workspace?.startup?.name || 'Startup';

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={`border rounded-lg p-3 ${alert.severity === 'critical' ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20' : ''}`}>
        <CollapsibleTrigger asChild>
          <div className="flex items-start justify-between cursor-pointer">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-lg">{severityConfig.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link 
                    to={`/workspace/${alert.workspace_id}`}
                    className="font-medium text-sm hover:underline truncate"
                    onClick={e => e.stopPropagation()}
                  >
                    {startupName}
                  </Link>
                  <Badge variant="outline" className="text-xs">
                    {getRuleTypeLabel(alert.rule_type)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{alert.reason}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="ml-2">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3 mt-3 border-t">
          {/* Evidence */}
          {alert.evidence_json && Object.keys(alert.evidence_json).length > 0 && (
            <div className="text-xs text-muted-foreground mb-3 bg-muted/50 p-2 rounded">
              <strong>Detalhes:</strong>
              <pre className="mt-1 whitespace-pre-wrap">
                {JSON.stringify(alert.evidence_json, null, 2)}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
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
                  onClick={onResolve}
                  disabled={isLoading}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resolver
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={onIgnore}
                  disabled={isLoading}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Ignorar
                </Button>
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default AlertsPanel;
