/**
 * GuidedTooltip — Phase 2: Contextual Guided Steps
 *
 * A glassmorphism tooltip that appears next to UI targets to guide users.
 * Each tooltip explains why the action matters, and always provides
 * Skip / Later options. Feels like advisor notes, not instructions.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, SkipForward } from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';

/**
 * @param {Object} props
 * @param {string} props.stepId - Onboarding step ID ('resume', 'career-goal', 'agents', 'roadmap')
 * @param {string} props.title - Tooltip title
 * @param {string} props.description - Why this action matters
 * @param {string} props.actionLabel - CTA button text
 * @param {function} props.onAction - What happens when user clicks CTA
 * @param {'top'|'bottom'|'left'|'right'} props.position - Where to show relative to target
 * @param {React.ReactNode} props.icon - Icon component
 * @param {React.ReactNode} props.children - Target element to wrap
 */
const GuidedTooltip = ({
  stepId,
  title,
  description,
  actionLabel = 'Got it',
  onAction,
  position = 'bottom',
  icon,
  children,
}) => {
  const { state, isGuideActive, completeStep, skipStep } = useOnboarding();
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  const isCurrentStep = isGuideActive && state.currentStep === stepId;
  const isAlreadyDone = state.completedSteps.includes(stepId);

  useEffect(() => {
    if (isCurrentStep && !isAlreadyDone) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isCurrentStep, isAlreadyDone]);

  const handleAction = () => {
    setVisible(false);
    completeStep(stepId);
    if (onAction) onAction();
  };

  const handleSkip = () => {
    setVisible(false);
    skipStep(stepId);
  };

  // Position classes
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  };

  // Arrow classes
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-white/10 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-white/10 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-white/10 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-white/10 border-y-transparent border-l-transparent',
  };

  return (
    <div className="relative" ref={ref}>
      {/* Spotlight glow on target when active */}
      {visible && (
        <motion.div
          className="absolute inset-0 rounded-xl ring-2 ring-blue-500/30 pointer-events-none z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          layoutId={`spotlight-${stepId}`}
          style={{ boxShadow: '0 0 30px rgba(59, 130, 246, 0.15)' }}
        />
      )}

      {children}

      <AnimatePresence>
        {visible && (
          <motion.div
            className={`absolute z-50 ${positionClasses[position]}`}
            initial={{ opacity: 0, y: position === 'bottom' ? -8 : 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === 'bottom' ? -8 : 8, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="w-72 naviya-glass rounded-xl p-4 border border-white/[0.08] shadow-2xl shadow-black/30">
              {/* Arrow indicator */}
              <div className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`} />

              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {icon && <span className="text-blue-400">{icon}</span>}
                  <h4 className="text-sm font-semibold text-white">{title}</h4>
                </div>
                <button
                  onClick={handleSkip}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{description}</p>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>Skip</span>
                </button>
                <button
                  onClick={handleAction}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-blue-600/80 text-white hover:bg-blue-500/80 transition-colors"
                >
                  <span>{actionLabel}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GuidedTooltip;
