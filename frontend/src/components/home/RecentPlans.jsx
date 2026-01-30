import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, ChevronRight, History } from 'lucide-react';

const RecentPlans = ({ plans }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getModeEmoji = (mode) => {
    switch (mode) {
      case 'quick': return '⚡';
      case 'comprehensive': return '🎯';
      default: return '📚';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-12"
    >
      <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <History className="w-5 h-5" />
        Continue Learning
      </h3>
      
      <div className="grid gap-3">
        {plans.slice(0, 5).map((plan, index) => (
          <motion.div
            key={plan.plan_id || index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => navigate(`/learn/${plan.plan_id}`)}
            className="group relative bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/30 rounded-xl p-4 cursor-pointer transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                {/* Mode Emoji */}
                <div className="w-10 h-10 rounded-xl bg-gray-700/50 flex items-center justify-center text-xl">
                  {getModeEmoji(plan.learning_mode)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                    {plan.topic}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {plan.total_steps || plan.steps?.length || 0} steps
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(plan.created_at)}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                {plan.progress !== undefined && (
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                        style={{ width: `${plan.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-10">{plan.progress || 0}%</span>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default RecentPlans;
