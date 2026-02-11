/**
 * SoftGateWarning — Non-blocking accuracy warning
 *
 * When key context (like resume) is missing, this component shows
 * a subtle warning: "Generated with limited context" and offers
 * a CTA to improve accuracy. Never blocks usage.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowUpRight, X } from 'lucide-react';
import { useState } from 'react';

/**
 * @param {Object} props
 * @param {boolean} props.visible - Whether to show the warning
 * @param {string} props.message - Warning message
 * @param {string} props.ctaLabel - CTA button text
 * @param {function} props.onCtaClick - CTA click handler
 * @param {string} props.continueLabel - Continue button text
 * @param {function} props.onContinue - Continue handler
 */
const SoftGateWarning = ({
  visible = false,
  message = 'Generated with limited context — accuracy can be improved',
  ctaLabel = 'Improve accuracy',
  onCtaClick,
  continueLabel = 'Continue anyway',
  onContinue,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="w-full"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="naviya-glass rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-start gap-3">
              {/* Warning icon with glow */}
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">{message}</p>

                <div className="flex items-center gap-3">
                  {onCtaClick && (
                    <button
                      onClick={onCtaClick}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                        bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/20
                        transition-all duration-200"
                    >
                      <span>{ctaLabel}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                  {onContinue && (
                    <button
                      onClick={() => {
                        setDismissed(true);
                        onContinue();
                      }}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {continueLabel}
                    </button>
                  )}
                </div>
              </div>

              {/* Dismiss */}
              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SoftGateWarning;
