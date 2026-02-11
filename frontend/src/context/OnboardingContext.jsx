/**
 * OnboardingContext
 * 
 * Manages the guided onboarding state across the entire app.
 * Stores progress in localStorage so users can resume, skip, or
 * return to guidance at any time. Never blocks or gates the UI.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const OnboardingContext = createContext(null);

const STORAGE_PREFIX = 'naviya_onboarding_';

/** State for a brand-new, first-time user */
const FIRST_TIME_STATE = {
  started: false,
  completed: false,
  dismissed: false,
  showWelcome: true,        // Phase 1 welcome card visible
  currentStep: null,
  completedSteps: [],
  skippedSteps: [],
  shownTooltips: [],
  startedAt: null,
  completedAt: null,
};

/** State for returning users — guide never appears */
const RETURNING_USER_STATE = {
  ...FIRST_TIME_STATE,
  showWelcome: false,
  dismissed: true,
  completed: true,
};

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
};

/**
 * @param {{ userId: string|null, children: React.ReactNode }} props
 * userId is required — when null the guide is fully inactive.
 */
export function OnboardingProvider({ userId, children }) {
  const storageKey = userId ? `${STORAGE_PREFIX}${userId}` : null;

  const [state, setState] = useState(() => loadState(storageKey));

  // Re-load when userId changes (login / logout / switch user)
  useEffect(() => {
    setState(loadState(storageKey));
  }, [storageKey]);

  // Persist to localStorage on every change
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [state, storageKey]);

  // --- Actions ---

  const startGuide = useCallback(() => {
    setState(prev => ({
      ...prev,
      started: true,
      showWelcome: false,
      currentStep: 'resume',
      startedAt: new Date().toISOString(),
    }));
  }, []);

  const dismissGuide = useCallback(() => {
    setState(prev => ({
      ...prev,
      dismissed: true,
      showWelcome: false,
      currentStep: null,
    }));
  }, []);

  const reopenGuide = useCallback(() => {
    setState(prev => ({
      ...prev,
      dismissed: false,
      showWelcome: false,
      started: true,
      currentStep: getNextIncompleteStep(prev.completedSteps),
    }));
  }, []);

  const completeStep = useCallback((stepId) => {
    setState(prev => {
      const completed = [...new Set([...prev.completedSteps, stepId])];
      const nextStep = getNextIncompleteStep(completed);
      const allDone = STEP_ORDER.every(s => completed.includes(s));
      return {
        ...prev,
        completedSteps: completed,
        currentStep: allDone ? null : nextStep,
        completed: allDone,
        completedAt: allDone ? new Date().toISOString() : prev.completedAt,
      };
    });
  }, []);

  const skipStep = useCallback((stepId) => {
    setState(prev => {
      const skipped = [...new Set([...prev.skippedSteps, stepId])];
      const completed = [...new Set([...prev.completedSteps, stepId])];
      const nextStep = getNextIncompleteStep(completed);
      const allDone = STEP_ORDER.every(s => completed.includes(s));
      return {
        ...prev,
        skippedSteps: skipped,
        completedSteps: completed,
        currentStep: allDone ? null : nextStep,
        completed: allDone,
        completedAt: allDone ? new Date().toISOString() : prev.completedAt,
      };
    });
  }, []);

  const markTooltipShown = useCallback((tooltipId) => {
    setState(prev => ({
      ...prev,
      shownTooltips: [...new Set([...prev.shownTooltips, tooltipId])],
    }));
  }, []);

  const hasSeenTooltip = useCallback((tooltipId) => {
    return state.shownTooltips.includes(tooltipId);
  }, [state.shownTooltips]);

  const resetOnboarding = useCallback(() => {
    setState(FIRST_TIME_STATE);
    if (storageKey) localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Check if guide is active (user started and hasn't dismissed/completed)
  const isGuideActive = state.started && !state.dismissed && !state.completed;

  const value = {
    state,
    isGuideActive,
    startGuide,
    dismissGuide,
    reopenGuide,
    completeStep,
    skipStep,
    markTooltipShown,
    hasSeenTooltip,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// --- Helpers ---

const STEP_ORDER = ['resume', 'career-goal', 'agents', 'roadmap'];

function getNextIncompleteStep(completedSteps) {
  return STEP_ORDER.find(s => !completedSteps.includes(s)) || null;
}

/**
 * Load onboarding state from localStorage.
 * - If a key exists → returning user, restore their state.
 * - If no key exists → first-time user, show the welcome.
 * - If no storageKey (no userId) → inactive / returning-user state.
 */
function loadState(storageKey) {
  if (!storageKey) return RETURNING_USER_STATE;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      // Returning user — merge with defaults to handle schema changes
      return { ...FIRST_TIME_STATE, ...JSON.parse(saved) };
    }
    // No saved state → brand-new user
    return FIRST_TIME_STATE;
  } catch {
    return FIRST_TIME_STATE;
  }
}
