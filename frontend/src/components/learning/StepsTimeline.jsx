import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Play, Lock, ChevronDown } from 'lucide-react';

const StepsTimeline = ({ steps = [], currentIndex, completedSteps, onStepSelect }) => {
  return (
    <div className="w-80 flex-shrink-0 border-r border-gray-800/50 bg-gray-900/50 overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
          <ChevronDown className="w-4 h-4" />
          Learning Path
        </h3>

        <div className="space-y-2">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === currentIndex;
            const isLocked = !isCompleted && index > currentIndex && !completedSteps.has(index - 1);

            return (
              <motion.button
                key={step.id || index}
                onClick={() => !isLocked && onStepSelect(index)}
                disabled={isLocked}
                whileHover={!isLocked ? { x: 4 } : {}}
                className={`
                  w-full text-left p-3 rounded-xl transition-all duration-200 relative
                  ${isCurrent 
                    ? 'bg-purple-500/20 border border-purple-500/50' 
                    : isCompleted
                      ? 'bg-green-500/10 border border-green-500/20 hover:border-green-500/40'
                      : isLocked
                        ? 'bg-gray-800/30 border border-gray-700/30 opacity-50 cursor-not-allowed'
                        : 'bg-gray-800/30 border border-gray-700/50 hover:border-gray-600'}
                `}
              >
                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div className={`
                    absolute left-6 top-full w-0.5 h-2 z-0
                    ${completedSteps.has(index) ? 'bg-green-500/50' : 'bg-gray-700'}
                  `} />
                )}

                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                    ${isCurrent 
                      ? 'bg-purple-500' 
                      : isCompleted 
                        ? 'bg-green-500' 
                        : isLocked 
                          ? 'bg-gray-700' 
                          : 'bg-gray-700'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : isCurrent ? (
                      <Play className="w-4 h-4 text-white fill-white" />
                    ) : isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <span className={`
                      text-xs font-medium mb-1 block
                      ${isCurrent ? 'text-purple-400' : isCompleted ? 'text-green-400' : 'text-gray-500'}
                    `}>
                      Step {step.step_number || index + 1}
                    </span>
                    <h4 className={`
                      text-sm font-medium line-clamp-2
                      ${isCurrent ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-400'}
                    `}>
                      {step.step_title}
                    </h4>
                    {step.video?.duration && (
                      <span className="text-xs text-gray-500 mt-1 block">
                        {step.video.duration}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StepsTimeline;
