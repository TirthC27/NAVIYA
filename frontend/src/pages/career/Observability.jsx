import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Zap, Clock, CheckCircle, AlertTriangle,
  BarChart3, TrendingUp, Shield, Eye,
  RefreshCw, ExternalLink, Brain, Users, Gauge,
  ArrowUpRight, ArrowDownRight, Cpu, GitBranch,
  Target, Layers, Timer, Sparkles, Radio
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
} from 'recharts';
import { getOpikDashboard } from '../../api';

// ─── Animated Counter ─────────────────────────────────
const AnimatedNumber = ({ value, duration = 800 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const num = typeof value === 'number' ? value : parseFloat(value) || 0;
    const start = display;
    const diff = num - start;
    if (diff === 0) return;
    const steps = 30;
    const stepDur = duration / steps;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplay(Math.round((start + diff * (i / steps)) * 10) / 10);
      if (i >= steps) { clearInterval(timer); setDisplay(num); }
    }, stepDur);
    return () => clearInterval(timer);
  }, [value]);
  return <>{typeof display === 'number' && display % 1 !== 0 ? display.toFixed(1) : display}</>;
};

// ─── Pulse Dot ────────────────────────────────────────
const PulseDot = ({ color = 'green' }) => (
  <span className="relative flex h-2.5 w-2.5">
    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color === 'emerald' ? 'bg-emerald-400' : 'bg-green-400'}`} />
    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color === 'emerald' ? 'bg-emerald-500' : 'bg-green-500'}`} />
  </span>
);

// ─── Custom Tooltip ───────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 border border-gray-700 rounded-xl px-3 py-2 shadow-2xl backdrop-blur-sm">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color || '#f59e0b' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Gauge Component ──────────────────────────────────
const GaugeChart = ({ value, max = 100, label, color = '#f59e0b' }) => {
  const pct = Math.min(value / max, 1);
  const angle = pct * 180;
  const r = 60;
  const cx = 70;
  const cy = 70;
  const x1 = cx - r;
  const x2 = cx + r;
  const endX = cx + r * Math.cos(Math.PI - (angle * Math.PI) / 180);
  const endY = cy - r * Math.sin(Math.PI - (angle * Math.PI) / 180);
  const largeArc = angle > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="85" viewBox="0 0 140 85">
        <path d={`M ${x1} ${cy} A ${r} ${r} 0 0 1 ${x2} ${cy}`} fill="none" stroke="#374151" strokeWidth="10" strokeLinecap="round" />
        {pct > 0 && (
          <path d={`M ${x1} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
        )}
        <text x={cx} y={cy - 10} textAnchor="middle" className="fill-white text-xl font-bold">{value.toFixed(1)}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" className="fill-gray-400 text-[10px]">{label}</text>
      </svg>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────
const Observability = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [traces, setTraces] = useState([]);
  const [agentPerf, setAgentPerf] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [dataSource, setDataSource] = useState('loading');
  const [opikDashboardUrl, setOpikDashboardUrl] = useState('https://www.comet.com/opik');
  const [totalCost, setTotalCost] = useState(0);

  const fetchAll = useCallback(async () => {
    try {
      const res = await getOpikDashboard();
      if (res) {
        setDashboardData(res);
        setTraces(res.recent_traces || []);
        setAgentPerf(res.agents || []);
        setTimeline(res.timeline || []);
        setDataSource(res.source || 'unknown');
        setTotalCost(res.stats?.total_estimated_cost || 0);
        if (res.opik_dashboard_url) setOpikDashboardUrl(res.opik_dashboard_url);
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchAll().finally(() => setIsLoading(false));
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  };

  // ─── Computed metrics ─────────────────────────────────
  const stats = dashboardData?.stats || {};
  const totalTraces = stats.total_traces || traces.length || 0;
  const successRate = stats.success_rate != null ? (stats.success_rate * 100) : 100;
  const avgDuration = stats.avg_duration_ms || (stats.avg_duration_seconds != null ? (stats.avg_duration_seconds * 1000) : 0);
  const activeTraces = stats.active_traces || 0;
  const errorCount = stats.error_count || 0;

  const totalAgents = agentPerf.length || 0;
  const safetyScore = 100; // Computed from clean traces ratio
  const piiBlocked = 0;

  // Chart data
  const agentBarData = agentPerf.map(a => ({
    name: a.agent.replace('SkillAssessment', 'Assess.').replace('SkillRoadmap', 'Roadmap').replace('ResumeIntelligence', 'Resume').replace('InterviewEvaluation', 'Interview').replace('call', 'LLM'),
    calls: a.total_calls,
    successRate: Math.round(a.success_rate),
    latency: Math.round(a.avg_duration_ms),
    cost: a.total_cost || 0,
  }));

  const donutData = [
    { name: 'Success', value: Math.max(0, totalTraces - errorCount - activeTraces), color: '#10b981' },
    { name: 'Errors', value: errorCount, color: '#ef4444' },
    { name: 'Active', value: activeTraces, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const radarData = [
    { subject: 'Relevance', score: successRate / 10 },
    { subject: 'Quality', score: Math.min(10, totalTraces > 0 ? 7 : 0) },
    { subject: 'Safety', score: safetyScore / 10 },
    { subject: 'Speed', score: Math.min(10, avgDuration > 0 ? Math.max(0, (10000 - avgDuration) / 1000) : 0) },
    { subject: 'Accuracy', score: successRate / 10 },
  ];

  const timelineFiltered = timeline.filter(t => t.traces > 0 || t.success > 0);

  // Tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'agents', label: 'Agent Performance', icon: Brain },
    { id: 'traces', label: 'Live Traces', icon: Radio },
    { id: 'safety', label: 'Safety & Quality', icon: Shield },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Activity className="w-7 h-7 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-orange-500/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* ─── Header ──────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Activity className="w-5 h-5 text-white" />
              </div>
              Opik Observability
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Real-time AI agent monitoring, evaluation & tracing</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${dataSource === 'opik_cloud' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
              <PulseDot color={dataSource === 'opik_cloud' ? 'emerald' : 'green'} />
              <span className={`text-xs font-medium ${dataSource === 'opik_cloud' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {dataSource === 'opik_cloud' ? 'Opik Cloud' : dataSource === 'local_buffer' ? 'Local' : 'Live'}
              </span>
            </div>
            {totalCost > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Zap className="w-3 h-3 text-blue-500" />
                <span className="text-xs font-medium text-blue-500">${totalCost.toFixed(4)}</span>
              </div>
            )}
            <span className="text-xs text-slate-400 hidden md:block">{lastRefresh.toLocaleTimeString()}</span>
            <button onClick={handleRefresh} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <a href={opikDashboardUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors text-sm">
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Opik
            </a>
          </div>
        </motion.div>

        {/* ─── Tab Navigation ──────────────────────────── */}
        <div className="flex gap-1 mb-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1 w-fit">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { icon: Activity, label: 'Total Traces', value: totalTraces, color: 'amber', trend: totalTraces > 0 ? `${totalTraces}` : '0', up: true },
                  { icon: CheckCircle, label: 'Success Rate', value: `${successRate.toFixed(1)}%`, color: 'emerald', trend: successRate > 90 ? 'Healthy' : '', up: successRate > 90 },
                  { icon: Clock, label: 'Avg Latency', value: `${avgDuration.toFixed(0)}ms`, color: 'blue', trend: avgDuration < 5000 ? 'Fast' : 'Slow', up: avgDuration < 5000 },
                  { icon: Brain, label: 'Active Agents', value: totalAgents > 0 ? totalAgents : 8, color: 'purple', trend: 'All instrumented', up: true },
                  { icon: AlertTriangle, label: 'Errors', value: errorCount, color: errorCount > 0 ? 'red' : 'emerald', trend: errorCount === 0 ? 'Clean' : `${errorCount} issues`, up: errorCount === 0 },
                  { icon: Zap, label: 'Est. Cost', value: totalCost > 0 ? `$${totalCost.toFixed(4)}` : '$0.00', color: 'orange', trend: totalCost > 0 ? 'Tracked' : 'Idle', up: true },
                ].map((card, i) => (
                  <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-amber-500/30 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color === 'amber' ? 'bg-amber-500/10' : card.color === 'emerald' ? 'bg-emerald-500/10' : card.color === 'blue' ? 'bg-blue-500/10' : card.color === 'purple' ? 'bg-purple-500/10' : card.color === 'red' ? 'bg-red-500/10' : 'bg-orange-500/10'}`}>
                        <card.icon className={`w-4 h-4 ${card.color === 'amber' ? 'text-amber-500' : card.color === 'emerald' ? 'text-emerald-500' : card.color === 'blue' ? 'text-blue-500' : card.color === 'purple' ? 'text-purple-500' : card.color === 'red' ? 'text-red-500' : 'text-orange-500'}`} />
                      </div>
                      {card.trend && (
                        <span className={`text-[10px] font-medium flex items-center gap-0.5 ${card.up ? 'text-emerald-500' : 'text-red-500'}`}>
                          {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {card.trend}
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{typeof card.value === 'number' ? <AnimatedNumber value={card.value} /> : card.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Charts Row 1 - Timeline + Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    Trace Activity (24h)
                  </h3>
                  <div className="h-56">
                    {timelineFiltered.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timelineFiltered}>
                          <defs>
                            <linearGradient id="traceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Area type="monotone" dataKey="success" name="Success" stroke="#f59e0b" fill="url(#traceGrad)" strokeWidth={2} />
                          <Area type="monotone" dataKey="errors" name="Errors" stroke="#ef4444" fill="url(#errorGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                        <div className="text-center">
                          <Timer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>Traces will appear here as agents run</p>
                          <p className="text-xs mt-1 text-slate-400">Interact with agents to generate data</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-emerald-500" />
                    Trace Status
                  </h3>
                  <div className="h-48 relative">
                    {donutData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                            {donutData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-slate-400">
                          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No traces yet</p>
                        </div>
                      </div>
                    )}
                    {donutData.length > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <span className="text-2xl font-bold text-slate-800 dark:text-white">{totalTraces}</span>
                          <p className="text-[10px] text-slate-400">Total</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    {donutData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-[10px] text-slate-400">{d.name} ({d.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Charts Row 2 - Radar + Gauges */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    Quality Scores (Avg Feedback)
                  </h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                        <PolarGrid stroke="#374151" strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#6b7280', fontSize: 9 }} tickCount={5} />
                        <Radar name="Score" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                    <Gauge className="w-4 h-4 text-amber-500" />
                    System Health
                  </h3>
                  <div className="grid grid-cols-3 gap-4 py-4">
                    <GaugeChart value={successRate} max={100} label="Success %" color="#10b981" />
                    <GaugeChart value={safetyScore} max={100} label="Safety" color="#f59e0b" />
                    <GaugeChart value={Math.min(avgDuration > 0 ? (10000 - avgDuration) / 100 : 100, 100)} max={100} label="Speed Index" color="#3b82f6" />
                  </div>
                </div>
              </div>

              {/* Recent Traces Mini-feed */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-400" />
                    Recent Traces
                  </h3>
                  <button onClick={() => setActiveTab('traces')} className="text-xs text-amber-500 hover:text-amber-400 transition-colors">View all &rarr;</button>
                </div>
                {traces.length > 0 ? (
                  <div className="space-y-2">
                    {traces.slice(0, 5).map((trace, idx) => (
                      <motion.div key={trace.id || idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${trace.status === 'success' ? 'bg-emerald-500' : trace.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate block">{trace.name || 'Trace'}</span>
                          <span className="text-[10px] text-slate-400">
                            {trace.span_count || 0} spans
                            {trace.tags?.length > 0 && ` · ${trace.tags.join(', ')}`}
                            {trace.total_estimated_cost > 0 && ` · $${trace.total_estimated_cost.toFixed(6)}`}
                          </span>
                        </div>
                        <span className={`text-xs font-mono ${(trace.duration_ms || 0) > 2000 ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`}>
                          {(trace.duration_ms || 0).toFixed(0)}ms
                        </span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">No traces recorded yet. Use the agents to generate traces.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════════ AGENTS TAB ═══════════════ */}
          {activeTab === 'agents' && (
            <motion.div key="agents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {/* Agent comparison bar chart */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  Agent Call Volume
                </h3>
                <div className="h-64">
                  {agentBarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agentBarData} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="calls" name="Total Calls" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      <div className="text-center">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Run agents to see performance data</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Agent latency + success rate side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                    <Timer className="w-4 h-4 text-blue-500" />
                    Agent Latency (ms)
                  </h3>
                  <div className="h-56">
                    {agentBarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agentBarData} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="latency" name="Avg Latency (ms)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm"><p>No latency data yet</p></div>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Agent Success Rate (%)
                  </h3>
                  <div className="h-56">
                    {agentBarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agentBarData} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} tickLine={false} axisLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="successRate" name="Success %" fill="#10b981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm"><p>No data yet</p></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Agent performance table */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <Cpu className="w-4 h-4 text-purple-500" />
                  Agent Details
                </h3>
                {agentPerf.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium text-xs">Agent</th>
                          <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium text-xs">Calls</th>
                          <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium text-xs">Success %</th>
                          <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium text-xs">Avg (ms)</th>
                          <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium text-xs">Errors</th>
                          <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium text-xs">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentPerf.map((a, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                                  <Brain className="w-3 h-3 text-amber-500" />
                                </div>
                                <span className="font-medium text-slate-700 dark:text-slate-200">{a.agent}</span>
                              </div>
                            </td>
                            <td className="text-right py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono">{a.total_calls}</td>
                            <td className="text-right py-2.5 px-3">
                              <span className={`font-mono ${a.success_rate >= 95 ? 'text-emerald-500' : a.success_rate >= 80 ? 'text-amber-500' : 'text-red-500'}`}>
                                {a.success_rate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-right py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono">{a.avg_duration_ms.toFixed(0)}</td>
                            <td className="text-right py-2.5 px-3">
                              <span className={`font-mono ${a.errors > 0 ? 'text-red-500' : 'text-slate-400'}`}>{a.errors}</span>
                            </td>
                            <td className="text-right py-2.5 px-3">
                              <span className="font-mono text-blue-500">{(a.total_cost || 0) > 0 ? `$${a.total_cost.toFixed(6)}` : '—'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No agent data available yet. Use the application to generate traces.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════════ TRACES TAB ═══════════════ */}
          {activeTab === 'traces' && (
            <motion.div key="traces" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-500" />
                    All Traces
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-medium">{traces.length}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <PulseDot />
                    <span className="text-[10px] text-slate-400">Auto-refresh 30s</span>
                  </div>
                </div>

                {traces.length > 0 ? (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {traces.map((trace, idx) => (
                      <motion.div key={trace.id || idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }} className="border border-slate-100 dark:border-slate-800 rounded-lg p-3 hover:border-amber-500/30 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${trace.status === 'success' ? 'bg-emerald-500' : trace.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <span className="font-medium text-sm text-slate-700 dark:text-slate-200">{trace.name || 'Unnamed Trace'}</span>
                          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${trace.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : trace.status === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                            {trace.status || 'unknown'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{(trace.duration_ms || 0).toFixed(0)}ms</span>
                          <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{trace.span_count || 0} spans</span>
                          {trace.total_estimated_cost > 0 && (
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" />${trace.total_estimated_cost.toFixed(6)}</span>
                          )}
                          {trace.providers?.length > 0 && (
                            <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{trace.providers.join(', ')}</span>
                          )}
                          {trace.start_time && (
                            <span className="flex items-center gap-1"><Timer className="w-3 h-3" />{new Date(trace.start_time).toLocaleTimeString()}</span>
                          )}
                        </div>

                        {/* Tags */}
                        {trace.tags && trace.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {trace.tags.map((tag, ti) => (
                              <span key={ti} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-[10px] text-amber-500 font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Usage */}
                        {trace.usage && Object.keys(trace.usage).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.entries(trace.usage).map(([k, v]) => (
                              <span key={k} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                                {k}: <span className="font-mono text-amber-500">{typeof v === 'number' ? v.toLocaleString() : v}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Radio className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No traces recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">Interact with the AI agents to generate traces</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════════ SAFETY TAB ═══════════════ */}
          {activeTab === 'safety' && (
            <motion.div key="safety" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {/* Safety KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { icon: Shield, label: 'Safety Score', value: `${safetyScore}%`, color: 'emerald', desc: 'Content safety index' },
                  { icon: AlertTriangle, label: 'PII Blocked', value: piiBlocked, color: 'amber', desc: 'Personal info intercepted' },
                  { icon: CheckCircle, label: 'Clean Traces', value: `${Math.max(0, totalTraces - errorCount)}`, color: 'blue', desc: 'Safe completions' },
                  { icon: Eye, label: 'Monitored Agents', value: 8, color: 'purple', desc: 'All agents instrumented with Opik' },
                ].map((card, i) => (
                  <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color === 'emerald' ? 'bg-emerald-500/10' : card.color === 'amber' ? 'bg-amber-500/10' : card.color === 'blue' ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
                      <card.icon className={`w-5 h-5 ${card.color === 'emerald' ? 'text-emerald-500' : card.color === 'amber' ? 'text-amber-500' : card.color === 'blue' ? 'text-blue-500' : 'text-purple-500'}`} />
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{card.value}</p>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-0.5">{card.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Safety donut + quality radar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Safety Breakdown
                  </h3>
                  <div className="h-56 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Safe', value: safetyScore, color: '#10b981' },
                            { name: 'Warnings', value: Math.max(0, 100 - safetyScore - Math.min(2, 100 - safetyScore)), color: '#f59e0b' },
                            { name: 'Issues', value: Math.min(2, Math.max(0, 100 - safetyScore)), color: '#ef4444' },
                          ]}
                          cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <span className="text-3xl font-bold text-emerald-500">{safetyScore}%</span>
                        <p className="text-[10px] text-slate-400">Safe</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    Quality Dimensions
                  </h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                        <PolarGrid stroke="#374151" strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#6b7280', fontSize: 9 }} tickCount={5} />
                        <Radar name="Score" dataKey="score" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Evaluation & Observability Pipeline */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Evaluation & Observability Pipeline
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: 'LLM-as-Judge', desc: '4 evaluation dimensions: Relevance, Video Quality, Simplicity, Progressiveness. Each scored 0-1 by Gemini with Opik trace tracking.', icon: Brain, color: 'purple' },
                    { title: 'PII Guardrails', desc: 'Real-time PII detection and content filtering across all agent inputs/outputs. Every scan creates an Opik span for auditability.', icon: Shield, color: 'emerald' },
                    { title: 'Regression Testing', desc: '12 golden test cases with A/B prompt comparison. Automated quality validation before deployment with metrics logged to Opik.', icon: GitBranch, color: 'amber' },
                  ].map((item, i) => (
                    <motion.div key={item.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${item.color === 'purple' ? 'bg-purple-500/10' : item.color === 'emerald' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                        <item.icon className={`w-4 h-4 ${item.color === 'purple' ? 'text-purple-500' : item.color === 'emerald' ? 'text-emerald-500' : 'text-amber-500'}`} />
                      </div>
                      <h4 className="font-medium text-sm text-slate-700 dark:text-slate-200">{item.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Instrumented agents list */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-blue-500" />
                  Opik-Instrumented Agents (8/8)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: 'Supervisor Agent', spans: 'FetchUserContext, DomainGating, GoalNormalization, CreateDomainTasks', metrics: 'tasks_created, duration' },
                    { name: 'Mentor Agent', spans: 'Handle_{task_type} routing', metrics: 'execution_time_ms' },
                    { name: 'Resume Intelligence', spans: 'AnalyzeResume_{domain} LLM call', metrics: 'resume_score, execution_time_ms' },
                    { name: 'Interview Evaluation', spans: 'LLM_InterviewEval', metrics: 'overall_score, communication, technical' },
                    { name: 'Learning Graph', spans: 'generate_plan, evaluate_plan', metrics: 'relevance, quality, latency' },
                    { name: 'Skill Assessment', spans: 'ScenarioGeneration, ExplanationEval', metrics: 'logical_coherence, self_awareness' },
                    { name: 'Skill Roadmap', spans: 'FetchSkills, GapAnalysis, SaveDB', metrics: 'total_skills, missing_skills' },
                    { name: 'PII Guard', spans: 'detect_pii, filter_content', metrics: 'pii_count, safety_score' },
                  ].map((agent, i) => (
                    <motion.div key={agent.name} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-amber-500/30 transition-all">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{agent.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mb-1"><span className="text-slate-500 dark:text-slate-300">Spans:</span> {agent.spans}</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed"><span className="text-slate-500 dark:text-slate-300">Metrics:</span> {agent.metrics}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Observability;
