import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Sparkles, Play, Clock, Eye,
  Search, Globe, X, Loader2, RefreshCw, CheckCircle,
  AlertCircle, BookOpen, ArrowRight, History,
  FileText, Brain, Cpu, Zap, MessageSquare, Send,
  TrendingUp, BarChart3, Code2, Database, Cloud, Smartphone,
  Briefcase, GraduationCap, ChevronDown, ChevronUp
} from 'lucide-react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow';
import OpikEvalPopup from '../../components/observability/OpikEvalPopup';
import 'reactflow/dist/style.css';
import useActivityTracker from '../../hooks/useActivityTracker';
import { API_BASE_URL as API_BASE } from '../../api/config';

// ============================================
// Layout
// ============================================
const nodeWidth = 220;
const nodeHeight = 100;
const horizontalGap = 80;
const verticalGap = 130;

const getLayoutedElements = (nodes, edges) => {
  // Find max step for placing goal at bottom
  const maxStep = nodes.reduce((mx, n) => {
    const s = n.data?.node?.step || n.data?.step || 0;
    return s > mx ? s : mx;
  }, 0);

  const layoutedNodes = nodes.map((node) => {
    const step = node.data?.node?.step || node.data?.step || 0;
    let x = 0, y = 0;

    if (step === 0) {
      // Goal node → center bottom
      const goalRow = Math.ceil(maxStep / 3) + 1;
      x = 60 + (nodeWidth + horizontalGap);
      y = 30 + goalRow * (nodeHeight + verticalGap);
    } else if (step === 1) { x = 60; y = 30; }
    else if (step === 2) { x = 60 + nodeWidth + horizontalGap; y = 30; }
    else if (step === 3) { x = 60 + 2 * (nodeWidth + horizontalGap); y = 30; }
    else if (step === 4) { x = 60 + (nodeWidth + horizontalGap); y = 30 + nodeHeight + verticalGap; }
    else if (step === 5) { x = 60; y = 30 + 2 * (nodeHeight + verticalGap); }
    else if (step === 6) { x = 60 + (nodeWidth + horizontalGap); y = 30 + 2 * (nodeHeight + verticalGap); }
    else if (step === 7) { x = 60 + (nodeWidth + horizontalGap); y = 30 + 3 * (nodeHeight + verticalGap); }
    else {
      const col = (step - 8) % 3;
      const row = Math.floor((step - 8) / 3) + 4;
      x = 60 + col * (nodeWidth + horizontalGap);
      y = 30 + row * (nodeHeight + verticalGap);
    }
    return { ...node, targetPosition: Position.Top, sourcePosition: Position.Bottom, position: { x, y } };
  });

  console.log('[ReactFlow] layoutedNodes:', layoutedNodes.length, 'edges:', edges.length);
  layoutedNodes.forEach(n => console.log(`  node ${n.id} step=${n.data?.node?.step} pos=(${n.position.x},${n.position.y})`));

  return { nodes: layoutedNodes, edges };
};

// ============================================
// Colors
// ============================================
const STATUS_BG = { has: '#22c55e', missing: '#ef4444', goal: '#f59e0b' };
const STATUS_COLORS = { has: '#22c55e', missing: '#ef4444', goal: '#f59e0b' };

// ============================================
// SkillNode
// ============================================
const SkillNode = ({ data }) => {
  const { node, onNodeClick, isSelected, videoCompleted, videoProgress: vidProg } = data;
  const isGoal = node.status === 'goal';
  const isMissing = node.status === 'missing';

  return (
    <>
      <Handle type="target" position={Position.Top}
        style={{ background: '#3b82f6', width: 8, height: 8, border: '2px solid white' }} isConnectable={false} />
      <div
        className={`relative px-4 py-2.5 rounded-xl text-white shadow-lg cursor-pointer transition-all duration-200
          hover:shadow-2xl hover:brightness-110 ${isSelected ? 'ring-4 ring-blue-400 ring-offset-2' : ''}`}
        style={{ backgroundColor: videoCompleted ? '#16a34a' : STATUS_BG[node.status] || '#94a3b8', width: nodeWidth, minHeight: nodeHeight - 10 }}
        onClick={() => onNodeClick(node)}
      >
        <div className="absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white z-10">
          {isGoal ? '🎯' : node.step || '?'}
        </div>
        {/* Video completion badge */}
        {isMissing && videoCompleted && (
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center z-10 shadow-md">
            <span className="text-[10px]">✓</span>
          </div>
        )}
        {isMissing && !videoCompleted && vidProg > 0 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center z-10 shadow-md">
            <span className="text-[8px] font-bold">{vidProg}%</span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-base shrink-0">{isGoal ? '🎯' : videoCompleted ? '✅' : isMissing ? '📚' : '✅'}</span>
          <span className="text-xs font-bold leading-tight text-left">{node.label}</span>
        </div>
        <div className="w-full bg-white/30 rounded-full h-1 mt-2">
          <div className="bg-white h-1 rounded-full" style={{ width: node.status === 'has' ? '100%' : videoCompleted ? '100%' : `${vidProg || 0}%` }} />
        </div>
        <div className="text-[10px] mt-1 text-center font-medium text-white/90">
          {node.status === 'has' ? '✓ Completed' : isGoal ? '⭐ Target' : videoCompleted ? '✓ Video Done' : vidProg > 0 ? `▶ ${vidProg}% watched` : '📖 To Learn'}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom}
        style={{ background: '#3b82f6', width: 8, height: 8, border: '2px solid white' }} isConnectable={false} />
    </>
  );
};

const nodeTypes = { skillNode: SkillNode };

// ============================================
// Convert backend → React Flow
// ============================================
function convertToReactFlowFormat(roadmapData, selectedNode, onNodeClick, videoProgress) {
  if (!roadmapData?.nodes) return { nodes: [], edges: [] };
  const sortedNodes = [...roadmapData.nodes].sort((a, b) => (a.step || a.level || 999) - (b.step || b.level || 999));
  const nodes = sortedNodes.map((node) => ({
    id: node.id, type: 'skillNode',
    data: { node, onNodeClick, isSelected: selectedNode?.id === node.id, isDimmed: false, videoCompleted: videoProgress?.[node.id]?.completed || false, videoProgress: videoProgress?.[node.id]?.progress_percent || 0 },
    position: { x: 0, y: 0 },
  }));
  const edges = (roadmapData.links || []).map((link, idx) => ({
    id: `edge-${idx}`, source: link.source, target: link.target,
    type: 'smoothstep', animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 20, height: 20 },
  }));
  return getLayoutedElements(nodes, edges);
}

// ============================================
// YouTube Embedded Player with Watch-Time Tracking
// ============================================
let ytApiLoaded = false;
let ytApiLoading = false;
const ytApiCallbacks = [];

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (ytApiLoaded) return resolve();
    ytApiCallbacks.push(resolve);
    if (ytApiLoading) return;
    ytApiLoading = true;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      ytApiCallbacks.forEach(cb => cb());
      ytApiCallbacks.length = 0;
    };
  });
}

const EmbeddedVideoPlayer = ({ video, userId, roadmapId, nodeId, onProgressUpdate }) => {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const lastSavedRef = useRef(0);
  const [playerReady, setPlayerReady] = useState(false);
  // elapsedPlayTime = real seconds the video has been in PLAYING state (cheat-proof)
  const [elapsedPlayTime, setElapsedPlayTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);
  const duration = video.duration_seconds || 0;
  // Progress is based on real elapsed play-time, not video position
  const remaining = Math.max(duration - elapsedPlayTime, 0);
  const progressPercent = duration > 0 ? Math.min(Math.round((elapsedPlayTime / duration) * 100), 100) : 0;

  // Format seconds → m:ss
  const fmt = (s) => { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };

  // Load YouTube IFrame API and create player
  useEffect(() => {
    let mounted = true;
    loadYouTubeAPI().then(() => {
      if (!mounted || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: video.video_id,
        height: '100%',
        width: '100%',
        playerVars: { rel: 0, modestbranding: 1, fs: 1 },
        events: {
          onReady: () => mounted && setPlayerReady(true),
          onStateChange: (e) => {
            if (!mounted) return;
            if (e.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
            else setIsPlaying(false);
          },
        },
      });
    });
    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch {}
      }
    };
  }, [video.video_id]);

  // Real-time countdown: increment elapsed time by 1 every second ONLY while video is playing
  // Skipping/seeking does NOT affect this — it's a wall-clock timer
  useEffect(() => {
    if (isPlaying && playerReady && !completed) {
      intervalRef.current = setInterval(() => {
        setElapsedPlayTime(prev => {
          const next = prev + 1;
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, playerReady, completed]);

  // Save progress to backend & check completion
  useEffect(() => {
    if (elapsedPlayTime <= 0 || !userId || !roadmapId) return;
    const isCompleted = duration > 0 && elapsedPlayTime >= duration;

    // On completion: immediately mark done, stop timer, force save
    if (isCompleted && !completed) {
      setCompleted(true);
      // Immediately notify parent so graph node turns green
      if (onProgressUpdate) onProgressUpdate(nodeId, true, duration);
      // Force-save final state to DB
      lastSavedRef.current = duration;
      fetch(`${API_BASE}/api/skill-roadmap/video-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId, roadmap_id: roadmapId, node_id: nodeId,
          video_id: video.video_id, video_title: video.title,
          duration_seconds: duration, watched_seconds: duration,
        }),
      }).catch(() => {});
      return;
    }

    // Periodic save every 5 seconds of real play-time
    if (!isCompleted && elapsedPlayTime - lastSavedRef.current >= 5) {
      lastSavedRef.current = elapsedPlayTime;
      fetch(`${API_BASE}/api/skill-roadmap/video-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId, roadmap_id: roadmapId, node_id: nodeId,
          video_id: video.video_id, video_title: video.title,
          duration_seconds: duration, watched_seconds: elapsedPlayTime,
        }),
      }).then(res => res.json()).then(data => {
        // Update parent with in-progress %
        if (onProgressUpdate) onProgressUpdate(nodeId, false, data.watched_seconds);
      }).catch(() => {});
    }
  }, [elapsedPlayTime]);

  return (
    <div className="space-y-2">
      {/* Player */}
      <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
        <div ref={containerRef} className="absolute inset-0" />
      </div>
      {/* Video info + countdown timer */}
      <div className="px-1">
        <h4 className="text-xs font-medium text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">{video.title}</h4>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{video.channel_title}</p>

        {/* Countdown timer */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ease-linear ${completed ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className={`text-[11px] font-bold tabular-nums min-w-[52px] text-right ${completed ? 'text-green-600 dark:text-green-400' : isPlaying ? 'text-amber-600 dark:text-lime-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {completed ? '✓ Done' : fmt(remaining)}
          </div>
        </div>

        {!completed && (
          <p className="text-[10px] text-slate-400 mt-1">
            {isPlaying
              ? `⏱ Timer running — ${fmt(remaining)} left`
              : elapsedPlayTime > 0
                ? `⏸ Paused — ${fmt(remaining)} remaining`
                : `▶ Play the video to start ${fmt(duration)} timer`}
          </p>
        )}
        {completed && (
          <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 font-medium">🎉 Video completed! This skill is marked as learned.</p>
        )}

        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
          <Clock className="w-2.5 h-2.5" />
          <span>{video.duration_formatted}</span>
          {video.view_count != null && (
            <>
              <Eye className="w-2.5 h-2.5 ml-1" />
              <span>{video.view_count > 1000000 ? `${(video.view_count / 1000000).toFixed(1)}M` :
                video.view_count > 1000 ? `${(video.view_count / 1000).toFixed(0)}K` : video.view_count}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// SkillPanel (compact, absolute overlay)
// ============================================
const SkillPanel = ({ node, videos, loadingVideos, onClose, onFetchVideos, userId, roadmapId, videoProgress, onProgressUpdate }) => {
  useEffect(() => {
    if (node && node.status === 'missing' && node.search_query) {
      onFetchVideos(node.search_query, node.id);
    }
  }, [node?.id]);

  if (!node) return null;
  const isMissing = node.status === 'missing';
  const isGoal = node.status === 'goal';
  const nodeProgress = videoProgress?.[node.id];
  const video = videos && videos.length > 0 ? videos[0] : null;

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute right-0 top-0 w-[380px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto z-50 shadow-2xl"
    >
      <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${STATUS_COLORS[node.status] || '#94a3b8'}20` }}>
              {isGoal ? <Target className="w-4 h-4" style={{ color: STATUS_COLORS.goal }} />
                : isMissing ? <AlertCircle className="w-4 h-4" style={{ color: STATUS_COLORS.missing }} />
                  : <CheckCircle className="w-4 h-4" style={{ color: STATUS_COLORS.has }} />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{node.label}</h3>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isMissing ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : isGoal ? 'bg-amber-50 dark:bg-lime-500/10 text-amber-600 dark:text-lime-400' : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                }`}>
                {isGoal ? 'Your Goal' : isMissing ? 'Missing Skill' : 'You Have This'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Category</p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 capitalize">{node.category || 'skill'}</p>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Step</p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{node.step ? `Step ${node.step}` : 'Goal'}</p>
          </div>
          {nodeProgress && (
            <div className={`flex-1 rounded-lg p-2 text-center ${nodeProgress.completed ? 'bg-green-50 dark:bg-green-500/10' : 'bg-amber-50 dark:bg-lime-500/10'}`}>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Video</p>
              <p className={`text-xs font-medium ${nodeProgress.completed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-lime-400'}`}>
                {nodeProgress.completed ? '✓ Done' : `${nodeProgress.progress_percent || 0}%`}
              </p>
            </div>
          )}
        </div>

        {isMissing && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Play className="w-3.5 h-3.5 text-red-500" />
              <h4 className="font-medium text-xs text-slate-700 dark:text-slate-200">Tutorial Video</h4>
            </div>
            {loadingVideos ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">Finding best tutorial...</span>
              </div>
            ) : video ? (
              <EmbeddedVideoPlayer
                video={video}
                userId={userId}
                roadmapId={roadmapId}
                nodeId={node.id}
                onProgressUpdate={onProgressUpdate}
              />
            ) : (
              <div className="text-center py-4 text-slate-400">
                <BookOpen className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">No tutorial found</p>
              </div>
            )}
          </div>
        )}

        {node.status === 'has' && (
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg p-3 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-green-700 dark:text-green-400">You already have this skill!</p>
          </div>
        )}

        {isGoal && (
          <div className="bg-amber-50 dark:bg-lime-500/10 border border-amber-200 dark:border-lime-500/20 rounded-lg p-3 text-center">
            <Target className="w-6 h-6 text-amber-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-amber-700 dark:text-lime-400">This is your career goal!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// Interactive Loading Steps
// ============================================
const LOADING_STEPS = [
  { icon: FileText, text: 'Agent fetched your resume data', color: 'blue', delay: 0 },
  { icon: Brain, text: 'Analyzing your current skills', color: 'purple', delay: 2500 },
  { icon: Search, text: 'Researching career requirements', color: 'indigo', delay: 5000 },
  { icon: Cpu, text: 'AI mapping skill gaps', color: 'amber', delay: 8000 },
  { icon: Target, text: 'Building step-by-step learning path', color: 'orange', delay: 11000 },
  { icon: Zap, text: 'Finalizing your roadmap', color: 'green', delay: 14000 },
];

const LoadingView = ({ careerGoal }) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers = LOADING_STEPS.map((_, i) =>
      setTimeout(() => setActiveStep(i), LOADING_STEPS[i].delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-lg px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-amber-100 dark:border-lime-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Generating Your Roadmap</h2>
          <p className="text-slate-400 text-xs mt-1">for &ldquo;{careerGoal}&rdquo;</p>
        </motion.div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-6">
          <motion.div
            className="bg-amber-500 h-1.5 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(((activeStep + 1) / LOADING_STEPS.length) * 100, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        <div className="space-y-2.5">
          {LOADING_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === activeStep;
            const isDone = idx < activeStep;
            const isVisible = idx <= activeStep;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isVisible ? 1 : 0.15, x: isVisible ? 0 : -10 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${isActive ? 'bg-amber-50 dark:bg-lime-500/10 border-amber-200 dark:border-lime-500/20 shadow-sm scale-[1.02]' :
                    isDone ? 'bg-green-50/60 dark:bg-green-500/10 border-green-100 dark:border-green-500/20' :
                      'bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                  }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-amber-100 dark:bg-lime-500/20' : isDone ? 'bg-green-100 dark:bg-green-500/20' : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                  {isDone ? <CheckCircle className="w-4.5 h-4.5 text-green-500" /> :
                    isActive ? <Loader2 className="w-4.5 h-4.5 text-amber-600 dark:text-lime-400 animate-spin" /> :
                      <Icon className="w-4.5 h-4.5 text-slate-300" />}
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-amber-700 dark:text-lime-400' : isDone ? 'text-green-600 dark:text-green-400' : 'text-slate-300 dark:text-slate-500'
                  }`}>{step.text}</span>
                {isDone && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </motion.div>
                )}
                {isActive && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }} className="ml-auto">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Card icon map for career goals
// ============================================
const CAREER_ICONS = {
  'full stack': Code2, 'frontend': Code2, 'backend': Database, 'data': BarChart3,
  'devops': Cloud, 'cloud': Cloud, 'mobile': Smartphone, 'ml': Brain,
  'machine learning': Brain, 'ai': Brain, 'network': Globe, 'security': AlertCircle,
  'product': Briefcase, 'ux': Target, 'default': GraduationCap,
};
const CARD_GRADIENTS = [
  'from-amber-400 to-orange-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-sky-500',
];

function getCareerIcon(goal) {
  const lower = (goal || '').toLowerCase();
  for (const [key, Icon] of Object.entries(CAREER_ICONS)) {
    if (key !== 'default' && lower.includes(key)) return Icon;
  }
  return CAREER_ICONS.default;
}

// ============================================
// History Card — modern card design
// ============================================
const HistoryCard = ({ item, onLoad, index = 0 }) => {
  const date = item.generated_at ? new Date(item.generated_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  }) : '';
  const Icon = getCareerIcon(item.career_goal);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const total = (item.has_count || 0) + (item.missing_count || 0);
  const progress = total > 0 ? Math.round(((item.has_count || 0) / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 cursor-pointer transition-all duration-200 hover:border-amber-200 dark:hover:border-lime-500/20 group"
      onClick={() => onLoad(item.id, item.career_goal)}
    >
      {/* Icon + title */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight capitalize truncate">{item.career_goal}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{date}</p>
        </div>
      </div>

      {/* Summary */}
      {item.summary && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">{item.summary}</p>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-400">Skill coverage</span>
          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
          <motion.div
            className={`bg-gradient-to-r ${progress >= 60 ? 'from-emerald-400 to-green-500' : progress >= 30 ? 'from-amber-400 to-orange-500' : 'from-red-400 to-rose-500'} h-1.5 rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, delay: index * 0.06 + 0.3 }}
          />
        </div>
      </div>

      {/* Stats footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px]">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span className="text-green-600 font-semibold">{item.has_count}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span className="text-red-500 font-semibold">{item.missing_count}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full group-hover:bg-amber-50 dark:group-hover:bg-lime-500/10 group-hover:text-amber-600 dark:group-hover:text-lime-400 transition-colors">
          <span>{item.total_skills} skills</span>
          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// Main Component
// ============================================
const CareerRoadmap = () => {
  useActivityTracker('roadmap');
  const [step, setStep] = useState('input');
  const [careerGoal, setCareerGoal] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [roadmapData, setRoadmapData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeVideos, setNodeVideos] = useState({});
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [videoProgress, setVideoProgress] = useState({});
  const [currentRoadmapId, setCurrentRoadmapId] = useState(null);
  const [opikEval, setOpikEval] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; }
  }, []);
  const userId = user?.id || user?.user_id;

  // Store React Flow instance for fitView
  const rfInstance = useRef(null);
  const topBarRef = useRef(null);
  const [graphHeight, setGraphHeight] = useState(600);

  // Measure remaining height for React Flow
  useEffect(() => {
    if (step !== 'graph') return;
    const measure = () => {
      if (topBarRef.current) {
        const topBarBottom = topBarRef.current.getBoundingClientRect().bottom;
        const viewportH = window.innerHeight;
        const remaining = viewportH - topBarBottom;
        console.log('[GraphView] topBarBottom:', topBarBottom, 'viewportH:', viewportH, 'remaining:', remaining);
        setGraphHeight(Math.max(remaining, 300));
      }
    };
    // Small delay to ensure DOM is painted
    const timer = setTimeout(measure, 50);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(timer); window.removeEventListener('resize', measure); };
  }, [step, roadmapData]);

  // React Flow nodes
  useEffect(() => {
    if (roadmapData?.nodes) {
      console.log('[CareerRoadmap] roadmapData.nodes:', roadmapData.nodes.length, 'links:', roadmapData.links?.length);
      console.log('[CareerRoadmap] sample node:', JSON.stringify(roadmapData.nodes[0]));
      const { nodes: ln, edges: le } = convertToReactFlowFormat(
        roadmapData, selectedNode,
        (node) => setSelectedNode(prev => prev?.id === node.id ? null : node),
        videoProgress
      );
      console.log('[CareerRoadmap] Setting nodes:', ln.length, 'edges:', le.length);
      if (ln.length > 0) {
        console.log('[CareerRoadmap] First node position:', JSON.stringify(ln[0].position), 'type:', ln[0].type);
      }
      setNodes(ln);
      setEdges(le);

      // Re-fit view after nodes change
      setTimeout(() => {
        if (rfInstance.current) {
          console.log('[CareerRoadmap] Calling fitView on instance');
          rfInstance.current.fitView({ padding: 0.2, maxZoom: 0.85 });
        }
      }, 200);
    }
  }, [roadmapData, selectedNode, videoProgress]);

  // Fetch history
  useEffect(() => {
    if (!userId) { setHistoryLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/skill-roadmap/history/${userId}`);
        if (res.ok) { const data = await res.json(); setHistory(data.history || []); }
      } catch {}
      setHistoryLoading(false);
    })();
  }, [userId]);

  // Load roadmap by ID
  const loadRoadmap = async (roadmapId, goal) => {
    try {
      const res = await fetch(`${API_BASE}/api/skill-roadmap/load/${roadmapId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.roadmap) {
          setRoadmapData(data.roadmap);
          setCareerGoal(data.career_goal || goal);
          setSelectedNode(null);
          setNodeVideos({});
          setCurrentRoadmapId(roadmapId);
          setStep('graph');
          fetchVideoProgress(roadmapId);
        }
      }
    } catch { setError('Failed to load roadmap'); }
  };

  // Generate
  const handleGenerate = async () => {
    if (!careerGoal.trim() || careerGoal.trim().length < 3) {
      setError('Please enter a valid career goal'); return;
    }
    setError('');
    setStep('loading');
    try {
      const res = await fetch(`${API_BASE}/api/skill-roadmap/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, career_goal: careerGoal.trim(), preferred_language: preferredLanguage })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to generate roadmap');
      }
      const data = await res.json();
      if (data.success && data.roadmap) {
        setRoadmapData(data.roadmap);
        if (data.opik_eval) setOpikEval(data.opik_eval);
        setSelectedNode(null);
        setNodeVideos({});
        setVideoProgress({});
        if (data.roadmap_id) {
          setCurrentRoadmapId(data.roadmap_id);
          fetchVideoProgress(data.roadmap_id);
        }
        setStep('graph');
        // Refresh history
        try {
          const hres = await fetch(`${API_BASE}/api/skill-roadmap/history/${userId}`);
          if (hres.ok) { const hd = await hres.json(); setHistory(hd.history || []); }
        } catch {}
      } else { throw new Error('Invalid response'); }
    } catch (e) { setError(e.message); setStep('input'); }
  };

  // Fetch videos (1 per skill)
  const fetchVideos = useCallback(async (searchQuery, nodeId) => {
    if (nodeVideos[nodeId]) return;
    setLoadingVideos(true);
    try {
      const res = await fetch(`${API_BASE}/api/skill-roadmap/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, preferred_language: preferredLanguage, max_results: 1 })
      });
      const data = await res.json();
      setNodeVideos(prev => ({ ...prev, [nodeId]: data.videos || [] }));
    } catch { setNodeVideos(prev => ({ ...prev, [nodeId]: [] })); }
    finally { setLoadingVideos(false); }
  }, [nodeVideos, preferredLanguage]);

  // Fetch video progress when roadmap loads
  const fetchVideoProgress = useCallback(async (roadmapId) => {
    if (!userId || !roadmapId) return;
    try {
      const res = await fetch(`${API_BASE}/api/skill-roadmap/video-progress/${userId}/${roadmapId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setVideoProgress(data.progress || {});
      }
    } catch {}
  }, [userId]);

  // Handle progress update from embedded player
  const handleProgressUpdate = useCallback((nodeId, isCompleted, watchedSec) => {
    setVideoProgress(prev => {
      const existing = prev[nodeId] || {};
      const dur = existing.duration_seconds || watchedSec || 1;
      return {
        ...prev,
        [nodeId]: {
          ...existing,
          completed: isCompleted,
          watched_seconds: watchedSec,
          progress_percent: isCompleted ? 100 : Math.round((watchedSec / dur) * 100),
        }
      };
    });
  }, []);

  // ============================================
  // INPUT VIEW — ChatAgent + Card Grid
  // ============================================
  if (step === 'input') {
    const suggestions = [
      { label: 'Full Stack Developer', icon: Code2 },
      { label: 'Data Scientist', icon: BarChart3 },
      { label: 'DevOps Engineer', icon: Cloud },
      { label: 'ML Engineer', icon: Brain },
      { label: 'Mobile Developer', icon: Smartphone },
      { label: 'Cloud Architect', icon: Cloud },
    ];

    return (
      <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors">
        {/* ChatAgent Header Bar */}
        <div className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                <MessageSquare className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">ChatAgent</h1>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-[10px] text-slate-400">AI Career Roadmap Agent — Online</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <Globe className="w-3.5 h-3.5" />
              <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)}
                className="bg-transparent border-none text-[10px] text-slate-500 dark:text-slate-400 focus:outline-none cursor-pointer pr-4">
                {['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese'].map(l => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content — scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {/* Chat Welcome Area */}
          <div className="max-w-3xl mx-auto px-6 pt-8 pb-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-lime-500/20 dark:to-lime-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Sparkles className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">What career path would you like to explore?</h2>
              <p className="text-sm text-slate-400">I'll analyze your resume skills and build a personalized learning roadmap</p>
            </motion.div>

            {/* Quick Pick Chips */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="flex flex-wrap justify-center gap-2 mb-6">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  onClick={() => setCareerGoal(s.label)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 text-sm
                    ${careerGoal === s.label
                      ? 'bg-amber-50 dark:bg-lime-500/10 border-amber-300 dark:border-lime-500/30 text-amber-700 dark:text-lime-400 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-200 dark:hover:border-lime-500/30 hover:bg-amber-50/50 dark:hover:bg-lime-500/10 hover:text-amber-700 dark:hover:text-lime-400'
                    }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </motion.button>
              ))}
            </motion.div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="max-w-md mx-auto mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400 text-center">
                {error}
              </motion.div>
            )}
          </div>

          {/* Saved Roadmaps Grid */}
          {(history.length > 0 || historyLoading) && (
            <div className="max-w-5xl mx-auto px-6 pb-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <History className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Your Roadmaps</h2>
                <span className="text-[10px] text-amber-600 dark:text-lime-400 bg-amber-50 dark:bg-lime-500/10 px-2 py-0.5 rounded-full font-semibold">
                  {history.length}
                </span>
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  <span className="ml-2 text-sm text-slate-400">Loading your roadmaps...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.map((item, idx) => (
                    <HistoryCard key={item.id} item={item} onLoad={loadRoadmap} index={idx} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!historyLoading && history.length === 0 && (
            <div className="max-w-3xl mx-auto px-6 pb-8">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Target className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">No roadmaps yet</p>
                <p className="text-xs text-slate-400">Type a career goal below to generate your first roadmap</p>
              </motion.div>
            </div>
          )}
        </div>

        {/* ChatAgent Input — fixed bottom bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all px-4 py-1">
              <MessageSquare className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={careerGoal}
                onChange={(e) => setCareerGoal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Tell me your dream career... e.g., Full Stack Developer"
                className="flex-1 bg-transparent border-none py-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleGenerate}
                disabled={!careerGoal.trim()}
                className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 disabled:from-slate-200 disabled:to-slate-300 rounded-xl flex items-center justify-center transition-all shadow-sm hover:shadow-md disabled:shadow-none shrink-0"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-300 mt-2">
              ChatAgent analyzes your resume &amp; builds a personalized skill roadmap
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // LOADING VIEW
  // ============================================
  if (step === 'loading') {
    return (
      <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
        <LoadingView careerGoal={careerGoal} />
      </div>
    );
  }

  // ============================================
  // GRAPH VIEW
  // ============================================
  const missingCount = roadmapData?.missing_count || roadmapData?.nodes?.filter(n => n.status === 'missing').length || 0;
  const hasCount = roadmapData?.has_count || roadmapData?.nodes?.filter(n => n.status === 'has').length || 0;

  return (
    <>
    <div className="bg-slate-50 dark:bg-slate-950 transition-colors" style={{ height: '100vh', overflow: 'hidden' }}>
      <style>{`
        .react-flow__handle { opacity: 0; }
        .react-flow__node:hover .react-flow__handle { opacity: 1; }
      `}</style>

      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-500" />
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">{roadmapData?.career_goal || careerGoal}</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3.5 h-3.5" /> {hasCount} have</span>
            <span className="flex items-center gap-1 text-red-500"><AlertCircle className="w-3.5 h-3.5" /> {missingCount} to learn</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-400 mr-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Have</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Learn</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Goal</span>
          </div>
          <button onClick={() => { setStep('input'); setSelectedNode(null); setRoadmapData(null); }}
            className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> New Search
          </button>
        </div>
      </div>

      {/* Measurement ref — everything above this is "topBar" */}
      <div ref={topBarRef} />

      {/* React Flow with explicit pixel height */}
      <div style={{ width: '100%', height: graphHeight, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            console.log('[ReactFlow] onInit — nodes:', nodes.length);
            rfInstance.current = instance;
            setTimeout(() => instance.fitView({ padding: 0.2, maxZoom: 0.85 }), 150);
          }}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 0.85, minZoom: 0.15 }}
          minZoom={0.1}
          maxZoom={1.2}
          defaultEdgeOptions={{
            animated: true,
            style: { strokeWidth: 2.5, stroke: '#3b82f6' },
            type: 'smoothstep',
          }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
        >
          <Background color="#cbd5e1" gap={24} size={1.5} />
          <Controls showInteractive={false} className="bg-white dark:bg-slate-900 shadow-lg rounded-lg border border-slate-200 dark:border-slate-800" />
          <MiniMap
            nodeColor={(node) => STATUS_BG[node.data?.node?.status] || '#94a3b8'}
            nodeStrokeWidth={2}
            zoomable
            pannable
            maskColor="rgb(240, 242, 245, 0.8)"
            style={{ backgroundColor: '#f8fafc', width: 140, height: 90 }}
          />
        </ReactFlow>

        <AnimatePresence>
          {selectedNode && (
            <SkillPanel
              node={selectedNode}
              videos={nodeVideos[selectedNode.id]}
              loadingVideos={loadingVideos}
              onClose={() => setSelectedNode(null)}
              onFetchVideos={fetchVideos}
              userId={userId}
              roadmapId={currentRoadmapId}
              videoProgress={videoProgress}
              onProgressUpdate={handleProgressUpdate}
            />
          )}
        </AnimatePresence>

        {/* Collapsible Summary Card - Bottom Right */}
        {roadmapData?.summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-4 right-4 z-10"
          >
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ maxWidth: '380px' }}>
              {/* Header with toggle */}
              <div
                className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-lime-500/10 dark:to-lime-500/10 border-b border-amber-200 dark:border-lime-500/20 cursor-pointer hover:from-amber-100 hover:to-orange-100 dark:hover:from-lime-500/20 dark:hover:to-lime-500/20 transition-colors"
                onClick={() => setSummaryExpanded(!summaryExpanded)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-xs font-bold text-amber-800 dark:text-lime-400">AI Analysis</h3>
                </div>
                <button className="p-0.5 hover:bg-amber-200/50 dark:hover:bg-lime-500/20 rounded transition-colors">
                  {summaryExpanded ? (
                    <ChevronDown className="w-4 h-4 text-amber-700 dark:text-lime-400" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-amber-700 dark:text-lime-400" />
                  )}
                </button>
              </div>

              {/* Collapsible Content */}
              <AnimatePresence>
                {summaryExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-3 py-2.5">
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {roadmapData.summary}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </div>

    {opikEval && (
      <OpikEvalPopup
        evaluation={opikEval}
        agentName="Skill Roadmap"
        onClose={() => setOpikEval(null)}
      />
    )}
    </>
  );
};

export default CareerRoadmap;
