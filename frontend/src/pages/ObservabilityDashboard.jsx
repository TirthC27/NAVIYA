import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import KPICards from '../components/observability/KPICards';
import RadarScoreChart from '../components/observability/RadarScoreChart';
import SafetyDonut from '../components/observability/SafetyDonut';
import PromptLeaderboard from '../components/observability/PromptLeaderboard';
import TraceFeed from '../components/observability/TraceFeed';
import { getDashboard, getEvalRuns, getPromptVersions, getAllFeedback } from '../api';
import { 
  Activity, ArrowLeft, RefreshCw, ExternalLink, 
  BarChart3, Shield, FileText, Zap 
} from 'lucide-react';

const ObservabilityDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [evalRuns, setEvalRuns] = useState([]);
  const [promptVersions, setPromptVersions] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [dashData, evalsData, promptsData, feedbackData] = await Promise.all([
        getDashboard().catch(() => null),
        getEvalRuns(null, 50).catch(() => []),
        getPromptVersions().catch(() => []),
        getAllFeedback(100).catch(() => []),
      ]);
      
      setDashboard(dashData);
      setEvalRuns(evalsData || []);
      setPromptVersions(promptsData || []);
      setFeedback(feedbackData || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate metrics from data
  const metrics = {
    totalPlans: dashboard?.summary?.total_plans || 0,
    totalSteps: dashboard?.summary?.total_steps || 0,
    avgRating: dashboard?.summary?.avg_rating || 0,
    totalEvals: evalRuns.length,
    avgLatency: calculateAvgLatency(evalRuns),
    safetyScore: calculateSafetyScore(evalRuns),
    feedbackCount: feedback.length,
  };

  // Prepare chart data
  const radarData = prepareRadarData(evalRuns);
  const safetyData = prepareSafetyData(evalRuns);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"
        >
          <Activity className="w-6 h-6 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
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
                  <Activity className="w-5 h-5 text-green-400" />
                  Observability Dashboard
                </h1>
                <p className="text-sm text-gray-400">
                  OPIK-powered AI monitoring & evaluation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchAllData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-300 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
              <a
                href="https://www.comet.com/opik"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300 hover:bg-purple-500/30 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open OPIK
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <KPICards metrics={metrics} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Radar Chart */}
          <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Evaluation Scores
            </h3>
            <RadarScoreChart data={radarData} />
          </div>

          {/* Safety Donut */}
          <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              Safety Metrics
            </h3>
            <SafetyDonut data={safetyData} />
          </div>

          {/* Prompt Leaderboard */}
          <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Prompt Versions
            </h3>
            <PromptLeaderboard versions={promptVersions} />
          </div>
        </div>

        {/* Trace Feed */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Recent Traces
          </h3>
          <TraceFeed traces={evalRuns} />
        </div>
      </div>
    </div>
  );
};

// Helper functions
const calculateAvgLatency = (evals) => {
  if (!evals.length) return 0;
  const total = evals.reduce((acc, e) => acc + (e.latency_ms || 0), 0);
  return Math.round(total / evals.length);
};

const calculateSafetyScore = (evals) => {
  if (!evals.length) return 100;
  const safe = evals.filter(e => e.safety_passed !== false).length;
  return Math.round((safe / evals.length) * 100);
};

const prepareRadarData = (evals) => {
  // Aggregate scores from evaluations
  const scores = {
    relevance: 0,
    coherence: 0,
    helpfulness: 0,
    accuracy: 0,
    safety: 0,
  };
  
  let count = 0;
  evals.forEach(e => {
    if (e.scores) {
      Object.keys(scores).forEach(key => {
        if (e.scores[key] !== undefined) {
          scores[key] += e.scores[key];
        }
      });
      count++;
    }
  });

  if (count > 0) {
    Object.keys(scores).forEach(key => {
      scores[key] = Math.round((scores[key] / count) * 100) / 100;
    });
  } else {
    // Default demo data
    return [
      { subject: 'Relevance', score: 0.85 },
      { subject: 'Coherence', score: 0.90 },
      { subject: 'Helpfulness', score: 0.88 },
      { subject: 'Accuracy', score: 0.82 },
      { subject: 'Safety', score: 0.95 },
    ];
  }

  return Object.entries(scores).map(([key, value]) => ({
    subject: key.charAt(0).toUpperCase() + key.slice(1),
    score: value || 0.5,
  }));
};

const prepareSafetyData = (evals) => {
  if (!evals.length) {
    return [
      { name: 'Safe', value: 95, color: '#10b981' },
      { name: 'Warnings', value: 4, color: '#f59e0b' },
      { name: 'Blocked', value: 1, color: '#ef4444' },
    ];
  }

  let safe = 0, warnings = 0, blocked = 0;
  
  evals.forEach(e => {
    if (e.safety_passed === false) {
      blocked++;
    } else if (e.safety_warning) {
      warnings++;
    } else {
      safe++;
    }
  });

  const total = safe + warnings + blocked;
  return [
    { name: 'Safe', value: Math.round((safe / total) * 100), color: '#10b981' },
    { name: 'Warnings', value: Math.round((warnings / total) * 100), color: '#f59e0b' },
    { name: 'Blocked', value: Math.round((blocked / total) * 100), color: '#ef4444' },
  ];
};

export default ObservabilityDashboard;
