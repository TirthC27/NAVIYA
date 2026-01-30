import { motion } from 'framer-motion';
import { X, Youtube, Clock, ExternalLink, BookOpen, Target, CheckCircle2 } from 'lucide-react';

const StepInspector = ({ step, onClose }) => {
  if (!step) return null;

  const isCompleted = step.status === 'completed';

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-96 h-full bg-gray-900/95 backdrop-blur-xl border-l border-gray-800 overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs text-purple-300">
            Step {step.step_number}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <h2 className="text-lg font-bold text-white">
          {step.step_title}
        </h2>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Status */}
        <div className={`
          flex items-center gap-3 p-3 rounded-xl
          ${isCompleted ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-800/50 border border-gray-700/50'}
        `}>
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Completed</span>
            </>
          ) : (
            <>
              <Target className="w-5 h-5 text-purple-400" />
              <span className="text-gray-300">Ready to learn</span>
            </>
          )}
        </div>

        {/* Video Section */}
        {step.video && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Youtube className="w-4 h-4 text-red-400" />
              Recommended Video
            </h3>
            
            {/* Video Card */}
            <div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50">
              {/* Thumbnail placeholder */}
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Youtube className="w-8 h-8 text-red-400" />
                </div>
              </div>
              
              <div className="p-4">
                <h4 className="text-white font-medium text-sm mb-2 line-clamp-2">
                  {step.video.title}
                </h4>
                
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                  {step.video.channel && (
                    <span>{step.video.channel}</span>
                  )}
                  {step.video.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {step.video.duration}
                    </span>
                  )}
                </div>

                {step.video.url && (
                  <a
                    href={step.video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Watch on YouTube
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Learning Objectives */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            What you'll learn
          </h3>
          <ul className="space-y-2">
            {(step.objectives || generateObjectives(step.step_title)).map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                {obj}
              </li>
            ))}
          </ul>
        </div>

        {/* Depth Level */}
        {step.depth_level && (
          <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <span className="text-xs text-gray-500">Depth Level</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-1">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className={`w-8 h-2 rounded-full ${
                      level <= step.depth_level
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-300">
                {step.depth_level === 1 ? 'Fundamentals' : step.depth_level === 2 ? 'Intermediate' : 'Advanced'}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Generate placeholder objectives from step title
const generateObjectives = (title) => {
  return [
    `Understand the core concepts of ${title}`,
    'Learn practical implementation techniques',
    'Apply knowledge through hands-on examples',
  ];
};

export default StepInspector;
