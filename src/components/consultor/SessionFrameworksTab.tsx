import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Target,
  Lightbulb,
  ArrowRight,
  Copy,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Brain,
  Compass,
  Scale,
  Rocket,
  Users,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SessionFramework {
  id: string;
  title: string;
  purpose: string;
  duration: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  stages: FrameworkStage[];
  bestFor: string[];
  outcomes: string[];
  tips: string[];
}

interface FrameworkStage {
  name: string;
  duration: string;
  questions: string[];
  objectives: string[];
}

const FRAMEWORKS: SessionFramework[] = [
  {
    id: 'discovery',
    title: 'Discovery Session',
    purpose: 'Understand the startup context, challenges, and immediate needs',
    duration: '45-60 min',
    icon: Compass,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    bestFor: ['First meeting with founder', 'New workspace onboarding', 'Quarterly review'],
    outcomes: ['Clear problem definition', 'Prioritized focus areas', 'Next session agenda'],
    tips: [
      'Let the founder speak 70% of the time',
      'Take notes on emotions, not just facts',
      'Identify the "job behind the job"',
    ],
    stages: [
      {
        name: 'Context Setting',
        duration: '10 min',
        questions: [
          'Walk me through your week - what consumed most of your energy?',
          'What does success look like for you in the next 90 days?',
          'What keeps you up at night about this business?',
        ],
        objectives: ['Build rapport', 'Understand current state', 'Surface top-of-mind concerns'],
      },
      {
        name: 'Deep Dive',
        duration: '25 min',
        questions: [
          'Tell me about your most challenging customer interaction recently',
          'What assumptions are you most uncertain about?',
          'If you had unlimited resources, what would you build first?',
        ],
        objectives: ['Uncover root causes', 'Identify patterns', 'Challenge assumptions'],
      },
      {
        name: 'Action Planning',
        duration: '15 min',
        questions: [
          'Of everything we discussed, what feels most urgent?',
          'What one thing could we focus on that would unlock others?',
          'What support do you need from me?',
        ],
        objectives: ['Prioritize actions', 'Assign ownership', 'Schedule follow-up'],
      },
    ],
  },
  {
    id: 'problem-solving',
    title: 'Problem-Solving Workshop',
    purpose: 'Work through a specific challenge using structured thinking',
    duration: '60-90 min',
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    bestFor: ['Strategic decisions', 'Technical architecture', 'Pricing strategy'],
    outcomes: ['Decision framework', 'Risk assessment', 'Implementation roadmap'],
    tips: [
      'Use whiteboarding or visual tools',
      'Encourage "stupid" questions',
      'Document alternatives considered',
    ],
    stages: [
      {
        name: 'Problem Definition',
        duration: '15 min',
        questions: [
          'State the problem in one sentence',
          'Who is affected and how severely?',
          'What have you already tried?',
        ],
        objectives: ['Align on problem scope', 'Identify stakeholders', 'Review past attempts'],
      },
      {
        name: 'Root Cause Analysis',
        duration: '20 min',
        questions: [
          'Why does this problem exist? (5 Whys)',
          'What constraints are we working with?',
          'What data do we have vs need?',
        ],
        objectives: ['Find root causes', 'Map constraints', 'Identify knowledge gaps'],
      },
      {
        name: 'Solution Ideation',
        duration: '20 min',
        questions: [
          'What are 3 completely different ways to solve this?',
          'What would [industry leader] do?',
          'What is the minimum viable solution?',
        ],
        objectives: ['Generate options', 'Think outside the box', 'Find MVP path'],
      },
      {
        name: 'Decision & Planning',
        duration: '15 min',
        questions: [
          'Which solution best balances impact vs effort?',
          'What are the key risks and mitigations?',
          'What is the first concrete step?',
        ],
        objectives: ['Select approach', 'Risk planning', 'Define next actions'],
      },
    ],
  },
  {
    id: 'accountability',
    title: 'Accountability Check-in',
    purpose: 'Review progress, celebrate wins, and course-correct',
    duration: '30 min',
    icon: Scale,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    bestFor: ['Weekly standup', 'Sprint review', 'Milestone tracking'],
    outcomes: ['Progress visibility', 'Blocker resolution', 'Updated commitments'],
    tips: [
      'Start with wins, no matter how small',
      'Focus on learning, not blame',
      'Keep energy forward-looking',
    ],
    stages: [
      {
        name: 'Wins & Progress',
        duration: '8 min',
        questions: [
          'What did you accomplish since last time?',
          'What are you most proud of?',
          'Any unexpected wins or learnings?',
        ],
        objectives: ['Celebrate progress', 'Build momentum', 'Surface learnings'],
      },
      {
        name: 'Challenges & Blockers',
        duration: '12 min',
        questions: [
          'What didn\'t go as planned?',
          'What is blocking your progress right now?',
          'Where do you need help?',
        ],
        objectives: ['Identify obstacles', 'Problem-solve together', 'Offer resources'],
      },
      {
        name: 'Next Commitments',
        duration: '10 min',
        questions: [
          'What 3 things will you accomplish by next session?',
          'How will you measure success?',
          'What could derail you, and how will you prevent it?',
        ],
        objectives: ['Set clear goals', 'Define success criteria', 'Anticipate risks'],
      },
    ],
  },
  {
    id: 'pitch-prep',
    title: 'Pitch Preparation',
    purpose: 'Refine storytelling and prepare for investor/customer presentations',
    duration: '60-90 min',
    icon: Rocket,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    bestFor: ['Fundraising prep', 'Demo day', 'Key sales meetings'],
    outcomes: ['Polished narrative', 'Q&A readiness', 'Confidence boost'],
    tips: [
      'Record and review practice sessions',
      'Focus on the "so what?" for each point',
      'Prepare for tough questions specifically',
    ],
    stages: [
      {
        name: 'Story Foundation',
        duration: '20 min',
        questions: [
          'In 30 seconds, why does your company exist?',
          'What is the one number that proves traction?',
          'Why you, why now?',
        ],
        objectives: ['Nail the hook', 'Identify key proof points', 'Clarify timing'],
      },
      {
        name: 'Pitch Walkthrough',
        duration: '30 min',
        questions: [
          'Walk me through your full pitch',
          'Where do you feel least confident?',
          'What objections do you expect?',
        ],
        objectives: ['Full dry run', 'Identify weak spots', 'Prepare objection handles'],
      },
      {
        name: 'Q&A Gauntlet',
        duration: '20 min',
        questions: [
          'What if a competitor has 10x your resources?',
          'Walk me through your unit economics',
          'Why haven\'t you grown faster?',
        ],
        objectives: ['Stress test', 'Build confidence', 'Refine responses'],
      },
    ],
  },
  {
    id: 'team-dynamics',
    title: 'Team & Culture Check',
    purpose: 'Address team challenges, hiring, and organizational health',
    duration: '45-60 min',
    icon: Users,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    bestFor: ['Co-founder conflict', 'Scaling team', 'Culture issues'],
    outcomes: ['Team health assessment', 'Hiring/firing decisions', 'Communication improvements'],
    tips: [
      'Create safe space for honest conversation',
      'Focus on behaviors, not personalities',
      'Document agreed actions and owners',
    ],
    stages: [
      {
        name: 'Team Health Pulse',
        duration: '15 min',
        questions: [
          'On a scale of 1-10, how is the team energy right now?',
          'Who on the team is thriving? Who is struggling?',
          'What conversations are you avoiding?',
        ],
        objectives: ['Assess morale', 'Identify individuals needing support', 'Surface tensions'],
      },
      {
        name: 'Deep Dive Issue',
        duration: '25 min',
        questions: [
          'What specific situation is causing the most friction?',
          'What does each party want/need?',
          'What would "resolved" look like?',
        ],
        objectives: ['Understand all perspectives', 'Find common ground', 'Define success'],
      },
      {
        name: 'Path Forward',
        duration: '15 min',
        questions: [
          'What is the first conversation you need to have?',
          'What support or training would help?',
          'How will you know if things are improving?',
        ],
        objectives: ['Plan specific actions', 'Identify resources', 'Set check-in points'],
      },
    ],
  },
];

export function SessionFrameworksTab() {
  const { t } = useTranslation();
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const copyQuestions = (framework: SessionFramework) => {
    const text = framework.stages
      .map(
        (s) =>
          `## ${s.name} (${s.duration})\n${s.questions.map((q) => `- ${q}`).join('\n')}`
      )
      .join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success(t('consultorTools.questionsCopied'));
  };

  const copyAgenda = (framework: SessionFramework) => {
    const text = `# ${framework.title} Agenda\n\nDuration: ${framework.duration}\nPurpose: ${framework.purpose}\n\n${framework.stages
      .map((s) => `## ${s.name} (${s.duration})\nObjectives:\n${s.objectives.map((o) => `- ${o}`).join('\n')}`)
      .join('\n\n')}`;
    navigator.clipboard.writeText(text);
    toast.success(t('consultorTools.agendaCopied'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t('consultorTools.sessionFrameworks')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('consultorTools.sessionFrameworksDesc')}
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          {FRAMEWORKS.length} {t('consultorTools.frameworks')}
        </Badge>
      </div>

      {/* Framework Cards */}
      <div className="space-y-4">
        {FRAMEWORKS.map((framework) => {
          const Icon = framework.icon;
          const isExpanded = expandedFramework === framework.id;

          return (
            <Card key={framework.id} className="overflow-hidden">
              <Collapsible open={isExpanded} onOpenChange={() => setExpandedFramework(isExpanded ? null : framework.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className={cn('cursor-pointer transition-colors hover:bg-muted/50', framework.bgColor)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded-lg bg-background/80', framework.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {framework.title}
                            <Badge variant="secondary" className="text-xs font-normal">
                              <Clock className="h-3 w-3 mr-1" />
                              {framework.duration}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-1">{framework.purpose}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAgenda(framework);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          {t('consultorTools.agenda')}
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Best For & Outcomes Badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {framework.bestFor.slice(0, 3).map((item, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <Target className="h-3 w-3 mr-1" />
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-6">
                    {/* Stages */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{t('consultorTools.sessionFlow')}</h4>
                        <Button variant="outline" size="sm" onClick={() => copyQuestions(framework)}>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          {t('consultorTools.copyAllQuestions')}
                        </Button>
                      </div>

                      {framework.stages.map((stage, idx) => {
                        const stageKey = `${framework.id}-${idx}`;
                        const isStageExpanded = expandedStage === stageKey;

                        return (
                          <Card key={idx} className="bg-muted/30">
                            <Collapsible
                              open={isStageExpanded}
                              onOpenChange={() => setExpandedStage(isStageExpanded ? null : stageKey)}
                            >
                              <CollapsibleTrigger asChild>
                                <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                                        {idx + 1}
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">{stage.name}</p>
                                        <p className="text-xs text-muted-foreground">{stage.duration}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {stage.questions.length} {t('consultorTools.questions')}
                                      </Badge>
                                      {isStageExpanded ? (
                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </div>
                                  </div>
                                </CardHeader>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <CardContent className="pt-0 space-y-4">
                                  {/* Objectives */}
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      {t('consultorTools.objectives')}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {stage.objectives.map((obj, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {obj}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Questions */}
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                      <MessageSquare className="h-3 w-3" />
                                      Questions to Ask
                                    </p>
                                    <ul className="space-y-2">
                                      {stage.questions.map((q, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                          <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                          <span>{q}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </CardContent>
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Outcomes & Tips */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Expected Outcomes
                        </p>
                        <ul className="space-y-1">
                          {framework.outcomes.map((o, i) => (
                            <li key={i} className="text-sm flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              {o}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Pro Tips
                        </p>
                        <ul className="space-y-1">
                          {framework.tips.map((tip, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
