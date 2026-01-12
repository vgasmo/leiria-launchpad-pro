import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2,
  Check,
  Building2,
  Layers,
  BarChart3,
  BookOpen,
  Bell,
  CheckCircle,
  Rocket,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useProgramSetupDraft,
  useCreateProgramDraft,
  useUpdateProgramDraft,
  useDiscardProgramDraft,
  usePublishProgramDraft,
  type ProgramSetupDraft,
} from '@/hooks/useProgramSetup';
import { WizardBasicsStep } from '@/components/admin/wizard/WizardBasicsStep';
import { WizardStagesStep } from '@/components/admin/wizard/WizardStagesStep';
import { WizardKpisStep } from '@/components/admin/wizard/WizardKpisStep';
import { WizardPlaybooksStep } from '@/components/admin/wizard/WizardPlaybooksStep';
import { WizardAlertRulesStep } from '@/components/admin/wizard/WizardAlertRulesStep';
import { WizardReviewStep } from '@/components/admin/wizard/WizardReviewStep';
import { WizardStepTransition } from '@/components/ui/WizardStepTransition';
import { WizardIllustration } from '@/components/ui/WizardIllustration';
import { triggerConfetti } from '@/lib/confetti';

type WizardStep = 'basics' | 'stages' | 'kpis' | 'playbooks' | 'alerts' | 'review';

const ALL_STEPS: { key: WizardStep; label: string; icon: React.ElementType; standardOnly?: boolean }[] = [
  { key: 'basics', label: 'Basics', icon: Building2 },
  { key: 'stages', label: 'Stages', icon: Layers, standardOnly: true },
  { key: 'kpis', label: 'KPIs', icon: BarChart3, standardOnly: true },
  { key: 'playbooks', label: 'Playbooks', icon: BookOpen, standardOnly: true },
  { key: 'alerts', label: 'Alert Rules', icon: Bell, standardOnly: true },
  { key: 'review', label: 'Review', icon: CheckCircle },
];

export default function ProgramSetupWizard() {
  const { t } = useTranslation();
  const { id, draftId } = useParams<{ id?: string; draftId?: string }>();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [prevStep, setPrevStep] = useState<WizardStep>('basics');
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftId || null);
  const publishedRef = useRef(false);

  const { data: draft, isLoading: draftLoading } = useProgramSetupDraft(activeDraftId || undefined);
  const createDraft = useCreateProgramDraft();
  const updateDraft = useUpdateProgramDraft();
  const discardDraft = useDiscardProgramDraft();
  const publishDraft = usePublishProgramDraft();

  // Determine which steps to show based on program mode
  const isBasicMode = draft?.draft_json.basics?.settings?.program_mode === 'basic';
  const STEPS = ALL_STEPS.filter(step => !step.standardOnly || !isBasicMode);

  // Helper for step transitions
  const goToStep = (step: WizardStep) => {
    // Ensure step is valid for current mode
    if (!STEPS.some(s => s.key === step)) return;
    setPrevStep(currentStep);
    setCurrentStep(step);
  };
  
  const direction = STEPS.findIndex(s => s.key === currentStep) > STEPS.findIndex(s => s.key === prevStep) ? 'forward' : 'backward';

  // Create draft on mount if needed
  useEffect(() => {
    if (!activeDraftId && !createDraft.isPending) {
      createDraft.mutate(
        { programId: id },
        {
          onSuccess: (newDraft) => {
            setActiveDraftId(newDraft.id);
            // Update URL without full navigation
            window.history.replaceState(null, '', `/admin/programs/${id ? `${id}/setup` : 'new'}/${newDraft.id}`);
          },
        }
      );
    }
  }, [id, activeDraftId, createDraft]);

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      goToStep(STEPS[nextIndex].key);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      goToStep(STEPS[prevIndex].key);
    }
  };

  const handleSaveAndContinue = async () => {
    // Auto-save happens via step components
    handleNext();
    toast.success('Progress saved');
  };

  const handleUpdateDraft = async (updates: Partial<ProgramSetupDraft['draft_json']>) => {
    if (!activeDraftId) return;
    await updateDraft.mutateAsync({ draftId: activeDraftId, draftJson: updates });
  };

  const handleDiscard = async () => {
    if (!activeDraftId) return;
    await discardDraft.mutateAsync(activeDraftId);
    navigate('/admin');
  };

  const handlePublish = async () => {
    if (!activeDraftId || publishedRef.current) return;
    try {
      publishedRef.current = true;
      triggerConfetti();
      await publishDraft.mutateAsync(activeDraftId);
      toast.success('🎉 Program published successfully!');
      setTimeout(() => navigate('/admin'), 1500);
    } catch (error) {
      publishedRef.current = false;
      // Error handled by mutation
    }
  };

  // Validation for review step
  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (!draft) return errors;

    const { basics, stages, coreKpis, alertRules, healthModel } = draft.draft_json;
    const programIsBasic = basics?.settings?.program_mode === 'basic';

    if (!basics?.name?.trim()) errors.push('Program name is required');
    
    // Standard mode validations
    if (!programIsBasic) {
      const activeStages = stages?.filter((s) => s.is_active) || [];
      if (activeStages.length === 0) errors.push('At least one stage must be active');

      const coreCount = coreKpis?.length || 0;
      if (coreCount < 3) errors.push('At least 3 core KPIs required');
      if (coreCount > 6) errors.push('Maximum 6 core KPIs allowed');

      // Check alert thresholds
      for (const rule of alertRules || []) {
        if (rule.threshold < 0) errors.push(`Alert rule "${rule.rule_type}" has negative threshold`);
      }

      // Check health model weights
      if (healthModel?.is_enabled) {
        const weights = Object.values(healthModel.weights_json || {});
        const sum = weights.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 100) > 0.1) errors.push(`Health weights must sum to 100 (current: ${sum})`);
      }
    }

    return errors;
  };

  if (draftLoading || createDraft.isPending) {
    return (
      <AppLayout title="Program Setup" subtitle="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  const isEditing = !!id;
  const title = isEditing ? `Edit Program: ${draft?.draft_json.basics?.name || 'Untitled'}` : 'New Program Setup';

  return (
    <AppLayout 
      title={title} 
      subtitle="Configure your program step by step"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Progress Header */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                <span className="font-medium">Setup Progress</span>
              </div>
              <Badge variant={draft?.status === 'draft' ? 'secondary' : 'default'}>
                {draft?.status || 'draft'}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-3">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = step.key === currentStep;
                const isComplete = idx < currentStepIndex;
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => goToStep(step.key)}
                    className={`flex flex-col items-center gap-1 text-xs transition-all hover:scale-105 ${
                      isActive
                        ? 'text-primary font-medium'
                        : isComplete
                        ? 'text-primary/70'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isComplete
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted'
                      }`}
                    >
                      {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span className="hidden sm:block">{step.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start gap-4">
            <WizardIllustration 
              type={currentStep as any} 
              size="sm" 
            />
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {STEPS[currentStepIndex].label}
              </CardTitle>
              <CardDescription>
                {currentStep === 'basics' && 'Enter the basic information about your program'}
                {currentStep === 'stages' && 'Configure which stages are active and their order'}
                {currentStep === 'kpis' && 'Review and customize KPIs for each stage'}
                {currentStep === 'playbooks' && 'Set up playbooks with milestones and actions'}
                {currentStep === 'alerts' && 'Configure alert rules and health scoring'}
                {currentStep === 'review' && 'Review your configuration and publish'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <WizardStepTransition stepKey={currentStep} direction={direction}>
              {draft && (
                <>
                  {currentStep === 'basics' && (
                    <WizardBasicsStep
                      data={draft.draft_json.basics}
                      onUpdate={(basics) => handleUpdateDraft({ basics })}
                    />
                  )}
                  {currentStep === 'stages' && (
                    <WizardStagesStep
                      data={draft.draft_json.stages}
                      onUpdate={(stages) => handleUpdateDraft({ stages })}
                    />
                  )}
                  {currentStep === 'kpis' && (
                    <WizardKpisStep
                      stages={draft.draft_json.stages}
                      kpis={draft.draft_json.kpis}
                      coreKpis={draft.draft_json.coreKpis}
                      onUpdate={(kpis, coreKpis) => handleUpdateDraft({ kpis, coreKpis })}
                    />
                  )}
                  {currentStep === 'playbooks' && (
                    <WizardPlaybooksStep
                      stages={draft.draft_json.stages}
                      playbooks={draft.draft_json.playbooks}
                      onUpdate={(playbooks) => handleUpdateDraft({ playbooks })}
                    />
                  )}
                  {currentStep === 'alerts' && (
                    <WizardAlertRulesStep
                      alertRules={draft.draft_json.alertRules}
                      healthModel={draft.draft_json.healthModel}
                      onUpdate={(alertRules, healthModel) => handleUpdateDraft({ alertRules, healthModel })}
                    />
                  )}
                  {currentStep === 'review' && (
                    <WizardReviewStep
                      draft={draft}
                      validationErrors={getValidationErrors()}
                    />
                  )}
                </>
              )}
            </WizardStepTransition>
          </CardContent>
        </Card>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDiscardDialog(true)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Discard
            </Button>
          </div>

          <div className="flex gap-2">
            {currentStepIndex > 0 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}

            {currentStep !== 'review' ? (
              <Button type="button" onClick={handleSaveAndContinue} disabled={updateDraft.isPending}>
                <Save className="h-4 w-4 mr-1" />
                Save & Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handlePublish}
                disabled={publishDraft.isPending || getValidationErrors().length > 0 || publishedRef.current}
                className="bg-green-600 hover:bg-green-700"
              >
                {publishDraft.isPending || publishedRef.current ? (
                  '🎉 Publishing...'
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Publish Program
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Discard Confirmation */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your progress. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}