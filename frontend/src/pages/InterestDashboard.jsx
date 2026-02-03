import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import KnowledgeMap from '../components/interests/KnowledgeMap';
import TopicSidebar from '../components/interests/TopicSidebar';
import AchievementShelf from '../components/interests/AchievementShelf';
import ResumeAnalysisCard from '../components/interests/ResumeAnalysisCard';
import ResumeUpload from '../components/interests/ResumeUpload';
import { 
  LatestMentorMessage, 
  MessageHistoryPanel,
  MessageDetailModal 
} from '../components/mentor/MentorMessageCard';
import { getUserPlans, getMetricsSummary, getDashboardState, getMentorMessages, markMentorMessageRead } from '../api';
import { 
  Map, Trophy, TrendingUp, Clock, BookOpen, Sparkles, 
  ArrowLeft, Plus, Target, Zap, Loader2, CheckCircle2,
  Briefcase, GraduationCap, AlertCircle, FileText
} from 'lucide-react';

const InterestDashboard = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardState, setDashboardState] = useState(null);
  
  // Mentor messages state
  const [mentorMessages, setMentorMessages] = useState([]);
  const [latestMessage, setLatestMessage] = useState(null);
  const [showMessageHistory, setShowMessageHistory] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Get dashboard state first
      let stateData = null;
      if (user?.id) {
        try {
          stateData = await getDashboardState(user.id);
          setDashboardState(stateData);
          
          // Fetch mentor messages
          const messagesData = await getMentorMessages(user.id, 20);
          if (messagesData?.messages) {
            setMentorMessages(messagesData.messages);
            // Set latest unread message or most recent
            const unread = messagesData.messages.find(m => !m.read_at);
            setLatestMessage(unread || messagesData.messages[0] || null);
          }
        } catch (err) {
          console.error('Failed to fetch dashboard state:', err);
        }
      }

      // Only fetch plans/metrics if not in "setting up" state
      if (!stateData || !stateData.is_setting_up) {
        const [plansData, metricsData] = await Promise.all([
          getUserPlans('anonymous', 50).catch(() => []),
          getMetricsSummary().catch(() => null),
        ]);
        setPlans(plansData || []);
        setMetrics(metricsData);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismissMessage = async (messageId) => {
    try {
      await markMentorMessageRead(messageId);
      // Find next unread or clear
      const remaining = mentorMessages.filter(m => m.id !== messageId);
      const nextUnread = remaining.find(m => !m.read_at);
      setLatestMessage(nextUnread || null);
      // Update read status in list
      setMentorMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, read_at: new Date().toISOString() } : m)
      );
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  };

  const handleMessageClick = (message) => {
    setSelectedMessage(message);
    // Mark as read when viewing
    if (!message.read_at) {
      markMentorMessageRead(message.id).catch(console.error);
      setMentorMessages(prev => 
        prev.map(m => m.id === message.id ? { ...m, read_at: new Date().toISOString() } : m)
      );
    }
  };

  // Calculate stats
  const totalTopics = plans.length;
  const completedTopics = plans.filter(p => p.progress === 100).length;
  const totalSteps = plans.reduce((acc, p) => acc + (p.total_steps || 0), 0);
  const completedSteps = plans.reduce((acc, p) => {
    const completed = Math.round((p.progress || 0) / 100 * (p.total_steps || 0));
    return acc + completed;
  }, 0);

  // Group plans by topic categories (simple extraction)
  const topicGroups = plans.reduce((acc, plan) => {
    const category = extractCategory(plan.topic);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(plan);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"
        >
          <Map className="w-6 h-6 text-white" />
        </motion.div>
      </div>
    );
  }

  // Show "Setting Up" state if agent tasks exist but none completed
  if (dashboardState?.is_setting_up) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <div className="relative z-10 border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Career Dashboard
                </h1>
                <p className="text-sm text-gray-400">Your personalized learning journey</p>
              </div>
            </div>
          </div>
        </div>

        {/* Setting Up Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-8"
          >
            {/* Status Header */}
            <div className="text-center mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Setting Things Up</h2>
              <p className="text-gray-400">
                Our AI agents are preparing your personalized learning experience...
              </p>
            </div>

            {/* Onboarding Summary */}
            <div className="space-y-4 mb-8">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Your Profile</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SummaryCard
                  label="Domain"
                  value={dashboardState.user_context.selected_domain}
                  icon={Briefcase}
                />
                <SummaryCard
                  label="Education Level"
                  value={dashboardState.user_context.education_level}
                  icon={GraduationCap}
                />
                <SummaryCard
                  label="Time Commitment"
                  value={`${dashboardState.user_context.weekly_hours} hours/week`}
                  icon={Clock}
                  fullWidth
                />
              </div>

              <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Target className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-400 mb-1">Career Goal</div>
                    <div className="text-white">{dashboardState.user_context.career_goal_raw}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Tasks Progress */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Agent Progress</h3>
              
              <div className="space-y-3">
                {dashboardState.agent_tasks.map((task) => (
                  <AgentTaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>

            {/* Footer Message */}
            <div className="mt-8 pt-6 border-t border-gray-800/50 text-center">
              <p className="text-sm text-gray-500">
                This usually takes a few moments. You'll be automatically redirected when ready.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-400" />
                  Interest Dashboard
                </h1>
                <p className="text-sm text-gray-400">Your learning journey visualized</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-medium"
            >
              <Plus className="w-4 h-4" />
              Learn Something New
            </motion.button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="relative z-10 border-b border-gray-800/50 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={BookOpen}
              label="Topics Explored"
              value={totalTopics}
              color="purple"
            />
            <StatCard
              icon={Trophy}
              label="Completed"
              value={completedTopics}
              color="green"
            />
            <StatCard
              icon={Zap}
              label="Steps Completed"
              value={completedSteps}
              subvalue={`of ${totalSteps}`}
              color="blue"
            />
            <StatCard
              icon={TrendingUp}
              label="Learning Streak"
              value={metrics?.streak_days || 0}
              subvalue="days"
              color="orange"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Mentor Message Section */}
        {latestMessage && (
          <LatestMentorMessage
            message={latestMessage}
            onActionClick={(route) => navigate(route)}
            onDismiss={handleDismissMessage}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Knowledge Map - Main Area */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6 h-[500px]">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Map className="w-5 h-5 text-purple-400" />
                Knowledge Map
              </h2>
              <KnowledgeMap 
                topicGroups={topicGroups}
                onTopicSelect={setSelectedTopic}
              />
            </div>
          </div>

          {/* Topic Sidebar */}
          <div className="space-y-6">
            <TopicSidebar
              selectedTopic={selectedTopic}
              plans={plans}
              onNavigate={(planId) => navigate(`/learn/${planId}`)}
            />
            
            {/* Message History */}
            {mentorMessages.length > 0 && (
              <MessageHistoryPanel
                messages={mentorMessages}
                isExpanded={showMessageHistory}
                onToggle={() => setShowMessageHistory(!showMessageHistory)}
                onMessageClick={handleMessageClick}
                unreadCount={mentorMessages.filter(m => !m.read_at).length}
              />
            )}
          </div>
        </div>

        {/* Achievement Shelf */}
        <AchievementShelf
          completedTopics={completedTopics}
          completedSteps={completedSteps}
          streak={metrics?.streak_days || 0}
        />

        {/* Resume Section */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Resume Intelligence
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResumeUpload 
              userId={user?.id}
              onUploadComplete={() => {
                // Refresh data after upload
                fetchData();
              }}
            />
            <ResumeAnalysisCard userId={user?.id} />
          </div>
        </div>
      </div>

      {/* Message Detail Modal */}
      <MessageDetailModal
        message={selectedMessage}
        isOpen={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        onActionClick={(route) => navigate(route)}
      />
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subvalue, color }) => {
  const colorMap = {
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-cyan-600',
    orange: 'from-orange-500 to-amber-600',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{value}</span>
            {subvalue && <span className="text-sm text-gray-500">{subvalue}</span>}
          </div>
          <span className="text-sm text-gray-400">{label}</span>
        </div>
      </div>
    </motion.div>
  );
};

// Summary Card Component for Setting Up State
const SummaryCard = ({ label, value, icon: Icon, fullWidth = false }) => {
  return (
    <div className={`bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 ${fullWidth ? 'md:col-span-2' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10">
          <Icon className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <div className="text-sm text-gray-400">{label}</div>
          <div className="text-white font-medium">{value}</div>
        </div>
      </div>
    </div>
  );
};

// Agent Task Card Component
const AgentTaskCard = ({ task }) => {
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      label: 'Waiting'
    },
    running: {
      icon: Loader2,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      label: 'Processing',
      animate: true
    },
    completed: {
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      label: 'Done'
    },
    failed: {
      icon: AlertCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      label: 'Failed'
    }
  };

  const config = statusConfig[task.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <StatusIcon className={`w-5 h-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="text-white font-medium">{task.agent_name}</div>
            <div className="text-sm text-gray-400">{task.task_type.replace(/_/g, ' ')}</div>
          </div>
        </div>
        <div className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </div>
      </div>
    </div>
  );
};

// Helper function to extract category from topic
const extractCategory = (topic) => {
  if (!topic) return 'General';
  const lower = topic.toLowerCase();
  
  if (lower.includes('react') || lower.includes('vue') || lower.includes('angular') || lower.includes('frontend')) {
    return 'Frontend';
  }
  if (lower.includes('node') || lower.includes('python') || lower.includes('java') || lower.includes('backend')) {
    return 'Backend';
  }
  if (lower.includes('machine learning') || lower.includes('ml') || lower.includes('ai') || lower.includes('data')) {
    return 'AI/ML';
  }
  if (lower.includes('devops') || lower.includes('docker') || lower.includes('kubernetes') || lower.includes('cloud')) {
    return 'DevOps';
  }
  if (lower.includes('mobile') || lower.includes('ios') || lower.includes('android') || lower.includes('flutter')) {
    return 'Mobile';
  }
  return 'General';
};

export default InterestDashboard;
