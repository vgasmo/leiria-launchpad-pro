import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, CheckCircle2, AlertTriangle, HelpCircle, Loader2, 
  Target, Lightbulb, ListChecks, Calendar, TrendingUp, ChevronDown, ChevronUp,
  Copy, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { useGenerateTemplateCoach, useCreateActionsFromAI, type AICoachFeedback } from '@/hooks/useTemplateAI';
import { toast } from 'sonner';

interface TemplateCoachPanelProps {
  instanceId: string;
  workspaceId: string;
  onCopyToNotes?: (notes: string) => void;
  showReviewActions?: boolean;
  onApplyReview?: (recommendation: 'approved' | 'needs_changes', notes: string) => void;
}

export function TemplateCoachPanel({ 
  instanceId, 
  workspaceId, 
  onCopyToNotes,
  showReviewActions = false,
  onApplyReview
}: TemplateCoachPanelProps) {
  const { t } = useTranslation();
  const generateCoach = useGenerateTemplateCoach();
  const createActions = useCreateActionsFromAI(workspaceId);
  const [feedback, setFeedback] = useState<AICoachFeedback | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'actions']));

  const handleGenerate = async () => {
    try {
      const result = await generateCoach.mutateAsync({ templateInstanceId: instanceId });
      if (result.feedback) {
        setFeedback(result.feedback);
      }
    } catch {
      // Error handled by mutation
    }
  };

  const handleCreateActions = async () => {
    if (!feedback?.recommended_actions?.length) return;
    try {
      await createActions.mutateAsync(feedback.recommended_actions);
    } catch {
      // Error handled by mutation
    }
  };

  const buildNotesMarkdown = () => {
    if (!feedback) return '';

    const h2Summary = t('templates.aiCoachNotes.summaryHeading', '## AI Coach Summary');
    const h3Strengths = t('templates.aiCoachNotes.strengthsHeading', '### Strengths');
    const h3Gaps = t('templates.aiCoachNotes.gapsHeading', '### Gaps to Address');
    const h3RedFlags = t('templates.aiCoachNotes.redFlagsHeading', '### Red Flags');
    const h3Agenda = t('templates.aiCoachNotes.agendaHeading', '### Next Session Agenda');

    let notes = `${h2Summary}\n${feedback.summary}\n\n`;

    if (feedback.strengths.length > 0) {
      notes += `${h3Strengths}\n${feedback.strengths.map((s) => `- ${s}`).join('\n')}\n\n`;
    }

    if (feedback.gaps.length > 0) {
      notes += `${h3Gaps}\n${feedback.gaps.map((g) => `- **${g.field}**: ${g.why}`).join('\n')}\n\n`;
    }

    if (feedback.red_flags.length > 0) {
      notes += `${h3RedFlags}\n${feedback.red_flags
        .map((r) => {
          const sev = t(`templates.severity.${r.severity}`, { defaultValue: r.severity.toUpperCase() });
          return `- [${sev}] ${r.risk}: ${r.mitigation}`;
        })
        .join('\n')}\n\n`;
    }

    if (feedback.next_session_agenda.length > 0) {
      notes += `${h3Agenda}\n${feedback.next_session_agenda.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
    }

    return notes.trim();
  };

  const handleCopyToNotes = () => {
    if (!feedback || !onCopyToNotes) return;
    onCopyToNotes(buildNotesMarkdown());
    toast.success(t('templates.copiedToNotes'));
  };

  const handleApplyReview = (decision: 'approved' | 'needs_changes') => {
    if (!feedback || !onApplyReview) return;

    // More compact notes for review decisions
    const h2Summary = t('templates.aiCoachNotes.summaryHeading', '## AI Coach Summary');
    const h3Gaps = t('templates.aiCoachNotes.gapsHeading', '### Gaps to Address');
    const h3RedFlags = t('templates.aiCoachNotes.redFlagsHeading', '### Red Flags');

    let notes = `${h2Summary}\n${feedback.summary}\n\n`;

    if (feedback.gaps.length > 0) {
      notes += `${h3Gaps}\n${feedback.gaps.map((g) => `- **${g.field}**: ${g.why}`).join('\n')}\n\n`;
    }

    if (feedback.red_flags.length > 0) {
      notes += `${h3RedFlags}\n${feedback.red_flags
        .map((r) => {
          const sev = t(`templates.severity.${r.severity}`, { defaultValue: r.severity.toUpperCase() });
          return `- [${sev}] ${r.risk}`;
        })
        .join('\n')}\n\n`;
    }

    onApplyReview(decision, notes.trim());
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'medium':
        return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
      default:
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30';
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDueOwner = (dueInDays: number, ownerHint: string) => {
    const days = t('templates.dueInDaysShort', { count: dueInDays, defaultValue: '{{count}}d' });
    const owner = t(`templates.ownerHint.${ownerHint}`, { defaultValue: ownerHint });
    return t('templates.dueAndOwner', { days, owner, defaultValue: '{{days}} • {{owner}}' });
  };

  // Initial state - show generate button
  if (!feedback && !generateCoach.isPending) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        {t('templates.aiCoach', 'AI Coach')}
      </Button>
    );
  }

  // Loading state
  if (generateCoach.isPending) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {t('templates.analyzingCoach', 'Generating coaching insights...')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!feedback) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {t('templates.aiCoach', 'AI Coach')}
              </span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Summary */}
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              {feedback.summary}
            </div>

            {/* Strengths */}
            {feedback.strengths.length > 0 && (
              <Section
                title={t('templates.strengths', 'Strengths')}
                icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
                expanded={expandedSections.has('strengths')}
                onToggle={() => toggleSection('strengths')}
                count={feedback.strengths.length}
              >
                <ul className="space-y-1">
                  {feedback.strengths.map((s, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Gaps */}
            {feedback.gaps.length > 0 && (
              <Section
                title={t('templates.gaps', 'Gaps to Address')}
                icon={<HelpCircle className="h-4 w-4 text-amber-600" />}
                expanded={expandedSections.has('gaps')}
                onToggle={() => toggleSection('gaps')}
                count={feedback.gaps.length}
              >
                <ul className="space-y-2">
                  {feedback.gaps.map((g, i) => (
                    <li key={i} className="text-sm">
                      <div className="font-medium">{g.field}</div>
                      <div className="text-muted-foreground">{g.why}</div>
                      <div className="text-primary text-xs mt-1 italic">→ {g.question}</div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Assumptions to Test */}
            {feedback.assumptions_to_test.length > 0 && (
              <Section
                title={t('templates.assumptionsToTest', 'Assumptions to Test')}
                icon={<Lightbulb className="h-4 w-4 text-blue-600" />}
                expanded={expandedSections.has('assumptions')}
                onToggle={() => toggleSection('assumptions')}
                count={feedback.assumptions_to_test.length}
              >
                <ul className="space-y-2">
                  {feedback.assumptions_to_test.map((a, i) => (
                    <li key={i} className="text-sm border-l-2 border-blue-300 pl-3">
                      <div className="font-medium">{a.assumption}</div>
                      <div className="text-muted-foreground">{t('templates.test')}: {a.test}</div>
                      <div className="text-xs text-muted-foreground">{t('templates.metric')}: {a.metric}</div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Red Flags */}
            {feedback.red_flags.length > 0 && (
              <Section
                title={t('templates.redFlags', 'Red Flags')}
                icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
                expanded={expandedSections.has('redflags')}
                onToggle={() => toggleSection('redflags')}
                count={feedback.red_flags.length}
              >
                <ul className="space-y-2">
                  {feedback.red_flags.map((r, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(r.severity)}>{t(`templates.severity.${r.severity}`, { defaultValue: r.severity })}</Badge>
                        <span className="font-medium">{r.risk}</span>
                      </div>
                      <div className="text-muted-foreground mt-1">{t('templates.mitigation')}: {r.mitigation}</div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Recommended Actions */}
            {feedback.recommended_actions.length > 0 && (
              <Section
                title={t('templates.recommendedActions', 'Recommended Actions')}
                icon={<ListChecks className="h-4 w-4 text-primary" />}
                expanded={expandedSections.has('actions')}
                onToggle={() => toggleSection('actions')}
                count={feedback.recommended_actions.length}
              >
                <ul className="space-y-2">
                  {feedback.recommended_actions.map((a, i) => (
                    <li key={i} className="text-sm p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getPriorityColor(a.priority)}>{t(`templates.priority.${a.priority}`, { defaultValue: a.priority })}</Badge>
                        <span className="font-medium">{a.title}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{formatDueOwner(a.due_in_days, a.owner_hint)}</span>
                      </div>
                      <div className="text-muted-foreground mt-1">{a.description}</div>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCreateActions}
                  disabled={createActions.isPending}
                  className="w-full mt-2"
                >
                  {createActions.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <ListChecks className="h-4 w-4 mr-1" />
                  )}
                  {t('templates.createNActions', { count: feedback.recommended_actions.length, defaultValue: 'Create {{count}} Actions' })}
                </Button>
              </Section>
            )}

            {/* Next Session Agenda */}
            {feedback.next_session_agenda.length > 0 && (
              <Section
                title={t('templates.nextSessionAgenda', 'Next Session Agenda')}
                icon={<Calendar className="h-4 w-4 text-purple-600" />}
                expanded={expandedSections.has('agenda')}
                onToggle={() => toggleSection('agenda')}
                count={feedback.next_session_agenda.length}
              >
                <ol className="list-decimal list-inside space-y-1">
                  {feedback.next_session_agenda.map((item, i) => (
                    <li key={i} className="text-sm">{item}</li>
                  ))}
                </ol>
              </Section>
            )}

            {/* KPI Suggestions */}
            {feedback.kpi_suggestions.length > 0 && (
              <Section
                title={t('templates.kpiSuggestions', 'KPI Suggestions')}
                icon={<TrendingUp className="h-4 w-4 text-green-600" />}
                expanded={expandedSections.has('kpis')}
                onToggle={() => toggleSection('kpis')}
                count={feedback.kpi_suggestions.length}
              >
                <ul className="space-y-2">
                  {feedback.kpi_suggestions.map((k, i) => (
                    <li key={i} className="text-sm">
                      <div className="font-medium">{k.name}</div>
                      <div className="text-muted-foreground">{k.definition}</div>
                      <div className="text-xs text-muted-foreground">{t('templates.target', 'Target')}: {k.target_hint}</div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Separator />

            {/* Review Actions (when applicable) */}
            {showReviewActions && onApplyReview && feedback && (
              <div className="flex gap-2">
                 <Button
                   size="sm"
                   onClick={() => handleApplyReview('approved')}
                   className="flex-1"
                 >
                   <ThumbsUp className="h-4 w-4 mr-1" />
                   {t('templates.applyAndApprove')}
                 </Button>
                 <Button
                   size="sm"
                   variant="outline"
                   onClick={() => handleApplyReview('needs_changes')}
                   className="flex-1"
                 >
                   <ThumbsDown className="h-4 w-4 mr-1" />
                   {t('templates.applyAndRequestChanges')}
                 </Button>
              </div>
            )}

            {/* Other Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {onCopyToNotes && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyToNotes}
                  className="gap-1"
                >
                  <Copy className="h-3 w-3" />
                  {t('templates.copyToNotes')}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleGenerate}
                disabled={generateCoach.isPending}
                className="gap-1"
              >
                <Sparkles className="h-3 w-3" />
                {t('templates.reanalyze')}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  count: number;
  children: React.ReactNode;
}

function Section({ title, icon, expanded, onToggle, count, children }: SectionProps) {
  return (
    <div className="border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-1">{count}</Badge>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="p-3 pt-0 border-t">
          {children}
        </div>
      )}
    </div>
  );
}
