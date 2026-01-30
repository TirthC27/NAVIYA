import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import StepsTimeline from '../components/learning/StepsTimeline';
import VideoPanel from '../components/learning/VideoPanel';
import AICoachSidebar from '../components/learning/AICoachSidebar';
import CompletionPopup from '../components/learning/CompletionPopup';
import { getPlan, completeStep, submitFeedback, deepenRoadmap } from '../api';
import { BookOpen, Sparkles, ArrowLeft, MessageCircle, Trophy } from 'lucide-react';

const LearningDashboard = () => {
  const { plan_id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [planData, setPlanData] = useState(location.state?.planData || null);
  const [topic, setTopic] = useState(location.state?.topic || '');
  const [learningMode, setLearningMode] = useState(location.state?.learningMode || 'standard');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showCoach, setShowCoach] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isLoading, setIsLoading] = useState(!planData);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  useEffect(() => {
    if (!planData && plan_id) {
      fetchPlan();
    } else if (planData?.steps) {
      // Initialize completed steps from plan data
      const completed = new Set();
      planData.steps.forEach((step, i) => {
        if (step.status === 'completed') completed.add(i);
      });
      setCompletedSteps(completed);
    }
  }, [plan_id]);

  const fetchPlan = async () => {
    try {
      setIsLoading(true);
      const data = await getPlan(plan_id);
      setPlanData(data);
      setTopic(data.topic);
      setLearningMode(data.learning_mode || 'standard');
      
      // Initialize completed steps
      const completed = new Set();
      data.steps?.forEach((step, i) => {
        if (step.status === 'completed') completed.add(i);
      });
      setCompletedSteps(completed);
    } catch (err) {
      console.error('Failed to fetch plan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentStep = planData?.steps?.[currentStepIndex];
  const progress = planData?.steps 
    ? Math.round((completedSteps.size / planData.steps.length) * 100)
    : 0;

  const handleStepSelect = (index) => {
    setCurrentStepIndex(index);
  };

  const handleCompleteStep = async () => {
    if (!currentStep) return;

    try {
      const stepId = currentStep.id || `step-${currentStepIndex}`;
      await completeStep(stepId, 'anonymous', 0);
    } catch (err) {
      console.log('Marking step complete locally');
    }

    // Update local state
    setCompletedSteps(prev => new Set([...prev, currentStepIndex]));
    
    // Update plan data
    setPlanData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === currentStepIndex ? { ...step, status: 'completed' } : step
      )
    }));

    // Check if all steps completed
    if (completedSteps.size + 1 === planData.steps.length) {
      setShowCompletion(true);
    } else {
      // Auto-advance to next step
      if (currentStepIndex < planData.steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    }
  };

  const handleFeedback = async (rating, comment) => {
    if (!currentStep?.video?.id) return;
    try {
      await submitFeedback(currentStep.video.id, rating, 'anonymous', comment);
    } catch (err) {
      console.log('Feedback saved locally');
    }
  };

  const handleDeepen = async () => {
    try {
      const completedTitles = planData.steps
        .filter((_, i) => completedSteps.has(i))
        .map(s => s.step_title);
      
      const newData = await deepenRoadmap(topic, completedTitles, 2, learningMode);
      navigate(`/roadmap/${plan_id}/confirm`, { 
        state: { planData: newData, topic, learningMode } 
      });
    } catch (err) {
      console.error('Failed to deepen roadmap:', err);
    }
    setShowCompletion(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"
        >
          <BookOpen className="w-6 h-6 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white truncate max-w-md">
                  {topic}
                </h1>
                <p className="text-sm text-gray-400">
                  Step {currentStepIndex + 1} of {planData?.steps?.length || 0}
                </p>
              </div>
            </div>

            {/* Progress & Actions */}
            <div className="flex items-center gap-4">
              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-sm text-gray-400">{progress}%</span>
              </div>

              {/* Coach Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCoach(!showCoach)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl transition-all
                  ${showCoach 
                    ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300' 
                    : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-purple-500/30'}
                `}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden md:inline">AI Coach</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-65px)]">
        {/* Timeline Sidebar */}
        <StepsTimeline
          steps={planData?.steps || []}
          currentIndex={currentStepIndex}
          completedSteps={completedSteps}
          onStepSelect={handleStepSelect}
        />

        {/* Video Panel */}
        <VideoPanel
          step={currentStep}
          stepIndex={currentStepIndex}
          totalSteps={planData?.steps?.length || 0}
          isCompleted={completedSteps.has(currentStepIndex)}
          onComplete={handleCompleteStep}
          onFeedback={handleFeedback}
          onPrevious={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
          onNext={() => setCurrentStepIndex(Math.min(planData.steps.length - 1, currentStepIndex + 1))}
        />

        {/* AI Coach Sidebar */}
        <AnimatePresence>
          {showCoach && (
            <AICoachSidebar
              topic={topic}
              currentStep={currentStep}
              onClose={() => setShowCoach(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Completion Popup */}
      <AnimatePresence>
        {showCompletion && (
          <CompletionPopup
            topic={topic}
            totalSteps={planData?.steps?.length || 0}
            learningMode={learningMode}
            onDeepen={handleDeepen}
            onFinish={() => navigate('/interests')}
            onClose={() => setShowCompletion(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LearningDashboard;
