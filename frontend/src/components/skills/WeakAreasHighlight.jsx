/**
 * WeakAreasHighlight Component
 * 
 * Displays weak areas that need improvement
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ExclamationTriangleIcon, 
  ArrowTrendingUpIcon,
  LightBulbIcon 
} from '@heroicons/react/24/outline';

const WeakAreasHighlight = ({ 
  weakAreas = [], 
  recommendation,
  showRecommendation = true,
  className = '' 
}) => {
  if (!weakAreas || weakAreas.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`bg-emerald-50 border border-emerald-200 rounded-xl p-6 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="font-medium text-emerald-800">Great job!</h4>
            <p className="text-sm text-emerald-600">No significant weak areas identified.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-red-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Areas for Improvement</h3>
            <p className="text-sm text-gray-500">
              {weakAreas.length} topic{weakAreas.length !== 1 ? 's' : ''} need{weakAreas.length === 1 ? 's' : ''} attention
            </p>
          </div>
        </div>
      </div>

      {/* Weak Areas List */}
      <div className="p-6">
        <div className="space-y-3">
          {weakAreas.map((area, index) => (
            <motion.div
              key={typeof area === 'string' ? area : area.topic}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-medium">
                {index + 1}
              </span>
              <div className="flex-1">
                <span className="text-gray-700 font-medium">
                  {typeof area === 'string' ? area : area.topic}
                </span>
                {typeof area === 'object' && area.frequency && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({area.frequency}x flagged)
                  </span>
                )}
              </div>
              <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                Needs work
              </span>
            </motion.div>
          ))}
        </div>

        {/* Recommendation */}
        {showRecommendation && recommendation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100"
          >
            <div className="flex gap-3">
              <LightBulbIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Recommendation</h4>
                <p className="text-sm text-blue-700">{recommendation}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default WeakAreasHighlight;
