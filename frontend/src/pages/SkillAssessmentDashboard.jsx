/**
 * SkillAssessmentDashboard Page
 * 
 * Main dashboard for skill assessments
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AcademicCapIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  PlayIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

import { 
  SkillScoreCard, 
  ProficiencyBadge, 
  WeakAreasHighlight,
  RetakeCooldown 
} from '../components/skills';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const SkillAssessmentDashboard = () => {
  const [userId] = useState('user-001'); // Replace with actual user context
  const [domain, setDomain] = useState('tech');
  const [skillSummary, setSkillSummary] = useState(null);
  const [weakAreas, setWeakAreas] = useState([]);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch data on mount and domain change
  useEffect(() => {
    fetchDashboardData();
  }, [userId, domain]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [summaryRes, weakAreasRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/api/assessments/${userId}/summary?domain=${domain}`),
        fetch(`${API_BASE}/api/assessments/${userId}/weak-areas?domain=${domain}`),
        fetch(`${API_BASE}/api/assessments/${userId}/history?domain=${domain}&limit=10`)
      ]);

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSkillSummary(summaryData);
      }

      if (weakAreasRes.ok) {
        const weakAreasData = await weakAreasRes.json();
        setWeakAreas(weakAreasData.weak_areas || []);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setRecentAssessments(historyData.assessments || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Domain toggle
  const DomainToggle = () => (
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => setDomain('tech')}
        className={`px-4 py-2 rounded-md font-medium transition-all ${
          domain === 'tech'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        💻 Tech
      </button>
      <button
        onClick={() => setDomain('medical')}
        className={`px-4 py-2 rounded-md font-medium transition-all ${
          domain === 'medical'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        🏥 Medical
      </button>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 dark:border-lime-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-slate-400">Loading skill assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-3">
                <AcademicCapIcon className="w-8 h-8 text-blue-500 dark:text-lime-400" />
                Skill Assessments
              </h1>
              <p className="text-gray-500 dark:text-slate-400 mt-1">
                Track your proficiency and identify areas for improvement
              </p>
            </div>
            <DomainToggle />
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6 border-b border-gray-200 -mb-px">
            {['overview', 'history', 'improvement'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Total Assessments"
                  value={skillSummary?.total_assessments || 0}
                  icon={ClipboardDocumentListIcon}
                  color="blue"
                />
                <StatCard
                  title="Average Score"
                  value={`${Math.round(skillSummary?.average_score || 0)}%`}
                  icon={ChartBarIcon}
                  color="emerald"
                />
                <StatCard
                  title="Skills Tracked"
                  value={skillSummary?.skills?.length || 0}
                  icon={AcademicCapIcon}
                  color="purple"
                />
              </div>

              {/* Skills Grid */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Skills</h2>
                {skillSummary?.skills && skillSummary.skills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {skillSummary.skills.map((skill) => (
                      <SkillScoreCard
                        key={skill.skill_or_subject}
                        skillName={skill.skill_or_subject}
                        score={skill.latest_score || skill.average_score || 0}
                        proficiencyLevel={skill.proficiency_level}
                        confidenceLevel={skill.confidence_level}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No assessments yet"
                    description="Take your first skill assessment to start tracking your progress"
                    icon={ClipboardDocumentListIcon}
                  />
                )}
              </div>

              {/* Weak Areas */}
              <WeakAreasHighlight
                weakAreas={weakAreas}
                recommendation="Focus on your weak areas through targeted practice and review."
              />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment History</h2>
              {recentAssessments.length > 0 ? (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Skill/Subject
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentAssessments.map((assessment) => (
                        <tr key={assessment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {assessment.skill_or_subject}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-semibold ${
                              assessment.raw_score >= 70 ? 'text-emerald-600' :
                              assessment.raw_score >= 40 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {Math.round(assessment.raw_score)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <ProficiencyBadge 
                              level={assessment.proficiency_level} 
                              size="sm"
                              animated={false}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(assessment.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <RetakeStatus retakeAvailableAt={assessment.retake_available_at} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No history yet"
                  description="Your assessment history will appear here"
                  icon={ClipboardDocumentListIcon}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'improvement' && (
            <motion.div
              key="improvement"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Skill Improvement</h2>
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Take multiple assessments for the same skill to see your improvement over time.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </motion.div>
  );
};

// Retake Status Component
const RetakeStatus = ({ retakeAvailableAt }) => {
  if (!retakeAvailableAt) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 text-sm">
        <CheckCircleIcon className="w-4 h-4" />
        Can retake
      </span>
    );
  }

  const now = new Date();
  const retakeTime = new Date(retakeAvailableAt);

  if (now >= retakeTime) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 text-sm">
        <CheckCircleIcon className="w-4 h-4" />
        Can retake
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-gray-500 text-sm">
      <ArrowPathIcon className="w-4 h-4" />
      Cooldown
    </span>
  );
};

// Empty State Component
const EmptyState = ({ title, description, icon: Icon }) => (
  <div className="bg-white rounded-xl shadow-lg p-12 text-center">
    <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500">{description}</p>
    <button className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors inline-flex items-center gap-2">
      <PlayIcon className="w-5 h-5" />
      Start Assessment
    </button>
  </div>
);

export default SkillAssessmentDashboard;
