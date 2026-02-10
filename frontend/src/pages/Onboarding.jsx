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
  Sparkles
} from 'lucide-react';

const TOTAL_STEPS = 5;

// Domain options with icons
const DOMAIN_OPTIONS = [
  { value: 'Technology / Engineering', icon: Briefcase, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'Medical / Healthcare', icon: Stethoscope, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { value: 'Business', icon: Building2, color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'Government Exams', icon: FileText, color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { value: 'Design / Creative', icon: Palette, color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { value: 'Other', icon: MoreHorizontal, color: 'bg-slate-50 border-slate-200 text-slate-700' },
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
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i + 1 === currentStep
              ? 'w-8 bg-amber-400'
              : i + 1 < currentStep
              ? 'w-2 bg-amber-400'
              : 'w-2 bg-slate-200'
          }`}
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
            <h2 className="text-xl font-semibold text-slate-800 text-center mb-1">
              Which domain are you aiming for?
            </h2>
            <p className="text-slate-500 text-center text-sm mb-4">
              This helps us personalize your career roadmap
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DOMAIN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('selected_domain', option.value)}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1.5 ${
                    formData.selected_domain === option.value
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <option.icon className={`w-5 h-5 ${
                    formData.selected_domain === option.value ? 'text-amber-600' : 'text-slate-500'
                  }`} />
                  <span className={`text-xs font-medium ${
                    formData.selected_domain === option.value ? 'text-amber-800' : 'text-slate-700'
                  }`}>
                    {option.value}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-800 text-center mb-1">
              What's your current education level?
            </h2>
            <p className="text-slate-500 text-center text-sm mb-4">
              Help us understand your background
            </p>
            <div className="grid grid-cols-2 gap-2">
              {EDUCATION_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => updateField('education_level', option)}
                  className={`p-2.5 rounded-xl border-2 transition-all duration-200 ${
                    formData.education_level === option
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className={`text-sm font-medium ${
                    formData.education_level === option ? 'text-amber-800' : 'text-slate-700'
                  }`}>
                    {option}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-800 text-center mb-1">
              How would you rate yourself?
            </h2>
            <p className="text-slate-500 text-center text-sm mb-4">
              Be honest — this helps us calibrate your path
            </p>
            <div className="space-y-2">
              {LEVEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('self_assessed_level', option.value)}
                  className={`w-full p-3 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${
                    formData.self_assessed_level === option.value
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-left">
                    <span className={`text-sm font-medium ${
                      formData.self_assessed_level === option.value ? 'text-amber-800' : 'text-slate-700'
                    }`}>
                      {option.label}
                    </span>
                    <p className="text-xs text-slate-400">{option.description}</p>
                  </div>
                  {formData.self_assessed_level === option.value && (
                    <Check className="w-4 h-4 text-amber-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-800 text-center mb-1">
              How many hours per week can you give?
            </h2>
            <p className="text-slate-500 text-center text-sm mb-4">
              Be realistic — consistency beats intensity
            </p>
            <div className="space-y-2">
              {HOURS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('weekly_hours', option.value)}
                  className={`w-full p-3 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${
                    formData.weekly_hours === option.value
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className={`w-4 h-4 ${
                      formData.weekly_hours === option.value ? 'text-amber-600' : 'text-slate-400'
                    }`} />
                    <div className="text-left">
                      <span className={`text-sm font-medium ${
                        formData.weekly_hours === option.value ? 'text-amber-800' : 'text-slate-700'
                      }`}>
                        {option.label}
                      </span>
                      <p className="text-xs text-slate-400">{option.description}</p>
                    </div>
                  </div>
                  {formData.weekly_hours === option.value && (
                    <Check className="w-4 h-4 text-amber-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-800 text-center mb-1">
              What's holding you back the most?
            </h2>
            <p className="text-slate-500 text-center text-sm mb-4">
              Understanding your challenges helps us help you better
            </p>
            <div className="relative">
              <AlertCircle className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea
                value={formData.primary_blocker}
                onChange={(e) => updateField('primary_blocker', e.target.value)}
                placeholder="e.g., I struggle with staying consistent, or I don't know where to start, or I lack practical experience..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-amber-400 focus:ring-0 outline-none transition-colors resize-none text-sm text-slate-700 placeholder:text-slate-400"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-amber-100/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-800">Naviya</span>
        </div>

        {/* Progress */}
        {renderProgress()}

        {/* Step indicator */}
        <p className="text-center text-xs text-slate-500 mb-4">
          Step {currentStep} of {TOTAL_STEPS}
        </p>

        {/* Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100"
        >
          {renderStepContent()}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2"
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
              className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                currentStep === 1
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-1 px-6 py-2.5 rounded-lg bg-amber-400 text-slate-900 font-medium hover:bg-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              ) : currentStep === TOTAL_STEPS ? (
                <>
                  Complete
                  <Check className="w-4 h-4" />
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

        {/* Skip hint (only on first step) */}
        {currentStep === 1 && (
          <p className="text-center text-xs text-slate-400 mt-6">
            This helps our AI agents personalize your experience
          </p>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
