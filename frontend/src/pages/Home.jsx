import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PromptBox from '../components/home/PromptBox';
import LoadingPipeline from '../components/home/LoadingPipeline';
import RecentPlans from '../components/home/RecentPlans';
import { generateLearningPlan, createPlan, addStepsToPlan, getUserPlans, getLearningModes } from '../api';
import { Sparkles, Zap, Brain, Target, BookOpen, Trophy } from 'lucide-react';

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
      // Stage 1: Understanding topic
      setLoadingStage(1);
      await new Promise(r => setTimeout(r, 800));

      // Stage 2: Building roadmap
      setLoadingStage(2);
      const planData = await generateLearningPlan(topic, learningMode, 1, [], true);
      
      // Stage 3: Finding videos
      setLoadingStage(3);
      await new Promise(r => setTimeout(r, 600));

      // Stage 4: Creating plan in DB
      setLoadingStage(4);
      let dbPlan;
      try {
        dbPlan = await createPlan('anonymous', topic, learningMode, 'medium');
      } catch {
        // Use local plan ID if DB fails
        dbPlan = { plan_id: `local_${Date.now()}` };
      }
      
      // Stage 5: Saving steps
      setLoadingStage(5);
      if (planData.steps && dbPlan.plan_id) {
        try {
          await addStepsToPlan(dbPlan.plan_id, 1, planData.steps);
        } catch (e) {
          console.log('Steps will be stored locally');
        }
      }

      // Navigate to confirmation
      setLoadingStage(6);
      await new Promise(r => setTimeout(r, 400));
      
      navigate(`/roadmap/${dbPlan.plan_id}/confirm`, { 
        state: { planData, topic, learningMode } 
      });
    } catch (err) {
      setError(err.message || 'Failed to generate learning plan');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">AI-Powered Learning</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
            Learn Anything
            <br />
            <span className="text-4xl md:text-6xl">with Naviya AI</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Your personal AI tutor that creates custom learning paths, 
            finds the best videos, and tracks your progress.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {[
              { icon: Zap, label: 'Instant Roadmaps' },
              { icon: Brain, label: 'AI-Curated Videos' },
              { icon: Target, label: 'Adaptive Learning' },
              { icon: Trophy, label: 'Progress Tracking' },
            ].map((feature, i) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-full"
              >
                <feature.icon className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">{feature.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Content */}
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
              {/* Prompt Box */}
              <PromptBox 
                onGenerate={handleGenerate} 
                learningModes={learningModes}
                error={error}
              />

              {/* Recent Plans */}
              {recentPlans.length > 0 && (
                <RecentPlans plans={recentPlans} />
              )}

              {/* Quick Start Topics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-16"
              >
                <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Popular Topics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    'Machine Learning Basics',
                    'Web Development with React',
                    'Python for Data Science',
                    'System Design',
                    'Kubernetes & Docker',
                    'GraphQL APIs',
                    'TypeScript Mastery',
                    'AWS Cloud Architecture',
                  ].map((topic, i) => (
                    <motion.button
                      key={topic}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleGenerate(topic, 'standard')}
                      className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl text-left text-sm text-gray-300 hover:text-white hover:border-purple-500/30 transition-all duration-200"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                    >
                      {topic}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Home;
