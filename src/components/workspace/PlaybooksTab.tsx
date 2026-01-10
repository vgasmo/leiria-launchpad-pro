import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Play, CheckCircle, X, Target, ListTodo, Clock, TrendingUp, Rocket, Sparkles, ArrowRight, MessageSquarePlus, Settings, Users, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePlaybooksForStage, useInstantiatePlaybook, useDismissPlaybook, useWorkspacePlaybookInstances, Playbook, PlaybookItem } from '@/hooks/usePlaybooks';
import { usePlaybookProgress } from '@/hooks/usePlaybookProgress';
import { RequestPlaybookDialog } from '@/components/workspace/RequestPlaybookDialog';
import { formatShortDate } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type StartupStage = Database['public']['Enums']['startup_stage'];

interface PlaybooksTabProps {
  workspaceId: string;
  programId?: string;
  currentStage?: StartupStage;
  canWrite?: boolean;
}

export function PlaybooksTab({ workspaceId, currentStage, programId, canWrite }: PlaybooksTabProps) {
  const { t } = useTranslation();
  const [, setSearchParams] = useSearchParams();
  const { isConsultor, isAdmin } = useAuth();
  const isStaff = isConsultor || isAdmin;
  
  const stage = currentStage || 'ideation';
  const { data: playbooks, isLoading } = usePlaybooksForStage(stage, programId);
  const { data: instances } = useWorkspacePlaybookInstances(workspaceId);
  const { data: progress } = usePlaybookProgress(workspaceId);
  const instantiate = useInstantiatePlaybook();
  const dismiss = useDismissPlaybook();

  const getInstanceStatus = (playbookId: string) => {
    return instances?.find(i => i.playbook_id === playbookId)?.status;
  };

  // Get stage display name with i18n
  const getStageLabel = (stageKey: string) => {
    return t(`playbooks.stages.${stageKey}`, stageKey.charAt(0).toUpperCase() + stageKey.slice(1));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  const availablePlaybooks = playbooks?.filter(p => getInstanceStatus(p.id) !== 'instantiated') || [];
  const instantiatedPlaybooks = instances?.filter(i => i.status === 'instantiated') || [];

  // Extract KPI hints from playbook items metadata
  const getKpiHints = (items: PlaybookItem[] | undefined) => {
    if (!items) return [];
    const kpis = new Set<string>();
    items.forEach(item => {
      const meta = item.metadata_json as Record<string, unknown>;
      if (meta?.kpi_names) {
        (meta.kpi_names as string[]).forEach(k => kpis.add(k));
      }
      if (meta?.kpi_categories) {
        (meta.kpi_categories as string[]).forEach(k => kpis.add(`${t('playbooks.category')}: ${k}`));
      }
    });
    return Array.from(kpis);
  };

  // No playbooks available at all - show appropriate empty state
  if (!playbooks?.length && !instantiatedPlaybooks.length) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Rocket}
          title={isStaff ? t('playbooks.staff.emptyTitle') : t('playbooks.emptyTitle')}
          description={isStaff ? t('playbooks.staff.emptyDescription') : t('playbooks.emptyDescription')}
          value={isStaff ? t('playbooks.staff.emptyValue') : t('playbooks.emptyValue')}
        />
        {canWrite && !isStaff && (
          <div className="flex justify-center">
            <RequestPlaybookDialog workspaceId={workspaceId} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role-based intro card */}
      {isStaff ? (
        // Staff/Consultant view - Management focused
        <Card className="bg-gradient-to-r from-accent/5 to-primary/5 border-accent/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full p-2 bg-accent/10">
                <Settings className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  {t('playbooks.staff.introTitle')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('playbooks.staff.introDescription')}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  {availablePlaybooks.length} {t('playbooks.staff.available')}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {instantiatedPlaybooks.length} {t('playbooks.staff.deployed')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Founder view - Benefit/value focused
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full p-2 bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {t('playbooks.introTitle')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('playbooks.introDescription')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available/Recommended Playbooks */}
      {availablePlaybooks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {isStaff 
              ? t('playbooks.staff.availableFor', { stage: getStageLabel(stage) })
              : t('playbooks.recommended', { stage: getStageLabel(stage) })
            }
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            {availablePlaybooks.map(playbook => {
              const status = getInstanceStatus(playbook.id);
              const milestones = playbook.items?.filter(i => i.item_type === 'milestone') || [];
              const actions = playbook.items?.filter(i => i.item_type === 'action') || [];
              const kpiHints = getKpiHints(playbook.items);

              return (
                <Card key={playbook.id} className="hover:shadow-md transition-shadow group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {playbook.title}
                        </CardTitle>
                        <CardDescription>{playbook.description}</CardDescription>
                      </div>
                      {status === 'dismissed' && (
                        <Badge variant="secondary">{t('playbooks.dismissed')}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {t('playbooks.milestonesCount', { count: milestones.length })}
                      </span>
                      <span className="flex items-center gap-1">
                        <ListTodo className="h-4 w-4" />
                        {t('playbooks.actionsCount', { count: actions.length })}
                      </span>
                    </div>

                    {/* KPI Connections - show value */}
                    {kpiHints.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        <TrendingUp className="h-3 w-3 text-primary mt-0.5" />
                        {kpiHints.slice(0, 4).map((kpi, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs py-0">
                            {kpi}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Preview items */}
                    {playbook.items && playbook.items.length > 0 && (
                      <div className="mb-4 p-3 rounded-lg bg-muted/50 max-h-40 overflow-y-auto">
                        <p className="text-xs font-medium mb-2">{t('playbooks.preview')}:</p>
                        {playbook.items.slice(0, 5).map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-xs py-1">
                            {item.item_type === 'milestone' ? (
                              <Target className="h-3 w-3 text-primary" />
                            ) : (
                              <ListTodo className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className="truncate">{item.title}</span>
                            {item.relative_due_days && (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                +{item.relative_due_days}d
                              </span>
                            )}
                          </div>
                        ))}
                        {playbook.items.length > 5 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('playbooks.moreItems', { count: playbook.items.length - 5 })}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => instantiate.mutate({ workspaceId, playbookId: playbook.id })}
                        disabled={instantiate.isPending || !canWrite}
                      >
                        <Play className="h-4 w-4" />
                        {instantiate.isPending 
                          ? t('common.creating') 
                          : isStaff 
                            ? t('playbooks.staff.deploy') 
                            : t('playbooks.activate')
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => dismiss.mutate({ workspaceId, playbookId: playbook.id })}
                        disabled={dismiss.isPending || !canWrite}
                        title={t('playbooks.dismiss')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All applied - Role-specific success state */}
      {availablePlaybooks.length === 0 && instantiatedPlaybooks.length > 0 && (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="py-6">
            <div className="text-center mb-6">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
              <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1">
                {isStaff ? t('playbooks.staff.allDeployedTitle') : t('playbooks.allAppliedTitle')}
              </h3>
              <p className="text-sm text-green-600 dark:text-green-500">
                {isStaff ? t('playbooks.staff.allDeployedDescription') : t('playbooks.allAppliedDescription')}
              </p>
            </div>

            {/* Next actions - keep momentum */}
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setSearchParams({ tab: 'milestones' })}
              >
                <Target className="h-4 w-4" />
                {t('playbooks.reviewMilestones')}
              </Button>
              <Button 
                variant="outline"
                className="gap-2"
                onClick={() => setSearchParams({ tab: 'actions' })}
              >
                <ListTodo className="h-4 w-4" />
                {t('playbooks.continueActions')}
                <ArrowRight className="h-3 w-3" />
              </Button>
              {canWrite && !isStaff && (
                <RequestPlaybookDialog 
                  workspaceId={workspaceId}
                  trigger={
                    <Button variant="ghost" className="gap-2">
                      <MessageSquarePlus className="h-4 w-4" />
                      {t('playbooks.requestAdvanced')}
                    </Button>
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Already Instantiated/Deployed */}
      {instantiatedPlaybooks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {isStaff ? t('playbooks.staff.deployed') : t('playbooks.applied')}
          </h3>
          <div className="space-y-2">
            {instantiatedPlaybooks.map(instance => (
              <div 
                key={instance.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
              >
                <div>
                  <p className="font-medium">{instance.playbook?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {isStaff 
                      ? t('playbooks.staff.deployedOn', { date: formatShortDate(instance.instantiated_at) })
                      : t('playbooks.appliedOn', { date: formatShortDate(instance.instantiated_at) })
                    }
                  </p>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-600 gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {isStaff ? t('playbooks.staff.deployedBadge') : t('playbooks.appliedBadge')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
