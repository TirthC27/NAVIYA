import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import KnowledgeMap from '../components/interests/KnowledgeMap';
import TopicSidebar from '../components/interests/TopicSidebar';
import AchievementShelf from '../components/interests/AchievementShelf';
import { getUserPlans, getMetricsSummary } from '../api';
import { 
  Map, Trophy, TrendingUp, Clock, BookOpen, Sparkles, 
  ArrowLeft, Plus, Target, Zap 
} from 'lucide-react';

const InterestDashboard = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [plansData, metricsData] = await Promise.all([
        getUserPlans('anonymous', 50).catch(() => []),
        getMetricsSummary().catch(() => null),
      ]);
      setPlans(plansData || []);
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
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
          <div>
            <TopicSidebar
              selectedTopic={selectedTopic}
              plans={plans}
              onNavigate={(planId) => navigate(`/learn/${planId}`)}
            />
          </div>
        </div>

        {/* Achievement Shelf */}
        <AchievementShelf
          completedTopics={completedTopics}
          completedSteps={completedSteps}
          streak={metrics?.streak_days || 0}
        />
      </div>
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

// Helper to extract category from topic
const extractCategory = (topic) => {
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
