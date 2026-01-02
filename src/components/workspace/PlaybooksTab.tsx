import { useState } from 'react';
import { Play, CheckCircle, X, Target, ListTodo, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlaybooksForStage, useInstantiatePlaybook, useDismissPlaybook, useWorkspacePlaybookInstances, Playbook, PlaybookItem } from '@/hooks/usePlaybooks';
import type { Database } from '@/integrations/supabase/types';

type StartupStage = Database['public']['Enums']['startup_stage'];

interface PlaybooksTabProps {
  workspaceId: string;
  programId?: string;
  currentStage?: StartupStage;
  canWrite?: boolean;
}

export function PlaybooksTab({ workspaceId, currentStage, programId, canWrite }: PlaybooksTabProps) {
  const stage = currentStage || 'ideation';
  const { data: playbooks, isLoading } = usePlaybooksForStage(stage, programId);
  const { data: instances } = useWorkspacePlaybookInstances(workspaceId);
  const instantiate = useInstantiatePlaybook();
  const dismiss = useDismissPlaybook();
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);

  const getInstanceStatus = (playbookId: string) => {
    return instances?.find(i => i.playbook_id === playbookId)?.status;
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

  return (
    <div className="space-y-6">
      {/* Recommended Playbooks */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Playbooks Recomendados para {stage.charAt(0).toUpperCase() + stage.slice(1)}
        </h3>

        {availablePlaybooks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
              <p>Todos os playbooks desta fase já foram aplicados!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {availablePlaybooks.map(playbook => {
              const status = getInstanceStatus(playbook.id);
              const milestones = playbook.items?.filter(i => i.item_type === 'milestone') || [];
              const actions = playbook.items?.filter(i => i.item_type === 'action') || [];

              return (
                <Card key={playbook.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{playbook.title}</CardTitle>
                        <CardDescription>{playbook.description}</CardDescription>
                      </div>
                      {status === 'dismissed' && (
                        <Badge variant="secondary">Descartado</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {milestones.length} milestones
                      </span>
                      <span className="flex items-center gap-1">
                        <ListTodo className="h-4 w-4" />
                        {actions.length} ações
                      </span>
                    </div>

                    {/* Preview items */}
                    {playbook.items && playbook.items.length > 0 && (
                      <div className="mb-4 p-3 rounded-lg bg-muted/50 max-h-40 overflow-y-auto">
                        <p className="text-xs font-medium mb-2">Preview:</p>
                        {playbook.items.slice(0, 5).map((item, idx) => (
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
                            +{playbook.items.length - 5} mais...
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => instantiate.mutate({ workspaceId, playbookId: playbook.id })}
                        disabled={instantiate.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {instantiate.isPending ? 'A criar...' : 'Instanciar'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => dismiss.mutate({ workspaceId, playbookId: playbook.id })}
                        disabled={dismiss.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Already Instantiated */}
      {instantiatedPlaybooks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Playbooks Aplicados
          </h3>
          <div className="space-y-2">
            {instantiatedPlaybooks.map(instance => (
              <div key={instance.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div>
                  <p className="font-medium">{instance.playbook?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Aplicado em {new Date(instance.instantiated_at!).toLocaleDateString('pt-PT')}
                  </p>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Aplicado
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
