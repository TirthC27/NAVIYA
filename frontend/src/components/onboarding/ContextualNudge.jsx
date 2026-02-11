/**
 * ContextualNudge — Progressive Disclosure Tooltips
 *
 * Shows a one-time contextual nudge when a user first encounters
 * a specific feature. Appears as a subtle advisor note that can
 * be dismissed and never shows again.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info } from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';

/**
 * @param {Object} props
 * @param {string} props.id - Unique tooltip ID for tracking
 * @param {string} props.message - The nudge message
 * @param {'top'|'bottom'|'left'|'right'} props.position
 * @param {number} props.delay - Delay before showing (ms)
 * @param {React.ReactNode} props.children - Target element
 */
const ContextualNudge = ({
  id,
  message,
  position = 'bottom',
  delay = 1000,
  children,
}) => {
  const { hasSeenTooltip, markTooltipShown } = useOnboarding();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasSeenTooltip(id)) return;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [id, delay, hasSeenTooltip]);

  const dismiss = () => {
    setVisible(false);
    markTooltipShown(id);
  };

  const posMap = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-flex">
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            className={`absolute z-50 ${posMap[position]}`}
            initial={{ opacity: 0, scale: 0.9, y: position === 'bottom' ? -4 : 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          >
            <div className="flex items-start gap-2 w-56 px-3 py-2.5 rounded-lg
              bg-slate-800/95 backdrop-blur-lg border border-slate-700/50
              shadow-lg shadow-black/20"
            >
              <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed flex-1">{message}</p>
              <button
                onClick={dismiss}
                className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContextualNudge;
