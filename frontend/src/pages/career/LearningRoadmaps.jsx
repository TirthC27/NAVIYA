import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Sparkles, 
  Clock, 
  Zap, 
  Brain, 
  Target,
  Play,
  ChevronRight,
  Search,
  Loader2
} from 'lucide-react';

const learningModes = [
  { id: 'quick', name: 'Quick', icon: Zap, duration: '2-4 steps, 30 min', color: 'yellow' },
  { id: 'standard', name: 'Standard', icon: BookOpen, duration: '5-8 steps, 2 hours', color: 'purple' },
  { id: 'deep', name: 'Deep Dive', icon: Brain, duration: '10-15 steps, 5+ hours', color: 'pink' },
];

const suggestedTopics = [
  'React Hooks for State Management',
  'Python Data Analysis with Pandas',
  'System Design Fundamentals',
  'Machine Learning Basics',
  'TypeScript Best Practices',
  'Cloud Architecture with AWS',
];

const recentPaths = [
  {
    id: 1,
    title: 'Advanced JavaScript Patterns',
    mode: 'standard',
    progress: 65,
    steps: 6,
    completedSteps: 4,
    lastAccessed: '2 hours ago'
  },
  {
    id: 2,
    title: 'React Performance Optimization',
    mode: 'deep',
    progress: 30,
    steps: 12,
    completedSteps: 4,
    lastAccessed: '1 day ago'
  },
  {
    id: 3,
    title: 'Git Workflow Essentials',
    mode: 'quick',
    progress: 100,
    steps: 3,
    completedSteps: 3,
    lastAccessed: '3 days ago'
  },
];

const LearningRoadmaps = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState('standard');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
      // Would navigate to the generated roadmap
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold text-slate-800">Learning Paths</h1>
        <p className="text-slate-500 mt-1">AI-curated video courses tailored to your goals</p>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Generate New Path */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">Generate Learning Path</h2>
                <p className="text-sm text-slate-500">Tell us what you want to learn</p>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What do you want to learn today?"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>

            {/* Suggested Topics */}
            <div className="mb-6">
              <p className="text-xs text-slate-500 mb-3">Suggested topics</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setPrompt(topic)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-600 transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Mode Selection */}
            <div className="mb-6">
              <p className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Learning Mode
              </p>
              <div className="grid grid-cols-3 gap-3">
                {learningModes.map((mode) => {
                  const isSelected = selectedMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all text-left
                        ${isSelected 
                          ? 'border-amber-400 bg-amber-50' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'}
                      `}
                    >
                      <mode.icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                      <div className={`font-medium text-sm ${isSelected ? 'text-amber-700' : 'text-slate-700'}`}>
                        {mode.name}
                      </div>
                      <div className="text-xs text-slate-500">{mode.duration}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Path...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Learning Path
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Right Column - Recent Paths */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Recent Paths</h3>
            
            <div className="space-y-3">
              {recentPaths.map((path) => (
                <div
                  key={path.id}
                  className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-slate-800 text-sm">{path.title}</h4>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <span className="capitalize">{path.mode}</span>
                    <span>•</span>
                    <span>{path.completedSteps}/{path.steps} steps</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        path.progress === 100 ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${path.progress}%` }}
                    />
                  </div>
                  
                  <p className="text-xs text-slate-400 mt-2">{path.lastAccessed}</p>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">
              View All Paths →
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LearningRoadmaps;
