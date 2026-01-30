import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';

const PromptLeaderboard = ({ versions }) => {
  // Mock data if none provided
  const prompts = versions?.length > 0 ? versions : [
    { 
      name: 'roadmap_generator', 
      version: 'v2.1', 
      score: 0.92, 
      change: 0.05,
      uses: 1234 
    },
    { 
      name: 'video_selector', 
      version: 'v1.8', 
      score: 0.88, 
      change: 0.02,
      uses: 856 
    },
    { 
      name: 'step_analyzer', 
      version: 'v1.5', 
      score: 0.85, 
      change: -0.01,
      uses: 672 
    },
    { 
      name: 'coach_assistant', 
      version: 'v2.0', 
      score: 0.90, 
      change: 0,
      uses: 445 
    },
  ];

  return (
    <div className="space-y-3">
      {prompts.map((prompt, index) => (
        <motion.div
          key={prompt.name || index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:border-purple-500/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {index === 0 && (
                <Trophy className="w-4 h-4 text-yellow-400" />
              )}
              <span className="text-sm font-medium text-white">
                {prompt.name}
              </span>
              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                {prompt.version}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {prompt.change > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : prompt.change < 0 ? (
                <TrendingDown className="w-3 h-3 text-red-400" />
              ) : (
                <Minus className="w-3 h-3 text-gray-400" />
              )}
              <span className={`text-xs ${
                prompt.change > 0 ? 'text-green-400' : 
                prompt.change < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {prompt.change > 0 ? '+' : ''}{(prompt.change * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-gray-300">
                {(prompt.score * 100).toFixed(0)}%
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {prompt.uses?.toLocaleString()} uses
            </span>
          </div>

          {/* Score bar */}
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${prompt.score * 100}%` }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            />
          </div>
        </motion.div>
      ))}

      {prompts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No prompt versions tracked yet</p>
        </div>
      )}
    </div>
  );
};

export default PromptLeaderboard;
