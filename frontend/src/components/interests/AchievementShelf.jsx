import { motion } from 'framer-motion';
import { Trophy, Star, Zap, Target, Award, Crown, Medal, Flame } from 'lucide-react';

const achievements = [
  {
    id: 'first_topic',
    title: 'First Steps',
    description: 'Complete your first topic',
    icon: Star,
    color: 'from-yellow-500 to-orange-500',
    requirement: (stats) => stats.completedTopics >= 1,
  },
  {
    id: 'five_topics',
    title: 'Knowledge Seeker',
    description: 'Complete 5 topics',
    icon: Trophy,
    color: 'from-purple-500 to-pink-500',
    requirement: (stats) => stats.completedTopics >= 5,
  },
  {
    id: 'ten_topics',
    title: 'Learning Master',
    description: 'Complete 10 topics',
    icon: Crown,
    color: 'from-blue-500 to-cyan-500',
    requirement: (stats) => stats.completedTopics >= 10,
  },
  {
    id: 'twenty_steps',
    title: 'Step by Step',
    description: 'Complete 20 learning steps',
    icon: Target,
    color: 'from-green-500 to-emerald-500',
    requirement: (stats) => stats.completedSteps >= 20,
  },
  {
    id: 'fifty_steps',
    title: 'Dedicated Learner',
    description: 'Complete 50 learning steps',
    icon: Medal,
    color: 'from-indigo-500 to-purple-500',
    requirement: (stats) => stats.completedSteps >= 50,
  },
  {
    id: 'streak_3',
    title: 'On Fire',
    description: '3-day learning streak',
    icon: Flame,
    color: 'from-red-500 to-orange-500',
    requirement: (stats) => stats.streak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: '7-day learning streak',
    icon: Zap,
    color: 'from-amber-500 to-yellow-500',
    requirement: (stats) => stats.streak >= 7,
  },
  {
    id: 'hundred_steps',
    title: 'Century Club',
    description: 'Complete 100 learning steps',
    icon: Award,
    color: 'from-rose-500 to-pink-500',
    requirement: (stats) => stats.completedSteps >= 100,
  },
];

const AchievementShelf = ({ completedTopics, completedSteps, streak }) => {
  const stats = { completedTopics, completedSteps, streak };

  const unlockedAchievements = achievements.filter(a => a.requirement(stats));
  const lockedAchievements = achievements.filter(a => !a.requirement(stats));

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        Achievements
        <span className="text-sm font-normal text-gray-500">
          {unlockedAchievements.length} / {achievements.length}
        </span>
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Unlocked Achievements */}
        {unlockedAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -4 }}
            className="group relative"
          >
            <div className={`
              w-full aspect-square rounded-2xl bg-gradient-to-br ${achievement.color}
              flex items-center justify-center shadow-lg transition-shadow
              group-hover:shadow-xl group-hover:shadow-purple-500/20
            `}>
              <achievement.icon className="w-8 h-8 text-white" />
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 whitespace-nowrap">
                <p className="text-sm font-medium text-white">{achievement.title}</p>
                <p className="text-xs text-gray-400">{achievement.description}</p>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          </motion.div>
        ))}

        {/* Locked Achievements */}
        {lockedAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: (unlockedAchievements.length + index) * 0.05 }}
            whileHover={{ scale: 1.02 }}
            className="group relative"
          >
            <div className="w-full aspect-square rounded-2xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center opacity-40">
              <achievement.icon className="w-8 h-8 text-gray-500" />
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 whitespace-nowrap">
                <p className="text-sm font-medium text-gray-400">{achievement.title}</p>
                <p className="text-xs text-gray-500">{achievement.description}</p>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AchievementShelf;
