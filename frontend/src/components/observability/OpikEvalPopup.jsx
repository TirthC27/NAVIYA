import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, TrendingUp, Shield, Target,
  ChevronRight, Star, Zap, Brain
} from 'lucide-react';

/**
 * OpikEvalPopup — Universal AI self-evaluation popup
 *
 * Shows after any agent completes a task. Displays the LLM's
 * self-assessment in a compact, user-friendly card.
 *
 * Props:
 *   evaluation: {
 *     task_quality: "High" | "Medium" | "Needs Improvement",
 *     strengths: ["...", "..."],
 *     confidence: "Low" | "Medium" | "High",
 *     confidence_reason: "...",
 *     alignment: "Well Aligned" | "Partially Aligned" | "Misaligned",
 *     improvement: "...",
 *     metrics: { response_clarity: 1-5, personalization_score: 1-5, relevance_score: 1-5 }
 *   }
 *   agentName: string     — e.g. "Career Intelligence", "Interview Coach"
 *   onClose:   () => void
 *   autoClose: number     — ms before auto-dismissal (0 = never)
 */

const qualityConfig = {
  High: {
    color: 'emerald',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: Sparkles,
    label: 'High Quality',
  },
  Medium: {
    color: 'amber',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: TrendingUp,
    label: 'Medium Quality',
  },
  'Needs Improvement': {
    color: 'red',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: Target,
    label: 'Needs Improvement',
  },
};

const confidenceConfig = {
  High: { color: 'text-emerald-400', dot: 'bg-emerald-400' },
  Medium: { color: 'text-amber-400', dot: 'bg-amber-400' },
  Low: { color: 'text-red-400', dot: 'bg-red-400' },
};

const alignmentConfig = {
  'Well Aligned': { color: 'text-emerald-400', icon: '✓' },
  'Partially Aligned': { color: 'text-amber-400', icon: '~' },
  Misaligned: { color: 'text-red-400', icon: '✗' },
};

function ScoreBar({ label, score, max = 5 }) {
  const pct = (score / max) * 100;
  const color =
    score >= 4 ? 'bg-emerald-500' : score >= 3 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
      <span className="text-xs font-medium text-slate-300 w-6 text-right">
        {score}
      </span>
    </div>
  );
}

export default function OpikEvalPopup({
  evaluation,
  agentName = 'AI Agent',
  onClose,
  autoClose = 0,
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoClose > 0) {
      const t = setTimeout(() => setVisible(false), autoClose);
      return () => clearTimeout(t);
    }
  }, [autoClose]);

  if (!evaluation || Object.keys(evaluation).length === 0) return null;

  const quality = evaluation.task_quality || 'Medium';
  const qc = qualityConfig[quality] || qualityConfig.Medium;
  const QIcon = qc.icon;

  const confidence = evaluation.confidence || 'Medium';
  const cc = confidenceConfig[confidence] || confidenceConfig.Medium;

  const alignment = evaluation.alignment || 'Partially Aligned';
  const ac = alignmentConfig[alignment] || alignmentConfig['Partially Aligned'];

  const strengths = evaluation.strengths || [];
  const improvement = evaluation.improvement || '';
  const metrics = evaluation.metrics || {};
  const reason = evaluation.confidence_reason || '';

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Card */}
          <motion.div
            className="fixed top-1/2 left-1/2 z-[100] w-[420px] max-w-[92vw] max-h-[85vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-45%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/40">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20">
                    <Brain className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      AI Performance Insight
                    </h3>
                    <p className="text-[11px] text-slate-500">{agentName}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                {/* Task Quality Badge */}
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${qc.bg} border ${qc.border}`}
                >
                  <QIcon className={`w-4 h-4 ${qc.text}`} />
                  <span className={`text-sm font-medium ${qc.text}`}>
                    {qc.label}
                  </span>
                </div>

                {/* Strengths */}
                {strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-amber-400" />
                      Key Strengths
                    </p>
                    <ul className="space-y-1.5">
                      {strengths.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-slate-300"
                        >
                          <ChevronRight className="w-3 h-3 mt-0.5 text-emerald-400 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Confidence + Alignment row */}
                <div className="flex gap-3">
                  <div className="flex-1 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                      Confidence
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${cc.dot}`}
                      />
                      <span className={`text-sm font-medium ${cc.color}`}>
                        {confidence}
                      </span>
                    </div>
                    {reason && (
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                        {reason}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                      Resume Alignment
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm ${ac.color}`}>{ac.icon}</span>
                      <span className={`text-sm font-medium ${ac.color}`}>
                        {alignment}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Improvement Suggestion */}
                {improvement && (
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                    <p className="text-xs font-medium text-amber-400 mb-1 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" />
                      Suggestion
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {improvement}
                    </p>
                  </div>
                )}

                {/* Execution Metrics Bars */}
                {Object.keys(metrics).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-400 mb-1">
                      Execution Scores
                    </p>
                    {metrics.response_clarity != null && (
                      <ScoreBar label="Response Clarity" score={metrics.response_clarity} />
                    )}
                    {metrics.personalization_score != null && (
                      <ScoreBar
                        label="Personalization"
                        score={metrics.personalization_score}
                      />
                    )}
                    {metrics.relevance_score != null && (
                      <ScoreBar label="Relevance" score={metrics.relevance_score} />
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-800/60 flex items-center justify-between">
                <p className="text-[10px] text-slate-600">
                  Powered by NAVIYA Transparent AI
                </p>
                <button
                  onClick={handleClose}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
