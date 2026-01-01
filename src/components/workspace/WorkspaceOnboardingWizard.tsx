import { useState } from 'react';
import { format, addDays, addWeeks } from 'date-fns';
import {
  Sparkles,
  Check,
  Target,
  TrendingUp,
  Calendar,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useApplyStageDefaults } from '@/hooks/useKpis';
import { useCreateMilestone } from '@/hooks/useMilestones';
import { useCreateActionItemFull } from '@/hooks/useActionItems';
import { useMeetings } from '@/hooks/useMeetings';
import { toast } from 'sonner';
import type { StartupStage } from '@/types/database';

interface WorkspaceOnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  stage: StartupStage;
  startupName: string;
}

// Default milestones by stage with suggested actions
const STAGE_MILESTONES: Record<StartupStage, { 
  title: string; 
  description: string; 
  weeksOut: number;
  actions: { title: string; daysOffset: number }[];
}[]> = {
  ideation: [
    { 
      title: 'Complete problem validation interviews', 
      description: 'Conduct 10+ customer interviews to validate the problem', 
      weeksOut: 2,
      actions: [
        { title: 'Create interview script with key questions', daysOffset: 2 },
        { title: 'Identify and reach out to 15 potential interviewees', daysOffset: 4 },
        { title: 'Conduct first 5 interviews', daysOffset: 8 },
        { title: 'Synthesize findings and document patterns', daysOffset: 12 },
      ]
    },
    { 
      title: 'Define value proposition', 
      description: 'Document clear value proposition and unique selling points', 
      weeksOut: 3,
      actions: [
        { title: 'Analyze competitor positioning', daysOffset: 2 },
        { title: 'Draft value proposition canvas', daysOffset: 5 },
        { title: 'Test messaging with 5 potential customers', daysOffset: 10 },
      ]
    },
    { 
      title: 'Create initial business model canvas', 
      description: 'Complete first iteration of BMC', 
      weeksOut: 4,
      actions: [
        { title: 'Complete customer segments and channels sections', daysOffset: 5 },
        { title: 'Define revenue streams and cost structure', daysOffset: 10 },
        { title: 'Review BMC with mentor/advisor', daysOffset: 20 },
      ]
    },
    { 
      title: 'Identify early adopters', 
      description: 'Build list of 50+ potential early adopter contacts', 
      weeksOut: 6,
      actions: [
        { title: 'Define early adopter profile and criteria', daysOffset: 3 },
        { title: 'Research and list 20 potential early adopters', daysOffset: 14 },
        { title: 'Reach out and qualify interest from 10 contacts', daysOffset: 28 },
      ]
    },
  ],
  validation: [
    { 
      title: 'Launch landing page', 
      description: 'Create and deploy landing page with signup form', 
      weeksOut: 2,
      actions: [
        { title: 'Write compelling headline and copy', daysOffset: 2 },
        { title: 'Design and build landing page', daysOffset: 7 },
        { title: 'Set up analytics and email capture', daysOffset: 10 },
        { title: 'Launch and share with initial contacts', daysOffset: 12 },
      ]
    },
    { 
      title: 'Run first experiment', 
      description: 'Design and execute first validation experiment', 
      weeksOut: 3,
      actions: [
        { title: 'Define hypothesis and success metrics', daysOffset: 2 },
        { title: 'Design experiment methodology', daysOffset: 5 },
        { title: 'Execute experiment', daysOffset: 14 },
        { title: 'Analyze results and document learnings', daysOffset: 18 },
      ]
    },
    { 
      title: 'Collect 100+ signups', 
      description: 'Achieve 100 email signups from landing page', 
      weeksOut: 5,
      actions: [
        { title: 'Share landing page on social media', daysOffset: 3 },
        { title: 'Reach out to communities and groups', daysOffset: 10 },
        { title: 'Run small paid ad campaign', daysOffset: 20 },
      ]
    },
    { 
      title: 'Complete solution interviews', 
      description: 'Validate proposed solution with 20+ prospects', 
      weeksOut: 6,
      actions: [
        { title: 'Create solution mockups or prototype', daysOffset: 5 },
        { title: 'Schedule interviews with signups', daysOffset: 10 },
        { title: 'Conduct 10 solution interviews', daysOffset: 25 },
        { title: 'Document feedback and iterate', daysOffset: 35 },
      ]
    },
  ],
  mvp: [
    { 
      title: 'Define MVP scope', 
      description: 'Document core MVP features and success criteria', 
      weeksOut: 1,
      actions: [
        { title: 'List all potential features', daysOffset: 1 },
        { title: 'Prioritize to core must-haves only', daysOffset: 3 },
        { title: 'Define success metrics for MVP', daysOffset: 5 },
      ]
    },
    { 
      title: 'Complete MVP development', 
      description: 'Build and deploy minimum viable product', 
      weeksOut: 6,
      actions: [
        { title: 'Set up development environment', daysOffset: 3 },
        { title: 'Build core feature #1', daysOffset: 14 },
        { title: 'Build core feature #2', daysOffset: 28 },
        { title: 'Deploy and test MVP', daysOffset: 38 },
      ]
    },
    { 
      title: 'Onboard first 10 users', 
      description: 'Get first paying customers or active users', 
      weeksOut: 8,
      actions: [
        { title: 'Invite early adopters to try MVP', daysOffset: 5 },
        { title: 'Provide hands-on onboarding support', daysOffset: 15 },
        { title: 'Collect feedback and fix critical bugs', daysOffset: 40 },
      ]
    },
    { 
      title: 'Collect feedback and iterate', 
      description: 'Document learnings and plan next iteration', 
      weeksOut: 10,
      actions: [
        { title: 'Conduct user feedback sessions', daysOffset: 10 },
        { title: 'Analyze usage data and patterns', daysOffset: 30 },
        { title: 'Prioritize next iteration features', daysOffset: 50 },
      ]
    },
  ],
  growth: [
    { 
      title: 'Define growth metrics', 
      description: 'Establish key growth KPIs and targets', 
      weeksOut: 1,
      actions: [
        { title: 'Identify north star metric', daysOffset: 2 },
        { title: 'Set up analytics dashboard', daysOffset: 4 },
        { title: 'Define monthly growth targets', daysOffset: 6 },
      ]
    },
    { 
      title: 'Launch marketing campaigns', 
      description: 'Execute first paid acquisition campaigns', 
      weeksOut: 3,
      actions: [
        { title: 'Research target audience and channels', daysOffset: 3 },
        { title: 'Create ad creatives and copy', daysOffset: 10 },
        { title: 'Launch and monitor campaigns', daysOffset: 15 },
        { title: 'Optimize based on performance', daysOffset: 18 },
      ]
    },
    { 
      title: 'Achieve 100 active users', 
      description: 'Reach 100 monthly active users milestone', 
      weeksOut: 8,
      actions: [
        { title: 'Implement referral program', daysOffset: 10 },
        { title: 'Launch content marketing strategy', daysOffset: 25 },
        { title: 'Optimize onboarding for activation', daysOffset: 40 },
      ]
    },
    { 
      title: 'Optimize conversion funnel', 
      description: 'Identify and fix key conversion bottlenecks', 
      weeksOut: 10,
      actions: [
        { title: 'Map full user journey and funnel', daysOffset: 5 },
        { title: 'Identify biggest drop-off points', daysOffset: 20 },
        { title: 'Run A/B tests on key pages', daysOffset: 50 },
      ]
    },
  ],
  scale: [
    { 
      title: 'Hire key team members', 
      description: 'Recruit for critical growth positions', 
      weeksOut: 4,
      actions: [
        { title: 'Define roles and job descriptions', daysOffset: 3 },
        { title: 'Post jobs and source candidates', daysOffset: 7 },
        { title: 'Interview and select candidates', daysOffset: 21 },
      ]
    },
    { 
      title: 'Expand to new market/segment', 
      description: 'Launch in second market or customer segment', 
      weeksOut: 8,
      actions: [
        { title: 'Research new market opportunity', daysOffset: 10 },
        { title: 'Adapt product for new segment', daysOffset: 35 },
        { title: 'Launch and test in new market', daysOffset: 50 },
      ]
    },
    { 
      title: 'Implement automation', 
      description: 'Automate key operational processes', 
      weeksOut: 10,
      actions: [
        { title: 'Audit current manual processes', daysOffset: 5 },
        { title: 'Prioritize automation opportunities', daysOffset: 15 },
        { title: 'Implement top 3 automations', daysOffset: 55 },
      ]
    },
    { 
      title: 'Prepare for funding round', 
      description: 'Complete materials for next funding round', 
      weeksOut: 12,
      actions: [
        { title: 'Update pitch deck', daysOffset: 20 },
        { title: 'Prepare financial projections', daysOffset: 40 },
        { title: 'Build investor target list', daysOffset: 60 },
        { title: 'Start investor outreach', daysOffset: 75 },
      ]
    },
  ],
};

type WizardStep = 'welcome' | 'kpis' | 'milestones' | 'meeting' | 'complete';

export function WorkspaceOnboardingWizard({
  open,
  onOpenChange,
  workspaceId,
  stage,
  startupName,
}: WorkspaceOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Step results tracking
  const [kpisApplied, setKpisApplied] = useState(false);
  const [milestonesCreated, setMilestonesCreated] = useState(false);
  const [meetingScheduled, setMeetingScheduled] = useState(false);
  
  // Milestone selections
  const [selectedMilestones, setSelectedMilestones] = useState<Set<number>>(
    new Set(STAGE_MILESTONES[stage].map((_, i) => i))
  );
  
  // Meeting form
  const [meetingTitle, setMeetingTitle] = useState(`Kickoff Meeting - ${startupName}`);
  const [meetingDate, setMeetingDate] = useState(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [meetingDuration, setMeetingDuration] = useState('60');

  const applyDefaults = useApplyStageDefaults(workspaceId);
  const createMilestone = useCreateMilestone(workspaceId);
  const createAction = useCreateActionItemFull(workspaceId);
  const { createMeeting } = useMeetings(workspaceId);

  const stageMilestones = STAGE_MILESTONES[stage];

  const handleApplyKpis = async () => {
    setIsProcessing(true);
    try {
      const result = await applyDefaults.mutateAsync(stage);
      setKpisApplied(true);
      if (result.length > 0) {
        toast.success(`Added ${result.length} KPIs for ${stage} stage`);
      } else {
        toast.info('Default KPIs already configured');
      }
      setCurrentStep('milestones');
    } catch {
      toast.error('Failed to apply KPI defaults');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateMilestones = async () => {
    setIsProcessing(true);
    try {
      const milestonesToCreate = stageMilestones.filter((_, i) => selectedMilestones.has(i));
      let totalActionsCreated = 0;
      
      for (let i = 0; i < milestonesToCreate.length; i++) {
        const m = milestonesToCreate[i];
        // Create the milestone first
        const createdMilestone = await createMilestone.mutateAsync({
          title: m.title,
          description: m.description,
          target_date: format(addWeeks(new Date(), m.weeksOut), 'yyyy-MM-dd'),
          position: i,
        });
        
        // Create actions for this milestone
        for (const action of m.actions) {
          await createAction.mutateAsync({
            title: action.title,
            milestone_id: createdMilestone.id,
            due_date: format(addDays(new Date(), action.daysOffset), 'yyyy-MM-dd'),
            priority: 'medium',
          });
          totalActionsCreated++;
        }
      }
      
      setMilestonesCreated(true);
      toast.success(`Created ${milestonesToCreate.length} milestones with ${totalActionsCreated} actions`);
      setCurrentStep('meeting');
    } catch {
      toast.error('Failed to create milestones');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!meetingTitle.trim()) {
      toast.error('Please enter a meeting title');
      return;
    }
    
    setIsProcessing(true);
    try {
      const startsAt = new Date(`${meetingDate}T${meetingTime}`);
      const endsAt = new Date(startsAt.getTime() + parseInt(meetingDuration) * 60000);
      
      await createMeeting.mutateAsync({
        title: meetingTitle,
        description: 'Initial kickoff meeting to align on goals and next steps.',
        workspace_id: workspaceId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      });
      
      setMeetingScheduled(true);
      toast.success('Meeting scheduled');
      setCurrentStep('complete');
    } catch {
      toast.error('Failed to schedule meeting');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setCurrentStep('welcome');
      setKpisApplied(false);
      setMilestonesCreated(false);
      setMeetingScheduled(false);
      setSelectedMilestones(new Set(STAGE_MILESTONES[stage].map((_, i) => i)));
    }, 200);
  };

  const steps: { key: WizardStep; label: string; icon: React.ElementType }[] = [
    { key: 'welcome', label: 'Welcome', icon: Sparkles },
    { key: 'kpis', label: 'KPIs', icon: TrendingUp },
    { key: 'milestones', label: 'Milestones', icon: Target },
    { key: 'meeting', label: 'Meeting', icon: Calendar },
    { key: 'complete', label: 'Done', icon: Check },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Workspace Setup Wizard
          </DialogTitle>
          <DialogDescription>
            Let's set up your workspace for success in the {stage} stage.
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStepIndex;
            const isComplete = idx < currentStepIndex;
            
            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors',
                    isActive && 'bg-primary text-primary-foreground',
                    isComplete && 'bg-primary/20 text-primary',
                    !isActive && !isComplete && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className={cn(
                    'h-4 w-4 mx-1',
                    isComplete ? 'text-primary' : 'text-muted-foreground/50'
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[200px]">
          {currentStep === 'welcome' && (
            <div className="text-center py-6 space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Welcome to {startupName}!</h3>
                <p className="text-muted-foreground text-sm">
                  This wizard will help you set up your workspace with stage-appropriate KPIs,
                  initial milestones, and schedule your first meeting.
                </p>
              </div>
            </div>
          )}

          {currentStep === 'kpis' && (
            <div className="space-y-4">
              <div className="text-center">
                <TrendingUp className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Setup KPI Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  We'll add the recommended KPIs for the <Badge variant="secondary">{stage}</Badge> stage.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="text-muted-foreground">
                  This will add key metrics like revenue, burn rate, active users, and more based
                  on what matters most at your current stage.
                </p>
              </div>
              {kpisApplied && (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">KPIs applied successfully</span>
                </div>
              )}
            </div>
          )}

          {currentStep === 'milestones' && (
            <div className="space-y-4">
              <div className="text-center">
                <Target className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Create Initial Milestones</h3>
                <p className="text-sm text-muted-foreground">
                  Select the milestones to add for your {stage} stage journey.
                </p>
              </div>
              <ScrollArea className="h-[180px]">
                <div className="space-y-2">
                  {stageMilestones.map((m, idx) => (
                    <label
                      key={idx}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedMilestones.has(idx) ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
                      )}
                    >
                      <Checkbox
                        checked={selectedMilestones.has(idx)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedMilestones);
                          if (checked) newSet.add(idx);
                          else newSet.delete(idx);
                          setSelectedMilestones(newSet);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          ~{m.weeksOut} weeks
                        </Badge>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
              {milestonesCreated && (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Milestones created successfully</span>
                </div>
              )}
            </div>
          )}

          {currentStep === 'meeting' && (
            <div className="space-y-4">
              <div className="text-center">
                <Calendar className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Schedule Kickoff Meeting</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your first team meeting to align on goals.
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="meeting-title">Meeting Title</Label>
                  <Input
                    id="meeting-title"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="meeting-date">Date</Label>
                    <Input
                      id="meeting-date"
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="meeting-time">Time</Label>
                    <Input
                      id="meeting-time"
                      type="time"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="meeting-duration">Duration</Label>
                    <Input
                      id="meeting-duration"
                      type="number"
                      value={meetingDuration}
                      onChange={(e) => setMeetingDuration(e.target.value)}
                      min="15"
                      max="180"
                    />
                  </div>
                </div>
              </div>
              {meetingScheduled && (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Meeting scheduled successfully</span>
                </div>
              )}
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="text-center py-6 space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">You're all set!</h3>
                <p className="text-muted-foreground text-sm">
                  Your workspace is ready to go. You can now track KPIs, manage milestones,
                  and collaborate with your team.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-sm">
                {kpisApplied && (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" /> KPIs configured
                  </Badge>
                )}
                {milestonesCreated && (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" /> Milestones created
                  </Badge>
                )}
                {meetingScheduled && (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" /> Meeting scheduled
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {currentStep !== 'complete' && currentStep !== 'welcome' && (
            <Button
              variant="ghost"
              onClick={() => {
                const prevStep = steps[currentStepIndex - 1]?.key;
                if (prevStep) setCurrentStep(prevStep);
              }}
              disabled={isProcessing}
            >
              Back
            </Button>
          )}
          
          {currentStep === 'welcome' && (
            <Button onClick={() => setCurrentStep('kpis')} className="w-full sm:w-auto">
              Get Started
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          
          {currentStep === 'kpis' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setCurrentStep('milestones')} disabled={isProcessing}>
                Skip
              </Button>
              <Button onClick={handleApplyKpis} disabled={isProcessing || kpisApplied}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {kpisApplied ? 'Applied' : 'Apply KPIs'}
              </Button>
            </div>
          )}
          
          {currentStep === 'milestones' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setCurrentStep('meeting')} disabled={isProcessing}>
                Skip
              </Button>
              <Button 
                onClick={handleCreateMilestones} 
                disabled={isProcessing || selectedMilestones.size === 0 || milestonesCreated}
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {milestonesCreated ? 'Created' : `Create ${selectedMilestones.size} Milestones`}
              </Button>
            </div>
          )}
          
          {currentStep === 'meeting' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setCurrentStep('complete')} disabled={isProcessing}>
                Skip
              </Button>
              <Button onClick={handleScheduleMeeting} disabled={isProcessing || meetingScheduled}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {meetingScheduled ? 'Scheduled' : 'Schedule Meeting'}
              </Button>
            </div>
          )}
          
          {currentStep === 'complete' && (
            <Button onClick={handleClose} className="w-full sm:w-auto">
              Go to Workspace
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
