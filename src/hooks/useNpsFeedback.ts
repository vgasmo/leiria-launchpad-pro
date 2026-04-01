import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

const NPS_STORAGE_KEY = 'nps_feedback_state';
const DAYS_BEFORE_PROMPT = 7;
const DAYS_BETWEEN_PROMPTS = 30;

interface NpsState {
  firstSeenAt: string;
  lastPromptedAt?: string;
  lastSubmittedAt?: string;
  dismissed: boolean;
}

/**
 * Hook for managing NPS feedback prompts.
 * Shows a feedback prompt after 7 days of first use, then every 30 days.
 */
export function useNpsFeedback() {
  const { user, profile } = useAuth();
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [npsState, setNpsState] = useState<NpsState | null>(null);

  // Load state from localStorage
  useEffect(() => {
    if (!user) return;

    const stored = localStorage.getItem(`${NPS_STORAGE_KEY}_${user.id}`);
    if (stored) {
      try {
        const state = JSON.parse(stored) as NpsState;
        setNpsState(state);
      } catch {
        // Initialize fresh state
        const freshState: NpsState = {
          firstSeenAt: new Date().toISOString(),
          dismissed: false,
        };
        localStorage.setItem(`${NPS_STORAGE_KEY}_${user.id}`, JSON.stringify(freshState));
        setNpsState(freshState);
      }
    } else {
      // First time user
      const freshState: NpsState = {
        firstSeenAt: new Date().toISOString(),
        dismissed: false,
      };
      localStorage.setItem(`${NPS_STORAGE_KEY}_${user.id}`, JSON.stringify(freshState));
      setNpsState(freshState);
    }
  }, [user]);

  // Determine if we should show the prompt
  useEffect(() => {
    if (!npsState || !user) {
      setShouldShowPrompt(false);
      return;
    }

    if (npsState.dismissed) {
      setShouldShowPrompt(false);
      return;
    }

    const now = new Date();
    const firstSeen = new Date(npsState.firstSeenAt);
    const daysSinceFirstSeen = Math.floor((now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24));

    // Wait at least 7 days before first prompt
    if (daysSinceFirstSeen < DAYS_BEFORE_PROMPT) {
      setShouldShowPrompt(false);
      return;
    }

    // If never prompted before, show now
    if (!npsState.lastPromptedAt) {
      setShouldShowPrompt(true);
      return;
    }

    // Check if enough time has passed since last prompt
    const lastPrompted = new Date(npsState.lastPromptedAt);
    const daysSinceLastPrompt = Math.floor((now.getTime() - lastPrompted.getTime()) / (1000 * 60 * 60 * 24));

    setShouldShowPrompt(daysSinceLastPrompt >= DAYS_BETWEEN_PROMPTS);
  }, [npsState, user]);

  const submitFeedback = useCallback(async (score: number, feedback?: string) => {
    if (!user || !profile) return;

    try {
      // Log to activity_log for now (could be a dedicated table)
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: 'nps_feedback_submitted',
        entity_type: 'feedback',
        entity_id: user.id,
        metadata: {
        score,
        feedback,
        submitted_at: new Date().toISOString(),
      },
    });

      // Update local state
      const newState: NpsState = {
        ...npsState!,
        lastSubmittedAt: new Date().toISOString(),
        lastPromptedAt: new Date().toISOString(),
      };
      localStorage.setItem(`${NPS_STORAGE_KEY}_${user.id}`, JSON.stringify(newState));
      setNpsState(newState);
      setShouldShowPrompt(false);

      return true;
    } catch (error) {
      logger.error('error', {}, 'Failed to submit NPS feedback:', error);
      return false;
    }
  }, [user, profile, npsState]);

  const dismissPrompt = useCallback(() => {
    if (!user || !npsState) return;

    const newState: NpsState = {
      ...npsState,
      lastPromptedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${NPS_STORAGE_KEY}_${user.id}`, JSON.stringify(newState));
    setNpsState(newState);
    setShouldShowPrompt(false);
  }, [user, npsState]);

  const dismissPermanently = useCallback(() => {
    if (!user || !npsState) return;

    const newState: NpsState = {
      ...npsState,
      dismissed: true,
    };
    localStorage.setItem(`${NPS_STORAGE_KEY}_${user.id}`, JSON.stringify(newState));
    setNpsState(newState);
    setShouldShowPrompt(false);
  }, [user, npsState]);

  return {
    shouldShowPrompt,
    submitFeedback,
    dismissPrompt,
    dismissPermanently,
  };
}
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
