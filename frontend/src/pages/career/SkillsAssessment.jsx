import { useState, useEffect, useMemo, useCallback, useRef, createElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Play, Award, TrendingUp, CheckCircle, XCircle,
  ChevronRight, Clock, Trophy, Star, Shield, Brain,
  AlertTriangle, MessageSquare, Send, ArrowRight, RotateCcw,
  Target, Sparkles, Eye, EyeOff, Loader2, BarChart3,
  Briefcase, Scale, Monitor, ChevronDown, Users, Lock,
  Timer, Hash
} from 'lucide-react';
import {
  getAssessmentDomains,
  startScenarioAssessment,
  scoreScenarioActions,
  submitScenarioExplanation,
  getScenarioHistory
} from '../../api/career';
import useActivityTracker from '../../hooks/useActivityTracker';


// ============================================
// Constants
// ============================================
const DOMAIN_CONFIG = {
  tech:     { icon: Monitor,   color: 'amber',  gradient: 'from-amber-400 to-orange-500',  bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700' },
  business: { icon: Briefcase, color: 'blue',   gradient: 'from-blue-400 to-indigo-500',   bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-700' },
  law:      { icon: Scale,     color: 'emerald', gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
};

const ACTION_CATEGORY_ICONS = {
  investigate: Eye,
  communicate: MessageSquare,
  execute: Zap,
  escalate: AlertTriangle,
  defer: Clock,
};

const RISK_COLORS = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  high: 'text-red-600 bg-red-50 border-red-200',
};

const GRADE_COLORS = {
  A: 'from-emerald-400 to-green-500',
  B: 'from-blue-400 to-indigo-500',
  C: 'from-amber-400 to-orange-500',
  D: 'from-orange-400 to-red-500',
  F: 'from-red-500 to-red-700',
};

const SCORE_LABELS = {
  decision_quality: { label: 'Decision Quality', icon: Brain },
  risk_awareness: { label: 'Risk Awareness', icon: Shield },
  communication: { label: 'Communication', icon: MessageSquare },
  ethical_reasoning: { label: 'Ethical Reasoning', icon: Scale },
  stress_behavior: { label: 'Stress Behavior', icon: Timer },
};


// ============================================
// Score Ring Component
// ============================================
const ScoreRing = ({ score, size = 72, strokeWidth = 6, grade }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="url(#scoreGrad)" strokeWidth={strokeWidth} strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeDasharray={circumference}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-slate-800 dark:text-slate-100">{score}</span>
        <span className="text-[9px] font-bold text-slate-400">/ 100</span>
      </div>
    </div>
  );
};


// ============================================
// Score Bar Component
// ============================================
const ScoreBar = ({ label, icon: Icon, score, delay = 0 }) => (
  <div className="flex items-center gap-3">
    <div className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
      <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">{label}</span>
        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{score}</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  </div>
);


// ============================================
// Timer Component
// ============================================
const CountdownTimer = ({ seconds, onExpire, isPaused }) => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (isPaused || remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { onExpire?.(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, remaining, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgency = remaining <= 15 ? 'text-red-500' : remaining <= 30 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-200';

  return (
    <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${urgency}`}>
      <Timer className="w-4 h-4" />
      {mins}:{secs.toString().padStart(2, '0')}
      {remaining <= 15 && <motion.span animate={{ opacity: [1, 0.3] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-2 h-2 rounded-full bg-red-500 inline-block" />}
    </div>
  );
};


// ============================================
// STEP INDICATOR
// ============================================
const StepIndicator = ({ current, steps }) => (
  <div className="flex items-center gap-1">
    {steps.map((s, i) => (
      <div key={i} className="flex items-center gap-1">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
          i < current ? 'bg-amber-400 text-white' :
          i === current ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md' :
          'bg-slate-100 dark:bg-slate-800 text-slate-400'
        }`}>{i + 1}</div>
        {i < steps.length - 1 && <div className={`w-4 h-0.5 rounded ${i < current ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'}`} />}
      </div>
    ))}
  </div>
);


// ============================================
// MAIN COMPONENT — REPLACES OLD QUIZ
// ============================================
const SkillsAssessment = () => {
  useActivityTracker('skills');
  // Steps: select → loading → scenario → explain → results
  const [phase, setPhase] = useState('select');
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [scenario, setScenario] = useState(null);
  const [fullScenario, setFullScenario] = useState(null);
  const [selectedActions, setSelectedActions] = useState([]);
  const [scores, setScores] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [finalScores, setFinalScores] = useState(null);
  const [explanationFeedback, setExplanationFeedback] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timerExpired, setTimerExpired] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const startTime = useRef(Date.now());

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; }
  }, []);
  const userId = user?.id || user?.user_id;

  const PHASE_STEPS = ['select', 'scenario', 'explain', 'results'];
  const currentStep = Math.max(0, PHASE_STEPS.indexOf(phase));

  // Load domains + history on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [domRes, histRes] = await Promise.all([
          getAssessmentDomains(),
          userId ? getScenarioHistory(userId) : { history: [] },
        ]);
        setDomains(domRes.domains || []);
        setHistory(histRes.history || []);
      } catch (e) {
        console.error('Load error:', e);
      }
    };
    load();
  }, [userId]);

  // ── Start Assessment ─────────────────────────────────
  const handleStart = useCallback(async () => {
    if (!selectedDomain || !selectedSkill) return;
    setError('');
    setLoading(true);
    setPhase('loading');
    try {
      const res = await startScenarioAssessment(userId, selectedDomain, selectedSkill);
      setScenario(res.scenario);
      setFullScenario(res._full_scenario);
      setSelectedActions([]);
      startTime.current = Date.now();
      setTimerExpired(false);
      setPhase('scenario');
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to generate scenario');
      setPhase('select');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDomain, selectedSkill]);

  // ── Toggle Action ────────────────────────────────────
  const toggleAction = useCallback((actionId) => {
    setSelectedActions(prev => {
      const exists = prev.find(a => a.action_id === actionId);
      if (exists) return prev.filter(a => a.action_id !== actionId);
      return [...prev, { action_id: actionId, order: prev.length + 1, timestamp: Date.now() }];
    });
  }, []);

  // ── Submit Actions → Auto-Score ──────────────────────
  const handleSubmitActions = useCallback(async () => {
    if (selectedActions.length === 0) return;
    setLoading(true);
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);
    try {
      const res = await scoreScenarioActions({
        user_id: userId,
        domain: selectedDomain,
        skill: selectedSkill,
        scenario: fullScenario,
        actions: selectedActions,
        time_taken_seconds: timeTaken,
      });
      setScores(res.scores);
      setPhase('explain');
    } catch (e) {
      setError('Scoring failed — ' + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDomain, selectedSkill, fullScenario, selectedActions]);

  // ── Submit Explanation → Final ───────────────────────
  const handleSubmitExplanation = useCallback(async () => {
    setLoading(true);
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);
    try {
      const res = await submitScenarioExplanation({
        user_id: userId,
        domain: selectedDomain,
        skill: selectedSkill,
        scenario: fullScenario,
        actions: selectedActions,
        scores,
        explanation,
        time_taken_seconds: timeTaken,
      });
      setFinalScores(res.scores);
      setExplanationFeedback(res.explanation_feedback || null);
      setPhase('results');
      // Refresh history
      if (userId) {
        const h = await getScenarioHistory(userId);
        setHistory(h.history || []);
      }
    } catch (e) {
      setError('Evaluation failed — ' + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDomain, selectedSkill, fullScenario, selectedActions, scores, explanation]);

  // ── Reset ────────────────────────────────────────────
  const handleReset = () => {
    setPhase('select');
    setScenario(null);
    setFullScenario(null);
    setSelectedActions([]);
    setScores(null);
    setFinalScores(null);
    setExplanation('');
    setExplanationFeedback(null);
    setError('');
    setTimerExpired(false);
    setShowHidden(false);
  };

  const domainConfig = DOMAIN_CONFIG[selectedDomain] || DOMAIN_CONFIG.tech;


  // ============================================
  // SELECT PHASE — Domain + Skill picker
  // ============================================
  if (phase === 'select') {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors">
        {/* Header */}
        <div className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">Skill Assessment</h1>
              <p className="text-[10px] text-slate-400">Scenario-based evaluation — test real decision-making</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          <div className="max-w-4xl mx-auto px-6 pt-8 pb-6">
            {/* Welcome */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Target className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Choose Your Assessment</h2>
              <p className="text-sm text-slate-400">Select a domain and skill to start a real-world scenario</p>
            </motion.div>

            {/* Domain Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {domains.map((d, i) => {
                const cfg = DOMAIN_CONFIG[d.id] || DOMAIN_CONFIG.tech;
                const DIcon = cfg.icon;
                const isSelected = selectedDomain === d.id;
                return (
                  <motion.button
                    key={d.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => { setSelectedDomain(d.id); setSelectedSkill(''); }}
                    className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                      isSelected
                        ? `${cfg.bg} ${cfg.border} shadow-md`
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-10 h-10 bg-gradient-to-br ${cfg.gradient} rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
                      <DIcon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-0.5">{d.label}</h3>
                    <p className="text-[11px] text-slate-400">{d.skills?.length || 0} skills available</p>
                    {isSelected && (
                      <motion.div layoutId="domainCheck" className="absolute top-3 right-3">
                        <CheckCircle className={`w-5 h-5 ${cfg.text}`} />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Skill Picker */}
            <AnimatePresence>
              {selectedDomain && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-slate-400" /> Select Skill to Test
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {domains.find(d => d.id === selectedDomain)?.skills?.map((skill, i) => (
                      <motion.button
                        key={skill}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => setSelectedSkill(skill)}
                        className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                          selectedSkill === skill
                            ? `${domainConfig.bg} ${domainConfig.border} ${domainConfig.text} font-semibold shadow-sm`
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {skill}
                      </motion.button>
                    ))}
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 text-center">{error}</div>
                  )}

                  {/* Start Button */}
                  <div className="flex justify-center">
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: selectedSkill ? 1 : 0.5 }}
                      onClick={handleStart}
                      disabled={!selectedSkill}
                      className={`flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold text-white text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${domainConfig.gradient}`}
                    >
                      <Play className="w-4 h-4" /> Start Assessment
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* History */}
            {history.length > 0 && (
              <div className="mt-10">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" /> Recent Assessments
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {history.slice(0, 6).map((h, i) => {
                    const hCfg = DOMAIN_CONFIG[h.domain] || DOMAIN_CONFIG.tech;
                    const HIcon = hCfg.icon;
                    return (
                      <motion.div
                        key={h.id || i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 bg-gradient-to-br ${hCfg.gradient} rounded-lg flex items-center justify-center shrink-0`}>
                            <HIcon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{h.skill}</p>
                            <p className="text-[10px] text-slate-400">{h.domain} • {h.completed_at ? new Date(h.completed_at).toLocaleDateString() : ''}</p>
                          </div>
                          <div className={`text-lg font-black bg-gradient-to-r ${GRADE_COLORS[h.scores?.grade] || GRADE_COLORS.C} bg-clip-text text-transparent`}>
                            {h.scores?.grade || '?'}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${(h.total_score || 0) >= 70 ? 'bg-green-500' : (h.total_score || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${h.total_score || 0}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{Math.round(h.total_score || 0)}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }


  // ============================================
  // LOADING PHASE — pipeline animation
  // ============================================
  if (phase === 'loading') {
    const DIcon = domainConfig.icon;
    const steps = [
      { label: 'Loading core rules...', icon: Shield },
      { label: `Loading ${selectedDomain} rule pack...`, icon: DIcon },
      { label: 'AI generating scenario...', icon: Brain },
      { label: 'Building your challenge...', icon: Sparkles },
    ];
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 max-w-sm w-full">
          <div className={`w-14 h-14 bg-gradient-to-br ${domainConfig.gradient} rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md`}>
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <h2 className="text-center text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Preparing Assessment</h2>
          <p className="text-center text-xs text-slate-400 mb-6">{selectedSkill}</p>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.5 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 bg-amber-100 dark:bg-lime-500/10 rounded-lg flex items-center justify-center">
                  {createElement(s.icon, { className: 'w-3.5 h-3.5 text-amber-600 dark:text-lime-400' })}
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-300">{s.label}</span>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.5 + 0.4 }}
                  className="ml-auto"
                >
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }


  // ============================================
  // SCENARIO PHASE — THE GAME
  // ============================================
  if (phase === 'scenario' && scenario) {
    const actions = scenario.available_actions || [];
    const timeLimit = scenario.time_limit_seconds || 120;
    const DIcon = domainConfig.icon;

    return (
      <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors">
        {/* Scenario Header */}
        <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 bg-gradient-to-br ${domainConfig.gradient} rounded-lg flex items-center justify-center`}>
                <DIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedSkill}</h1>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                    scenario.urgency === 'high' ? 'bg-red-100 text-red-600' :
                    scenario.urgency === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                  }`}>{scenario.urgency} urgency</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StepIndicator current={1} steps={PHASE_STEPS} />
              <div className="text-[10px] text-slate-400">
                <span className="font-bold text-slate-600 dark:text-slate-300">{selectedActions.length}</span> / {actions.length} selected
              </div>
              <CountdownTimer
                seconds={timeLimit}
                onExpire={() => setTimerExpired(true)}
                isPaused={false}
              />
            </div>
          </div>
        </div>

        {/* Scenario Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'thin' }}>
          <div className="max-w-3xl mx-auto">
            {/* Context Card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Situation</h3>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{scenario.context}</p>
              {scenario.background_info && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-[11px] font-medium text-blue-700">
                    <Eye className="w-3 h-3 inline mr-1" /> {scenario.background_info}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Time expired warning */}
            {timerExpired && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 text-center font-medium">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> Time expired — submit your current selections now.
              </motion.div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 text-center">{error}</div>
            )}

            {/* Action Cards */}
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Choose your actions (order matters)
            </h3>
            <div className="grid grid-cols-1 gap-3 mb-6">
              {actions.map((action, i) => {
                const isSelected = selectedActions.find(a => a.action_id === action.id);
                const order = isSelected ? selectedActions.findIndex(a => a.action_id === action.id) + 1 : null;
                const CatIcon = ACTION_CATEGORY_ICONS[action.category] || Zap;
                const riskClass = RISK_COLORS[action.risk_level] || RISK_COLORS.medium;

                return (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => toggleAction(action.id)}
                    className={`relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      isSelected
                        ? `${domainConfig.bg} ${domainConfig.border} shadow-md`
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Order Badge */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? `bg-gradient-to-br ${domainConfig.gradient} text-white shadow-sm`
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {order ? <span className="text-xs font-black">{order}</span> : <CatIcon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isSelected ? 'text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>{action.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {action.risk_level && (
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${riskClass}`}>
                            {action.risk_level} risk
                          </span>
                        )}
                        {action.category && <span className="text-[10px] text-slate-400 capitalize">{action.category}</span>}
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0">
                        <CheckCircle className={`w-5 h-5 ${domainConfig.text}`} />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Submit Bar */}
        <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={handleSubmitActions}
              disabled={selectedActions.length === 0 || loading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 bg-gradient-to-r ${domainConfig.gradient}`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Submit Actions
            </button>
          </div>
        </div>
      </div>
    );
  }


  // ============================================
  // EXPLAIN PHASE — scoring preview + explanation
  // ============================================
  if (phase === 'explain' && scores) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors">
        <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 bg-gradient-to-br ${domainConfig.gradient} rounded-lg flex items-center justify-center`}>
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Explain Your Decisions</h1>
                <p className="text-[10px] text-slate-400">Why did you choose those actions in that order?</p>
              </div>
            </div>
            <StepIndicator current={2} steps={PHASE_STEPS} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6" style={{ scrollbarWidth: 'thin' }}>
          <div className="max-w-2xl mx-auto">
            {/* Quick Score Preview */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Initial Action Scores</h3>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{scores.total || 0}</span>
                  <span className="text-[10px] text-slate-400">/ 100</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(SCORE_LABELS).map(([key, { label, icon }]) => {
                  const s = scores[key]?.score ?? scores[key] ?? 0;
                  const scoreNum = typeof s === 'object' ? s.score || 0 : s;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        scoreNum >= 70 ? 'bg-green-100' : scoreNum >= 50 ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        {createElement(icon, { className: `w-3 h-3 ${
                          scoreNum >= 70 ? 'text-green-600' : scoreNum >= 50 ? 'text-amber-600' : 'text-red-600'
                        }` })}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">{label}</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{scoreNum}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Breakdown */}
            {scores.breakdown?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Action Breakdown</h3>
                <div className="space-y-2">
                  {scores.breakdown.map((b, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <span className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{b.action_id || b.label}</p>
                        {b.rules_followed?.map((f, j) => (
                          <p key={`f-${j}`} className="text-[10px] text-green-600 mt-0.5">✓ {typeof f === 'string' ? f : f.rule || f.id}</p>
                        ))}
                        {b.rules_violated?.map((v, j) => (
                          <p key={`v-${j}`} className="text-[10px] text-red-500 mt-0.5">✗ {typeof v === 'string' ? v : v.rule || v.id}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 text-center">{error}</div>
            )}

            {/* Explanation Input */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Your Reasoning</h3>
              <p className="text-[11px] text-slate-400 mb-3">Explain why you made those decisions. This affects your final score.</p>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="I chose to investigate first because... I communicated early since... I avoided restarting because..."
                className="w-full h-32 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 dark:bg-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none"
                autoFocus
              />
            </motion.div>
          </div>
        </div>

        {/* Bottom */}
        <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button onClick={() => setPhase('scenario')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
              <ChevronRight className="w-3 h-3 rotate-180" /> Back to scenario
            </button>
            <button
              onClick={handleSubmitExplanation}
              disabled={!explanation.trim() || loading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 bg-gradient-to-r ${domainConfig.gradient}`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit & Get Results
            </button>
          </div>
        </div>
      </div>
    );
  }


  // ============================================
  // RESULTS PHASE — final profile
  // ============================================
  if (phase === 'results' && finalScores) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors">
        <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 bg-gradient-to-br ${domainConfig.gradient} rounded-lg flex items-center justify-center`}>
                <Award className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Assessment Complete</h1>
                <p className="text-[10px] text-slate-400">{selectedSkill} • {selectedDomain}</p>
              </div>
            </div>
            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <RotateCcw className="w-3 h-3" /> New Assessment
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6" style={{ scrollbarWidth: 'thin' }}>
          <div className="max-w-3xl mx-auto">
            {/* Big Score Card */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-5 shadow-sm">
              <div className="flex items-center gap-6">
                <ScoreRing score={finalScores.total || 0} grade={finalScores.grade} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-3xl font-black bg-gradient-to-r ${GRADE_COLORS[finalScores.grade] || GRADE_COLORS.C} bg-clip-text text-transparent`}>
                      Grade {finalScores.grade || '?'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    {(finalScores.total || 0) >= 85 ? 'Excellent decision-making under pressure!' :
                     (finalScores.total || 0) >= 70 ? 'Good judgment with room for improvement.' :
                     (finalScores.total || 0) >= 55 ? 'Decent effort — review the feedback below.' :
                     'Needs improvement — focus on the highlighted areas.'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Score Bars */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Skill Profile</h3>
              <div className="space-y-4">
                {Object.entries(SCORE_LABELS).map(([key, { label, icon }], i) => {
                  const s = finalScores[key];
                  const scoreNum = typeof s === 'object' ? (s?.score ?? 0) : (s ?? 0);
                  return <ScoreBar key={key} label={label} icon={icon} score={scoreNum} delay={i * 0.1} />;
                })}
              </div>
            </motion.div>

            {/* Explanation Feedback */}
            {explanationFeedback && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-lime-500/10 dark:to-lime-500/10 rounded-2xl border border-amber-200 dark:border-lime-500/20 p-5 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-800 dark:text-lime-300 mb-1">AI Feedback on Your Reasoning</h3>
                    <p className="text-xs text-amber-700 dark:text-lime-400 leading-relaxed">{typeof explanationFeedback === 'string' ? explanationFeedback : JSON.stringify(explanationFeedback)}</p>
                  </div>
                </div>
                {finalScores.explanation && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { label: 'Logic', score: finalScores.explanation.logical_coherence },
                      { label: 'Self-Awareness', score: finalScores.explanation.self_awareness },
                      { label: 'Ethics', score: finalScores.explanation.ethical_consideration },
                    ].map(({ label, score }) => (
                      <div key={label} className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-amber-600 dark:text-lime-400">{label}</p>
                        <p className="text-sm font-bold text-amber-800 dark:text-lime-300">{score ?? '-'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Hidden Info Reveal */}
            {fullScenario && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <button
                  onClick={() => setShowHidden(!showHidden)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors w-full"
                >
                  {showHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showHidden ? 'Hide' : 'Reveal'} Optimal Solution & Hidden Info
                  <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${showHidden ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showHidden && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        {fullScenario.hidden_info && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Hidden Information</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{fullScenario.hidden_info}</p>
                          </div>
                        )}
                        {fullScenario.optimal_order && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Optimal Action Order</p>
                            <div className="flex flex-wrap gap-1">
                              {fullScenario.optimal_order.map((id, i) => (
                                <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-medium rounded-md border border-green-200">
                                  {i+1}. {id}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {fullScenario.critical_actions && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Critical Actions (must-do)</p>
                            <div className="flex flex-wrap gap-1">
                              {fullScenario.critical_actions.map((id, i) => (
                                <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-[10px] font-medium rounded-md border border-red-200">
                                  {id}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback / loading state
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
    </div>
  );
};

export default SkillsAssessment;