import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Clock, ArrowRight, CheckCircle2, Play, 
  Calendar, TrendingUp, Target 
} from 'lucide-react';

const TopicSidebar = ({ selectedTopic, plans, onNavigate }) => {
  const navigate = useNavigate();

  // Get recent/in-progress plans
  const activePlans = plans
    .filter(p => p.progress < 100)
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 5);

  const completedPlans = plans
    .filter(p => p.progress === 100)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Selected Topic Details */}
      {selectedTopic && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Selected Topic</h3>
          </div>
          <h4 className="text-lg text-white mb-2">{selectedTopic.topic || selectedTopic}</h4>
          {selectedTopic.plan_id && (
            <>
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {selectedTopic.total_steps || 0} steps
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {selectedTopic.progress || 0}%
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate(selectedTopic.plan_id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-medium"
              >
                <Play className="w-4 h-4" />
                Continue Learning
              </motion.button>
            </>
          )}
        </motion.div>
      )}

      {/* In Progress */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          In Progress
        </h3>
        
        {activePlans.length > 0 ? (
          <div className="space-y-3">
            {activePlans.map((plan, index) => (
              <motion.div
                key={plan.plan_id || index}
                whileHover={{ x: 4 }}
                onClick={() => onNavigate(plan.plan_id)}
                className="p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-purple-500/30 rounded-xl cursor-pointer transition-all"
              >
                <h4 className="text-sm text-white font-medium truncate mb-2">
                  {plan.topic}
                </h4>
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-3">
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                        style={{ width: `${plan.progress || 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{plan.progress || 0}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No topics in progress
          </p>
        )}
      </div>

      {/* Recently Completed */}
      {completedPlans.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            Completed
          </h3>
          
          <div className="space-y-3">
            {completedPlans.map((plan, index) => (
              <motion.div
                key={plan.plan_id || index}
                whileHover={{ x: 4 }}
                onClick={() => onNavigate(plan.plan_id)}
                className="p-3 bg-green-500/10 border border-green-500/20 hover:border-green-500/40 rounded-xl cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-green-300 font-medium truncate">
                    {plan.topic}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/')}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-xl text-gray-300 transition-colors"
      >
        <span>Explore New Topics</span>
        <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
};

export default TopicSidebar;
