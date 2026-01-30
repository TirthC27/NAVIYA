import { motion } from 'framer-motion';
import { Brain, Map, Youtube, Database, CheckCircle2, Loader2 } from 'lucide-react';

const stages = [
  { id: 1, label: 'Understanding your topic', icon: Brain, color: 'purple' },
  { id: 2, label: 'Building your roadmap', icon: Map, color: 'blue' },
  { id: 3, label: 'Finding best videos', icon: Youtube, color: 'red' },
  { id: 4, label: 'Creating your plan', icon: Database, color: 'green' },
  { id: 5, label: 'Saving progress', icon: CheckCircle2, color: 'emerald' },
  { id: 6, label: 'Finalizing...', icon: Loader2, color: 'purple' },
];

const colorMap = {
  purple: { bg: 'bg-purple-500', text: 'text-purple-400', glow: 'shadow-purple-500/50' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/50' },
  red: { bg: 'bg-red-500', text: 'text-red-400', glow: 'shadow-red-500/50' },
  green: { bg: 'bg-green-500', text: 'text-green-400', glow: 'shadow-green-500/50' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/50' },
};

const LoadingPipeline = ({ stage }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-2xl mx-auto"
    >
      {/* Main Loading Card */}
      <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 items-center justify-center mb-4"
          >
            <Brain className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Creating Your Learning Path</h2>
          <p className="text-gray-400">Our AI is crafting a personalized roadmap just for you</p>
        </div>

        {/* Pipeline Steps */}
        <div className="space-y-3">
          {stages.map((s, index) => {
            const isActive = stage === s.id;
            const isCompleted = stage > s.id;
            const isPending = stage < s.id;
            const colors = colorMap[s.color];

            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300
                  ${isActive ? 'bg-gray-800/80 border border-gray-600' : ''}
                  ${isCompleted ? 'bg-gray-800/40' : ''}
                  ${isPending ? 'opacity-40' : ''}
                `}
              >
                {/* Icon */}
                <div className={`
                  relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                  ${isActive ? `${colors.bg} shadow-lg ${colors.glow}` : ''}
                  ${isCompleted ? 'bg-green-500' : ''}
                  ${isPending ? 'bg-gray-700' : ''}
                `}>
                  {isActive && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 rounded-xl bg-white/20"
                    />
                  )}
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <s.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'} ${isActive && s.id === 6 ? 'animate-spin' : ''}`} />
                  )}
                </div>

                {/* Label */}
                <div className="flex-1">
                  <span className={`
                    font-medium transition-colors duration-300
                    ${isActive ? 'text-white' : ''}
                    ${isCompleted ? 'text-green-400' : ''}
                    ${isPending ? 'text-gray-500' : ''}
                  `}>
                    {s.label}
                  </span>
                </div>

                {/* Status indicator */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                          className={`w-1.5 h-1.5 rounded-full ${colors.bg}`}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {isCompleted && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-green-400 font-medium"
                  >
                    Done
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mt-8">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(stage / stages.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-center text-sm text-gray-500 mt-3">
            Step {stage} of {stages.length}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default LoadingPipeline;
