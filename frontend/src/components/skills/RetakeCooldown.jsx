/**
 * RetakeCooldown Component
 * 
 * Shows cooldown timer for assessment retakes
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClockIcon, 
  CheckCircleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

const RetakeCooldown = ({ 
  retakeAvailableAt, 
  onRetakeAvailable,
  className = '' 
}) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [canRetake, setCanRetake] = useState(false);

  useEffect(() => {
    if (!retakeAvailableAt) {
      setCanRetake(true);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date();
      const retakeTime = new Date(retakeAvailableAt);
      const diff = retakeTime - now;

      if (diff <= 0) {
        setCanRetake(true);
        setTimeLeft(null);
        onRetakeAvailable?.();
        return null;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      if (!remaining) {
        clearInterval(timer);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [retakeAvailableAt, onRetakeAvailable]);

  // Can retake - show enabled state
  if (canRetake) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          flex items-center gap-3 p-4 rounded-xl
          bg-gradient-to-r from-emerald-50 to-teal-50
          border border-emerald-200
          ${className}
        `}
      >
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-emerald-800">Ready to retake!</p>
          <p className="text-sm text-emerald-600">You can take this assessment again</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-emerald-600 transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Retake
        </motion.button>
      </motion.div>
    );
  }

  // Cooldown active - show timer
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        flex items-center gap-3 p-4 rounded-xl
        bg-gradient-to-r from-gray-50 to-slate-50
        border border-gray-200
        ${className}
      `}
    >
      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
        <ClockIcon className="w-5 h-5 text-gray-600" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-800">Cooldown Active</p>
        <p className="text-sm text-gray-500">Please wait before retaking</p>
      </div>
      
      {/* Timer display */}
      {timeLeft && (
        <div className="flex gap-2">
          <TimeUnit value={timeLeft.hours} label="hrs" />
          <span className="text-gray-400 self-center">:</span>
          <TimeUnit value={timeLeft.minutes} label="min" />
          <span className="text-gray-400 self-center">:</span>
          <TimeUnit value={timeLeft.seconds} label="sec" />
        </div>
      )}
    </motion.div>
  );
};

// Timer unit component
const TimeUnit = ({ value, label }) => (
  <div className="text-center">
    <AnimatePresence mode="wait">
      <motion.div
        key={value}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-gray-800 text-white px-2 py-1 rounded font-mono text-lg font-bold min-w-[2.5rem]"
      >
        {String(value).padStart(2, '0')}
      </motion.div>
    </AnimatePresence>
    <span className="text-xs text-gray-500 mt-0.5 block">{label}</span>
  </div>
);

export default RetakeCooldown;
