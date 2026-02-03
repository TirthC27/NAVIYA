import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Shield,
  Eye,
  RefreshCw
} from 'lucide-react';

// Mock data for observability metrics
const mockMetrics = {
  totalTraces: 1247,
  avgLatency: 234,
  successRate: 98.5,
  activeAgents: 6,
};

const mockTraces = [
  {
    id: 'trace-001',
    agent: 'SupervisorAgent',
    action: 'route_request',
    duration: 45,
    status: 'success',
    timestamp: '2 min ago'
  },
  {
    id: 'trace-002',
    agent: 'SkillExtractorAgent',
    action: 'extract_skills',
    duration: 1234,
    status: 'success',
    timestamp: '5 min ago'
  },
  {
    id: 'trace-003',
    agent: 'AssessmentAgent',
    action: 'generate_assessment',
    duration: 892,
    status: 'success',
    timestamp: '8 min ago'
  },
  {
    id: 'trace-004',
    agent: 'MentorAgent',
    action: 'mentor_chat',
    duration: 567,
    status: 'success',
    timestamp: '12 min ago'
  },
  {
    id: 'trace-005',
    agent: 'InterviewAgent',
    action: 'evaluate_answer',
    duration: 2100,
    status: 'warning',
    timestamp: '15 min ago'
  },
];

const mockSafetyMetrics = {
  piiDetected: 3,
  piiBlocked: 3,
  contentFiltered: 0,
  safetyScore: 100,
};

const mockAgentPerformance = [
  { agent: 'SupervisorAgent', calls: 342, avgLatency: 45, successRate: 99.7 },
  { agent: 'SkillExtractorAgent', calls: 89, avgLatency: 1120, successRate: 97.8 },
  { agent: 'AssessmentAgent', calls: 156, avgLatency: 890, successRate: 98.1 },
  { agent: 'InterviewAgent', calls: 78, avgLatency: 1450, successRate: 96.2 },
  { agent: 'MentorAgent', calls: 234, avgLatency: 560, successRate: 99.1 },
  { agent: 'RoadmapAgent', calls: 45, avgLatency: 2340, successRate: 97.8 },
];

const Observability = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Observability</h1>
          <p className="text-slate-500 mt-1">OPIK metrics, traces & agent performance</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      >
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-5 h-5 text-purple-500" />
            <span className="text-xs text-green-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{mockMetrics.totalTraces.toLocaleString()}</p>
          <p className="text-sm text-slate-500">Total Traces</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-xs text-green-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              -8%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{mockMetrics.avgLatency}ms</p>
          <p className="text-sm text-slate-500">Avg Latency</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{mockMetrics.successRate}%</p>
          <p className="text-sm text-slate-500">Success Rate</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-5 h-5 text-amber-500" />
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{mockMetrics.activeAgents}</p>
          <p className="text-sm text-slate-500">Active Agents</p>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trace Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-500" />
                Recent Traces
              </h3>
              <span className="text-xs text-slate-500">Live</span>
            </div>

            <div className="space-y-3">
              {mockTraces.map((trace, idx) => (
                <motion.div
                  key={trace.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    trace.status === 'success' ? 'bg-green-500' : 'bg-amber-500'
                  }`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 text-sm">{trace.agent}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-slate-600 text-sm">{trace.action}</span>
                    </div>
                    <span className="text-xs text-slate-400">{trace.timestamp}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className={`text-sm font-mono ${
                      trace.duration > 1000 ? 'text-yellow-600' : 'text-slate-600'
                    }`}>
                      {trace.duration}ms
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Safety & Agent Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Safety Metrics */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-green-500" />
              Safety Guardrails
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">PII Detected</span>
                <span className="font-medium text-slate-800">{mockSafetyMetrics.piiDetected}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">PII Blocked</span>
                <span className="font-medium text-green-600">{mockSafetyMetrics.piiBlocked}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Content Filtered</span>
                <span className="font-medium text-slate-800">{mockSafetyMetrics.contentFiltered}</span>
              </div>
              
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Safety Score</span>
                  <span className="font-bold text-green-600">{mockSafetyMetrics.safetyScore}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${mockSafetyMetrics.safetyScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Agent Performance */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              Agent Performance
            </h3>
            
            <div className="space-y-3">
              {mockAgentPerformance.slice(0, 4).map((agent) => (
                <div key={agent.agent} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {agent.agent.replace('Agent', '')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{agent.calls} calls</p>
                    <p className="text-xs text-green-600">{agent.successRate}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Observability;
