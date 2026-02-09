import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Sparkles,
  Mic,
  Square,
  CheckCircle,
  AlertCircle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Star,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Shield,
  Brain,
  Zap,
  Monitor,
  Send,
  X,
  Bot,
  Loader2,
} from 'lucide-react';
import { useDashboardState } from '../../context/DashboardStateContext';
import useActivityTracker from '../../hooks/useActivityTracker';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// ─── Phase constants ────────────────────────────────────
const PHASE = {
  SETUP: 'setup',
  INTERVIEW: 'interview',
  RECORDING: 'recording',
  TRANSCRIBING: 'transcribing',
  EVALUATING: 'evaluating',
  RESULTS: 'results',
};

// ─── Helpers ────────────────────────────────────────────
const getUserId = () => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user?.id || user?.user_id || null;
    }
  } catch (e) { /* empty */ }
  return null;
};

const ratingColor = (rating) => {
  const map = {
    Excellent: 'text-emerald-500',
    Good: 'text-blue-500',
    Average: 'text-amber-500',
    'Below Average': 'text-orange-500',
    Poor: 'text-red-500',
  };
  return map[rating] || 'text-slate-500';
};

const scoreColor = (score, max = 10) => {
  const pct = score / max;
  if (pct >= 0.8) return 'bg-emerald-500';
  if (pct >= 0.6) return 'bg-blue-500';
  if (pct >= 0.4) return 'bg-amber-500';
  return 'bg-red-500';
};

// ─── Component ──────────────────────────────────────────
const MockInterview = () => {
  useActivityTracker('interview');
  const { state: dashboardState } = useDashboardState();
  const userId = dashboardState?.user_id || getUserId();

  // Phase state
  const [phase, setPhase] = useState(PHASE.SETUP);
  const [error, setError] = useState(null);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // Permissions
  const [micPermission, setMicPermission] = useState(null);

  // Results
  const [transcript, setTranscript] = useState('');
  const [segments, setSegments] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [expandedQA, setExpandedQA] = useState(null);

  // Past sessions
  const [pastSessions, setPastSessions] = useState([]);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // ─── Check mic permission on mount ───
  useEffect(() => {
    navigator.permissions?.query({ name: 'microphone' }).then((status) => {
      setMicPermission(status.state);
      status.onchange = () => setMicPermission(status.state);
    }).catch(() => {});
  }, []);

  // ─── Fetch past sessions ───
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/interview/sessions/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPastSessions(data.sessions || []);
      })
      .catch(() => {});
  }, [userId, phase]);

  // ─── Recording timer ───
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // ─── Request mic permission ───
  const requestMicPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission('granted');
      setError(null);
      return true;
    } catch {
      setMicPermission('denied');
      setError('Microphone access denied. Please allow microphone in browser settings.');
      return false;
    }
  }, []);

  // ─── Start recording ───
  const startRecording = useCallback(async () => {
    setError(null);

    if (micPermission !== 'granted') {
      const ok = await requestMicPermission();
      if (!ok) return;
    }

    try {
      let stream;
      try {
        // Capture tab audio (interviewer) + mic (candidate)
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true,
        });
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();

        displayStream.getAudioTracks().forEach((track) => {
          audioContext.createMediaStreamSource(new MediaStream([track])).connect(destination);
        });
        micStream.getAudioTracks().forEach((track) => {
          audioContext.createMediaStreamSource(new MediaStream([track])).connect(destination);
        });

        stream = destination.stream;
        displayStream.getVideoTracks().forEach((t) => t.stop());
        streamRef.current = { displayStream, micStream, audioContext };
      } catch (screenErr) {
        console.warn('[Interview] Screen capture denied, mic-only:', screenErr.message);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = { micStream: stream };
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      setPhase(PHASE.RECORDING);
    } catch (err) {
      setError(`Failed to start recording: ${err.message}`);
    }
  }, [micPermission, requestMicPermission]);

  // ─── Stop recording & process ───
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);

        if (streamRef.current) {
          const { displayStream, micStream, audioContext } = streamRef.current;
          displayStream?.getTracks().forEach((t) => t.stop());
          micStream?.getTracks().forEach((t) => t.stop());
          audioContext?.close();
        }

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) {
          setError('Recording too short. Please record at least a few seconds.');
          setPhase(PHASE.INTERVIEW);
          resolve();
          return;
        }

        setPhase(PHASE.TRANSCRIBING);
        try {
          const formData = new FormData();
          formData.append('file', blob, 'interview_recording.webm');
          formData.append('user_id', userId);

          const response = await fetch(`${API_BASE}/api/interview/session`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Server error ${response.status}`);
          }

          const data = await response.json();

          if (data.success) {
            setTranscript(data.transcript || '');
            setSegments(data.segments || []);
            setEvaluation(data.evaluation || null);
            setPhase(PHASE.RESULTS);
          } else {
            throw new Error('Server returned unsuccessful response');
          }
        } catch (err) {
          console.error('[Interview] Pipeline error:', err);
          setError(`Processing failed: ${err.message}`);
          setPhase(PHASE.INTERVIEW);
        }
        resolve();
      };

      mediaRecorderRef.current.stop();
    });
  }, [userId]);

  // ─── Restart ───
  const resetInterview = useCallback(() => {
    setPhase(PHASE.SETUP);
    setError(null);
    setTranscript('');
    setSegments([]);
    setEvaluation(null);
    setExpandedQA(null);
    setRecordingTime(0);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Chat helpers ───
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (chatOpen) chatInputRef.current?.focus();
  }, [chatOpen]);

  const sendChatMessage = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;

    const userMsg = { role: 'user', content: msg };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/interview/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          evaluation: evaluation || {},
          transcript,
          segments,
          history: chatMessages,
        }),
      });

      const data = await res.json();
      if (data.success && data.reply) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I could not process that. Please try again.' }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please check if the server is running.' }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, evaluation, transcript, segments, chatMessages]);

  // ────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────
  const showIframe = phase === PHASE.SETUP || phase === PHASE.INTERVIEW || phase === PHASE.RECORDING;
  const showProcessing = phase === PHASE.TRANSCRIBING || phase === PHASE.EVALUATING;

  return (
    <div className="h-screen w-full relative overflow-hidden bg-black transition-colors">

      {/* ─── LiveAvatar Iframe — fills entire screen ─── */}
      {showIframe && (
        <iframe
          src="https://embed.liveavatar.com/v1/ee19c999-5495-433d-b0f8-a1cfde4e99c9"
          allow="microphone"
          title="Mock Interview — LiveAvatar"
          className="absolute inset-0 w-full h-full border-0"
        />
      )}

      {/* ─── Floating Bottom-Right Control Panel ─── */}
      {showIframe && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute bottom-4 right-4 z-50 w-[320px] bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl border border-slate-200 dark:border-lime-900/40 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden"
        >
          {/* Mini Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 dark:from-lime-500 dark:to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                <Video className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h1 className="text-xs font-bold text-slate-800 dark:text-slate-100">Mock Interview</h1>
                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400 dark:text-lime-400" /> AI-powered evaluation
                </p>
              </div>
            </div>
            {isRecording && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-full"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono font-medium text-red-600 dark:text-red-400">
                  {formatTime(recordingTime)}
                </span>
              </motion.div>
            )}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-3 py-2 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 text-[10px] text-red-700 dark:text-red-300 flex items-center gap-2"
              >
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span className="flex-1 leading-tight">{error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Permission Notice */}
          {phase === PHASE.SETUP && (
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-[10px] font-semibold text-amber-700 dark:text-lime-300 mb-1.5 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Permissions Needed
              </h3>
              <div className="space-y-1 text-[10px] text-amber-600 dark:text-lime-400">
                <div className="flex items-center gap-1.5">
                  <Mic className="w-3 h-3" />
                  <span><b>Mic</b> — your voice</span>
                  {micPermission === 'granted' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-3 h-3" />
                  <span><b>Tab Audio</b> — interviewer</span>
                </div>
              </div>
              <p className="text-[9px] text-amber-500 dark:text-lime-500 mt-1.5 leading-tight">
                Select the <b>current tab</b> &amp; check &quot;Share tab audio&quot;.
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="px-3 py-3 flex items-center justify-center">
            {!isRecording ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setPhase(PHASE.INTERVIEW); startRecording(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 transition-all"
              >
                <Mic className="w-3.5 h-3.5" />
                Start Recording
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={stopRecording}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-red-200/50 dark:shadow-red-900/30 transition-all"
              >
                <Square className="w-3.5 h-3.5" />
                Stop &amp; Evaluate
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── Processing States — fullscreen overlay ─── */}
      {showProcessing && (
        <div className="absolute inset-0 z-50 bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-[#0a0a0a] dark:via-[#0d0d0d] dark:to-[#0a1a0a] flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center space-y-4"
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-amber-200 dark:border-lime-900 border-t-amber-500 dark:border-t-lime-400 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                {phase === PHASE.TRANSCRIBING ? (
                  <MessageSquare className="w-6 h-6 text-amber-500 dark:text-lime-400" />
                ) : (
                  <Brain className="w-6 h-6 text-amber-500 dark:text-lime-400" />
                )}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-lime-50">
              {phase === PHASE.TRANSCRIBING
                ? 'Transcribing your interview...'
                : 'AI Agent is evaluating your performance...'}
            </h3>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {phase === PHASE.TRANSCRIBING
                ? 'Converting speech to text and identifying speakers'
                : 'Analyzing each answer for quality, depth, and accuracy'}
            </p>
          </motion.div>
        </div>
      )}

      {phase === PHASE.RESULTS && evaluation && (
        <div className="absolute inset-0 z-50 bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-[#0a0a0a] dark:via-[#0d0d0d] dark:to-[#0a1a0a] overflow-y-auto">
          <div className="max-w-[1100px] mx-auto p-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Overall Score Card */}
            <div className="bg-white dark:bg-[#111111] border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-lime-50 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-500 dark:text-lime-400" /> Interview Evaluation
                </h2>
                <button
                  onClick={resetInterview}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-amber-600 dark:hover:text-lime-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-amber-300 dark:hover:border-lime-500 transition-all"
                >
                  <RefreshCw className="w-3 h-3" /> New Interview
                </button>
              </div>

              {/* Score Overview */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-lime-950/30 dark:to-emerald-950/30 rounded-xl border border-amber-100 dark:border-lime-800/50">
                  <div className="text-3xl font-black text-amber-600 dark:text-lime-400">
                    {evaluation.overall_score}
                  </div>
                  <div className={`text-xs font-bold mt-1 ${ratingColor(evaluation.overall_rating)}`}>
                    {evaluation.overall_rating}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">out of 100</div>
                </div>

                {[
                  { label: 'Communication', score: evaluation.communication_score, icon: MessageSquare },
                  { label: 'Technical', score: evaluation.technical_score, icon: Brain },
                  { label: 'Confidence', score: evaluation.confidence_score, icon: Zap },
                  { label: 'Questions', score: evaluation.questions_evaluated, max: evaluation.total_questions, icon: CheckCircle, suffix: `/${evaluation.total_questions}` },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <item.icon className="w-4 h-4 text-slate-400 mb-1" />
                    <div className="text-xl font-bold text-slate-700 dark:text-slate-200">
                      {item.score}{item.suffix || ''}
                    </div>
                    <div className="text-[10px] text-slate-400">{item.label}</div>
                    {!item.suffix && (
                      <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreColor(item.score)}`}
                          style={{ width: `${(item.score / 10) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {evaluation.strengths_summary?.length > 0 && (
                  <div className="p-3 bg-emerald-50 dark:bg-lime-950/20 border border-emerald-100 dark:border-lime-800/50 rounded-xl">
                    <h4 className="text-xs font-semibold text-emerald-700 dark:text-lime-300 mb-2 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Strengths
                    </h4>
                    <ul className="space-y-1">
                      {evaluation.strengths_summary.map((s, i) => (
                        <li key={i} className="text-xs text-emerald-600 dark:text-lime-400 flex items-start gap-1.5">
                          <Star className="w-3 h-3 mt-0.5 shrink-0" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {evaluation.improvement_areas?.length > 0 && (
                  <div className="p-3 bg-orange-50 dark:bg-yellow-950/20 border border-orange-100 dark:border-yellow-800/40 rounded-xl">
                    <h4 className="text-xs font-semibold text-orange-700 dark:text-yellow-300 mb-2 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5" /> Areas to Improve
                    </h4>
                    <ul className="space-y-1">
                      {evaluation.improvement_areas.map((s, i) => (
                        <li key={i} className="text-xs text-orange-600 dark:text-yellow-400 flex items-start gap-1.5">
                          <Zap className="w-3 h-3 mt-0.5 shrink-0" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {evaluation.recommendation && (
                <div className="p-3 bg-blue-50 dark:bg-lime-950/10 border border-blue-100 dark:border-lime-800/40 rounded-xl">
                  <p className="text-xs text-blue-700 dark:text-lime-200">
                    <b>Recommendation:</b> {evaluation.recommendation}
                  </p>
                </div>
              )}
            </div>

            {/* Q&A Breakdown */}
            {evaluation.qa_evaluations?.length > 0 && (
              <div className="bg-white dark:bg-[#111111] border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-700 dark:text-lime-50 mb-3">
                  Question-by-Question Breakdown
                </h3>
                <div className="space-y-2">
                  {evaluation.qa_evaluations.map((qa, i) => (
                    <div key={i} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedQA(expandedQA === i ? null : i)}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${scoreColor(qa.quality_score)}`}>
                            {qa.quality_score}
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                            {qa.question.length > 80 ? qa.question.slice(0, 80) + '…' : qa.question}
                          </span>
                        </div>
                        {expandedQA === i ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      <AnimatePresence>
                        {expandedQA === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 pt-0 space-y-3 border-t border-slate-100 dark:border-slate-800">
                              <div>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Question</div>
                                <p className="text-xs text-slate-600 dark:text-slate-300">{qa.question}</p>
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Your Answer</div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic">{qa.candidate_answer || '(No answer captured)'}</p>
                              </div>
                              <div className="p-2.5 bg-blue-50 dark:bg-lime-950/20 rounded-lg">
                                <div className="text-[10px] font-semibold text-blue-500 dark:text-lime-400 uppercase mb-1">Ideal Answer</div>
                                <p className="text-xs text-blue-700 dark:text-lime-200">{qa.ideal_answer_summary}</p>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300">{qa.feedback}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {qa.strengths?.map((s, j) => (
                                  <span key={`s${j}`} className="px-2 py-0.5 text-[10px] bg-emerald-100 dark:bg-lime-900/30 text-emerald-700 dark:text-lime-300 rounded-full">
                                    ✓ {s}
                                  </span>
                                ))}
                                {qa.improvements?.map((s, j) => (
                                  <span key={`i${j}`} className="px-2 py-0.5 text-[10px] bg-orange-100 dark:bg-yellow-900/30 text-orange-700 dark:text-yellow-300 rounded-full">
                                    ↑ {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Transcript */}
            {segments.length > 0 && (
              <div className="bg-white dark:bg-[#111111] border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-700 dark:text-lime-50 mb-3">Full Transcript</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {segments.map((seg, i) => (
                    <div key={i} className="flex gap-2">
                      <span className={`text-[10px] font-bold shrink-0 w-24 text-right mt-0.5 ${seg.speaker === 'INTERVIEWER' ? 'text-blue-500' : 'text-emerald-500'}`}>
                        {seg.speaker}
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{seg.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* ─── Past Sessions ─── */}
          {pastSessions.length > 0 && (
            <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-sm border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-lime-400/70 mb-2">Past Sessions</h3>
              <div className="space-y-1.5">
                {pastSessions.slice(0, 5).map((session, i) => (
                  <div
                    key={session.id || i}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs"
                  >
                    <span className="text-slate-600 dark:text-slate-300">
                      {new Date(session.created_at).toLocaleDateString()} — Score: {session.overall_score}/100
                    </span>
                    <span className={`font-medium ${ratingColor(session.overall_rating)}`}>
                      {session.overall_rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
        )}

      {/* ─── Floating Chat Button + Panel ─── */}
      {(phase === PHASE.RESULTS || evaluation) && (
        <>
          {/* Toggle Button */}
          {!chatOpen && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setChatOpen(true)}
              className="fixed bottom-6 right-6 z-[100] w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 dark:from-lime-500 dark:to-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-amber-200/40 dark:shadow-lime-900/40 text-white"
            >
              <Bot className="w-6 h-6" />
            </motion.button>
          )}

          {/* Chat Panel */}
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="fixed bottom-6 right-6 z-[100] w-[380px] h-[520px] bg-white dark:bg-[#111111] border border-slate-200 dark:border-lime-900/40 rounded-2xl shadow-2xl shadow-black/15 dark:shadow-lime-950/30 flex flex-col overflow-hidden"
              >
                {/* Chat Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-500 dark:from-lime-500 dark:to-emerald-600 text-white">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    <div>
                      <h3 className="text-sm font-bold">Interview Coach</h3>
                      <p className="text-[10px] text-white/80">Ask about your performance</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChatOpen(false)}
                    className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 opacity-60">
                      <Bot className="w-10 h-10 text-amber-400 dark:text-lime-400 mb-3" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Hi! I&apos;m your interview coach.</p>
                      <p className="text-xs text-slate-400 mt-1">Ask me anything about your interview — improvements, better answers, tips, or strategies.</p>
                    </div>
                  )}

                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 dark:from-lime-500 dark:to-emerald-600 text-white rounded-br-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 text-amber-500 dark:text-lime-400 animate-spin" />
                        <span className="text-xs text-slate-400">Thinking...</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-slate-100 dark:border-slate-800 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                      placeholder="Ask about your interview..."
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-400/50 dark:focus:ring-lime-400/50 focus:border-amber-400 dark:focus:border-lime-400 text-slate-700 dark:text-slate-200 placeholder-slate-400 transition-all"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || chatLoading}
                      className="w-9 h-9 flex items-center justify-center bg-gradient-to-r from-amber-400 to-orange-500 dark:from-lime-500 dark:to-emerald-600 text-white rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                      <Send className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default MockInterview;
