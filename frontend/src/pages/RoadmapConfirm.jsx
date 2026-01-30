import { useState, useCallback, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import RoadmapFlow from '../components/roadmap/RoadmapFlow';
import StepInspector from '../components/roadmap/StepInspector';
import ConfirmBar from '../components/roadmap/ConfirmBar';
import { getPlan } from '../api';
import { Map, Sparkles, ArrowLeft, RefreshCw } from 'lucide-react';

const RoadmapConfirm = () => {
  const { plan_id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [planData, setPlanData] = useState(location.state?.planData || null);
  const [topic, setTopic] = useState(location.state?.topic || '');
  const [learningMode, setLearningMode] = useState(location.state?.learningMode || 'standard');
  const [selectedStep, setSelectedStep] = useState(null);
  const [isLoading, setIsLoading] = useState(!planData);

  useEffect(() => {
    if (!planData && plan_id) {
      fetchPlan();
    }
  }, [plan_id]);

  const fetchPlan = async () => {
    try {
      setIsLoading(true);
      const data = await getPlan(plan_id);
      setPlanData(data);
      setTopic(data.topic);
      setLearningMode(data.learning_mode || 'standard');
    } catch (err) {
      console.error('Failed to fetch plan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeClick = useCallback((step) => {
    setSelectedStep(step);
  }, []);

  const handleConfirm = () => {
    navigate(`/learn/${plan_id}`, { state: { planData, topic, learningMode } });
  };

  const handleRegenerate = () => {
    navigate('/', { state: { topic, learningMode } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"
        >
          <Map className="w-6 h-6 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-400">Review Your Roadmap</span>
                </div>
                <h1 className="text-xl font-bold text-white truncate max-w-md">
                  {topic}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm text-gray-300 capitalize">
                {learningMode} mode
              </span>
              <span className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm text-purple-300">
                {planData?.steps?.length || 0} steps
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex h-[calc(100vh-140px)]">
        {/* Flow Canvas */}
        <div className="flex-1 relative">
          <RoadmapFlow 
            steps={planData?.steps || []} 
            onNodeClick={handleNodeClick}
            selectedStep={selectedStep}
          />

          {/* Regenerate Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRegenerate}
            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur border border-gray-700/50 rounded-xl text-sm text-gray-300 hover:border-purple-500/30 hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </motion.button>
        </div>

        {/* Step Inspector Sidebar */}
        <AnimatePresence>
          {selectedStep && (
            <StepInspector 
              step={selectedStep} 
              onClose={() => setSelectedStep(null)} 
            />
          )}
        </AnimatePresence>
      </div>

      {/* Confirm Bar */}
      <ConfirmBar 
        totalSteps={planData?.steps?.length || 0}
        estimatedTime={calculateEstimatedTime(planData?.steps)}
        onConfirm={handleConfirm}
        onBack={() => navigate('/')}
      />
    </div>
  );
};

// Helper function to estimate total time
const calculateEstimatedTime = (steps) => {
  if (!steps || steps.length === 0) return '0 min';
  
  let totalMinutes = 0;
  steps.forEach(step => {
    if (step.video?.duration) {
      // Parse duration like "10:30" or "1:05:30"
      const parts = step.video.duration.split(':').map(Number);
      if (parts.length === 2) {
        totalMinutes += parts[0] + parts[1] / 60;
      } else if (parts.length === 3) {
        totalMinutes += parts[0] * 60 + parts[1] + parts[2] / 60;
      }
    } else {
      totalMinutes += 15; // Default estimate
    }
  });

  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default RoadmapConfirm;
