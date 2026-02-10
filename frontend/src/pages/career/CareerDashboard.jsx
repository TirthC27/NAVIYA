import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Target,
  Zap,
  ChevronRight,
  ChevronLeft,
  Clock,
  FileText,
  MessageSquare,
  Route,
  Lock,
  CheckCircle,
  Users,
  Activity,
  Sparkles,
  Award,
  BarChart3,
  Brain,
  Play,
  Upload,
  ArrowUpRight,
  RefreshCw,
  Shield,
  Star,
  BookOpen,
  Search,
  Calendar as CalendarIcon,
  Circle,
  Presentation
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDashboardState } from '../../context/DashboardStateContext';
import useActivityTracker from '../../hooks/useActivityTracker';
import { API_BASE_URL as API_BASE } from '../../api/config';

// ─── Helpers ────────────────────────────────────────────
const getUserId = () => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user?.id || user?.user_id || null;
    }
  } catch (e) {}
  return null;
};

const getUserName = () => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user?.name || user?.full_name || user?.email?.split('@')[0] || 'there';
    }
  } catch (e) {}
  return 'there';
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatScore = (v) => (v != null ? Math.round(v) : '--');

// ─── Calendar Helper ────────────────────────────────────
const getCalendarData = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const weeks = [];
  let day = 1;
  let nextDay = 1;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      if (w === 0 && d < firstDay) {
        week.push({ day: daysInPrev - firstDay + d + 1, current: false });
      } else if (day <= daysInMonth) {
        week.push({ day, current: true });
        day++;
      } else {
        week.push({ day: nextDay++, current: false });
      }
    }
    weeks.push(week);
    if (day > daysInMonth) break;
  }
  return weeks;
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── Main Dashboard ────────────────────────────────────
const CareerDashboard = () => {
  useActivityTracker('dashboard');
  const navigate = useNavigate();
  const { state: ds, canAccess, unlockedFeatures, loading: stateLoading } = useDashboardState();
  const userId = ds?.user_id || getUserId();

  // Real data states
  const [resumeData, setResumeData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [roadmapSummary, setRoadmapSummary] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [roadmapHistory, setRoadmapHistory] = useState([]);
  const [videoProgress, setVideoProgress] = useState({});
  const [weeklyActivity, setWeeklyActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const today = new Date();

  // Fetch all data in parallel
  const fetchAll = useCallback(async (isRefresh = false) => {
    if (!userId) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);

    const safe = async (fn) => { try { return await fn(); } catch { return null; } };

    const [resData, analysis, roadmap, assess, rmHistory] = await Promise.all([
      safe(async () => {
        const r = await fetch(`${API_BASE}/api/resume-simple/data/${userId}`);
        if (!r.ok) return null;
        return r.json();
      }),
      safe(async () => {
        const r = await fetch(`${API_BASE}/api/career-intelligence/analysis/${userId}`);
        if (!r.ok) return null;
        return r.json();
      }),
      safe(async () => {
        const r = await fetch(`${API_BASE}/api/roadmap/${userId}/summary`);
        if (!r.ok) return null;
        return r.json();
      }),
      safe(async () => {
        const r = await fetch(`${API_BASE}/api/skill-assessment/history/${userId}`);
        if (!r.ok) return null;
        return r.json();
      }),
      safe(async () => {
        const r = await fetch(`${API_BASE}/api/skill-roadmap/history/${userId}`);
        if (!r.ok) return null;
        return r.json();
      }),
    ]);

    setResumeData(resData);
    setAnalysisData(analysis);
    setRoadmapSummary(roadmap);
    setAssessments(Array.isArray(assess) ? assess : assess?.history || []);
    setRoadmapHistory(rmHistory?.history || []);

    // Fetch video progress for most recent roadmap
    if (rmHistory?.history?.length > 0) {
      const latestId = rmHistory.history[0].id;
      safe(async () => {
        const r = await fetch(`${API_BASE}/api/skill-roadmap/video-progress/${userId}/${latestId}`);
        if (r.ok) {
          const d = await r.json();
          if (d.success) setVideoProgress(d.progress || {});
        }
      });
    }

    setLoading(false);
    setRefreshing(false);

    // Fetch weekly activity for Hours chart
    safe(async () => {
      const r = await fetch(`${API_BASE}/api/activity/weekly/${userId}`);
      if (r.ok) {
        const d = await r.json();
        if (d.success) setWeeklyActivity(d);
      }
    });
  }, [userId]);

  useEffect(() => { if (!stateLoading) fetchAll(); }, [stateLoading, fetchAll]);

  // Derived data
  const userName = resumeData?.name || getUserName();
  const skills = resumeData?.skills || analysisData?.extracted_data?.skills || [];
  const skillCount = Array.isArray(skills) ? skills.length : 0;
  const overallScore = analysisData?.overall_score ?? analysisData?.quality_scores?.overall ?? null;
  
  const completedAssessments = assessments.filter(a => a.completed).length;
  const avgAssessScore = completedAssessments > 0
    ? Math.round(assessments.filter(a => a.completed).reduce((s, a) => s + (a.total_score || 0), 0) / completedAssessments)
    : null;

  const roadmapPhases = roadmapSummary?.total_phases || 0;
  const roadmapCompleted = roadmapSummary?.completed_phases || 0;
  const roadmapProgress = roadmapSummary?.overall_progress || 0;

  // Get latest skill roadmap nodes for "Daily Schedule" equivalent
  const latestRoadmap = roadmapHistory.length > 0 ? roadmapHistory[0] : null;

  // Hours Activity — real data from /api/activity/weekly
  const weekActivity = useMemo(() => {
    if (weeklyActivity?.days) {
      const todayISO = new Date().toISOString().slice(0, 10);
      return weeklyActivity.days.map(d => ({
        day: d.day_label,
        hours: d.hours,
        totalSeconds: d.total_seconds,
        features: d.features || {},
        isToday: d.day === todayISO,
      }));
    }
    // Fallback: empty week
    const labels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0
    return labels.map((d, i) => ({ day: d, hours: 0, totalSeconds: 0, features: {}, isToday: i === todayIdx }));
  }, [weeklyActivity]);

  const totalWeekHours = weeklyActivity?.total_hours || 0;
  const mostActiveFeature = weeklyActivity?.most_active_feature || null;

  const maxActivity = Math.max(...weekActivity.map(w => w.hours), 1);

  // Feature cards data
  const features = [
    { to: '/career/resume', icon: FileText, label: 'Resume Analysis', lessons: `${skillCount || 0} skills`, rate: overallScore ? (overallScore / 20).toFixed(1) : '--', type: 'AI Review', gradient: 'from-blue-500 to-indigo-500', unlocked: true, done: ds?.resume_ready },
    { to: '/career/roadmap', icon: Route, label: 'Career Roadmap', lessons: `${latestRoadmap?.total_skills || 0} skills`, rate: '4.9', type: 'Learning Path', gradient: 'from-emerald-500 to-teal-500', unlocked: canAccess('roadmap') || canAccess('resume_analysis'), done: ds?.roadmap_ready },
    { to: '/career/skills', icon: Zap, label: 'Skill Assessment', lessons: `${completedAssessments} completed`, rate: avgAssessScore ? (avgAssessScore / 20).toFixed(1) : '--', type: 'Challenges', gradient: 'from-violet-500 to-purple-500', unlocked: canAccess('skill_assessment') || canAccess('resume_analysis'), done: ds?.skill_eval_ready },
    { to: '/career/interview', icon: MessageSquare, label: 'Mock Interview', lessons: 'AI Avatar', rate: '4.8', type: 'Practice', gradient: 'from-amber-500 to-orange-500', unlocked: canAccess('mock_interview') || canAccess('resume_analysis'), done: ds?.interview_ready },
    { to: '/career/alumni', icon: Presentation, label: 'Topic Explainer', lessons: 'AI PPT', rate: '4.9', type: 'Learning', gradient: 'from-pink-500 to-rose-500', unlocked: canAccess('resume_analysis'), done: ds?.mentor_ready },
  ];

  // Calendar data
  const calWeeks = useMemo(() => getCalendarData(calYear, calMonth), [calYear, calMonth]);

  // Missing skills for "Daily Schedule"
  const missingSkills = useMemo(() => {
    if (!latestRoadmap) return [];
    // We don't have the full roadmap data here, so use history summary
    return [];
  }, [latestRoadmap]);

  // Next action
  const getNextAction = () => {
    if (!resumeData && !analysisData) return { title: 'Upload Your Resume', desc: 'Start your journey — upload your resume for AI-powered career analysis.', icon: Upload, path: '/career/resume', color: 'amber', time: '2 min' };
    if (roadmapHistory.length === 0) return { title: 'Generate Career Roadmap', desc: 'Get a personalized skill-gap roadmap based on your resume.', icon: Route, path: '/career/roadmap', color: 'emerald', time: '3 min' };
    if (completedAssessments === 0) return { title: 'Take Skill Assessment', desc: 'Test your abilities with scenario-based challenges.', icon: Zap, path: '/career/skills', color: 'violet', time: '10 min' };
    return { title: 'Practice Mock Interview', desc: 'Sharpen your interview skills with our AI avatar coach.', icon: Play, path: '/career/interview', color: 'amber', time: '15 min' };
  };
  const nextAction = getNextAction();

  // Loading skeleton
  if (loading || stateLoading) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-8 transition-colors">
        <div className="max-w-[1440px] mx-auto space-y-5 animate-pulse">
          <div className="h-10 w-72 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-colors" style={{ scrollbarWidth: 'thin' }}>
      <div className="max-w-[1440px] mx-auto p-5 lg:p-7 pb-10 space-y-5">

        {/* ═══════════════════════════════════════════
            ROW 1: Header — Welcome + Search
        ═══════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-[28px] font-bold text-slate-800 dark:text-slate-100">
              Welcome back <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">{userName}</span> 👋
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 w-64">
              <Search className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Search features</span>
            </div>
            <button onClick={() => fetchAll(true)} disabled={refreshing}
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════
            ROW 2: Feature Cards (like "New Courses")
        ═══════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Your Features</h2>
            <Link to="/career/roadmap" className="text-sm text-amber-600 dark:text-lime-400 hover:text-amber-700 font-medium">View All</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {features.map((f, i) => (
              <FeatureCourseCard key={f.label} feature={f} index={i} />
            ))}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════
            ROW 3: 3-column layout
            Left: Hours Activity | Mid: Daily Schedule | Right: Calendar + Go Premium
        ═══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Hours Activity (Bar Chart) — Real data */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="lg:col-span-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 h-full transition-colors">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Hours Activity</h3>
                <span className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
                  {totalWeekHours > 0 ? `${totalWeekHours}h this week` : 'Weekly'}
                </span>
              </div>
              {weekActivity.some(w => w.hours > 0) ? (
                <div className="flex items-center gap-1.5 mb-4">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">
                    {mostActiveFeature
                      ? `Most active: ${mostActiveFeature.charAt(0).toUpperCase() + mostActiveFeature.slice(1)}`
                      : `${totalWeekHours}h total`}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-4">Use any feature to see activity here</p>
              )}

              {/* Bar Chart */}
              <div className="flex items-end justify-between gap-2 h-40 mt-2">
                {weekActivity.map((w, i) => {
                  // Color based on dominant feature for that day
                  const featureKeys = Object.keys(w.features || {});
                  const topFeature = featureKeys.length > 0
                    ? featureKeys.reduce((a, b) => (w.features[a] || 0) > (w.features[b] || 0) ? a : b)
                    : null;
                  const featureColors = {
                    resume: 'from-blue-500 to-blue-400',
                    roadmap: 'from-emerald-500 to-emerald-400',
                    skills: 'from-violet-500 to-violet-400',
                    interview: 'from-amber-500 to-amber-400',
                    alumni: 'from-pink-500 to-pink-400',
                    topic_explainer: 'from-pink-500 to-pink-400',
                    dashboard: 'from-slate-400 to-slate-300',
                  };
                  const barGradient = w.isToday
                    ? 'from-amber-500 to-amber-400'
                    : (topFeature && w.hours > 0 ? featureColors[topFeature] || 'from-slate-300 to-slate-200' : 'from-slate-200 to-slate-200');

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                      <div className="w-full flex flex-col items-center justify-end" style={{ height: 120 }}>
                        {w.hours > 0 && (
                          <span className="text-[9px] text-slate-400 mb-1">{w.hours}h</span>
                        )}
                        <motion.div
                          className={`w-full max-w-[28px] rounded-t-lg bg-gradient-to-t ${barGradient}`}
                          initial={{ height: 0 }}
                          animate={{ height: w.hours > 0 ? Math.max((w.hours / maxActivity) * 100, 8) : 4 }}
                          transition={{ duration: 0.6, delay: i * 0.05 }}
                          style={{ minHeight: 4 }}
                        />
                      </div>
                      <span className={`text-[11px] font-medium ${w.isToday ? 'text-amber-600' : 'text-slate-400'}`}>{w.day}</span>
                      {/* Tooltip on hover */}
                      {w.hours > 0 && (
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                          {Object.entries(w.features || {}).map(([f, s]) => (
                            <div key={f} className="flex justify-between gap-2">
                              <span className="capitalize">{f}</span>
                              <span>{Math.round(s / 60)}m</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Feature Legend */}
              {weekActivity.some(w => w.hours > 0) && (
                <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {[
                    { key: 'resume', color: 'bg-blue-500', label: 'Resume' },
                    { key: 'roadmap', color: 'bg-emerald-500', label: 'Roadmap' },
                    { key: 'skills', color: 'bg-violet-500', label: 'Skills' },
                    { key: 'interview', color: 'bg-amber-500', label: 'Interview' },
                    { key: 'alumni', color: 'bg-pink-500', label: 'Explainer' },
                  ].map(l => (
                    <div key={l.key} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${l.color}`} />
                      <span className="text-[10px] text-slate-400">{l.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Daily Schedule / Learning Plan */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 h-full transition-colors">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Learning Plan</h3>
              <div className="space-y-3">
                {/* Show feature-based schedule items */}
                <ScheduleItem
                  icon={FileText} color="blue"
                  title="Resume Analysis"
                  sub={ds?.resume_ready ? 'Completed' : 'Pending'}
                  done={ds?.resume_ready}
                />
                <ScheduleItem
                  icon={Route} color="emerald"
                  title="Career Roadmap"
                  sub={roadmapHistory.length > 0 ? `${roadmapHistory.length} roadmap${roadmapHistory.length > 1 ? 's' : ''}` : 'Not started'}
                  done={roadmapHistory.length > 0}
                />
                <ScheduleItem
                  icon={Zap} color="violet"
                  title="Skill Assessment"
                  sub={completedAssessments > 0 ? `${completedAssessments} completed` : 'Not started'}
                  done={completedAssessments > 0}
                />
                <ScheduleItem
                  icon={MessageSquare} color="amber"
                  title="Mock Interview"
                  sub="AI Avatar Practice"
                  done={false}
                />
              </div>
            </div>
          </motion.div>

          {/* Right Column: Calendar + CTA Banner */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="lg:col-span-4 space-y-5">

            {/* Go Premium / Next Step CTA */}
            <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 rounded-2xl p-5 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 opacity-20">
                <svg viewBox="0 0 100 100"><circle cx="70" cy="30" r="40" fill="white"/><circle cx="90" cy="50" r="25" fill="white"/></svg>
              </div>
              <p className="text-amber-100 text-xs font-medium mb-1">NAVIYA AI</p>
              <h3 className="text-lg font-bold leading-tight mb-1">{nextAction.title}</h3>
              <p className="text-amber-100/90 text-xs leading-relaxed mb-3">{nextAction.desc}</p>
              <button onClick={() => navigate(nextAction.path)}
                className="bg-white text-amber-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors shadow-sm">
                Get Started
              </button>
            </div>

            {/* Calendar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <ChevronLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{MONTH_NAMES[calMonth]}, {calYear}</h4>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-0 mb-1">
                {DAY_HEADERS.map((d, i) => (
                  <div key={i} className="text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-1">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              {calWeeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-0">
                  {week.map((cell, di) => {
                    const isToday = cell.current && cell.day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                    return (
                      <div key={di} className={`text-center py-1.5 text-xs rounded-lg cursor-default
                        ${isToday ? 'bg-amber-500 text-white font-bold' : cell.current ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800' : 'text-slate-300 dark:text-slate-600'}`}>
                        {cell.day}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════
            ROW 4: Active Roadmaps (like "Course You're Taking")
        ═══════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Roadmaps You're Taking</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600 dark:text-lime-400 bg-amber-50 dark:bg-lime-500/10 border border-amber-200 dark:border-lime-500/30 px-2.5 py-1 rounded-lg font-medium">Active</span>
              <Link to="/career/roadmap" className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                <span className="text-slate-500 dark:text-slate-400 text-sm font-bold">+</span>
              </Link>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
            {roadmapHistory.length > 0 ? (
              roadmapHistory.slice(0, 4).map((rm, i) => {
                const total = (rm.has_count || 0) + (rm.missing_count || 0);
                const pct = total > 0 ? Math.round(((rm.has_count || 0) / total) * 100) : 0;
                return (
                  <Link key={rm.id} to="/career/roadmap"
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                      i === 0 ? 'from-amber-400 to-orange-500' : i === 1 ? 'from-blue-400 to-indigo-500' : i === 2 ? 'from-emerald-400 to-teal-500' : 'from-violet-400 to-purple-500'
                    } flex items-center justify-center shadow-sm`}>
                      <Route className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize truncate">{rm.career_goal}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{rm.total_skills} skills · {rm.missing_count} to learn</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-[11px] text-slate-400">Coverage</p>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{rm.has_count}/{total} skills</p>
                    </div>
                    {/* Circular progress */}
                    <div className="relative w-10 h-10 shrink-0">
                      <svg width={40} height={40} className="-rotate-90">
                        <circle cx={20} cy={20} r={16} fill="none" stroke="#f1f5f9" strokeWidth={3} />
                        <circle cx={20} cy={20} r={16} fill="none"
                          stroke={pct >= 60 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444'}
                          strokeWidth={3} strokeLinecap="round"
                          strokeDasharray={100.5}
                          strokeDashoffset={100.5 - (pct / 100) * 100.5}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">{pct}%</span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Route className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No roadmaps yet</p>
                <Link to="/career/roadmap" className="mt-2 text-xs text-amber-600 font-medium hover:text-amber-700">Generate your first roadmap →</Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════
            ROW 5: Assessments + Resume Insights (like "Assignments")
        ═══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Recent Assessments (like "Assignments") */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 h-full transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Assessments</h3>
                {completedAssessments > 0 && (
                  <Link to="/career/skills" className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-bold">+</span>
                  </Link>
                )}
              </div>
              {completedAssessments > 0 ? (
                <div className="space-y-3">
                  {assessments.filter(a => a.completed).slice(0, 4).map((a, i) => {
                    const score = a.total_score || 0;
                    const status = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Work';
                    const statusColor = score >= 80 ? 'bg-emerald-100 text-emerald-700' : score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                    const iconColor = score >= 80 ? 'from-emerald-400 to-green-500' : score >= 60 ? 'from-amber-400 to-orange-500' : 'from-red-400 to-rose-500';
                    return (
                      <div key={a.id || i} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center shadow-sm`}>
                          <Award className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate capitalize">{a.skill || a.domain || 'Assessment'}</p>
                          <p className="text-xs text-slate-400">
                            {a.completed_at ? new Date(a.completed_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${statusColor}`}>
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <Award className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No assessments yet</p>
                  <Link to="/career/skills" className="mt-2 text-xs text-amber-600 dark:text-lime-400 font-medium hover:text-amber-700">Take first assessment →</Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Resume Insights / Stats */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 h-full transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Resume Insights</h3>
                {ds?.resume_ready && (
                  <Link to="/career/resume" className="text-xs text-amber-600 dark:text-lime-400 hover:text-amber-700 font-medium flex items-center gap-0.5">
                    Details <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {ds?.resume_ready && analysisData ? (
                <div className="space-y-4">
                  {/* Score + Skills */}
                  <div className="flex items-center gap-4">
                    <ScoreRing score={overallScore || 0} size={68} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Overall Score</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(overallScore || 0) >= 80 ? 'Excellent resume!' : (overallScore || 0) >= 60 ? 'Good, room to improve' : 'Needs improvement'}
                      </p>
                    </div>
                  </div>
                  {/* Quality bars */}
                  {analysisData?.quality_scores && (
                    <div className="space-y-2">
                      {Object.entries(analysisData.quality_scores).filter(([k]) => k !== 'overall').slice(0, 4).map(([key, val]) => (
                        <QualityBar key={key} label={key.replace(/_/g, ' ')} value={val} />
                      ))}
                    </div>
                  )}
                  {/* Skills tags */}
                  {skillCount > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Top Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(skills) ? skills : []).slice(0, 8).map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 bg-amber-50 dark:bg-lime-500/10 text-amber-700 dark:text-lime-400 text-[11px] rounded-full border border-amber-200 dark:border-lime-500/20 font-medium">
                            {typeof skill === 'string' ? skill : skill?.name || 'Skill'}
                          </span>
                        ))}
                        {skillCount > 8 && <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] rounded-full">+{skillCount - 8}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No resume analysis yet</p>
                  <Link to="/career/resume" className="mt-2 text-xs text-amber-600 dark:text-lime-400 font-medium hover:text-amber-700">Upload Resume →</Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════
            Footer Status Bar
        ═══════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Powered by NAVIYA AI
              </span>
            </div>
            <div className="flex gap-2">
              <StatusDot active={!!resumeData} label="Resume" />
              <StatusDot active={roadmapHistory.length > 0} label="Roadmap" />
              <StatusDot active={completedAssessments > 0} label="Skills" />
              <StatusDot active={false} label="Interview" />
              <StatusDot active={true} label="Explainer" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ─── Sub-Components ─────────────────────────────────────

// Feature Card — matches "New Courses" card style
const FeatureCourseCard = ({ feature: f, index }) => {
  const isOpen = f.unlocked;
  return (
    <Link
      to={isOpen ? f.to : '#'}
      onClick={e => { if (!isOpen) e.preventDefault(); }}
      className={`group bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-4 transition-all hover:shadow-md ${
        isOpen ? 'border-slate-200/80 dark:border-slate-800 cursor-pointer hover:border-amber-200 dark:hover:border-lime-500/40' : 'border-slate-200/50 dark:border-slate-800/50 opacity-60 cursor-not-allowed'
      }`}
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + index * 0.04 }}>
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${isOpen ? f.gradient : 'from-slate-300 to-slate-400'} flex items-center justify-center shadow-sm`}>
            {isOpen ? <f.icon className="w-5 h-5 text-white" /> : <Lock className="w-4 h-4 text-white" />}
          </div>
          {f.done && (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          )}
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight mb-0.5">{f.label}</h4>
        <p className="text-[11px] text-slate-400">{f.lessons}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Rate</span>
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{f.rate}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400">Type</span>
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{f.type}</p>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

// Schedule Item — matches "Daily Schedule" row
const ScheduleItem = ({ icon: Icon, color, title, sub, done }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    violet: 'bg-violet-100 text-violet-600',
    amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <div className="flex items-center gap-3 py-2.5 group cursor-default">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color] || colors.blue}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        <p className="text-[11px] text-slate-400">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors" />
    </div>
  );
};

// Score Ring (SVG)
const ScoreRing = ({ score, size = 68 }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={5} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{Math.round(score)}</span>
      </div>
    </div>
  );
};

// Quality Bar
const QualityBar = ({ label, value }) => {
  const numVal = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : 0);
  const pct = numVal > 1 ? numVal : numVal * 100;
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-400';

  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize w-24 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div className={`h-full ${color} rounded-full`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
      </div>
      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 w-8 text-right">{Math.round(pct)}%</span>
    </div>
  );
};

// Status Dot
const StatusDot = ({ active, label }) => (
  <div className="flex items-center gap-1" title={label}>
    <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
    <span className="text-[10px] text-slate-400 hidden md:inline">{label}</span>
  </div>
);

export default CareerDashboard;
