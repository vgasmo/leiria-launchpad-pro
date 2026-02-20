import { useMemo } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Rocket, Flag, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStageHistory, useMilestoneHistory } from '@/hooks/useProgressHistory';
import { cn } from '@/lib/utils';

interface ProgressTimelineProps {
  workspaceId: string;
  className?: string;
}

const stageColors: Record<string, string> = {
  ideation: 'bg-purple-500/10 text-purple-600 border-purple-300',
  validation: 'bg-blue-500/10 text-blue-600 border-blue-300',
  mvp: 'bg-cyan-500/10 text-cyan-600 border-cyan-300',
  growth: 'bg-green-500/10 text-green-600 border-green-300',
  scale: 'bg-amber-500/10 text-amber-600 border-amber-300',
};

export function ProgressTimeline({ workspaceId, className }: ProgressTimelineProps) {
  const { t, i18n } = useTranslation();
  const { data: stageHistory, isLoading: stageLoading } = useStageHistory(workspaceId);
  const { data: milestoneHistory, isLoading: milestoneLoading } = useMilestoneHistory(workspaceId);

  const stageLabels: Record<string, string> = useMemo(() => ({
    ideation: t('stages.ideation', { defaultValue: 'Ideação' }),
    validation: t('stages.validation', { defaultValue: 'Validação' }),
    mvp: t('stages.mvp', { defaultValue: 'MVP' }),
    growth: t('stages.growth', { defaultValue: 'Crescimento' }),
    scale: t('stages.scale', { defaultValue: 'Escala' }),
  }), [t]);

  const dateLocale = i18n.language === 'pt' ? pt : undefined;

  // Combine and sort timeline events
  const timelineEvents = useMemo(() => {
    const events: Array<{
      id: string;
      type: 'stage' | 'milestone';
      title: string;
      description?: string;
      date: Date;
      fromStage?: string;
      toStage?: string;
    }> = [];

    // Add stage changes
    stageHistory?.forEach((sh) => {
      events.push({
        id: `stage-${sh.id}`,
        type: 'stage',
        title: t('progressTimeline.stageTransition', { defaultValue: 'Transição de fase' }),
        description: `${stageLabels[sh.from_stage || ''] || t('progressTimeline.start', { defaultValue: 'Início' })} → ${stageLabels[sh.to_stage] || sh.to_stage}`,
        date: new Date(sh.changed_at),
        fromStage: sh.from_stage || undefined,
        toStage: sh.to_stage,
      });
    });

    // Add completed milestones
    milestoneHistory?.forEach((m) => {
      if (m.completed_at) {
        events.push({
          id: `milestone-${m.id}`,
          type: 'milestone',
          title: m.title,
          description: m.description || undefined,
          date: new Date(m.completed_at),
        });
      }
    });

    // Sort by date descending
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [stageHistory, milestoneHistory, stageLabels, t]);

  const isLoading = stageLoading || milestoneLoading;

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('progressTimeline.title', { defaultValue: 'Linha do Tempo' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {t('progressTimeline.title', { defaultValue: 'Linha do Tempo' })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timelineEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Rocket className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('progressTimeline.noEvents', { defaultValue: 'Sem eventos de progresso ainda' })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('progressTimeline.noEventsDescription', { defaultValue: 'Mudanças de fase e marcos concluídos aparecerão aqui' })}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-4">
              {timelineEvents.slice(0, 10).map((event) => (
                <div key={event.id} className="relative flex items-start gap-4 pl-10">
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute left-2 w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center",
                    event.type === 'stage' ? "border-primary" : "border-green-500"
                  )}>
                    {event.type === 'stage' ? (
                      <Rocket className="h-2 w-2 text-primary" />
                    ) : (
                      <CheckCircle2 className="h-2 w-2 text-green-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {event.type === 'stage' ? (
                        <>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", stageColors[event.fromStage || ''] || 'bg-muted')}
                          >
                            {stageLabels[event.fromStage || ''] || t('progressTimeline.start', { defaultValue: 'Início' })}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", stageColors[event.toStage || ''])}
                          >
                            {stageLabels[event.toStage || ''] || event.toStage}
                          </Badge>
                        </>
                      ) : (
                        <>
                          <Flag className="h-3 w-3 text-green-500" />
                          <span className="text-sm font-medium">{event.title}</span>
                        </>
                      )}
                    </div>
                    {event.type === 'milestone' && event.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {event.description}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(event.date, "d 'de' MMM yyyy • HH:mm", { locale: dateLocale })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
