import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../api/config';
import { 
  ChevronRight, 
  ChevronLeft,
  Briefcase,
  Stethoscope,
  Building2,
  FileText,
  Palette,
  MoreHorizontal,
  Clock,
  AlertCircle,
  Check,
  Sparkles,
  SkipForward,
  Brain,
  Route,
  Zap,
  MessageSquare,
  ArrowRight
} from 'lucide-react';

const TOTAL_STEPS = 5;

// Domain options with icons
const DOMAIN_OPTIONS = [
  { value: 'Technology / Engineering', icon: Briefcase, color: 'border-blue-500/30 text-blue-400', bgActive: 'bg-blue-500/10 border-blue-500/50' },
  { value: 'Medical / Healthcare', icon: Stethoscope, color: 'border-emerald-500/30 text-emerald-400', bgActive: 'bg-emerald-500/10 border-emerald-500/50' },
  { value: 'Business', icon: Building2, color: 'border-purple-500/30 text-purple-400', bgActive: 'bg-purple-500/10 border-purple-500/50' },
  { value: 'Government Exams', icon: FileText, color: 'border-orange-500/30 text-orange-400', bgActive: 'bg-orange-500/10 border-orange-500/50' },
  { value: 'Design / Creative', icon: Palette, color: 'border-pink-500/30 text-pink-400', bgActive: 'bg-pink-500/10 border-pink-500/50' },
  { value: 'Other', icon: MoreHorizontal, color: 'border-slate-500/30 text-slate-400', bgActive: 'bg-slate-500/10 border-slate-500/50' },
];

const EDUCATION_OPTIONS = [
  'High School',
  'Undergraduate (1st/2nd Year)',
  'Undergraduate (3rd/4th Year)',
  'Graduate',
  'Post Graduate',
  'PhD',
  'Working Professional',
  'Other'
];

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner', description: 'Just starting out' },
  { value: 'intermediate', label: 'Intermediate', description: 'Have some experience' },
  { value: 'advanced', label: 'Advanced', description: 'Quite skilled' },
  { value: 'unknown', label: 'Not sure', description: 'Help me figure it out' },
];

const HOURS_OPTIONS = [
  { value: 5, label: '5 hours', description: 'Light commitment' },
  { value: 10, label: '10 hours', description: 'Moderate effort' },
  { value: 15, label: '15 hours', description: 'Serious dedication' },
  { value: 20, label: '20+ hours', description: 'Full commitment' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    selected_domain: '',
    education_level: '',
    self_assessed_level: '',
    weekly_hours: 10,
    primary_blocker: ''
  });

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Check if user already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.id) {
        navigate('/auth');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/onboarding/status?user_id=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.onboarding_completed) {
            navigate('/career/dashboard');
          }
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
      }
    };

    checkOnboardingStatus();
  }, [user?.id, navigate]);

  // Save current step data to database
  const saveStepData = async (stepData) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/onboarding/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          user_id: user.id,
          ...stepData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      return true;
    } catch (err) {
      setError('Failed to save. Please try again.');
      console.error('Save error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle next step
  const handleNext = async () => {
    // Validate current step
    if (!validateCurrentStep()) {
      return;
    }

    // Save current step data
    const saved = await saveStepData(formData);
    if (!saved) return;

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - complete onboarding
      await completeOnboarding();
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  // Validate current step
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.selected_domain) {
          setError('Please select a domain');
          return false;
        }
        break;
      case 2:
        if (!formData.education_level) {
          setError('Please select your education level');
          return false;
        }
        break;
      case 3:
        if (!formData.self_assessed_level) {
          setError('Please select your skill level');
          return false;
        }
        break;
      case 4:
        if (!formData.weekly_hours) {
          setError('Please select your time commitment');
          return false;
        }
        break;
      case 5:
        if (!formData.primary_blocker || formData.primary_blocker.trim().length < 5) {
          setError('Please share what\'s holding you back');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          user_id: user.id,
          selected_domain: formData.selected_domain,
          education_level: formData.education_level,
          self_assessed_level: formData.self_assessed_level,
          weekly_hours: formData.weekly_hours,
          primary_blocker: formData.primary_blocker,
          career_goal_raw: null,
          current_stage: null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      // Redirect to dashboard
      navigate('/career/dashboard');
    } catch (err) {
      setError('Failed to complete onboarding. Please try again.');
      console.error('Complete error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update form data
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // Render progress indicator
  const renderProgress = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <motion.div
          key={i}
          className={`h-1 rounded-full transition-all duration-500 ${
            i + 1 === currentStep
              ? 'w-10 bg-gradient-to-r from-blue-500 to-purple-500'
              : i + 1 < currentStep
              ? 'w-3 bg-blue-500'
              : 'w-3 bg-slate-700'
          }`}
          layout
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      ))}
    </div>
  );

  // Card animation variants
  const cardVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white text-center mb-1">
              Which domain are you aiming for?
            </h2>
            <p className="text-slate-400 text-center text-sm mb-4">
              This helps our AI agents personalize your career roadmap
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DOMAIN_OPTIONS.map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => updateField('selected_domain', option.value)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-3 rounded-xl border transition-all duration-300 flex flex-col items-center gap-1.5 ${
                    formData.selected_domain === option.value
                      ? option.bgActive + ' shadow-lg'
                      : 'border-slate-700/50 bg-white/[0.03] hover:bg-white/[0.06] hover:border-slate-600'
                  }`}
                  style={formData.selected_domain === option.value ? {
                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)'
                  } : {}}
                >
                  <option.icon className={`w-5 h-5 ${
                    formData.selected_domain === option.value ? option.color.split(' ')[1] : 'text-slate-500'
                  }`} />
                  <span className={`text-xs font-medium ${
                    formData.selected_domain === option.value ? 'text-white' : 'text-slate-400'
                  }`}>
                    {option.value}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white text-center mb-1">
              What's your current education level?
            </h2>
            <p className="text-slate-400 text-center text-sm mb-4">
              Help us understand your background
            </p>
            <div className="grid grid-cols-2 gap-2">
              {EDUCATION_OPTIONS.map((option) => (
                <motion.button
                  key={option}
                  onClick={() => updateField('education_level', option)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-2.5 rounded-xl border transition-all duration-300 ${
                    formData.education_level === option
                      ? 'border-blue-500/50 bg-blue-500/10 shadow-lg'
                      : 'border-slate-700/50 bg-white/[0.03] hover:bg-white/[0.06] hover:border-slate-600'
                  }`}
                  style={formData.education_level === option ? {
                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)'
                  } : {}}
                >
                  <span className={`text-sm font-medium ${
                    formData.education_level === option ? 'text-blue-300' : 'text-slate-400'
                  }`}>
                    {option}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white text-center mb-1">
              How would you rate yourself?
            </h2>
            <p className="text-slate-400 text-center text-sm mb-4">
              Be honest — this helps us calibrate your path
            </p>
            <div className="space-y-2">
              {LEVEL_OPTIONS.map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => updateField('self_assessed_level', option.value)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`w-full p-3 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                    formData.self_assessed_level === option.value
                      ? 'border-purple-500/50 bg-purple-500/10 shadow-lg'
                      : 'border-slate-700/50 bg-white/[0.03] hover:bg-white/[0.06] hover:border-slate-600'
                  }`}
                  style={formData.self_assessed_level === option.value ? {
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.1)'
                  } : {}}
                >
                  <div className="text-left">
                    <span className={`text-sm font-medium ${
                      formData.self_assessed_level === option.value ? 'text-purple-300' : 'text-slate-300'
                    }`}>
                      {option.label}
                    </span>
                    <p className="text-xs text-slate-500">{option.description}</p>
                  </div>
                  {formData.self_assessed_level === option.value && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    >
                      <Check className="w-4 h-4 text-purple-400" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white text-center mb-1">
              How many hours per week can you give?
            </h2>
            <p className="text-slate-400 text-center text-sm mb-4">
              Be realistic — consistency beats intensity
            </p>
            <div className="space-y-2">
              {HOURS_OPTIONS.map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => updateField('weekly_hours', option.value)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`w-full p-3 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                    formData.weekly_hours === option.value
                      ? 'border-emerald-500/50 bg-emerald-500/10 shadow-lg'
                      : 'border-slate-700/50 bg-white/[0.03] hover:bg-white/[0.06] hover:border-slate-600'
                  }`}
                  style={formData.weekly_hours === option.value ? {
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.1)'
                  } : {}}
                >
                  <div className="flex items-center gap-3">
                    <Clock className={`w-4 h-4 ${
                      formData.weekly_hours === option.value ? 'text-emerald-400' : 'text-slate-500'
                    }`} />
                    <div className="text-left">
                      <span className={`text-sm font-medium ${
                        formData.weekly_hours === option.value ? 'text-emerald-300' : 'text-slate-300'
                      }`}>
                        {option.label}
                      </span>
                      <p className="text-xs text-slate-500">{option.description}</p>
                    </div>
                  </div>
                  {formData.weekly_hours === option.value && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white text-center mb-1">
              What's holding you back the most?
            </h2>
            <p className="text-slate-400 text-center text-sm mb-4">
              Understanding your challenges helps our agents help you better
            </p>
            <div className="relative">
              <AlertCircle className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <textarea
                value={formData.primary_blocker}
                onChange={(e) => updateField('primary_blocker', e.target.value)}
                placeholder="e.g., I struggle with staying consistent, or I don't know where to start, or I lack practical experience..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700/50 bg-white/[0.03] 
                  focus:border-blue-500/50 focus:ring-0 focus:bg-white/[0.05] outline-none transition-all duration-300 
                  resize-none text-sm text-slate-300 placeholder:text-slate-600"
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen naviya-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-blue-400/20"
          style={{ left: `${15 + i * 18}%`, top: `${20 + i * 12}%` }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">NAVIYA</span>
        </motion.div>

        {/* Progress */}
        {renderProgress()}

        {/* Step indicator */}
        <motion.p
          className="text-center text-xs text-slate-500 mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Step {currentStep} of {TOTAL_STEPS}
        </motion.p>

        {/* Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="naviya-glass rounded-2xl p-6 border border-white/[0.08] shadow-2xl shadow-black/20"
        >
          {/* Top glow line */}
          <div className="absolute -top-px left-1/2 -translate-x-1/2 w-24 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

          {renderStepContent()}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1 || loading}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 ${
                currentStep === 1
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl
                bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium text-sm
                hover:from-blue-500 hover:to-purple-500 transition-all duration-300
                shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : currentStep === TOTAL_STEPS ? (
                <>
                  Launch Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Skip option */}
        <motion.div
          className="flex items-center justify-center gap-2 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={() => navigate('/career/dashboard')}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            <SkipForward className="w-3 h-3" />
            <span>Skip setup & explore dashboard</span>
          </button>
        </motion.div>

        {/* Agent activation teaser */}
        {currentStep === 1 && (
          <motion.div
            className="flex items-center justify-center gap-4 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {[
              { icon: Brain, label: 'Supervisor' },
              { icon: FileText, label: 'Resume' },
              { icon: Route, label: 'Roadmap' },
              { icon: Zap, label: 'Skills' },
            ].map((agent, i) => (
              <motion.div
                key={agent.label}
                className="flex flex-col items-center gap-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.4, y: 0 }}
                transition={{ delay: 1 + i * 0.15 }}
              >
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <agent.icon className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <span className="text-[9px] text-slate-600">{agent.label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
