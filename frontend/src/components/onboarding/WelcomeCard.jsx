/**
 * WelcomeCard — Phase 1: Soft Entry
 *
 * A small glassmorphism overlay card that invites the user to take
 * a 60-second guided setup. Two options: "Guide me" / "I'll explore on my own".
 * Skipping saves state and never punishes the user.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Eye } from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';

const WelcomeCard = () => {
  const { state, startGuide, dismissGuide } = useOnboarding();

  if (!state.showWelcome || state.completed || state.dismissed || state.started) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Backdrop — subtle dim, not a lockout */}
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissGuide}
        />

        {/* Glass Card */}
        <motion.div
          className="relative z-10 max-w-md w-full mx-4"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 0.1 }}
        >
          <div className="naviya-glass rounded-2xl p-8 border border-white/[0.08]">
            {/* Glow accent */}
            <div className="absolute -top-px left-1/2 -translate-x-1/2 w-32 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

            {/* Icon */}
            <motion.div
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center mx-auto mb-6"
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.3 }}
            >
              <Sparkles className="w-7 h-7 text-blue-400" />
            </motion.div>

            {/* Title */}
            <motion.h2
              className="text-xl font-semibold text-white text-center mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              Welcome to NAVIYA
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              className="text-sm text-slate-400 text-center mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              A 60-second guided setup helps our AI agents personalize
              your career path. You can always skip and return later.
            </motion.p>

            {/* Actions */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              {/* Primary */}
              <button
                onClick={startGuide}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                  bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium text-sm
                  hover:from-blue-500 hover:to-purple-500 transition-all duration-300
                  shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30
                  group"
              >
                <span>Guide me</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Secondary */}
              <button
                onClick={dismissGuide}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                  text-slate-400 text-sm hover:text-slate-300
                  hover:bg-white/[0.04] transition-all duration-200"
              >
                <Eye className="w-4 h-4" />
                <span>I'll explore on my own</span>
              </button>
            </motion.div>

            {/* Footer note */}
            <motion.p
              className="text-xs text-slate-500 text-center mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              No lockouts. Full dashboard access either way.
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeCard;
