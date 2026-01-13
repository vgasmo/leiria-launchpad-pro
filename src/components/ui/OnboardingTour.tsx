import { useState, useEffect, useMemo } from 'react';
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const TOUR_KEY = 'foundersbook-tour-completed';

/**
 * P3: Simplified onboarding tour - only 4 essential steps, role-aware.
 * Focuses on the most critical actions for new users.
 */
const tourSteps: Step[] = [
  {
    target: '[data-tour="workspaces"]',
    content: 'Welcome to FoundersBook! 🚀 Your workspaces appear here. Each workspace is a dedicated space for a startup.',
    placement: 'right',
    disableBeacon: true,
    title: 'Your Workspaces',
  },
  {
    target: '[data-tour="global-search"]',
    content: 'Search anything: startups, documents, sessions, KPIs. Press ⌘K or / to open instantly.',
    placement: 'bottom',
    title: 'Quick Search',
  },
  {
    target: '[data-tour="notifications"]',
    content: 'Stay updated with alerts, reminders, and team activity. Important items are highlighted.',
    placement: 'bottom',
    title: 'Notifications',
  },
  {
    target: '[data-tour="user-menu"]',
    content: 'Access your profile, settings, and switch themes here. You can restart this tour anytime from settings.',
    placement: 'left',
    title: 'Your Profile',
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
