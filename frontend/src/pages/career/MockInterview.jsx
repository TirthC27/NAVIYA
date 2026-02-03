import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Mic, 
  Video, 
  Clock, 
  ChevronRight,
  Send,
  User,
  Bot,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { startMockInterview, submitInterviewResponse, getInterviewFeedback, getInterviewHistory } from '../../api/career';

// Mock data
const mockRoles = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'React Developer',
  'Node.js Developer',
  'Data Analyst',
  'Product Manager',
  'UX Designer'
];

const mockQuestions = [
  {
    id: 1,
    question: "Tell me about yourself and your background in software development.",
    type: 'behavioral',
    tip: "Focus on relevant experience and skills. Keep it under 2 minutes."
  },
  {
    id: 2,
    question: "Describe a challenging project you worked on. What was your role and how did you overcome obstacles?",
    type: 'behavioral',
    tip: "Use the STAR method: Situation, Task, Action, Result."
  },
  {
    id: 3,
    question: "How do you stay updated with new technologies and industry trends?",
    type: 'behavioral',
    tip: "Mention specific resources, communities, or learning habits."
  },
  {
    id: 4,
    question: "Where do you see yourself in 5 years?",
    type: 'behavioral',
    tip: "Show ambition while being realistic. Align with the role."
  }
];

const mockFeedback = {
  overall_score: 76,
  strengths: [
    'Good use of specific examples',
    'Clear communication style',
    'Demonstrated problem-solving ability'
  ],
  improvements: [
    'Could quantify achievements more',
    'Add more technical depth to answers',
    'Practice concise responses'
  ],
  detailed_feedback: [
    { question: 1, score: 80, feedback: 'Good introduction, but could be more concise.' },
    { question: 2, score: 75, feedback: 'Solid STAR response. Add more metrics.' },
    { question: 3, score: 72, feedback: 'Good awareness. Mention specific examples.' },
    { question: 4, score: 78, feedback: 'Realistic goals. Align more with company growth.' }
  ]
};

const MockInterview = () => {
  const [step, setStep] = useState('setup'); // setup, interview, feedback
  const [selectedRole, setSelectedRole] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [interviewType, setInterviewType] = useState('text');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  const userId = 'current-user';

  const startInterview = () => {
    if (!selectedRole) return;
    setStep('interview');
    setCurrentQuestion(0);
    setResponses([]);
  };

  const submitResponse = () => {
    if (!currentResponse.trim()) return;
    
    const newResponses = [...responses, { 
      questionId: mockQuestions[currentQuestion].id, 
      response: currentResponse 
    }];
    setResponses(newResponses);
    setCurrentResponse('');

    if (currentQuestion < mockQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Show feedback
      setFeedback(mockFeedback);
      setStep('feedback');
    }
  };

  const resetInterview = () => {
    setStep('setup');
    setSelectedRole('');
    setCurrentQuestion(0);
    setResponses([]);
    setFeedback(null);
    setCurrentResponse('');
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold text-slate-800">Mock Interview</h1>
        <p className="text-slate-500 mt-1">Practice interviews with AI feedback</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Interview Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => setInterviewType('text')}
                className={`bg-white rounded-xl border p-5 text-left transition-all ${
                  interviewType === 'text' ? 'border-amber-400 ring-1 ring-amber-400' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">Text Interview</h3>
                <p className="text-sm text-slate-500">Chat-based interview simulation</p>
              </button>

              <button
                onClick={() => setInterviewType('voice')}
                className={`bg-white rounded-xl border p-5 text-left transition-all ${
                  interviewType === 'voice' ? 'border-amber-400 ring-1 ring-amber-400' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
                  <Mic className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">Voice Interview</h3>
                <p className="text-sm text-slate-500">Speak your answers naturally</p>
              </button>

              <button
                onClick={() => setInterviewType('video')}
                className={`bg-white rounded-xl border p-5 text-left transition-all ${
                  interviewType === 'video' ? 'border-amber-400 ring-1 ring-amber-400' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
                  <Video className="w-5 h-5 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">Video Interview</h3>
                <p className="text-sm text-slate-500">Full video practice (HeyGen ready)</p>
              </button>
            </div>

            {/* Role Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h3 className="font-semibold text-slate-800 mb-4">Select Target Role</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {mockRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                      selectedRole === role 
                        ? 'border-amber-400 bg-amber-50 text-amber-700' 
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h3 className="font-semibold text-slate-800 mb-4">Select Difficulty</h3>
              <div className="flex gap-4">
                {['easy', 'medium', 'hard'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium capitalize transition-all ${
                      difficulty === level 
                        ? 'border-amber-400 bg-amber-50 text-amber-700' 
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startInterview}
              disabled={!selectedRole}
              className="w-full py-4 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Start Interview
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {step === 'interview' && (
          <motion.div
            key="interview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-3xl mx-auto"
          >
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-500">
                  Question {currentQuestion + 1} of {mockQuestions.length}
                </span>
                <span className="text-sm text-slate-500">{selectedRole} Interview</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div 
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / mockQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Interview Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Question */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-slate-800 font-medium mb-2">
                      {mockQuestions[currentQuestion].question}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Tip: {mockQuestions[currentQuestion].tip}
                    </p>
                  </div>
                </div>
              </div>

              {/* Response Input */}
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={currentResponse}
                      onChange={(e) => setCurrentResponse(e.target.value)}
                      placeholder="Type your response here..."
                      rows={6}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-slate-400">
                        {currentResponse.length} characters
                      </span>
                      <button
                        onClick={submitResponse}
                        disabled={!currentResponse.trim()}
                        className="px-5 py-2 bg-amber-400 text-slate-900 font-semibold rounded-lg hover:bg-amber-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        Submit
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={resetInterview}
              className="mt-4 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel Interview
            </button>
          </motion.div>
        )}

        {step === 'feedback' && feedback && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            {/* Overall Score */}
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Award className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Interview Complete!</h2>
              <p className="text-slate-500 mb-6">{selectedRole} - {difficulty} difficulty</p>
              
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500">Overall Score:</span>
                <span className={`text-4xl font-bold ${getScoreColor(feedback.overall_score)}`}>
                  {feedback.overall_score}%
                </span>
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-slate-800">Strengths</h3>
                </div>
                <ul className="space-y-2">
                  {feedback.strengths.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-green-500 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-800">Areas to Improve</h3>
                </div>
                <ul className="space-y-2">
                  {feedback.improvements.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-amber-500 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Detailed Feedback */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Question-by-Question Feedback</h3>
              <div className="space-y-4">
                {feedback.detailed_feedback.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 py-3 border-b border-slate-100 last:border-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.score >= 80 ? 'bg-green-100' : item.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <span className={`text-sm font-semibold ${
                        item.score >= 80 ? 'text-green-600' : item.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {item.score}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Question {item.question}</p>
                      <p className="text-sm text-slate-500">{item.feedback}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={resetInterview}
              className="w-full py-4 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-sm"
            >
              Start New Interview
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Info */}
      {step === 'setup' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 flex items-center gap-3 bg-slate-100 rounded-lg px-4 py-3"
        >
          <Bot className="w-5 h-5 text-slate-500" />
          <p className="text-sm text-slate-600">
            InterviewAgent simulates real interview scenarios and provides structured feedback to help you improve.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default MockInterview;
