/**
 * OnboardingGuidePanel — Phase 2: Step-by-step sidebar panel
 *
 * A compact, non-blocking floating panel that shows the current
 * onboarding step. Always dismissible, always optional.
 * Appears as a small glass card in the bottom-left of the viewport.
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Target, Brain, Route, Check, SkipForward,
  ChevronRight, X, Sparkles, RotateCcw
} from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';
import AgentActivationVisual from './AgentActivationVisual';

const STEPS = [
  {
    id: 'resume',
    icon: FileText,
    title: 'Upload your resume',
    description: 'Your resume helps our AI agents understand your background, skills, and experience — enabling more accurate career recommendations.',
    skipLabel: 'Add later',
    skipNote: 'Features will work with limited context',
    color: '#3b82f6',
  },
  {
    id: 'career-goal',
    icon: Target,
    title: 'Set your career goal',
    description: 'Tell us where you\'re headed. Our transferable skill mapping engine will connect your current abilities to your target career path.',
    skipLabel: 'Skip for now',
    skipNote: 'We\'ll use your domain preferences',
    color: '#10b981',
  },
  {
    id: 'agents',
    icon: Brain,
    title: 'Meet your AI agents',
    description: 'NAVIYA uses a multi-agent system with a supervisor that routes your requests to specialized agents — Resume, Roadmap, Skills, and Mentor.',
    skipLabel: 'I understand',
    skipNote: null,
    color: '#8b5cf6',
    hasVisual: true,
  },
  {
    id: 'roadmap',
    icon: Route,
    title: 'Your personalized roadmap',
    description: 'Based on your profile, our roadmap agent builds an adaptive learning path. It evolves as you progress and gain new skills.',
    skipLabel: 'View later',
    skipNote: null,
    color: '#f59e0b',
  },
];

const OnboardingGuidePanel = () => {
  const {
    state,
    isGuideActive,
    completeStep,
    skipStep,
    dismissGuide,
    reopenGuide,
  } = useOnboarding();

  // Show reopen button when dismissed but not completed
  if (state.dismissed && !state.completed) {
    return (
      <motion.button
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl
          naviya-glass border border-white/[0.08] text-sm text-slate-400
          hover:text-white hover:border-blue-500/30 transition-all duration-300
          shadow-lg shadow-black/20"
        onClick={reopenGuide}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <RotateCcw className="w-4 h-4" />
        <span>Setup Guide</span>
      </motion.button>
    );
  }

  if (!isGuideActive) return null;

  const currentStepData = STEPS.find(s => s.id === state.currentStep);
  if (!currentStepData) return null;

  const stepIndex = STEPS.findIndex(s => s.id === state.currentStep);
  const progress = (state.completedSteps.length / STEPS.length) * 100;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.currentStep}
        className="fixed bottom-6 left-6 z-50 w-80"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
      >
        <div className="naviya-glass rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/30">
          {/* Progress bar */}
          <div className="h-0.5 bg-slate-800">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${currentStepData.color}15` }}
              >
                <currentStepData.icon
                  className="w-4 h-4"
                  style={{ color: currentStepData.color }}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Step {stepIndex + 1} of {STEPS.length}
              </span>
            </div>
            <button
              onClick={dismissGuide}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors"
              title="Dismiss guide"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            <h3 className="text-sm font-semibold text-white mb-1.5">
              {currentStepData.title}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {currentStepData.description}
            </p>

            {/* Agent activation visual */}
            {currentStepData.hasVisual && (
              <div className="mb-4">
                <AgentActivationVisual animate={true} />
              </div>
            )}

            {/* Step indicators */}
            <div className="flex items-center gap-1.5 mb-4">
              {STEPS.map((step, i) => (
                <div
                  key={step.id}
                  className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                    state.completedSteps.includes(step.id)
                      ? 'bg-blue-500'
                      : i === stepIndex
                      ? 'bg-blue-500/50'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => skipStep(currentStepData.id)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <SkipForward className="w-3 h-3" />
                <span>{currentStepData.skipLabel}</span>
              </button>

              <button
                onClick={() => completeStep(currentStepData.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium
                  bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white
                  hover:from-blue-500/80 hover:to-purple-500/80 transition-all duration-300"
              >
                <span>Continue</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Skip note */}
            {currentStepData.skipNote && (
              <p className="text-[10px] text-slate-600 mt-2 text-center">
                {currentStepData.skipNote}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingGuidePanel;
