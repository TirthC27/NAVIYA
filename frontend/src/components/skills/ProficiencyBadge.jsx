/**
 * ProficiencyBadge Component
 * 
 * Displays proficiency level as a styled badge
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  AcademicCapIcon, 
  SparklesIcon, 
  StarIcon,
  FireIcon 
} from '@heroicons/react/24/solid';

const ProficiencyBadge = ({ 
  level, 
  size = 'md',
  showIcon = true,
  animated = true,
  className = '' 
}) => {
  // Badge configurations based on level
  const getBadgeConfig = (level) => {
    switch (level?.toLowerCase()) {
      case 'advanced':
        return {
          label: 'Advanced',
          icon: FireIcon,
          bgColor: 'bg-gradient-to-r from-emerald-500 to-teal-500',
          textColor: 'text-white',
          borderColor: 'border-emerald-400',
          glowColor: 'shadow-emerald-500/50'
        };
      case 'intermediate':
        return {
          label: 'Intermediate',
          icon: StarIcon,
          bgColor: 'bg-gradient-to-r from-amber-400 to-orange-500',
          textColor: 'text-white',
          borderColor: 'border-amber-400',
          glowColor: 'shadow-amber-500/50'
        };
      case 'beginner':
      default:
        return {
          label: 'Beginner',
          icon: AcademicCapIcon,
          bgColor: 'bg-gradient-to-r from-blue-400 to-indigo-500',
          textColor: 'text-white',
          borderColor: 'border-blue-400',
          glowColor: 'shadow-blue-500/50'
        };
    }
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      padding: 'px-2 py-0.5',
      text: 'text-xs',
      icon: 'w-3 h-3'
    },
    md: {
      padding: 'px-3 py-1',
      text: 'text-sm',
      icon: 'w-4 h-4'
    },
    lg: {
      padding: 'px-4 py-2',
      text: 'text-base',
      icon: 'w-5 h-5'
    }
  };

  const badge = getBadgeConfig(level);
  const sizing = sizeConfig[size] || sizeConfig.md;
  const Icon = badge.icon;

  const Component = animated ? motion.span : 'span';
  const animationProps = animated ? {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    whileHover: { scale: 1.05 },
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  } : {};

  return (
    <Component
      {...animationProps}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${badge.bgColor} ${badge.textColor}
        ${sizing.padding} ${sizing.text}
        shadow-lg ${badge.glowColor}
        ${className}
      `}
    >
      {showIcon && <Icon className={sizing.icon} />}
      <span>{badge.label}</span>
    </Component>
  );
};

export default ProficiencyBadge;
