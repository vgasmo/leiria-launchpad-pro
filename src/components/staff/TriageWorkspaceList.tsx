import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChaseActionsButton } from './ChaseActionsButton';
import { Calendar, MessageSquare, ExternalLink, AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { HealthScore } from '@/types/database';

interface WorkspaceWithDetails {
  id: string;
  startup_id: string;
  program_id: string | null;
  stage: string;
  health_score: number | null;
  health_label: HealthScore | null;
  created_at: string;
  updated_at: string;
  startup?: {
    name: string;
    logo_url?: string | null;
  };
  program?: {
    name: string;
  } | null;
  overdue_actions_count?: number;
  last_session_date?: string | null;
  next_session_date?: string | null;
  top_overdue_action?: string | null;
  missing_kpis_count?: number;
}

interface TriageWorkspaceListProps {
  workspaces: WorkspaceWithDetails[];
  onScheduleSession?: (workspaceId: string) => void;
  onMessage?: (workspaceId: string) => void;
}

type QuickFilter = 'all' | 'no_activity_14d' | 'missing_kpis' | 'overdue_actions' | 'at_risk';

export function TriageWorkspaceList({ 
  workspaces, 
  onScheduleSession,
  onMessage 
}: TriageWorkspaceListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [triageMode, setTriageMode] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  const calculateUrgencyScore = (workspace: WorkspaceWithDetails): number => {
    let score = 0;
    
    // Overdue actions (weight: 3)
    score += (workspace.overdue_actions_count || 0) * 3;
    
    // Days since last session (weight: 2)
    if (workspace.last_session_date) {
      const daysSince = differenceInDays(new Date(), new Date(workspace.last_session_date));
      score += Math.min(daysSince, 30) * 2;
    } else {
      score += 60; // No session ever = high urgency
    }
    
    // Missing KPIs (weight: 2)
    score += (workspace.missing_kpis_count || 0) * 2;
    
    // Health state (weight: 5)
    const healthLabel = workspace.health_label?.toLowerCase();
    if (healthLabel === 'critical') score += 25;
    else if (healthLabel === 'at_risk' || healthLabel === 'at risk') score += 15;
    else if (healthLabel === 'needs_attention' || healthLabel === 'needs attention') score += 8;
    
    return score;
  };

  const filteredAndSortedWorkspaces = useMemo(() => {
    let filtered = [...workspaces];
    
    // Apply quick filters
    switch (quickFilter) {
      case 'no_activity_14d':
        filtered = filtered.filter(w => {
          if (!w.last_session_date) return true;
          return differenceInDays(new Date(), new Date(w.last_session_date)) >= 14;
        });
        break;
      case 'missing_kpis':
        filtered = filtered.filter(w => (w.missing_kpis_count || 0) > 0);
        break;
      case 'overdue_actions':
        filtered = filtered.filter(w => (w.overdue_actions_count || 0) > 0);
        break;
      case 'at_risk':
        filtered = filtered.filter(w => {
          const label = w.health_label?.toLowerCase();
          return label === 'critical' || label === 'at_risk' || label === 'at risk';
        });
        break;
    }
    
    // Sort by urgency if triage mode is on
    if (triageMode) {
      filtered.sort((a, b) => calculateUrgencyScore(b) - calculateUrgencyScore(a));
    }
    
    return filtered;
  }, [workspaces, triageMode, quickFilter]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM');
  };

  const getDaysSinceSession = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return differenceInDays(new Date(), new Date(dateStr));
  };

  const filters: { key: QuickFilter; label: string; icon?: React.ReactNode }[] = [
    { key: 'all', label: t('triage.filters.all', 'All') },
    { key: 'no_activity_14d', label: t('triage.filters.noActivity', 'No activity 14d'), icon: <Clock className="h-3 w-3" /> },
    { key: 'missing_kpis', label: t('triage.filters.missingKpis', 'Missing KPIs'), icon: <TrendingDown className="h-3 w-3" /> },
    { key: 'overdue_actions', label: t('triage.filters.overdueActions', 'Overdue actions'), icon: <AlertTriangle className="h-3 w-3" /> },
    { key: 'at_risk', label: t('triage.filters.atRisk', 'At risk'), icon: <AlertTriangle className="h-3 w-3" /> },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-lg">{t('triage.title', 'Workspace Triage')}</CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              id="triage-mode"
              checked={triageMode}
              onCheckedChange={setTriageMode}
            />
            <Label htmlFor="triage-mode" className="text-sm cursor-pointer">
              {t('triage.triageMode', 'Triage Mode')}
            </Label>
          </div>
        </div>
        
        {/* Quick filters */}
        <div className="flex flex-wrap gap-2 pt-3">
          {filters.map((filter) => (
            <Badge
              key={filter.key}
              variant={quickFilter === filter.key ? 'default' : 'outline'}
              className={cn(
                "cursor-pointer transition-colors",
                quickFilter === filter.key && "bg-primary"
              )}
              onClick={() => setQuickFilter(filter.key)}
            >
              {filter.icon}
              <span className={filter.icon ? "ml-1" : ""}>{filter.label}</span>
            </Badge>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {filteredAndSortedWorkspaces.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('triage.noWorkspaces', 'No workspaces match the current filter')}
          </p>
        ) : (
          filteredAndSortedWorkspaces.map((workspace) => {
            const daysSince = getDaysSinceSession(workspace.last_session_date);
            const urgencyScore = triageMode ? calculateUrgencyScore(workspace) : null;
            
            return (
              <div
                key={workspace.id}
                className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                {/* Urgency indicator */}
                {triageMode && urgencyScore !== null && (
                  <div className={cn(
                    "w-2 h-10 rounded-full",
                    urgencyScore >= 50 ? "bg-destructive" :
                    urgencyScore >= 30 ? "bg-warning" :
                    urgencyScore >= 15 ? "bg-yellow-500" :
                    "bg-green-500"
                  )} />
                )}
                
                {/* Startup info */}
                <div className="flex-1 min-w-[150px]">
                  <p className="font-medium text-sm">{workspace.startup?.name || 'Unknown'}</p>
                  {workspace.program?.name && (
                    <p className="text-xs text-muted-foreground">{workspace.program.name}</p>
                  )}
                </div>
                
                {/* Health badge */}
                <Badge 
                  variant={
                    workspace.health_label === 'critical' ? 'destructive' :
                    workspace.health_label === 'at_risk' ? 'outline' :
                    'secondary'
                  }
                  className="text-xs"
                >
                  {workspace.health_label || 'N/A'}
                </Badge>
                
                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {(workspace.overdue_actions_count || 0) > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      {workspace.overdue_actions_count} {t('triage.overdue', 'overdue')}
                    </span>
                  )}
                  
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {daysSince !== null ? `${daysSince}d` : '-'}
                  </span>
                </div>
                
                {/* Top overdue action */}
                {workspace.top_overdue_action && (
                  <p className="w-full text-xs text-muted-foreground truncate pl-3 border-l-2 border-destructive/30">
                    {workspace.top_overdue_action}
                  </p>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/workspace/${workspace.id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  
                  {onMessage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMessage(workspace.id)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {onScheduleSession && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onScheduleSession(workspace.id)}
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <ChaseActionsButton
                    workspaceId={workspace.id}
                    startupName={workspace.startup?.name || 'Startup'}
                    overdueCount={workspace.overdue_actions_count || 0}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
