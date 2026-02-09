import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Presentation,
  Sparkles,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  BookOpen,
  Lightbulb,
  Target,
  AlertTriangle,
  Rocket,
  Send,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import useActivityTracker from '../../hooks/useActivityTracker';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// Slide icons by index
const SLIDE_ICONS = [BookOpen, Lightbulb, Target, AlertTriangle, Rocket];

// ── Component ─────────────────────────────────────────────
const TopicExplainer = () => {
  useActivityTracker('topic_explainer');

  // Phases
  const [phase, setPhase] = useState('input'); // input | loading | presenting
  const [topic, setTopic] = useState('');
  const [error, setError] = useState(null);

  // Data
  const [sessionId, setSessionId] = useState(null);
  const [slides, setSlides] = useState([]);

  // Presentation state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0);

  // Refs
  const utteranceRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Loading progress
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // ── Focus input on mount ──
  useEffect(() => {
    if (phase === 'input') inputRef.current?.focus();
  }, [phase]);

  // ── Generate presentation ──
  const handleGenerate = useCallback(async () => {
    const t = topic.trim();
    if (!t) return;

    setError(null);
    setPhase('loading');
    setLoadingStep('Researching topic deeply…');
    setLoadingProgress(10);

    // Simulate progress while waiting
    const progressInterval = setInterval(() => {
      setLoadingProgress((p) => {
        if (p < 30) return p + 2;
        if (p < 60) { setLoadingStep('Building slide structure & narration…'); return p + 1; }
        if (p < 85) { setLoadingStep('Generating slide images…'); return p + 0.5; }
        return p;
      });
    }, 800);

    try {
      const res = await fetch(`${API_BASE}/api/topic-explainer/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t }),
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Generation failed');

      setLoadingProgress(100);
      setLoadingStep('Ready!');

      setSessionId(data.session_id);
      setSlides(data.slides || []);
      setCurrentSlide(0);

      // Small delay for the 100% to show
      setTimeout(() => setPhase('presenting'), 400);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message);
      setPhase('input');
    }
  }, [topic]);

  // ── TTS (Web Speech API) ──
  const speakSlide = useCallback(
    (slideIndex) => {
      window.speechSynthesis.cancel();
      if (isMuted) return;

      const slide = slides[slideIndex];
      if (!slide?.narration) return;

      const utt = new SpeechSynthesisUtterance(slide.narration);
      utt.rate = 1.0;
      utt.pitch = 1.0;
      utt.volume = 1.0;

      // Pick a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Samantha'))
      );
      if (preferred) utt.voice = preferred;

      // Track spoken word progress for sync
      const words = slide.narration.split(/\s+/);
      let wordIndex = 0;
      utt.onboundary = (e) => {
        if (e.name === 'word') {
          wordIndex++;
          setSpeechProgress(wordIndex / words.length);
        }
      };

      utt.onend = () => {
        setSpeechProgress(1);
        // Auto-advance to next slide after a short pause
        if (slideIndex < slides.length - 1 && isPlaying) {
          setTimeout(() => {
            setCurrentSlide(slideIndex + 1);
          }, 800);
        } else {
          setIsPlaying(false);
        }
      };

      utteranceRef.current = utt;
      window.speechSynthesis.speak(utt);
    },
    [slides, isMuted, isPlaying]
  );

  // ── When slide changes (during playback) speak it ──
  useEffect(() => {
    setSpeechProgress(0);
    if (isPlaying && slides.length > 0) {
      speakSlide(currentSlide);
    }
  }, [currentSlide, isPlaying, speakSlide, slides.length]);

  // ── Cleanup speech on unmount ──
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  // ── Play / Pause toggle ──
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // speakSlide will fire from useEffect
    }
  }, [isPlaying]);

  // ── Navigation ──
  const goNext = useCallback(() => {
    window.speechSynthesis.cancel();
    if (currentSlide < slides.length - 1) setCurrentSlide((s) => s + 1);
  }, [currentSlide, slides.length]);

  const goPrev = useCallback(() => {
    window.speechSynthesis.cancel();
    if (currentSlide > 0) setCurrentSlide((s) => s - 1);
  }, [currentSlide]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e) => {
      if (phase !== 'presenting') return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'p' || e.key === 'P') togglePlay();
      if (e.key === 'm' || e.key === 'M') setIsMuted((m) => !m);
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, goNext, goPrev, togglePlay, isFullscreen]);

  // ── Mute toggle also cancels current speech ──
  useEffect(() => {
    if (isMuted) window.speechSynthesis.cancel();
    else if (isPlaying) speakSlide(currentSlide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted]);

  // ── Fullscreen ──
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // ── Reset ──
  const resetAll = useCallback(() => {
    window.speechSynthesis.cancel();
    setPhase('input');
    setTopic('');
    setSlides([]);
    setSessionId(null);
    setCurrentSlide(0);
    setIsPlaying(false);
    setError(null);
    setLoadingProgress(0);
  }, []);

  const slide = slides[currentSlide] || null;

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════

  return (
    <div
      ref={containerRef}
      className="h-screen w-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-[#0a0a0a] dark:via-[#0d0d0d] dark:to-[#0a1a0a] transition-colors"
    >
      {/* ── INPUT PHASE ── */}
      {phase === 'input' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl space-y-8"
          >
            {/* Hero */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 dark:from-lime-500 dark:to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Presentation className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-800 dark:text-lime-50">
                Topic Explainer
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Enter any topic — AI will research it deeply, generate a professional 5-slide
                presentation with images, and narrate each slide for you.
              </p>
            </div>

            {/* Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g.  Blockchain in Healthcare, Agile Methodology, Quantum Computing …"
                className="w-full pl-12 pr-28 py-4 bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60 dark:focus:ring-lime-400/60 focus:border-transparent shadow-sm transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGenerate}
                disabled={!topic.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 dark:from-lime-500 dark:to-emerald-600 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate
              </motion.button>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-auto max-w-lg px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick suggestions */}
            <div className="flex flex-wrap justify-center gap-2">
              {['Machine Learning', 'Cloud Architecture', 'Product Management', 'Cybersecurity', 'DevOps'].map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className="px-3 py-1.5 text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-amber-50 dark:hover:bg-lime-950/30 hover:text-amber-700 dark:hover:text-lime-400 border border-transparent hover:border-amber-200 dark:hover:border-lime-800 transition-all"
                  >
                    {t}
                  </button>
                )
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── LOADING PHASE ── */}
      {phase === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md space-y-6 text-center"
          >
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-amber-200 dark:border-lime-900 border-t-amber-500 dark:border-t-lime-400 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Presentation className="w-8 h-8 text-amber-500 dark:text-lime-400" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-lime-50 mb-1">
                Generating Presentation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                &ldquo;{topic}&rdquo;
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 dark:from-lime-500 dark:to-emerald-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {loadingStep}
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── PRESENTING PHASE ── */}
      {phase === 'presenting' && slide && (
        <>
          {/* Top bar */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-white/80 dark:bg-[#111]/80 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                onClick={resetAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-lime-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-amber-300 dark:hover:border-lime-600 transition-all"
              >
                <ChevronLeft className="w-3 h-3" /> New Topic
              </button>
              <div>
                <h2 className="text-xs font-bold text-slate-800 dark:text-lime-50 truncate max-w-[320px]">
                  {topic}
                </h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Slide {currentSlide + 1} of {slides.length}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              <button onClick={goPrev} disabled={currentSlide === 0}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={togglePlay}
                className="p-2 rounded-lg bg-amber-100 dark:bg-lime-900/40 text-amber-600 dark:text-lime-400 hover:bg-amber-200 dark:hover:bg-lime-900/60 transition-colors">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={goNext} disabled={currentSlide === slides.length - 1}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
                <SkipForward className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
              <button onClick={() => { setIsMuted((m) => !m); }}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button onClick={toggleFullscreen}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Slide progress dots */}
          <div className="shrink-0 flex items-center justify-center gap-2 py-2 bg-white/60 dark:bg-[#111]/60">
            {slides.map((s, i) => {
              const Icon = SLIDE_ICONS[i] || BookOpen;
              return (
                <button
                  key={i}
                  onClick={() => { window.speechSynthesis.cancel(); setCurrentSlide(i); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    i === currentSlide
                      ? 'bg-amber-100 dark:bg-lime-900/40 text-amber-700 dark:text-lime-400 border border-amber-200 dark:border-lime-700'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Main slide area */}
          <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'thin' }}>
            <div className="max-w-5xl mx-auto space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Slide image (if available) */}
                  {slide.has_image && slide.image_url && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg">
                      <img
                        src={`${API_BASE}${slide.image_url}`}
                        alt={slide.title}
                        className="w-full object-contain bg-white dark:bg-[#0e0e0e]"
                        style={{ maxHeight: '420px' }}
                      />
                    </div>
                  )}

                  {/* Slide content card */}
                  <div className="bg-white dark:bg-[#111] border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    {/* Title */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-lime-900/40 text-amber-700 dark:text-lime-400 text-[10px] font-bold rounded-md">
                          SLIDE {slide.slide_number}
                        </span>
                      </div>
                      <h2 className="text-xl font-extrabold text-slate-800 dark:text-lime-50">
                        {slide.title}
                      </h2>
                      {slide.subtitle && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {slide.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Sections grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {slide.sections?.map((sec, j) => (
                        <div
                          key={j}
                          className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-xl"
                        >
                          <h4 className="text-xs font-bold text-slate-700 dark:text-lime-300 mb-2">
                            {sec.heading}
                          </h4>
                          <ul className="space-y-1">
                            {sec.bullets?.map((b, k) => (
                              <li
                                key={k}
                                className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5"
                              >
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-lime-500 shrink-0" />
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Key takeaway */}
                    {slide.key_takeaway && (
                      <div className="p-3 bg-amber-50 dark:bg-lime-950/20 border border-amber-100 dark:border-lime-800/40 rounded-xl">
                        <p className="text-xs text-amber-800 dark:text-lime-200 flex items-start gap-2">
                          <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500 dark:text-lime-400" />
                          <span><b>Key Takeaway:</b> {slide.key_takeaway}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Narration text (collapsed) */}
                  {slide.narration && (
                    <div className="bg-white/60 dark:bg-[#111]/60 backdrop-blur-sm border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Volume2 className="w-3.5 h-3.5 text-amber-500 dark:text-lime-400" />
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Narration Script
                        </span>
                        {isPlaying && !isMuted && (
                          <div className="flex items-center gap-1 ml-auto">
                            <div className="w-1 h-3 bg-amber-400 dark:bg-lime-400 rounded-full animate-pulse" />
                            <div className="w-1 h-4 bg-amber-500 dark:bg-lime-500 rounded-full animate-pulse delay-75" />
                            <div className="w-1 h-2 bg-amber-300 dark:bg-lime-300 rounded-full animate-pulse delay-150" />
                            <span className="text-[9px] text-amber-500 dark:text-lime-400 ml-1">Speaking…</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {slide.narration}
                      </p>
                      {/* Speech progress bar */}
                      {isPlaying && !isMuted && (
                        <div className="mt-2 w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-amber-400 dark:bg-lime-400 rounded-full"
                            animate={{ width: `${speechProgress * 100}%` }}
                            transition={{ duration: 0.2 }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom nav bar */}
          <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-[#111]/80 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={goPrev}
              disabled={currentSlide === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>

            {/* Slide progress */}
            <div className="flex items-center gap-1.5">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentSlide
                      ? 'w-6 bg-amber-500 dark:bg-lime-400'
                      : i < currentSlide
                        ? 'w-3 bg-amber-300 dark:bg-lime-600'
                        : 'w-3 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={goNext}
              disabled={currentSlide === slides.length - 1}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-amber-400 to-orange-500 dark:from-lime-500 dark:to-emerald-600 rounded-xl shadow-sm hover:shadow-md disabled:opacity-30 transition-all"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TopicExplainer;
