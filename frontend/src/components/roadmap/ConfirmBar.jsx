import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Clock, BookOpen, Sparkles } from 'lucide-react';

const ConfirmBar = ({ totalSteps, estimatedTime, onConfirm, onBack }) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800"
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-400">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">{totalSteps}</span>
              <span>learning steps</span>
            </div>
            <div className="h-6 w-px bg-gray-700" />
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold">{estimatedTime}</span>
              <span>estimated time</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-300 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onConfirm}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-xl text-white font-semibold shadow-lg shadow-purple-500/25 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Start Learning
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ConfirmBar;
