import { useState, useEffect, useMemo } from 'react';
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const TOUR_KEY = 'startup-portal-tour-completed';

const tourSteps: Step[] = [
  {
    target: '[data-tour="workspaces"]',
    content: 'Welcome! This is your navigation panel where you can access all areas of the portal.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="create-workspace"]',
    content: 'Click here to create a new startup workspace and start tracking your progress.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="filters"]',
    content: 'Use these filters to quickly find specific workspaces by program, stage, or health status.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="health-badge"]',
    content: 'Health badges show you at a glance how each startup is doing - from thriving to needing attention.',
    placement: 'left',
  },
  {
    target: '[data-tour="notifications"]',
    content: 'Check your notifications here for important updates and alerts.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="view-toggle"]',
    content: 'Switch between card and table views to see your workspaces in different layouts.',
    placement: 'left',
  },
];

interface OnboardingTourProps {
  run?: boolean;
  onComplete?: () => void;
}

export function OnboardingTour({ run, onComplete }: OnboardingTourProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Filter steps to only include targets that exist in the DOM
  const availableSteps = useMemo(() => {
    if (typeof document === 'undefined') return tourSteps;
    
    return tourSteps.filter(step => {
      const target = typeof step.target === 'string' ? step.target : null;
      if (!target) return true;
      return document.querySelector(target) !== null;
    });
  }, [runTour]); // Re-check when tour starts

  useEffect(() => {
    // Only run tour for logged-in users who haven't completed it
    if (user && run === undefined) {
      const hasCompletedTour = localStorage.getItem(`${TOUR_KEY}-${user.id}`);
      if (!hasCompletedTour) {
        // Delay tour start to ensure DOM is ready
        const timer = setTimeout(() => {
          setStepIndex(0);
          setRunTour(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    } else if (run !== undefined) {
      setStepIndex(0);
      setRunTour(run);
    }
  }, [user, run]);

  const handleTourCallback = (data: CallBackProps) => {
    const { status, action, type, index } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    // Handle step changes
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Move to next step
      if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      setStepIndex(0);
      if (user) {
        localStorage.setItem(`${TOUR_KEY}-${user.id}`, 'true');
      }
      onComplete?.();
    }
  };

  const isDark = theme === 'dark';

  // Don't render if no steps available
  if (availableSteps.length === 0) return null;

  return (
    <Joyride
      steps={availableSteps}
      stepIndex={stepIndex}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      spotlightClicks
      disableScrollParentFix
      callback={handleTourCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: isDark ? 'hsl(var(--card))' : '#fff',
          textColor: isDark ? 'hsl(var(--card-foreground))' : '#333',
          arrowColor: isDark ? 'hsl(var(--card))' : '#fff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: '0.5rem',
          padding: '8px 16px',
        },
        buttonBack: {
          color: isDark ? 'hsl(var(--muted-foreground))' : '#666',
          marginRight: 8,
        },
        buttonSkip: {
          color: isDark ? 'hsl(var(--muted-foreground))' : '#666',
          fontSize: '14px',
          fontWeight: 500,
        },
        buttonClose: {
          color: isDark ? 'hsl(var(--muted-foreground))' : '#666',
          width: 14,
          height: 14,
        },
        tooltip: {
          borderRadius: '0.75rem',
          padding: '16px',
        },
        tooltipContent: {
          padding: '8px 0',
        },
        spotlight: {
          borderRadius: '0.5rem',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
}

export function useOnboardingTour() {
  const { user } = useAuth();
  
  const resetTour = () => {
    if (user) {
      localStorage.removeItem(`${TOUR_KEY}-${user.id}`);
    }
  };

  const startTour = () => {
    resetTour();
    window.location.reload();
  };

  return { resetTour, startTour };
}
