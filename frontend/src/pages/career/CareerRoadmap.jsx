import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Route, 
  Lock, 
  CheckCircle, 
  Circle, 
  ChevronRight, 
  ChevronDown,
  Clock,
  Briefcase,
  FolderGit2,
  Target,
  Bot,
  LayoutGrid,
  List,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import RoadmapFlowView from '../../components/roadmap/RoadmapFlowView';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Mock data for development
const mockRoadmap = [
  {
    id: 1,
    phase_number: 1,
    phase_title: 'Foundation Building',
    phase_description: 'Establish core skills and fundamental knowledge',
    is_completed: true,
    estimated_weeks: 4,
    skills: [
      { name: 'JavaScript ES6+', level: 'intermediate' },
      { name: 'HTML5 & CSS3', level: 'intermediate' },
      { name: 'Git Version Control', level: 'beginner' }
    ],
    projects: [
      { name: 'Personal Portfolio Website', type: 'individual', status: 'completed' },
      { name: 'Interactive To-Do App', type: 'individual', status: 'completed' }
    ],
    exit_criteria: 'Complete all foundation projects and pass basic JavaScript assessment with 70%+ score'
  },
  {
    id: 2,
    phase_number: 2,
    phase_title: 'Framework Mastery',
    phase_description: 'Deep dive into React ecosystem and modern tooling',
    is_completed: false,
    estimated_weeks: 6,
    skills: [
      { name: 'React.js', level: 'intermediate' },
      { name: 'State Management (Redux/Zustand)', level: 'beginner' },
      { name: 'React Router', level: 'intermediate' },
      { name: 'TypeScript Basics', level: 'beginner' }
    ],
    projects: [
      { name: 'E-commerce Product Page', type: 'individual', status: 'in_progress' },
      { name: 'Dashboard with Charts', type: 'individual', status: 'pending' }
    ],
    exit_criteria: 'Build a complete React application with state management and routing'
  },
  {
    id: 3,
    phase_number: 3,
    phase_title: 'Advanced Development',
    phase_description: 'Master advanced patterns and full-stack integration',
    is_completed: false,
    estimated_weeks: 8,
    skills: [
      { name: 'Next.js', level: 'intermediate' },
      { name: 'API Integration', level: 'intermediate' },
      { name: 'Testing (Jest/RTL)', level: 'beginner' },
      { name: 'Performance Optimization', level: 'beginner' }
    ],
    projects: [
      { name: 'Full-Stack Blog Platform', type: 'individual', status: 'pending' },
      { name: 'Real-time Chat Application', type: 'team', status: 'pending' }
    ],
    exit_criteria: 'Deploy a production-ready full-stack application with testing'
  },
  {
    id: 4,
    phase_number: 4,
    phase_title: 'Career Launch',
    phase_description: 'Prepare for job market and professional growth',
    is_completed: false,
    estimated_weeks: 4,
    skills: [
      { name: 'System Design Basics', level: 'beginner' },
      { name: 'Technical Communication', level: 'intermediate' },
      { name: 'Code Review Practices', level: 'beginner' }
    ],
    projects: [
      { name: 'Open Source Contribution', type: 'community', status: 'pending' },
      { name: 'Capstone Project', type: 'individual', status: 'pending' }
    ],
    exit_criteria: 'Complete mock interviews with 80%+ score and have a polished portfolio'
  }
];

const mockProfile = {
  career_goal: 'Senior Frontend Developer',
  target_timeline_months: 12
};

const PhaseCard = ({ phase, isActive, isExpanded, onToggle }) => {
  const getStatusIcon = () => {
    if (phase.is_completed) {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    }
    if (isActive) {
      return (
        <div className="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
        </div>
      );
    }
    return <Circle className="w-6 h-6 text-slate-300" />;
  };

  const getProjectStatus = (status) => {
    switch (status) {
      case 'completed':
        return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Completed</span>;
      case 'in_progress':
        return <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">In Progress</span>;
      default:
        return <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">Pending</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: phase.phase_number * 0.1 }}
      className={`relative ${phase.phase_number < 4 ? 'pb-8' : ''}`}
    >
      {/* Connector Line */}
      {phase.phase_number < 4 && (
        <div className={`absolute left-[19px] top-12 w-0.5 h-full ${phase.is_completed ? 'bg-green-200' : 'bg-slate-200'}`} />
      )}

      <div 
        className={`bg-white rounded-xl border ${isActive ? 'border-amber-300' : 'border-slate-200'} overflow-hidden cursor-pointer transition-all hover:border-slate-300`}
        onClick={onToggle}
      >
        {/* Header */}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {getStatusIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wide">Phase {phase.phase_number}</span>
                  <h3 className="font-semibold text-slate-800 mt-0.5">{phase.phase_title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {phase.estimated_weeks} weeks
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-1">{phase.phase_description}</p>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100"
          >
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Skills */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-slate-500" />
                  <h4 className="text-sm font-medium text-slate-700">Skills to Learn</h4>
                </div>
                <div className="space-y-2">
                  {phase.skills.map((skill, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">{skill.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        skill.level === 'advanced' ? 'bg-yellow-100 text-yellow-700' :
                        skill.level === 'intermediate' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {skill.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FolderGit2 className="w-4 h-4 text-slate-500" />
                  <h4 className="text-sm font-medium text-slate-700">Projects to Build</h4>
                </div>
                <div className="space-y-2">
                  {phase.projects.map((project, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                      <div>
                        <span className="text-sm text-slate-700">{project.name}</span>
                        <span className="text-xs text-slate-400 ml-2">({project.type})</span>
                      </div>
                      {getProjectStatus(project.status)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Exit Criteria */}
            <div className="px-5 pb-5">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-slate-500" />
                  <h4 className="text-sm font-medium text-slate-700">Exit Criteria</h4>
                </div>
                <p className="text-sm text-slate-600">{phase.exit_criteria}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

const CareerRoadmap = () => {
  const [roadmap, setRoadmap] = useState(null);
  const [phaseProgress, setPhaseProgress] = useState([]);
  const [stats, setStats] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('flow'); // 'flow' or 'list'

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user?.id;

  useEffect(() => {
    if (userId) {
      fetchRoadmap();
    }
  }, [userId]);

  const fetchRoadmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/roadmap/${userId}/dashboard`);
      if (!response.ok) {
        throw new Error('Failed to fetch roadmap');
      }
      const data = await response.json();
      
      if (data.has_roadmap) {
        setRoadmap(data.roadmap);
        setPhaseProgress(data.phase_progress || []);
        setStats(data.stats);
        
        // Set expanded to current active phase
        const activePhase = data.phase_progress?.find(p => p.status === 'active');
        if (activePhase) {
          setExpandedPhase(activePhase.phase_number);
        }
      } else {
        setRoadmap(null);
      }
    } catch (err) {
      console.error('Failed to fetch roadmap:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading your roadmap...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Error Loading Roadmap</h2>
          <p className="text-slate-500 mb-4">{error}</p>
          <button
            onClick={fetchRoadmap}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No roadmap state
  if (!roadmap) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto text-center py-20"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <Route className="w-10 h-10 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Roadmap Being Generated
          </h2>
          <p className="text-slate-500 mb-6">
            Our AI agents are working on creating your personalized career roadmap.
            This usually happens shortly after completing onboarding.
          </p>
          <button
            onClick={fetchRoadmap}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium"
          >
            Check Again
          </button>
        </motion.div>
      </div>
    );
  }

  // Convert API roadmap format to list view format
  const listViewData = roadmap.phases.map((phase, index) => {
    const progress = phaseProgress.find(p => p.phase_number === phase.phase_number);
    return {
      id: phase.phase_number,
      phase_number: phase.phase_number,
      phase_title: phase.phase_title,
      phase_description: phase.focus_areas?.join(', ') || '',
      is_completed: progress?.status === 'completed',
      is_active: progress?.status === 'active',
      estimated_weeks: Math.ceil(parseInt(roadmap.overall_duration_estimate) / roadmap.phases.length) || 4,
      skills: phase.skills_or_subjects?.map(s => ({ name: s, level: 'intermediate' })) || [],
      projects: phase.expected_outcomes?.map(o => ({ name: o, type: 'milestone', status: progress?.status === 'completed' ? 'completed' : 'pending' })) || [],
      exit_criteria: phase.completion_criteria?.join('; ') || ''
    };
  });

  const currentPhase = stats?.current_phase_number || 1;
  const completedPhases = stats?.completed_phases || 0;
  const totalPhases = stats?.total_phases || roadmap.phases.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">Career Roadmap</h1>
              <p className="text-slate-500 mt-1">
                Your personalized {roadmap.domain === 'tech' ? 'technology' : 'medical'} learning path
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('flow')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm transition-colors ${
                  viewMode === 'flow' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Flow View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="w-4 h-4" />
                List View
              </button>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Route className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Progress</p>
                  <p className="font-semibold text-slate-800">
                    Phase {currentPhase} of {totalPhases}
                  </p>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="text-sm text-slate-500">Duration</p>
                <p className="font-semibold text-slate-800">{roadmap.overall_duration_estimate}</p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="text-sm text-slate-500">Confidence</p>
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                  roadmap.confidence_level === 'high' 
                    ? 'bg-green-100 text-green-700' 
                    : roadmap.confidence_level === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                }`}>
                  {roadmap.confidence_level}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-32">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{completedPhases} done</span>
                  <span>{totalPhases - completedPhases} left</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${(completedPhases / totalPhases) * 100}%` }} 
                  />
                </div>
              </div>
              <button
                onClick={fetchRoadmap}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Flow View */}
      {viewMode === 'flow' && (
        <div className="h-[calc(100vh-220px)]">
          <RoadmapFlowView
            roadmap={roadmap}
            phaseProgress={phaseProgress}
            onPhaseClick={(phase) => {
              setExpandedPhase(phase.phase_number);
              setViewMode('list');
            }}
          />
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="max-w-4xl mx-auto p-8">
          {/* AI Agent Note */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-slate-100 rounded-lg px-4 py-3 mb-6"
          >
            <Bot className="w-5 h-5 text-slate-500" />
            <p className="text-sm text-slate-600">
              This roadmap was generated by RoadmapAgent based on your career goal and experience level.
            </p>
          </motion.div>

          {/* Roadmap Phases */}
          <div className="space-y-0">
            {listViewData.map((phase) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                isActive={phase.is_active}
                isExpanded={expandedPhase === phase.phase_number}
                onToggle={() => setExpandedPhase(
                  expandedPhase === phase.phase_number ? null : phase.phase_number
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerRoadmap;
