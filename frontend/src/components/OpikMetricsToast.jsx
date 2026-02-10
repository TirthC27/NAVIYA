import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Zap, Clock, CheckCircle, XCircle,
  Brain, Cpu, ArrowRight, X, Sparkles,
  TrendingUp, BarChart3
} from 'lucide-react';

/* ────────────────────────────────────────────
   Agent display name + colour mapping
   ──────────────────────────────────────────── */
const AGENT_META = {
  Career_raodmap:       { label: 'Gemini LLM',           color: '#f59e0b', bg: 'from-amber-500/20 to-orange-500/20' },
  LLM_call_gemini_sync:  { label: 'Gemini LLM (sync)',    color: '#f59e0b', bg: 'from-amber-500/20 to-orange-500/20' },
  openrouter_chat:       { label: 'Topic Explainer',      color: '#8b5cf6', bg: 'from-purple-500/20 to-violet-500/20' },
  interview_transcribe:  { label: 'Interview Transcribe', color: '#3b82f6', bg: 'from-blue-500/20 to-cyan-500/20' },
  interview_chat:        { label: 'Interview Chat',       color: '#06b6d4', bg: 'from-cyan-500/20 to-teal-500/20' },
  gemini_fallback:       { label: 'Gemini Fallback',      color: '#10b981', bg: 'from-emerald-500/20 to-green-500/20' },
};

const getAgentMeta = (name) => AGENT_META[name] || {
  label: name?.replace(/_/g, ' ').replace(/LLM /g, '') || 'AI Agent',
  color: '#f59e0b',
  bg: 'from-amber-500/20 to-orange-500/20',
};

/* ────────────────────────────────────────────
   Latency rating
   ──────────────────────────────────────────── */
const getLatencyRating = (ms) => {
  if (ms <= 1500)  return { label: 'Blazing Fast',  color: '#10b981', pct: 95 };
  if (ms <= 3000)  return { label: 'Fast',           color: '#22c55e', pct: 80 };
  if (ms <= 6000)  return { label: 'Normal',         color: '#f59e0b', pct: 60 };
  if (ms <= 10000) return { label: 'Slow',           color: '#f97316', pct: 40 };
  return              { label: 'Very Slow',       color: '#ef4444', pct: 20 };
};

/* ────────────────────────────────────────────
   Mini progress ring
   ──────────────────────────────────────────── */
const ProgressRing = ({ pct, color, size = 40, stroke = 3.5 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="currentColor" strokeWidth={stroke}
        className="text-slate-700/30" />
      <motion.circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        strokeDasharray={circ} />
    </svg>
  );
};

/* ════════════════════════════════════════════
   OpikMetricsToast – single toast card
   ════════════════════════════════════════════ */
const OpikMetricsToast = ({ metrics, onClose, index = 0 }) => {
  const [progress, setProgress] = useState(100);
  const DURATION = 10000; // auto-dismiss in 10 s

  const agent  = getAgentMeta(metrics.agent);
  const rating = getLatencyRating(metrics.latency);
  const isOk   = metrics.status === 'success';

  // Countdown bar
  useEffect(() => {
    const start = Date.now();
    const frame = () => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct > 0) requestAnimationFrame(frame);
    };
    const id = requestAnimationFrame(frame);
    const timer = setTimeout(onClose, DURATION);
    return () => { cancelAnimationFrame(id); clearTimeout(timer); };
  }, [onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 380, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 380, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="relative w-[370px] rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-slate-700/60 backdrop-blur-xl"
      style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.97), rgba(30,41,59,0.97))' }}
    >
      {/* Glow line at top */}
      <div className="absolute top-0 inset-x-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)` }} />

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${agent.bg} flex items-center justify-center`}>
            <Activity className="w-4 h-4" style={{ color: agent.color }} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold tracking-wider uppercase"
                style={{ color: agent.color }}>Opik Trace</span>
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            </div>
            <p className="text-[13px] font-bold text-white leading-tight">{agent.label}</p>
          </div>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700/60 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ─── Metrics Grid ─── */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        {/* Latency */}
        <div className="flex flex-col items-center p-2 rounded-xl bg-slate-800/50 border border-slate-700/40">
          <div className="relative mb-1">
            <ProgressRing pct={rating.pct} color={rating.color} size={38} stroke={3} />
            <Clock className="w-3.5 h-3.5 text-slate-300 absolute inset-0 m-auto" />
          </div>
          <span className="text-[15px] font-bold text-white">{metrics.latency.toFixed(0)}<span className="text-[10px] text-slate-400">ms</span></span>
          <span className="text-[9px] font-medium mt-0.5" style={{ color: rating.color }}>{rating.label}</span>
        </div>

        {/* Tokens */}
        <div className="flex flex-col items-center p-2 rounded-xl bg-slate-800/50 border border-slate-700/40">
          <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-[15px] font-bold text-white">{(metrics.totalTokens || 0).toLocaleString()}</span>
          <span className="text-[9px] text-slate-400 font-medium mt-0.5">Tokens</span>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center p-2 rounded-xl bg-slate-800/50 border border-slate-700/40">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${isOk ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            {isOk
              ? <CheckCircle className="w-4 h-4 text-emerald-400" />
              : <XCircle className="w-4 h-4 text-red-400" />}
          </div>
          <span className={`text-[13px] font-bold ${isOk ? 'text-emerald-400' : 'text-red-400'}`}>
            {isOk ? 'Pass' : 'Fail'}
          </span>
          <span className="text-[9px] text-slate-400 font-medium mt-0.5">Status</span>
        </div>
      </div>

      {/* ─── Detail chips ─── */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
        <Chip icon={<Brain className="w-3 h-3" />} label="Model" value={metrics.model?.split('/').pop() || '—'} />
        <Chip icon={<TrendingUp className="w-3 h-3" />} label="In" value={`${metrics.promptTokens || 0}`} />
        <Chip icon={<Zap className="w-3 h-3" />} label="Out" value={`${metrics.completionTokens || 0}`} />
      </div>

      {/* ─── View in Opik ─── */}
      <div className="flex items-center justify-between px-4 pb-3">
        <a href="https://www.comet.com/opik" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors">
          View in Opik <ArrowRight className="w-3 h-3" />
        </a>
        <span className="text-[10px] text-slate-500 font-mono">{metrics.traceId?.slice(0, 8) || ''}</span>
      </div>

      {/* ─── Countdown bar ─── */}
      <div className="h-[2px] bg-slate-800">
        <motion.div
          className="h-full"
          style={{ backgroundColor: agent.color, width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </motion.div>
  );
};

/* ────────────────────────────────────────────
   Chip helper
   ──────────────────────────────────────────── */
const Chip = ({ icon, label, value }) => (
  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-700/30">
    <span className="text-slate-400">{icon}</span>
    <span className="text-[10px] text-slate-500">{label}:</span>
    <span className="text-[10px] font-semibold text-slate-200">{value}</span>
  </div>
);

/* ════════════════════════════════════════════
   OpikToastContainer – renders stacked toasts
   ════════════════════════════════════════════ */
export const OpikToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-3 pointer-events-auto">
      <AnimatePresence mode="popLayout">
        {toasts.map((t, i) => (
          <OpikMetricsToast
            key={t.id}
            metrics={t}
            index={i}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default OpikMetricsToast;
