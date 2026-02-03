/**
 * UnifiedDashboard Component
 * 
 * Single entry point for dashboard rendering.
 * Uses dashboard_state as single source of truth.
 * Only renders features that are unlocked.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  MapIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  SparklesIcon,
  CheckCircleIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

import { useDashboardState, FeatureGate, DashboardStateLoader } from '../context/DashboardStateContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// ============================================
// Feature Card Components
// ============================================

const FeatureCard = ({ 
  title, 
  description, 
  icon: Icon, 
  isReady, 
  onClick, 
  children,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-indigo-500',
    emerald: 'from-emerald-500 to-teal-500',
    purple: 'from-purple-500 to-pink-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-red-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={isReady ? { scale: 1.02 } : {}}
      className={`
        relative bg-white rounded-2xl shadow-lg overflow-hidden
        ${isReady ? 'cursor-pointer' : 'opacity-75'}
      `}
      onClick={isReady ? onClick : undefined}
    >
      {/* Header */}
      <div className={`
        bg-gradient-to-r ${colorClasses[color]} 
        px-6 py-4 flex items-center justify-between
      `}>
        <div className="flex items-center gap-3">
          <Icon className="w-6 h-6 text-white" />
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        {isReady ? (
          <CheckCircleIcon className="w-6 h-6 text-white/80" />
        ) : (
          <LockClosedIcon className="w-6 h-6 text-white/50" />
        )}
      </div>
      
      {/* Content */}
      <div className="p-6">
        {isReady ? (
          children || <p className="text-gray-600">{description}</p>
        ) : (
          <div className="text-center py-4">
            <LockClosedIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{description}</p>
            <p className="text-sm text-gray-400 mt-2">Complete previous steps to unlock</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// Resume Card
// ============================================

const ResumeCard = ({ onNavigate }) => {
  const { state, canAccess } = useDashboardState();
  const [resumeData, setResumeData] = useState(null);

  useEffect(() => {
    if (canAccess('resume_analysis') && state?.user_id) {
      fetchResumeData();
    }
  }, [canAccess, state?.user_id]);

  const fetchResumeData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/resume/${state.user_id}/analysis`);
      if (response.ok) {
        const data = await response.json();
        setResumeData(data);
      }
    } catch (err) {
      console.error('Error fetching resume data:', err);
    }
  };

  return (
    <FeatureCard
      title="Resume Analysis"
      description="Upload your resume to get AI-powered insights and recommendations"
      icon={DocumentTextIcon}
      isReady={canAccess('resume_analysis')}
      onClick={() => onNavigate('/resume')}
      color="blue"
    >
      {resumeData && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Overall Score</span>
            <span className="text-2xl font-bold text-blue-600">
              {resumeData.overall_resume_score || 0}/100
            </span>
          </div>
          {resumeData.recommendations?.slice(0, 2).map((rec, i) => (
            <p key={i} className="text-sm text-gray-500">• {rec}</p>
          ))}
          <button className="text-blue-600 text-sm font-medium hover:underline">
            View Full Analysis →
          </button>
        </div>
      )}
    </FeatureCard>
  );
};

// ============================================
// Roadmap Card
// ============================================

const RoadmapCard = ({ onNavigate }) => {
  const { state, canAccess } = useDashboardState();
  const [roadmapData, setRoadmapData] = useState(null);

  useEffect(() => {
    if (canAccess('roadmap') && state?.user_id) {
      fetchRoadmapData();
    }
  }, [canAccess, state?.user_id]);

  const fetchRoadmapData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/roadmap/${state.user_id}/summary`);
      if (response.ok) {
        const data = await response.json();
        setRoadmapData(data);
      }
    } catch (err) {
      console.error('Error fetching roadmap data:', err);
    }
  };

  return (
    <FeatureCard
      title="Career Roadmap"
      description="Get a personalized learning path based on your goals"
      icon={MapIcon}
      isReady={canAccess('roadmap')}
      onClick={() => onNavigate('/roadmap')}
      color="emerald"
    >
      {roadmapData && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Current Phase</span>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
              {state?.current_phase || 'Foundation'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Phases</span>
            <span className="font-semibold">{roadmapData.total_phases || 4}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${(roadmapData.completed_phases / roadmapData.total_phases) * 100 || 25}%` }}
            />
          </div>
          <button className="text-emerald-600 text-sm font-medium hover:underline">
            View Roadmap →
          </button>
        </div>
      )}
    </FeatureCard>
  );
};

// ============================================
// Skills Card
// ============================================

const SkillsCard = ({ onNavigate }) => {
  const { state, canAccess } = useDashboardState();
  const [skillsData, setSkillsData] = useState(null);

  useEffect(() => {
    if (canAccess('skill_assessment') && state?.user_id) {
      fetchSkillsData();
    }
  }, [canAccess, state?.user_id]);

  const fetchSkillsData = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/assessments/${state.user_id}/summary?domain=${state.domain || 'tech'}`
      );
      if (response.ok) {
        const data = await response.json();
        setSkillsData(data);
      }
    } catch (err) {
      console.error('Error fetching skills data:', err);
    }
  };

  return (
    <FeatureCard
      title="Skill Assessments"
      description="Test your knowledge and track your progress"
      icon={AcademicCapIcon}
      isReady={canAccess('skill_assessment')}
      onClick={() => onNavigate('/skills')}
      color="purple"
    >
      {skillsData && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Assessments Taken</span>
            <span className="font-semibold">{skillsData.total_assessments || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Average Score</span>
            <span className="text-2xl font-bold text-purple-600">
              {Math.round(skillsData.average_score || 0)}%
            </span>
          </div>
          <button className="text-purple-600 text-sm font-medium hover:underline">
            Take Assessment →
          </button>
        </div>
      )}
    </FeatureCard>
  );
};

// ============================================
// Mentor Card (Always Available)
// ============================================

const MentorCard = ({ onNavigate }) => {
  const { state } = useDashboardState();

  return (
    <FeatureCard
      title="AI Mentor"
      description="Get guidance and answers to your questions"
      icon={ChatBubbleLeftRightIcon}
      isReady={true}
      onClick={() => onNavigate('/mentor')}
      color="amber"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
          <SparklesIcon className="w-5 h-5 text-amber-600" />
          <span className="text-sm text-amber-800">
            {state?.last_updated_by_agent 
              ? `Last activity: ${state.last_updated_by_agent}`
              : 'Ready to help with your learning journey'}
          </span>
        </div>
        <button className="text-amber-600 text-sm font-medium hover:underline">
          Chat with Mentor →
        </button>
      </div>
    </FeatureCard>
  );
};

// ============================================
// Interview Card
// ============================================

const InterviewCard = ({ onNavigate }) => {
  const { canAccess } = useDashboardState();

  return (
    <FeatureCard
      title="Mock Interviews"
      description="Practice with AI-powered mock interviews"
      icon={VideoCameraIcon}
      isReady={canAccess('mock_interview')}
      onClick={() => onNavigate('/interview')}
      color="rose"
    >
      <div className="space-y-3">
        <p className="text-gray-600">
          Practice common interview questions and get instant feedback.
        </p>
        <button className="text-rose-600 text-sm font-medium hover:underline">
          Start Practice →
        </button>
      </div>
    </FeatureCard>
  );
};

// ============================================
// Progress Summary
// ============================================

const ProgressSummary = () => {
  const { state, unlockedFeatures } = useDashboardState();
  
  const totalFeatures = 5;
  const progress = (unlockedFeatures.length / totalFeatures) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Your Progress</h2>
          <p className="text-indigo-200">
            {state?.current_phase === 'onboarding' 
              ? 'Getting started' 
              : `Phase: ${state?.current_phase}`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{unlockedFeatures.length}/{totalFeatures}</div>
          <div className="text-indigo-200">Features Unlocked</div>
        </div>
      </div>
      
      <div className="h-3 bg-white/20 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-white rounded-full"
        />
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-indigo-200">
        <span>Start</span>
        <span>Career Ready</span>
      </div>
    </motion.div>
  );
};

// ============================================
// Main Dashboard Component
// ============================================

const UnifiedDashboard = ({ onNavigate = () => {} }) => {
  const { state, loading, error, lastUpdate } = useDashboardState();
  const [showUpdateAnimation, setShowUpdateAnimation] = useState(false);

  // Listen for realtime updates
  useEffect(() => {
    const handleUpdate = (event) => {
      setShowUpdateAnimation(true);
      setTimeout(() => setShowUpdateAnimation(false), 2000);
    };

    window.addEventListener('dashboard-state-updated', handleUpdate);
    return () => window.removeEventListener('dashboard-state-updated', handleUpdate);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <DashboardStateLoader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading dashboard: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Update notification */}
      <AnimatePresence>
        {showUpdateAnimation && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          >
            <SparklesIcon className="w-5 h-5" />
            <span>Dashboard updated!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to NAVIYA</h1>
          <p className="text-gray-500 mt-1">
            Your AI-powered career development platform
            {state?.domain && ` • ${state.domain === 'tech' ? '💻 Tech' : '🏥 Medical'} Track`}
          </p>
        </div>

        {/* Progress Summary */}
        <ProgressSummary />

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Mentor is always first and always available */}
          <MentorCard onNavigate={onNavigate} />
          
          {/* Resume - required for other features */}
          <ResumeCard onNavigate={onNavigate} />
          
          {/* Roadmap - unlocked after resume */}
          <RoadmapCard onNavigate={onNavigate} />
          
          {/* Skills - unlocked after first assessment */}
          <SkillsCard onNavigate={onNavigate} />
          
          {/* Interview - unlocked after sufficient skill assessments */}
          <InterviewCard onNavigate={onNavigate} />
        </div>

        {/* Last Updated */}
        {lastUpdate && (
          <p className="text-center text-gray-400 text-sm mt-8">
            Last updated: {new Date(lastUpdate).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default UnifiedDashboard;
