import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { generateLearningPlan, completeStep, deepenRoadmap } from '../api';
import StepCard from '../components/StepCard';
import LoadingState from '../components/LoadingState';

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0a',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  header: {
    background: '#111111',
    padding: '15px 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #1a1a1a',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  logoIcon: {
    width: '45px',
    height: '45px',
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
  },
  logoText: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'white',
  },
  topicBadge: {
    background: 'rgba(0, 255, 136, 0.1)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    padding: '10px 25px',
    borderRadius: '25px',
    color: '#00ff88',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  depthBadge: {
    background: 'rgba(0, 255, 136, 0.2)',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
  },
  backButton: {
    background: '#1a1a1a',
    border: '1px solid #333',
    padding: '12px 24px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  main: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  progressHeader: {
    background: '#111111',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '30px',
    border: '1px solid #1a1a1a',
  },
  progressTitle: {
    color: '#00ff88',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  progressBar: {
    height: '8px',
    background: '#1a1a1a',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00ff88 0%, #00cc6a 100%)',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
    boxShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
  },
  progressText: {
    color: '#888',
    fontSize: '14px',
  },
  stepsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  congratsModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease',
  },
  congratsCard: {
    background: '#111111',
    borderRadius: '24px',
    padding: '48px',
    textAlign: 'center',
    maxWidth: '450px',
    border: '2px solid rgba(0, 255, 136, 0.3)',
    boxShadow: '0 0 60px rgba(0, 255, 136, 0.2)',
  },
  congratsEmoji: {
    fontSize: '72px',
    marginBottom: '20px',
  },
  congratsTitle: {
    color: '#00ff88',
    fontSize: '28px',
    fontWeight: '800',
    marginBottom: '12px',
  },
  congratsSubtitle: {
    color: '#888',
    fontSize: '16px',
    marginBottom: '32px',
    lineHeight: '1.6',
  },
  buttonGroup: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  deeperButton: {
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    border: 'none',
    padding: '14px 32px',
    borderRadius: '12px',
    color: '#000',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)',
  },
  doneButton: {
    background: 'transparent',
    border: '2px solid #333',
    padding: '14px 32px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  maxDepthText: {
    color: '#00ff88',
    fontSize: '14px',
    marginTop: '16px',
  },
};

function LearningPlan() {
  const location = useLocation();
  const navigate = useNavigate();
  const { topic } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(null);
  const [learningPlan, setLearningPlan] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [showCongrats, setShowCongrats] = useState(false);
  const [depthLevel, setDepthLevel] = useState(1);
  const [previousStepTitles, setPreviousStepTitles] = useState([]);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!topic) {
      navigate('/');
      return;
    }
    
    // Prevent double fetch in React Strict Mode
    if (hasFetched) return;
    
    const fetchLearningPlan = async () => {
      try {
        setLoading(true);
        setError(null);
        setHasFetched(true);
        const response = await generateLearningPlan(topic, depthLevel, previousStepTitles);
        
        if (response.success && response.data) {
          setLearningPlan(response.data);
          setCompletedSteps(new Set());
        } else {
          setError('Failed to generate learning plan');
        }
      } catch (err) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLearningPlan();
  }, [topic, depthLevel, hasFetched]);

  const handleStepComplete = async (stepNumber, stepTitle) => {
    try {
      setLoadingStep(stepNumber);
      
      // Simulate API call
      await completeStep('plan-id', stepNumber);
      
      // Update completed steps
      const newCompleted = new Set(completedSteps);
      newCompleted.add(stepNumber);
      setCompletedSteps(newCompleted);

      // Check if all steps completed
      if (learningPlan && newCompleted.size === learningPlan.total_steps) {
        setTimeout(() => setShowCongrats(true), 500);
      }
    } catch (err) {
      console.error('Error completing step:', err);
    } finally {
      setLoadingStep(null);
    }
  };

  const handleGoDeeper = async () => {
    if (depthLevel >= 3) return;
    
    // Collect all completed step titles
    const currentStepTitles = learningPlan.learning_steps.map(s => s.title);
    setPreviousStepTitles([...previousStepTitles, ...currentStepTitles]);
    setHasFetched(false); // Reset to allow new fetch
    setDepthLevel(depthLevel + 1);
    setShowCongrats(false);
  };

  const handleFinish = () => {
    navigate('/');
  };

  const progressPercentage = learningPlan 
    ? (completedSteps.size / learningPlan.total_steps) * 100 
    : 0;

  if (loading) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.logo} onClick={() => navigate('/')}>
            <div style={styles.logoIcon}>🎓</div>
            <span style={styles.logoText}>LearnTube AI</span>
          </div>
          <div style={styles.topicBadge}>
            📚 {topic}
          </div>
        </header>
        <LoadingState 
          message="Generating your personalized roadmap..."
          subMessage="Analyzing topic difficulty and finding the best videos"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.logo} onClick={() => navigate('/')}>
            <div style={styles.logoIcon}>🎓</div>
            <span style={styles.logoText}>LearnTube AI</span>
          </div>
        </header>
        <div style={{ ...styles.main, textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>😕</div>
          <h2 style={{ color: 'white', marginBottom: '12px' }}>Oops! Something went wrong</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>{error}</p>
          <button 
            style={styles.deeperButton}
            onClick={() => navigate('/')}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo} onClick={() => navigate('/')}>
          <div style={styles.logoIcon}>🎓</div>
          <span style={styles.logoText}>LearnTube AI</span>
        </div>
        <div style={styles.topicBadge}>
          📚 {topic}
          <span style={styles.depthBadge}>Level {depthLevel}</span>
        </div>
        <button 
          style={styles.backButton}
          onClick={() => navigate('/')}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          ← Back
        </button>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Progress Section */}
        <div style={styles.progressHeader}>
          <div style={styles.progressTitle}>Your Progress</div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progressPercentage}%` }} />
          </div>
          <div style={styles.progressText}>
            {completedSteps.size} of {learningPlan?.total_steps || 0} steps completed
            {learningPlan?.difficulty && (
              <span style={{ marginLeft: '16px', opacity: 0.6 }}>
                • {learningPlan.difficulty.charAt(0).toUpperCase() + learningPlan.difficulty.slice(1)} difficulty
              </span>
            )}
          </div>
        </div>

        {/* Steps */}
        <div style={styles.stepsContainer}>
          {learningPlan?.learning_steps?.map((step, index) => (
            <StepCard
              key={step.step_number}
              step={step}
              isCompleted={completedSteps.has(step.step_number)}
              isLoading={loadingStep === step.step_number}
              onComplete={() => handleStepComplete(step.step_number, step.title)}
              stepIndex={index}
            />
          ))}
        </div>
      </main>

      {/* Congratulations Modal */}
      {showCongrats && (
        <div style={styles.congratsModal}>
          <div style={styles.congratsCard}>
            <div style={styles.congratsEmoji}>🎉</div>
            <h2 style={styles.congratsTitle}>Level {depthLevel} Complete!</h2>
            <p style={styles.congratsSubtitle}>
              Amazing work! You've completed all {learningPlan.total_steps} steps.
              {depthLevel < 3 
                ? " Ready to dive deeper into this topic?"
                : " You've mastered this topic at the deepest level!"}
            </p>
            <div style={styles.buttonGroup}>
              {depthLevel < 3 ? (
                <>
                  <button 
                    style={styles.deeperButton}
                    onClick={handleGoDeeper}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    🚀 Go Deeper
                  </button>
                  <button 
                    style={styles.doneButton}
                    onClick={handleFinish}
                    onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                  >
                    I'm Done
                  </button>
                </>
              ) : (
                <button 
                  style={styles.deeperButton}
                  onClick={handleFinish}
                >
                  🏆 Finish Learning
                </button>
              )}
            </div>
            {depthLevel >= 3 && (
              <p style={styles.maxDepthText}>
                ⭐ You've reached the maximum depth level!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LearningPlan;
