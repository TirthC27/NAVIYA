import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PromptBox from '../components/home/PromptBox';
import LoadingPipeline from '../components/home/LoadingPipeline';
import RecentPlans from '../components/home/RecentPlans';
import { generateLearningPlan, createPlan, addStepsToPlan, getUserPlans, getLearningModes } from '../api';
import {
  Sparkles,
  Target,
  BookOpen,
  Trophy,
  FileText,
  MessageCircle,
  BarChart3,
  ArrowRight,
  ArrowUpRight,
  Brain,
  Zap,
} from 'lucide-react';

/* ─── Feature cards ─── */
const features = [
  {
    title: 'Personalized\nCareer Roadmaps',
    desc: 'AI-generated career paths tailored to your goals, skills, and aspirations — with step-by-step milestones.',
    icon: Target,
    img: '/Vector_images/img1.png',
    color: 'from-amber-50 to-amber-100/60',
    accent: 'text-amber-600',
    tag: 'Explore roadmaps',
  },
  {
    title: 'AI-Curated\nLearning Paths',
    desc: 'Dynamic learning roadmaps built from the best YouTube content, adapted to your pace and level.',
    icon: BookOpen,
    img: '/Vector_images/img2.png',
    color: 'from-violet-50 to-violet-100/60',
    accent: 'text-violet-600',
    tag: 'Start learning',
  },
  {
    title: 'Resume Analysis\n& Interview Prep',
    desc: 'Deep resume parsing with ATS optimization and AI-powered mock interviews to ace every opportunity.',
    icon: FileText,
    img: '/Vector_images/img3.png',
    color: 'from-emerald-50 to-emerald-100/60',
    accent: 'text-emerald-600',
    tag: 'Get started',
  },
];

const stats = [
  { value: '10+', label: 'AI Agents' },
  { value: '24/7', label: 'Mentor Access' },
  { value: '100%', label: 'Personalized' },
  { value: '∞', label: 'Career Paths' },
];

const Home = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [recentPlans, setRecentPlans] = useState([]);
  const [learningModes, setLearningModes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecentPlans();
    fetchLearningModes();
  }, []);

  const fetchRecentPlans = async () => {
    try {
      const plans = await getUserPlans('anonymous', 5);
      setRecentPlans(plans || []);
    } catch (err) {
      console.log('No recent plans found');
    }
  };

  const fetchLearningModes = async () => {
    try {
      const modes = await getLearningModes();
      setLearningModes(modes?.modes || []);
    } catch (err) {
      console.log('Using default learning modes');
    }
  };

  const handleGenerate = async (topic, learningMode) => {
    setIsLoading(true);
    setError(null);
    setLoadingStage(0);

    try {
      setLoadingStage(1);
      await new Promise((r) => setTimeout(r, 800));

      setLoadingStage(2);
      const planData = await generateLearningPlan(topic, learningMode, 1, [], true);

      setLoadingStage(3);
      await new Promise((r) => setTimeout(r, 600));

      setLoadingStage(4);
      let dbPlan;
      try {
        dbPlan = await createPlan('anonymous', topic, learningMode, 'medium');
      } catch {
        dbPlan = { plan_id: `local_${Date.now()}` };
      }

      setLoadingStage(5);
      if (planData.steps && dbPlan.plan_id) {
        try {
          await addStepsToPlan(dbPlan.plan_id, 1, planData.steps);
        } catch (e) {
          console.log('Steps will be stored locally');
        }
      }

      setLoadingStage(6);
      await new Promise((r) => setTimeout(r, 400));

      navigate(`/roadmap/${dbPlan.plan_id}/confirm`, {
        state: { planData, topic, learningMode },
      });
    } catch (err) {
      setError(err.message || 'Failed to generate learning plan');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 overflow-hidden">
      {/* ═══════ NAV ═══════ */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <img src="/Vector_images/logo.png" alt="Logo" className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight text-slate-900">NAVIYA</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#features" className="hover:text-amber-600 transition-colors">Features</a>
            <a href="#learn" className="hover:text-amber-600 transition-colors">Learn</a>
            <a href="#about" className="hover:text-amber-600 transition-colors">About</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/auth')}
              className="px-5 py-2 text-sm font-medium text-slate-700 hover:text-amber-600 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-5 py-2 text-sm font-semibold bg-amber-400 text-slate-900 rounded-full hover:bg-amber-500 transition-all shadow-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="relative overflow-hidden">
        {/* Soft gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/80 via-white to-violet-50/40" />
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-violet-200/15 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 border border-amber-200/80 rounded-full mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  AI-Powered Career Platform
                </span>
              </motion.div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-slate-900 mb-6">
                Navigate your
                <br />
                <span className="text-amber-500">career journey</span>
                <br />
                with confidence.
              </h1>

              <p className="text-lg text-slate-500 max-w-lg mb-8 leading-relaxed">
                NAVIYA combines AI agents, personalized roadmaps, resume intelligence,
                and adaptive learning to accelerate your professional growth.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-12">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/auth')}
                  className="px-7 py-3 bg-amber-400 text-slate-900 font-semibold rounded-full hover:bg-amber-500 transition-all shadow-lg shadow-amber-200/50 flex items-center gap-2"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
                <button
                  onClick={() => {
                    document.getElementById('learn')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-7 py-3 border border-slate-300 rounded-full text-slate-700 font-medium hover:border-amber-400 hover:text-amber-600 transition-all"
                >
                  Explore Features
                </button>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-8">
                {stats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right hero image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:flex justify-center items-center relative"
            >
              <div className="relative">
                {/* Decorative ring */}
                <div className="absolute -inset-6 bg-gradient-to-tr from-amber-200/40 to-violet-200/20 rounded-[2rem] blur-xl" />
                <img
                  src="/Vector_images/img1.png"
                  alt="Career Intelligence"
                  className="relative w-full max-w-md object-contain drop-shadow-lg"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ FEATURE CARDS ═══════ */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Everything you need to <span className="text-amber-500">grow</span>
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            Powered by cutting-edge AI — from career roadmaps to interview prep, we've got you covered.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className={`group relative bg-gradient-to-br ${f.color} rounded-3xl overflow-hidden border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
            >
              {/* Image */}
              <div className="relative h-52 overflow-hidden flex items-center justify-center p-6">
                <img
                  src={f.img}
                  alt={f.title}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                />
                {/* Tag pill */}
                <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                  {f.tag}
                </div>
                {/* Arrow button */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm group-hover:bg-amber-400 group-hover:text-white transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              {/* Text */}
              <div className="px-6 pb-6 pt-2">
                <h3 className="text-lg font-bold text-slate-800 whitespace-pre-line leading-snug mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════ QUICK CAPABILITIES ═══════ */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Brain, title: 'AI Mentor', desc: '24/7 contextual career advice from your personal AI guide.' },
              { icon: BarChart3, title: 'Skill Assessment', desc: 'Adaptive testing with real-time difficulty scaling.' },
              { icon: Zap, title: 'Instant Roadmaps', desc: 'Generate step-by-step career paths in seconds.' },
              { icon: Trophy, title: 'Progress Tracking', desc: 'Visual analytics for your entire career journey.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-lg hover:border-amber-200/60 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-amber-600" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1.5">{item.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ LEARN (Prompt Box) ═══════ */}
      <section id="learn" className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Try it <span className="text-amber-400">now</span>
            </h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Type any topic and watch NAVIYA build a personalized learning roadmap for you instantly.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <LoadingPipeline stage={loadingStage} key="loading" />
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <PromptBox
                  onGenerate={handleGenerate}
                  learningModes={learningModes}
                  error={error}
                />
                {recentPlans.length > 0 && <RecentPlans plans={recentPlans} />}

                {/* Quick topic pills */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="mt-14"
                >
                  <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2 justify-center">
                    <BookOpen className="w-4 h-4" />
                    Popular Topics
                  </h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      'Machine Learning',
                      'React & Next.js',
                      'Python for Data Science',
                      'System Design',
                      'Kubernetes & Docker',
                      'TypeScript',
                      'AWS Architecture',
                      'GraphQL APIs',
                    ].map((topic) => (
                      <button
                        key={topic}
                        onClick={() => handleGenerate(topic, 'standard')}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-slate-300 hover:bg-amber-500/20 hover:border-amber-500/30 hover:text-amber-300 transition-all duration-200"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ═══════ CTA / FOOTER ═══════ */}
      <section id="about" className="max-w-7xl mx-auto px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Ready to shape your future?
          </h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            Join NAVIYA and let AI guide every step of your career.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/auth')}
            className="px-8 py-3.5 bg-amber-400 text-slate-900 font-semibold rounded-full hover:bg-amber-500 transition-all shadow-lg shadow-amber-200/50 text-lg flex items-center gap-2 mx-auto"
          >
            Get Started — It's Free
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </section>

      {/* Footer bar */}
      <footer className="border-t border-slate-100 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <img src="/Vector_images/logo.png" alt="Logo" className="w-5 h-5" />
            <span className="font-semibold text-slate-600">NAVIYA</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms</span>
            <span>Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
