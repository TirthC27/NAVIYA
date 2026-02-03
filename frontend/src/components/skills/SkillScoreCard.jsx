/**
 * SkillScoreCard Component
 * 
 * Displays the skill assessment score with visual gauge
 */

import React from 'react';
import { motion } from 'framer-motion';

const SkillScoreCard = ({ 
  skillName, 
  score, 
  proficiencyLevel, 
  confidenceLevel,
  className = '' 
}) => {
  // Color based on proficiency level
  const getColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'advanced':
        return { primary: '#10B981', bg: 'bg-emerald-500', light: 'bg-emerald-100' };
      case 'intermediate':
        return { primary: '#F59E0B', bg: 'bg-amber-500', light: 'bg-amber-100' };
      case 'beginner':
      default:
        return { primary: '#EF4444', bg: 'bg-red-500', light: 'bg-red-100' };
    }
  };

  const colors = getColor(proficiencyLevel);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-lg p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{skillName}</h3>
          <p className="text-sm text-gray-500 capitalize">{proficiencyLevel} Level</p>
        </div>
        {confidenceLevel && (
          <span className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${confidenceLevel === 'high' ? 'bg-green-100 text-green-700' : ''}
            ${confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' : ''}
            ${confidenceLevel === 'low' ? 'bg-red-100 text-red-700' : ''}
          `}>
            {confidenceLevel} confidence
          </span>
        )}
      </div>

      {/* Circular Score Gauge */}
      <div className="flex justify-center items-center my-6">
        <div className="relative w-32 h-32">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="#E5E7EB"
              strokeWidth="10"
              fill="none"
            />
            {/* Progress circle */}
            <motion.circle
              cx="64"
              cy="64"
              r="45"
              stroke={colors.primary}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{
                strokeDasharray: circumference
              }}
            />
          </svg>
          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-bold text-gray-900"
            >
              {Math.round(score)}%
            </motion.span>
            <span className="text-xs text-gray-500">Score</span>
          </div>
        </div>
      </div>

      {/* Proficiency indicator */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Beginner</span>
          <span>Intermediate</span>
          <span>Advanced</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full ${colors.bg} rounded-full`}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default SkillScoreCard;
