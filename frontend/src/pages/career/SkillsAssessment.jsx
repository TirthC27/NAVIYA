import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Play, 
  Award, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  ChevronRight,
  Clock,
  Trophy,
  Star,
  Bot
} from 'lucide-react';
import { getUserSkills, getSkillAssessment, submitAssessment, getAssessmentHistory } from '../../api/career';

// Mock data
const mockUserSkills = [
  { id: 1, skill_name: 'JavaScript', skill_level: 'advanced', xp: 450, source: 'assessment' },
  { id: 2, skill_name: 'React.js', skill_level: 'intermediate', xp: 280, source: 'assessment' },
  { id: 3, skill_name: 'TypeScript', skill_level: 'beginner', xp: 120, source: 'resume' },
  { id: 4, skill_name: 'CSS', skill_level: 'intermediate', xp: 200, source: 'manual' }
];

const mockAvailableSkills = [
  'JavaScript', 'TypeScript', 'React.js', 'Vue.js', 'Angular', 'Node.js', 
  'Python', 'Java', 'SQL', 'MongoDB', 'Docker', 'AWS', 'Git', 'GraphQL',
  'REST APIs', 'System Design', 'Data Structures', 'Algorithms'
];

const mockQuizQuestions = [
  {
    id: 1,
    question: 'What is the output of: console.log(typeof null)?',
    options: ['null', 'undefined', 'object', 'number'],
    correct: 2
  },
  {
    id: 2,
    question: 'Which method creates a new array with the results of calling a function on every element?',
    options: ['forEach()', 'filter()', 'map()', 'reduce()'],
    correct: 2
  },
  {
    id: 3,
    question: 'What is closure in JavaScript?',
    options: [
      'A way to close browser windows',
      'A function that has access to variables from its outer scope',
      'A method to end loops',
      'A type of error handling'
    ],
    correct: 1
  },
  {
    id: 4,
    question: 'What does the "async" keyword do?',
    options: [
      'Makes code run faster',
      'Declares a function that returns a Promise',
      'Stops code execution',
      'Creates a new thread'
    ],
    correct: 1
  },
  {
    id: 5,
    question: 'Which is NOT a valid way to declare a variable in modern JavaScript?',
    options: ['let x = 1', 'const x = 1', 'var x = 1', 'int x = 1'],
    correct: 3
  }
];

const getLevelColor = (level) => {
  switch (level) {
    case 'advanced': return 'bg-yellow-100 text-yellow-700';
    case 'intermediate': return 'bg-blue-100 text-blue-700';
    default: return 'bg-slate-100 text-slate-600';
  }
};

const SkillsAssessment = () => {
  const [skills, setSkills] = useState(mockUserSkills);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [quizMode, setQuizMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [totalXP, setTotalXP] = useState(1050);
  const [loading, setLoading] = useState(false);

  const userId = 'current-user';

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        // Uncomment when backend ready
        // const data = await getUserSkills(userId);
        // setSkills(data);
      } catch (err) {
        console.error('Failed to fetch skills:', err);
      }
    };
    fetchSkills();
  }, [userId]);

  const startQuiz = () => {
    if (!selectedSkill) return;
    setQuizMode(true);
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResults(false);
  };

  const handleAnswer = (answerIndex) => {
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);

    if (currentQuestion < mockQuizQuestions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      // Calculate results
      const correct = newAnswers.filter((a, i) => a === mockQuizQuestions[i].correct).length;
      const score = Math.round((correct / mockQuizQuestions.length) * 100);
      const xpEarned = correct * 20;
      const level = score >= 80 ? 'advanced' : score >= 50 ? 'intermediate' : 'beginner';

      setQuizResult({
        correct,
        total: mockQuizQuestions.length,
        score,
        xpEarned,
        levelAssigned: level
      });
      setTotalXP(totalXP + xpEarned);
      setShowResults(true);
    }
  };

  const resetQuiz = () => {
    setQuizMode(false);
    setSelectedSkill('');
    setShowResults(false);
    setQuizResult(null);
    setCurrentQuestion(0);
    setAnswers([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold text-slate-800">Skills Assessment</h1>
        <p className="text-slate-500 mt-1">Track, assess, and validate your skills</p>
      </motion.div>

      {!quizMode ? (
        <>
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">Total XP</span>
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{totalXP.toLocaleString()}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '65%' }} />
                </div>
                <span className="text-xs text-slate-400">Level 5</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">Skills Tracked</span>
                <Zap className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{skills.length}</p>
              <p className="text-xs text-slate-400 mt-1">
                {skills.filter(s => s.skill_level === 'advanced').length} at advanced level
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500">Assessments Taken</span>
                <Award className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {skills.filter(s => s.source === 'assessment').length}
              </p>
              <p className="text-xs text-slate-400 mt-1">This month</p>
            </div>
          </motion.div>

          {/* Start Assessment */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl border border-slate-200 p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Play className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Take a Skill Assessment</h3>
                <p className="text-sm text-slate-500">Earn XP and validate your skill level</p>
              </div>
            </div>

            <div className="flex gap-4">
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              >
                <option value="">Select a skill to assess...</option>
                {mockAvailableSkills.map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
              <button
                onClick={startQuiz}
                disabled={!selectedSkill}
                className="px-6 py-2.5 bg-amber-400 text-slate-900 font-medium rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Start Assessment
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Current Skills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl border border-slate-200 p-6"
          >
            <h3 className="font-semibold text-slate-800 mb-4">Your Skills</h3>
            <div className="space-y-3">
              {skills.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-700">{skill.skill_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getLevelColor(skill.skill_level)}`}>
                      {skill.skill_level}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-slate-600">{skill.xp} XP</span>
                    </div>
                    <button
                      onClick={() => setSelectedSkill(skill.skill_name)}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Re-assess
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      ) : showResults ? (
        /* Quiz Results */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl mx-auto"
        >
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
              quizResult.score >= 80 ? 'bg-green-100' : quizResult.score >= 50 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              {quizResult.score >= 80 ? (
                <Trophy className="w-10 h-10 text-green-600" />
              ) : quizResult.score >= 50 ? (
                <Star className="w-10 h-10 text-yellow-600" />
              ) : (
                <TrendingUp className="w-10 h-10 text-red-600" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">Assessment Complete!</h2>
            <p className="text-slate-500 mb-6">{selectedSkill} Assessment</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Score</p>
                <p className="text-3xl font-bold text-slate-800">{quizResult.score}%</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Correct Answers</p>
                <p className="text-3xl font-bold text-slate-800">{quizResult.correct}/{quizResult.total}</p>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold text-yellow-700">+{quizResult.xpEarned} XP Earned</span>
              </div>
              <p className="text-sm text-yellow-600">
                Level assigned: <span className="font-medium capitalize">{quizResult.levelAssigned}</span>
              </p>
            </div>

            <button
              onClick={resetQuiz}
              className="w-full py-3 bg-amber-400 text-slate-900 font-medium rounded-lg hover:bg-amber-500 transition-colors"
            >
              Continue
            </button>
          </div>
        </motion.div>
      ) : (
        /* Quiz Questions */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto"
        >
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">
                Question {currentQuestion + 1} of {mockQuizQuestions.length}
              </span>
              <span className="text-sm text-slate-500">{selectedSkill}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div 
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / mockQuizQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-xl border border-slate-200 p-8"
            >
              <h2 className="text-lg font-semibold text-slate-800 mb-6">
                {mockQuizQuestions[currentQuestion].question}
              </h2>

              <div className="space-y-3">
                {mockQuizQuestions[currentQuestion].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-slate-700">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={resetQuiz}
            className="mt-4 text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel Assessment
          </button>
        </motion.div>
      )}

      {/* Agent Info */}
      {!quizMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 flex items-center gap-3 bg-slate-100 rounded-lg px-4 py-3"
        >
          <Bot className="w-5 h-5 text-slate-500" />
          <p className="text-sm text-slate-600">
            Assessments are generated by AssessmentAgent. Questions adapt to your demonstrated skill level.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default SkillsAssessment;
