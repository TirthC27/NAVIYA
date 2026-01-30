import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Clock, BookOpen, ChevronRight, AlertCircle } from 'lucide-react';

const defaultModes = [
  { id: 'quick', name: 'Quick', icon: '⚡', description: '2-4 steps, 30 min', color: 'from-amber-500 to-orange-500' },
  { id: 'standard', name: 'Standard', icon: '📚', description: '5-8 steps, 2 hours', color: 'from-purple-500 to-blue-500' },
  { id: 'comprehensive', name: 'Deep Dive', icon: '🎯', description: '10-15 steps, 5+ hours', color: 'from-emerald-500 to-teal-500' },
];

const PromptBox = ({ onGenerate, learningModes = [], error }) => {
  const [topic, setTopic] = useState('');
  const [selectedMode, setSelectedMode] = useState('standard');
  const [isFocused, setIsFocused] = useState(false);

  const modes = learningModes.length > 0 ? learningModes : defaultModes;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (topic.trim()) {
      onGenerate(topic.trim(), selectedMode);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="max-w-3xl mx-auto"
    >
      {/* Main Input Card */}
      <div className={`
        relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-6 border transition-all duration-300
        ${isFocused ? 'border-purple-500/50 shadow-lg shadow-purple-500/10' : 'border-gray-700/50'}
      `}>
        {/* Glow Effect */}
        <div className={`
          absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 transition-opacity duration-300
          ${isFocused ? 'opacity-100' : ''}
        `} />

        <form onSubmit={handleSubmit} className="relative z-10">
          {/* Input Area */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="What do you want to learn today?"
              className="flex-1 bg-transparent text-xl text-white placeholder-gray-500 outline-none"
            />
          </div>

          {/* Learning Mode Selection */}
          <div className="mb-6">
            <label className="text-sm text-gray-400 mb-3 block flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Learning Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {modes.map((mode) => (
                <motion.button
                  key={mode.id}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`
                    relative p-4 rounded-xl border transition-all duration-200 text-left
                    ${selectedMode === mode.id 
                      ? 'border-purple-500 bg-purple-500/10' 
                      : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'}
                  `}
                >
                  {selectedMode === mode.id && (
                    <motion.div
                      layoutId="selectedMode"
                      className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="relative z-10">
                    <span className="text-2xl mb-2 block">{mode.icon}</span>
                    <span className="text-white font-medium block">{mode.name}</span>
                    <span className="text-xs text-gray-400">{mode.description}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={!topic.trim()}
            whileHover={{ scale: topic.trim() ? 1.02 : 1 }}
            whileTap={{ scale: topic.trim() ? 0.98 : 1 }}
            className={`
              w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all duration-200
              ${topic.trim()
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/25'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
            `}
          >
            <Zap className="w-5 h-5" />
            Generate Learning Path
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </form>
      </div>

      {/* Helper Text */}
      <p className="text-center text-sm text-gray-500 mt-4">
        Tip: Be specific! "React hooks for state management" works better than just "React"
      </p>
    </motion.div>
  );
};

export default PromptBox;
