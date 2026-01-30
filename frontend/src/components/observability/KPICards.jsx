import { motion } from 'framer-motion';
import { 
  BookOpen, TrendingUp, Clock, Star, Shield, 
  Activity, Zap, MessageSquare 
} from 'lucide-react';

const KPICards = ({ metrics }) => {
  const cards = [
    {
      icon: BookOpen,
      label: 'Total Plans',
      value: metrics.totalPlans,
      color: 'purple',
      bgGradient: 'from-purple-500/20 to-purple-600/10',
      iconBg: 'from-purple-500 to-purple-600',
    },
    {
      icon: TrendingUp,
      label: 'Total Steps',
      value: metrics.totalSteps,
      color: 'blue',
      bgGradient: 'from-blue-500/20 to-blue-600/10',
      iconBg: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Star,
      label: 'Avg Rating',
      value: metrics.avgRating?.toFixed(1) || '0.0',
      suffix: '/ 5',
      color: 'yellow',
      bgGradient: 'from-yellow-500/20 to-amber-600/10',
      iconBg: 'from-yellow-500 to-orange-500',
    },
    {
      icon: Activity,
      label: 'Evaluations',
      value: metrics.totalEvals,
      color: 'green',
      bgGradient: 'from-green-500/20 to-emerald-600/10',
      iconBg: 'from-green-500 to-emerald-500',
    },
    {
      icon: Clock,
      label: 'Avg Latency',
      value: metrics.avgLatency,
      suffix: 'ms',
      color: 'cyan',
      bgGradient: 'from-cyan-500/20 to-blue-600/10',
      iconBg: 'from-cyan-500 to-blue-500',
    },
    {
      icon: Shield,
      label: 'Safety Score',
      value: metrics.safetyScore,
      suffix: '%',
      color: 'emerald',
      bgGradient: 'from-emerald-500/20 to-green-600/10',
      iconBg: 'from-emerald-500 to-green-500',
    },
    {
      icon: MessageSquare,
      label: 'Feedback',
      value: metrics.feedbackCount,
      color: 'pink',
      bgGradient: 'from-pink-500/20 to-rose-600/10',
      iconBg: 'from-pink-500 to-rose-500',
    },
    {
      icon: Zap,
      label: 'Uptime',
      value: '99.9',
      suffix: '%',
      color: 'amber',
      bgGradient: 'from-amber-500/20 to-orange-600/10',
      iconBg: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className={`
            relative bg-gradient-to-br ${card.bgGradient}
            border border-gray-800/50 rounded-xl p-4 overflow-hidden
          `}
        >
          {/* Background glow */}
          <div className={`absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br ${card.iconBg} opacity-20 rounded-full blur-xl`} />
          
          <div className="relative z-10">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.iconBg} flex items-center justify-center mb-3`}>
              <card.icon className="w-4 h-4 text-white" />
            </div>
            
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">{card.value}</span>
              {card.suffix && (
                <span className="text-sm text-gray-400">{card.suffix}</span>
              )}
            </div>
            
            <span className="text-xs text-gray-400 mt-1 block">{card.label}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default KPICards;
