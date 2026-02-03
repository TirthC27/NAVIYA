/**
 * Roadmap Dashboard Page
 * 
 * Displays the user's career roadmap with:
 * - React Flow visualization of phases
 * - Progress tracking
 * - Phase details panel
 * - View-only mode (user cannot edit)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import RoadmapFlowView from '../components/roadmap/RoadmapFlowView';
import {
  ArrowLeft,
  Target,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Map,
  Trophy,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function RoadmapDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roadmapData, setRoadmapData] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  useEffect(() => {
    if (user?.id) {
      fetchRoadmapData();
    }
  }, [user?.id]);
  
  const fetchRoadmapData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/roadmap/${user.id}/dashboard`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch roadmap');
      }
      
      const data = await response.json();
      setRoadmapData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center"
        >
          <Map className="w-8 h-8 text-white" />
        </motion.div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Roadmap</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchRoadmapData}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  // No roadmap state
  if (!roadmapData?.has_roadmap) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
        {/* Header */}
        <div className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/interests')}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Map className="w-5 h-5 text-indigo-400" />
                  Career Roadmap
                </h1>
                <p className="text-sm text-gray-400">Your personalized learning path</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Empty State */}
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-12"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Roadmap Coming Soon
            </h2>
            <p className="text-gray-400 mb-6">
              Our AI agents are working on generating your personalized career roadmap.
              This usually takes a few moments after completing onboarding.
            </p>
            <button
              onClick={() => navigate('/interests')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
            >
              Back to Dashboard
            </button>
          </motion.div>
        </div>
      </div>
    );
  }
  
  const { roadmap, phase_progress, stats } = roadmapData;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/interests')}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Map className="w-5 h-5 text-indigo-400" />
                  Career Roadmap
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full
                    ${roadmap.domain === 'tech' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-green-500/20 text-green-400'}
                  `}>
                    {roadmap.domain === 'tech' ? 'Technology' : 'Medical'}
                  </span>
                </h1>
                <p className="text-sm text-gray-400">
                  {roadmap.overall_duration_estimate} estimated
                </p>
              </div>
            </div>
            
            {/* Progress Summary */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {stats.completed_phases}/{stats.total_phases}
                </div>
                <div className="text-xs text-gray-400">Phases Complete</div>
              </div>
              <div className="w-20 h-20 relative">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="#374151"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="url(#progressGradient)"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 35}`}
                    strokeDashoffset={`${2 * Math.PI * 35 * (1 - stats.overall_progress_percentage / 100)}`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {stats.overall_progress_percentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Bar */}
      <div className="border-b border-gray-800/50 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <StatBadge 
                icon={Target} 
                label="Current Phase" 
                value={`Phase ${stats.current_phase_number}`}
                color="indigo"
              />
              <StatBadge 
                icon={CheckCircle2} 
                label="Completed" 
                value={`${stats.completed_phases} phases`}
                color="green"
              />
              <StatBadge 
                icon={Clock} 
                label="Duration" 
                value={roadmap.overall_duration_estimate}
                color="amber"
              />
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <span className={`
                px-2 py-1 rounded-full text-xs
                ${roadmap.confidence_level === 'high' 
                  ? 'bg-green-500/20 text-green-400' 
                  : roadmap.confidence_level === 'medium'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'}
              `}>
                {roadmap.confidence_level} confidence
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">{roadmap.roadmap_version}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content - React Flow */}
      <div className="h-[calc(100vh-180px)]">
        <RoadmapFlowView
          roadmap={roadmap}
          phaseProgress={phase_progress}
          onPhaseClick={(phase) => {
            console.log('Phase clicked:', phase);
          }}
        />
      </div>
      
      {/* View Only Notice */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-full px-4 py-2 flex items-center gap-2 text-sm">
          <Target className="w-4 h-4 text-indigo-400" />
          <span className="text-gray-300">View-only mode</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-400">Roadmap is AI-generated</span>
        </div>
      </div>
    </div>
  );
}

// Stat Badge Component
function StatBadge({ icon: Icon, label, value, color }) {
  const colorMap = {
    indigo: 'text-indigo-400 bg-indigo-500/10',
    green: 'text-green-400 bg-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    purple: 'text-purple-400 bg-purple-500/10'
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-lg ${colorMap[color]}`}>
        <Icon className={`w-4 h-4 ${colorMap[color].split(' ')[0]}`} />
      </div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm font-medium text-white">{value}</div>
      </div>
    </div>
  );
}
