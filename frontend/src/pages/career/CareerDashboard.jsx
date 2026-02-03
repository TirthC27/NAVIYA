import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Target, 
  Zap, 
  ChevronRight,
  Clock,
  Bot,
  FileText,
  MessageSquare,
  Route,
  Lock,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardState, FeatureGate } from '../../context/DashboardStateContext';
// REMOVED: Legacy API imports - dashboard_state is the ONLY source of truth

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const agentIcons = {
  RoadmapAgent: Route,
  SkillExtractorAgent: FileText,
  AssessmentAgent: Zap,
  MentorAgent: MessageSquare,
  InterviewAgent: MessageSquare,
  SupervisorAgent: Bot
};

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
};

const CareerDashboard = () => {
  // Use dashboard state context - single source of truth
  const { state: dashboardState, canAccess, unlockedFeatures, loading: stateLoading } = useDashboardState();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [nextAction, setNextAction] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = dashboardState?.user_id || localStorage.getItem('user_id');

  // Determine next best action based on dashboard state
  const getNextActionFromState = () => {
    if (!canAccess('resume_analysis')) {
      return {
        action_type: 'resume_upload',
        title: 'Upload Your Resume',
        description: 'Start by uploading your resume to get AI-powered insights and unlock personalized career features.',
        priority: 'high',
        estimated_time: '5 min',
        path: '/career/resume'
      };
    }
    if (!canAccess('roadmap')) {
      return {
        action_type: 'roadmap_generation',
        title: 'Generate Career Roadmap',
        description: 'Based on your resume analysis, let us create a personalized career development roadmap for you.',
        priority: 'high',
        estimated_time: '3 min',
        path: '/career/roadmap'
      };
    }
    if (!canAccess('skill_assessment')) {
      return {
        action_type: 'skill_assessment',
        title: 'Complete Skill Assessment',
        description: 'Take a quick skill assessment to validate your abilities and track your progress.',
        priority: 'high',
        estimated_time: '15 min',
        path: '/career/skills'
      };
    }
    if (!canAccess('mock_interview')) {
      return {
        action_type: 'mock_interview',
        title: 'Practice Mock Interview',
        description: 'You\'re ready for interview practice! Try our AI-powered mock interviews.',
        priority: 'medium',
        estimated_time: '20 min',
        path: '/career/interview'
      };
    }
    return {
      action_type: 'continue_learning',
      title: 'Continue Learning',
      description: 'Keep building your skills with our AI mentor and learning resources.',
      priority: 'low',
      estimated_time: 'Ongoing',
      path: '/career/mentor'
    };
  };

  useEffect(() => {
    // ONLY use dashboard_state as single source of truth
    // NO legacy /api/career/* calls
    if (stateLoading) return;
    
    setLoading(true);
    
    // Build dashboard data directly from dashboard_state
    setDashboardData({
      profile: {
        career_goal: dashboardState?.domain === 'medical' ? 'Healthcare Professional' : 'Tech Professional',
        experience_level: 'professional',
        target_timeline_months: 12,
        weekly_hours: 15
      },
      stats: {
        total_skills: dashboardState?.skill_eval_ready ? 5 : 0,
        advanced_skills: dashboardState?.skill_eval_ready ? 1 : 0,
        roadmap_phases: 4,
        completed_phases: unlockedFeatures.length,
        current_phase: dashboardState?.current_phase || 'onboarding',
        skill_readiness: unlockedFeatures.length * 20,
        interview_avg_score: dashboardState?.interview_ready ? 75 : null
      }
    });
    
    // Fetch agent activity from the correct endpoint (agent_activity_log)
    const fetchActivity = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/dashboard-state/agent-activity/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setActivityFeed(data.activities || []);
        }
      } catch (err) {
        console.log('Agent activity not available yet');
        setActivityFeed([]);
      }
    };
    
    if (userId) {
      fetchActivity();
    }
    
    // Set next action based on dashboard_state
    setNextAction(getNextActionFromState());
    setLoading(false);
    
  }, [userId, stateLoading, dashboardState?.current_phase, unlockedFeatures.length]);

  // Show loading state
  if (loading || stateLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const profile = dashboardData?.profile || {
    career_goal: 'Career Goal Not Set',
    target_timeline_months: 12,
    weekly_hours: 10
  };
  
  const stats = dashboardData?.stats || {
    total_skills: 0,
    advanced_skills: 0,
    roadmap_phases: 4,
    completed_phases: 0,
    current_phase: 1,
    skill_readiness: 0,
    interview_avg_score: null
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Getting Started Banner - Show when most features locked */}
      {unlockedFeatures.length <= 1 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">🎯 Getting Started with NAVIYA</h2>
              <p className="text-white/90 mb-4">
                Welcome! Complete these steps to unlock all features and get personalized career guidance:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {canAccess('resume_analysis') ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-white/50" />
                  )}
                  <span className="font-medium">Step 1: Upload your resume for AI analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  {canAccess('roadmap') ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Lock className="w-5 h-5 text-white/50" />
                  )}
                  <span className={canAccess('roadmap') ? 'font-medium' : 'text-white/70'}>
                    Step 2: Generate your personalized roadmap
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {canAccess('skill_assessment') ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Lock className="w-5 h-5 text-white/50" />
                  )}
                  <span className={canAccess('skill_assessment') ? 'font-medium' : 'text-white/70'}>
                    Step 3: Complete skill assessments
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {canAccess('mock_interview') ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Lock className="w-5 h-5 text-white/50" />
                  )}
                  <span className={canAccess('mock_interview') ? 'font-medium' : 'text-white/70'}>
                    Step 4: Practice with mock interviews
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold text-slate-800">Career Dashboard</h1>
        <p className="text-slate-500 mt-1">Your AI-powered career command center</p>
      </motion.div>

      {/* Career Goal Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-slate-200 p-6 mb-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Career Goal</p>
              <h2 className="text-xl font-semibold text-slate-800">{profile.career_goal || 'Not set'}</h2>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {profile.target_timeline_months} month timeline
                </span>
                <span className="text-xs text-slate-400">
                  {profile.weekly_hours}h/week commitment
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/career/roadmap"
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1"
          >
            View Roadmap
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid - Google-style pastel matte cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {/* Blue pastel card */}
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-blue-700 font-medium">Current Phase</span>
            <Route className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {stats.current_phase} <span className="text-sm font-normal text-blue-500">of {stats.roadmap_phases}</span>
          </p>
          <div className="mt-3 w-full bg-blue-100 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${(stats.completed_phases / stats.roadmap_phases) * 100}%` }} 
            />
          </div>
        </div>

        {/* Pink/Rose pastel card */}
        <div className="bg-pink-50 rounded-2xl p-5 border border-pink-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-pink-700 font-medium">Skills Tracked</span>
            <Zap className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-2xl font-bold text-pink-900">{stats.total_skills}</p>
          <p className="text-xs text-pink-500 mt-1">{stats.advanced_skills} at advanced level</p>
        </div>

        {/* Green/Mint pastel card */}
        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-emerald-700 font-medium">Skill Readiness</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-900">{stats.skill_readiness}%</p>
          <div className="mt-3 w-full bg-emerald-100 rounded-full h-1.5">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${stats.skill_readiness}%` }} 
            />
          </div>
        </div>

        {/* Yellow/Amber pastel card */}
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-amber-700 font-medium">Interview Score</span>
            <MessageSquare className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-900">
            {stats.interview_avg_score ? `${stats.interview_avg_score}%` : '--'}
          </p>
          <p className="text-xs text-amber-500 mt-1">Average performance</p>
        </div>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Best Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-800">Next Best Action</h3>
              {nextAction.priority === 'high' && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  Recommended
                </span>
              )}
            </div>
            
            <div className="bg-slate-50 rounded-lg p-5 mb-4">
              <h4 className="font-medium text-slate-800 mb-1">{nextAction.title}</h4>
              <p className="text-sm text-slate-500 mb-3">{nextAction.description}</p>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {nextAction.estimated_time}
              </span>
            </div>
            
            <Link
              to={nextAction.path}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 text-slate-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors shadow-sm"
            >
              Take Action
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Agent Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-white rounded-xl border border-slate-200 p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Agent Activity</h3>
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            
            {activityFeed.length > 0 ? (
              <div className="space-y-4">
                {activityFeed.slice(0, 5).map((activity) => {
                  const IconComponent = agentIcons[activity.agent_name] || Bot;
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 line-clamp-2">{activity.summary}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">{activity.agent_name}</span>
                          <span className="text-xs text-slate-300">•</span>
                          <span className="text-xs text-slate-400">{formatTimeAgo(activity.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-2">No agent activity yet</p>
                <p className="text-xs text-slate-400">
                  {dashboardState?.last_updated_by_agent 
                    ? `Last activity: ${dashboardState.last_updated_by_agent}`
                    : 'Complete actions to see AI agent updates'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions - Feature-Gated */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Quick Actions</h3>
          <span className="text-xs text-slate-400">
            {unlockedFeatures.length}/5 features unlocked
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Resume - Always first step */}
          <QuickActionCard
            to="/career/resume"
            icon={FileText}
            title="Analyze Resume"
            description="Get AI-powered feedback"
            isUnlocked={true}
            isComplete={canAccess('resume_analysis')}
          />

          {/* Skills - Unlocked after resume */}
          <QuickActionCard
            to="/career/skills"
            icon={Zap}
            title="Assess Skills"
            description="Test and validate abilities"
            isUnlocked={canAccess('skill_assessment')}
            isComplete={dashboardState?.skill_eval_ready}
          />

          {/* Interview - Unlocked after skills */}
          <QuickActionCard
            to="/career/interview"
            icon={MessageSquare}
            title="Practice Interview"
            description="Prepare with AI coach"
            isUnlocked={canAccess('mock_interview')}
            isComplete={dashboardState?.interview_ready}
          />
        </div>
      </motion.div>

      {/* Unlocked Features Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 bg-white rounded-xl border border-slate-200 p-6"
      >
        <h3 className="font-semibold text-slate-800 mb-4">Feature Progress</h3>
        <div className="flex flex-wrap gap-3">
          <FeatureStatusBadge name="Resume Analysis" isReady={dashboardState?.resume_ready} />
          <FeatureStatusBadge name="Career Roadmap" isReady={dashboardState?.roadmap_ready} />
          <FeatureStatusBadge name="Skill Assessment" isReady={dashboardState?.skill_eval_ready} />
          <FeatureStatusBadge name="Mock Interview" isReady={dashboardState?.interview_ready} />
          <FeatureStatusBadge name="AI Mentor" isReady={dashboardState?.mentor_ready} />
        </div>
      </motion.div>
    </div>
  );
};

// Quick Action Card Component with lock state
const QuickActionCard = ({ to, icon: Icon, title, description, isUnlocked, isComplete }) => {
  if (!isUnlocked) {
    // Determine helpful message based on which feature
    let unlockHint = "Complete previous steps to unlock";
    if (title.includes("Skill")) {
      unlockHint = "📋 Upload your resume first";
    } else if (title.includes("Interview")) {
      unlockHint = "⚡ Complete skill assessments first";
    }
    
    return (
      <div className="bg-slate-100 rounded-xl border border-slate-200 p-5 opacity-60 cursor-not-allowed relative group">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
        </div>
        <h4 className="font-medium text-slate-500 mt-3">{title}</h4>
        <p className="text-sm text-slate-400 mt-1">{unlockHint}</p>
        
        {/* Tooltip on hover */}
        <div className="absolute inset-0 bg-slate-900/90 text-white p-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-center">
          <div>
            <Lock className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">{unlockHint}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-all group relative"
    >
      {isComplete && (
        <div className="absolute top-3 right-3">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isComplete ? 'bg-emerald-100' : 'bg-slate-100'}`}>
          <Icon className={`w-5 h-5 ${isComplete ? 'text-emerald-600' : 'text-slate-600'}`} />
        </div>
        {!isComplete && (
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
        )}
      </div>
      <h4 className="font-medium text-slate-800 mt-3">{title}</h4>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    </Link>
  );
};

// Feature Status Badge
const FeatureStatusBadge = ({ name, isReady }) => (
  <div className={`
    px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5
    ${isReady 
      ? 'bg-emerald-100 text-emerald-700' 
      : 'bg-slate-100 text-slate-500'}
  `}>
    {isReady ? <CheckCircle className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
    {name}
  </div>
);

export default CareerDashboard;
