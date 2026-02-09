import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addDays, addWeeks } from 'date-fns';
import {
  Sparkles,
  Check,
  Target,
  TrendingUp,
  Calendar,
  ChevronRight,
  Loader2,
  BookOpen,
  Building2,
} from 'lucide-react';
import { WizardStepTransition } from '@/components/ui/WizardStepTransition';
import { WizardIllustration } from '@/components/ui/WizardIllustration';
import { triggerConfetti } from '@/lib/confetti';
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
import { useCreateSession } from '@/hooks/useSessions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CompanyDetailsStep } from './CompanyDetailsStep';
import type { StartupStage } from '@/types/database';

interface WorkspaceOnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  startupId?: string;
  stage: StartupStage;
  startupName: string;
  website?: string;
  mainContactName?: string;
  mainContactEmail?: string;
  nif?: string;
  isFounderOnboarding?: boolean;
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

type WizardStep = 'welcome' | 'company' | 'kpis' | 'milestones' | 'meeting' | 'complete';

export function WorkspaceOnboardingWizard({
  open,
  onOpenChange,
  workspaceId,
  startupId,
  stage,
  startupName: initialStartupName,
  website: initialWebsite = '',
  mainContactName: initialContactName = '',
  mainContactEmail: initialContactEmail = '',
  nif: initialNif = '',
  isFounderOnboarding = false,
}: WorkspaceOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [prevStep, setPrevStep] = useState<WizardStep>('welcome');
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const confettiTriggered = useRef(false);
  
  // Company details state
  const [companyDetails, setCompanyDetails] = useState({
    startupName: initialStartupName,
    website: initialWebsite,
    mainContactName: initialContactName,
    mainContactEmail: initialContactEmail,
    nif: initialNif,
  });
  const [isNifValid, setIsNifValid] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);
  
  // Step results tracking
  const [kpisApplied, setKpisApplied] = useState(false);
  const [milestonesCreated, setMilestonesCreated] = useState(false);
  const [meetingScheduled, setMeetingScheduled] = useState(false);
  
  // Milestone selections - initialize with current stage
  const [selectedMilestones, setSelectedMilestones] = useState<Set<number>>(
    () => new Set(STAGE_MILESTONES[stage]?.map((_, i) => i) || [])
  );
  
  // Meeting form
  const [meetingTitle, setMeetingTitle] = useState(`Kickoff Meeting - ${initialStartupName}`);
  const [meetingDate, setMeetingDate] = useState(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [meetingDuration, setMeetingDuration] = useState('60');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep('welcome');
      setPrevStep('welcome');
      setCompanyDetails({
        startupName: initialStartupName,
        website: initialWebsite,
        mainContactName: initialContactName,
        mainContactEmail: initialContactEmail,
        nif: initialNif,
      });
      setIsNifValid(false);
      setCompanySaved(false);
      setKpisApplied(false);
      setMilestonesCreated(false);
      setMeetingScheduled(false);
      setSelectedMilestones(new Set(STAGE_MILESTONES[stage]?.map((_, i) => i) || []));
      setMeetingTitle(`Kickoff Meeting - ${initialStartupName}`);
      setMeetingDate(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
      setMeetingTime('10:00');
      setMeetingDuration('60');
      confettiTriggered.current = false;
    }
  }, [open, stage, initialStartupName, initialWebsite, initialContactName, initialContactEmail, initialNif]);

  // Trigger confetti on completion
  useEffect(() => {
    if (currentStep === 'complete' && !confettiTriggered.current) {
      confettiTriggered.current = true;
      triggerConfetti();
    }
  }, [currentStep]);

  // Build steps dynamically based on whether this is founder onboarding
  const steps: { key: WizardStep; label: string; icon: React.ElementType }[] = isFounderOnboarding
    ? [
        { key: 'welcome', label: t('onboardingWizard.stepWelcome', { defaultValue: 'Welcome' }), icon: Sparkles },
        { key: 'company', label: t('onboardingWizard.stepCompany', { defaultValue: 'Company' }), icon: Building2 },
        { key: 'kpis', label: t('onboardingWizard.stepKpis', { defaultValue: 'KPIs' }), icon: TrendingUp },
        { key: 'milestones', label: t('onboardingWizard.stepMilestones', { defaultValue: 'Milestones' }), icon: Target },
        { key: 'meeting', label: t('onboardingWizard.stepMeeting', { defaultValue: 'Meeting' }), icon: Calendar },
        { key: 'complete', label: t('onboardingWizard.stepDone', { defaultValue: 'Done' }), icon: Check },
      ]
    : [
        { key: 'welcome', label: t('onboardingWizard.stepWelcome', { defaultValue: 'Welcome' }), icon: Sparkles },
        { key: 'kpis', label: t('onboardingWizard.stepKpis', { defaultValue: 'KPIs' }), icon: TrendingUp },
        { key: 'milestones', label: t('onboardingWizard.stepMilestones', { defaultValue: 'Milestones' }), icon: Target },
        { key: 'meeting', label: t('onboardingWizard.stepMeeting', { defaultValue: 'Meeting' }), icon: Calendar },
        { key: 'complete', label: t('onboardingWizard.stepDone', { defaultValue: 'Done' }), icon: Check },
      ];

  // Helper for step transitions
  const goToStep = (step: WizardStep) => {
    setPrevStep(currentStep);
    setCurrentStep(step);
  };
  
  const direction = steps.findIndex(s => s.key === currentStep) > steps.findIndex(s => s.key === prevStep) ? 'forward' : 'backward';

  const applyDefaults = useApplyStageDefaults(workspaceId);
  const createMilestone = useCreateMilestone(workspaceId);
  const createAction = useCreateActionItemFull(workspaceId);
  const createSession = useCreateSession(workspaceId);

  const stageMilestones = STAGE_MILESTONES[stage];

  const handleApplyKpis = async () => {
    setIsProcessing(true);
    try {
      const result = await applyDefaults.mutateAsync(stage);
      setKpisApplied(true);
      if (result.length > 0) {
        toast.success(t('onboardingWizard.kpisApplied', { defaultValue: 'KPIs applied successfully' }));
      } else {
        toast.info(t('onboardingWizard.kpisAlreadyConfigured', { defaultValue: 'Default KPIs already configured' }));
      }
      goToStep('milestones');
    } catch {
      toast.error(t('onboardingWizard.kpisFailed', { defaultValue: 'Failed to apply KPI defaults' }));
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
      toast.success(t('onboardingWizard.milestonesCreated', { defaultValue: 'Milestones created successfully' }));
      goToStep('meeting');
    } catch {
      toast.error(t('onboardingWizard.milestonesFailed', { defaultValue: 'Failed to create milestones' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScheduleSession = async () => {
    if (!meetingTitle.trim()) {
      toast.error(t('onboardingWizard.meetingTitleRequired', { defaultValue: 'Please enter a session title' }));
      return;
    }
    
    setIsProcessing(true);
    try {
      const startsAt = new Date(`${meetingDate}T${meetingTime}`);
      const duration = parseInt(meetingDuration);
      
      await createSession.mutateAsync({
        title: meetingTitle,
        agenda: 'Initial kickoff session to align on goals and next steps.',
        scheduled_at: startsAt.toISOString(),
        duration: duration,
        notes: null,
        decisions: null,
      });
      
      setMeetingScheduled(true);
      toast.success(t('onboardingWizard.meetingScheduled', { defaultValue: 'Session scheduled' }));
      goToStep('complete');
    } catch {
      toast.error(t('onboardingWizard.meetingFailed', { defaultValue: 'Failed to schedule session' }));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle saving company details
  const handleSaveCompanyDetails = async () => {
    if (!startupId) {
      goToStep('kpis');
      return;
    }
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('startups')
        .update({
          name: companyDetails.startupName,
          website: companyDetails.website || null,
          main_contact_name: companyDetails.mainContactName || null,
          main_contact_email: companyDetails.mainContactEmail || null,
          nif: companyDetails.nif || null,
        })
        .eq('id', startupId);
      
      if (error) throw error;
      
      setCompanySaved(true);
      toast.success(t('onboardingWizard.companySaved', { defaultValue: 'Company details saved' }));
      goToStep('kpis');
    } catch (err) {
      console.error('Failed to save company details:', err);
      toast.error(t('onboardingWizard.companyFailed', { defaultValue: 'Failed to save company details' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // State will be reset by useEffect when dialog reopens
  };

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('onboardingWizard.title', { defaultValue: 'Workspace Setup Wizard' })}
          </DialogTitle>
          <DialogDescription>
            {t('onboardingWizard.setupDesc', { defaultValue: "Let's set up your workspace for success in the {{stage}} stage.", stage })}
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
        <div className="min-h-[280px] overflow-hidden">
          <WizardStepTransition stepKey={currentStep} direction={direction}>
            {currentStep === 'welcome' && (
              <div className="text-center py-6 space-y-4">
                <WizardIllustration type="welcome" size="lg" className="mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('onboardingWizard.welcomeTo', { defaultValue: 'Welcome to {{name}}!', name: companyDetails.startupName })}</h3>
                  <p className="text-muted-foreground text-sm">
                    {isFounderOnboarding 
                      ? t('onboardingWizard.founderWelcomeDesc', { defaultValue: 'This wizard will help you complete your company profile, set up KPIs, milestones, and schedule your first meeting.' })
                      : t('onboardingWizard.staffWelcomeDesc', { defaultValue: 'This wizard will help you set up your workspace with stage-appropriate KPIs, initial milestones, and schedule your first meeting.' })}
                  </p>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-left">
                  <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-primary">{t('onboardingWizard.proTip', { defaultValue: 'Pro tip: Use Playbooks' })}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('onboardingWizard.proTipDesc', { defaultValue: 'After setup, visit the <strong>Playbooks</strong> tab to instantly apply pre-built milestone and action templates specific to your stage.' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'company' && (
              <CompanyDetailsStep
                startupName={companyDetails.startupName}
                website={companyDetails.website}
                mainContactName={companyDetails.mainContactName}
                mainContactEmail={companyDetails.mainContactEmail}
                nif={companyDetails.nif}
                onUpdate={(updates) => setCompanyDetails(prev => ({ ...prev, ...updates }))}
                onNifValid={setIsNifValid}
              />
            )}

            {currentStep === 'kpis' && (
              <div className="space-y-4">
                <div className="text-center">
                  <WizardIllustration type="kpis" className="mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">{t('onboardingWizard.setupKpis', { defaultValue: 'Setup KPI Tracking' })}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('onboardingWizard.setupKpisDesc', { defaultValue: "We'll add the recommended KPIs for the {{stage}} stage.", stage })}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="text-muted-foreground">
                    {t('onboardingWizard.kpisExplain', { defaultValue: 'This will add key metrics like revenue, burn rate, active users, and more based on what matters most at your current stage.' })}
                  </p>
                </div>
                {kpisApplied && (
                  <div className="flex items-center gap-2 text-green-600 justify-center">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">{t('onboardingWizard.kpisApplied', { defaultValue: 'KPIs applied successfully' })}</span>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'milestones' && (
              <div className="space-y-4">
                <div className="text-center">
                  <WizardIllustration type="milestones" className="mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">{t('onboardingWizard.createMilestones', { defaultValue: 'Create Initial Milestones' })}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('onboardingWizard.selectMilestones', { defaultValue: 'Select the milestones to add for your {{stage}} stage journey.', stage })}
                  </p>
                </div>
                <ScrollArea className="h-[180px]">
                  <div className="space-y-2">
                    {stageMilestones.map((m, idx) => (
                      <label
                        key={idx}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
                          selectedMilestones.has(idx) ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 hover:bg-muted/50'
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
                            {t('onboardingWizard.weeks', { defaultValue: '~{{count}} weeks', count: m.weeksOut })}
                          </Badge>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                {milestonesCreated && (
                  <div className="flex items-center gap-2 text-green-600 justify-center">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">{t('onboardingWizard.milestonesCreated', { defaultValue: 'Milestones created successfully' })}</span>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'meeting' && (
              <div className="space-y-4">
                <div className="text-center">
                  <WizardIllustration type="meeting" className="mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">{t('onboardingWizard.scheduleKickoff', { defaultValue: 'Schedule Kickoff Meeting' })}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('onboardingWizard.scheduleKickoffDesc', { defaultValue: 'Set up your first team meeting to align on goals.' })}
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="meeting-title">{t('onboardingWizard.meetingTitle', { defaultValue: 'Meeting Title' })}</Label>
                    <Input
                      id="meeting-title"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="meeting-date">{t('onboardingWizard.meetingDate', { defaultValue: 'Date' })}</Label>
                      <Input
                        id="meeting-date"
                        type="date"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="meeting-time">{t('onboardingWizard.meetingTime', { defaultValue: 'Time' })}</Label>
                      <Input
                        id="meeting-time"
                        type="time"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="meeting-duration">{t('onboardingWizard.meetingDuration', { defaultValue: 'Duration' })}</Label>
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
                  <div className="flex items-center gap-2 text-green-600 justify-center">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">{t('onboardingWizard.meetingScheduled', { defaultValue: 'Meeting scheduled successfully' })}</span>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="text-center py-6 space-y-4">
                <WizardIllustration type="complete" size="lg" className="mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('onboardingWizard.allSet', { defaultValue: "You're all set! 🎉" })}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t('onboardingWizard.allSetDesc', { defaultValue: 'Your workspace is ready to go. You can now track KPIs, manage milestones, and collaborate with your team.' })}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  {kpisApplied && (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="h-3 w-3" /> {t('onboardingWizard.kpisConfigured', { defaultValue: 'KPIs configured' })}
                    </Badge>
                  )}
                  {milestonesCreated && (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="h-3 w-3" /> {t('onboardingWizard.milestonesCreatedBadge', { defaultValue: 'Milestones created' })}
                    </Badge>
                  )}
                  {meetingScheduled && (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="h-3 w-3" /> {t('onboardingWizard.meetingScheduledBadge', { defaultValue: 'Meeting scheduled' })}
                    </Badge>
                  )}
                </div>
                <div className="bg-muted/50 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-2 justify-center text-sm">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      {t('onboardingWizard.nextStepPlaybooks', { defaultValue: 'Next step: Check <strong>Playbooks</strong> tab for stage-specific templates' })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </WizardStepTransition>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {currentStep !== 'complete' && currentStep !== 'welcome' && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const prev = steps[currentStepIndex - 1]?.key;
                if (prev) goToStep(prev);
              }}
              disabled={isProcessing}
            >
              {t('onboardingWizard.back', { defaultValue: 'Back' })}
            </Button>
          )}
          
          {currentStep === 'welcome' && (
            <Button 
              type="button" 
              onClick={() => goToStep(isFounderOnboarding ? 'company' : 'kpis')} 
              className="w-full sm:w-auto"
            >
              {t('onboardingWizard.getStarted', { defaultValue: 'Get Started' })}
              <ChevronRight className="h-4 w-4 ml-1" />
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {currentStep === 'company' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={() => goToStep('kpis')} disabled={isProcessing}>
                {t('onboardingWizard.skip', { defaultValue: 'Skip' })}
              </Button>
              <Button 
                type="button" 
                onClick={handleSaveCompanyDetails} 
                disabled={isProcessing || companySaved}
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {companySaved ? t('onboardingWizard.saved', { defaultValue: 'Saved' }) : t('onboardingWizard.saveAndContinue', { defaultValue: 'Save & Continue' })}
              </Button>
            </div>
          )}
          
          {currentStep === 'kpis' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={() => goToStep('milestones')} disabled={isProcessing}>
                {t('onboardingWizard.skip', { defaultValue: 'Skip' })}
              </Button>
              <Button type="button" onClick={handleApplyKpis} disabled={isProcessing || kpisApplied}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {kpisApplied ? t('onboardingWizard.applied', { defaultValue: 'Applied' }) : t('onboardingWizard.applyKpis', { defaultValue: 'Apply KPIs' })}
              </Button>
            </div>
          )}
          
          {currentStep === 'milestones' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={() => goToStep('meeting')} disabled={isProcessing}>
                {t('onboardingWizard.skip', { defaultValue: 'Skip' })}
              </Button>
              <Button 
                type="button"
                onClick={handleCreateMilestones} 
                disabled={isProcessing || selectedMilestones.size === 0 || milestonesCreated}
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {milestonesCreated ? t('onboardingWizard.created', { defaultValue: 'Created' }) : t('onboardingWizard.createCount', { defaultValue: 'Create {{count}} Milestones', count: selectedMilestones.size })}
              </Button>
            </div>
          )}
          
          {currentStep === 'meeting' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={() => goToStep('complete')} disabled={isProcessing}>
                {t('onboardingWizard.skip', { defaultValue: 'Skip' })}
              </Button>
              <Button type="button" onClick={handleScheduleSession} disabled={isProcessing || meetingScheduled}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {meetingScheduled ? t('onboardingWizard.scheduled', { defaultValue: 'Scheduled' }) : t('onboardingWizard.scheduleSession', { defaultValue: 'Schedule Session' })}
              </Button>
            </div>
          )}
          
          {currentStep === 'complete' && (
            <Button type="button" onClick={handleClose} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
              {t('onboardingWizard.goToWorkspace', { defaultValue: '🎉 Go to Workspace' })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
