import { useState, useCallback } from 'react';

const CHECKLIST_DISMISSED_KEY = 'founder_checklist_dismissed';
const WELCOME_DISMISSED_KEY = 'founder_welcome_dismissed';

/**
 * Hook to manage checklist dismiss state and provide recovery functionality.
 * Used to allow users to restore dismissed onboarding checklists.
 */
export function useChecklistRecovery() {
  const [dismissed, setDismissed] = useState(() => ({
    checklist: localStorage.getItem(CHECKLIST_DISMISSED_KEY) === 'true',
    welcome: localStorage.getItem(WELCOME_DISMISSED_KEY) === 'true',
  }));

  const restoreChecklist = useCallback(() => {
    localStorage.removeItem(CHECKLIST_DISMISSED_KEY);
    localStorage.removeItem(WELCOME_DISMISSED_KEY);
    setDismissed({ checklist: false, welcome: false });
  }, []);

  const dismissChecklist = useCallback(() => {
    localStorage.setItem(CHECKLIST_DISMISSED_KEY, 'true');
    setDismissed(prev => ({ ...prev, checklist: true }));
  }, []);

  const dismissWelcome = useCallback(() => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
    setDismissed(prev => ({ ...prev, welcome: true }));
  }, []);

  return {
    isChecklistDismissed: dismissed.checklist,
    isWelcomeDismissed: dismissed.welcome,
    restoreChecklist,
    dismissChecklist,
    dismissWelcome,
    canRestore: dismissed.checklist || dismissed.welcome,
  };
}