import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Youtube, ExternalLink, CheckCircle2, ChevronLeft, ChevronRight,
  ThumbsUp, ThumbsDown, Star, Clock, MessageSquare
} from 'lucide-react';

const VideoPanel = ({ 
  step, 
  stepIndex, 
  totalSteps,
  isCompleted,
  onComplete, 
  onFeedback,
  onPrevious,
  onNext
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  if (!step) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Select a step to begin learning</p>
      </div>
    );
  }

  const handleRating = (value) => {
    setRating(value);
    onFeedback?.(value);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2000);
  };

  // Extract YouTube video ID from URL
  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeId(step.video?.url);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Video Container */}
      <div className="flex-1 relative bg-black">
        {videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
            title={step.video?.title || step.step_title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Youtube className="w-12 h-12 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{step.step_title}</h3>
              {step.video?.url && (
                <a
                  href={step.video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-medium transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Watch on YouTube
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-gray-900/95 border-t border-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Step Info */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 mr-4">
              <h2 className="text-lg font-bold text-white mb-1">
                {step.step_title}
              </h2>
              {step.video && (
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>{step.video.channel}</span>
                  {step.video.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {step.video.duration}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Rate video:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-5 h-5 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {showFeedback && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-green-400"
                >
                  Thanks!
                </motion.span>
              )}
            </div>
          </div>

          {/* Navigation & Complete */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPrevious}
                disabled={stepIndex === 0}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all
                  ${stepIndex === 0
                    ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}
                `}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNext}
                disabled={stepIndex === totalSteps - 1}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all
                  ${stepIndex === totalSteps - 1
                    ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}
                `}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onComplete}
              disabled={isCompleted}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all
                ${isCompleted
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400 cursor-default'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/25'}
              `}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Completed
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Mark Complete
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPanel;
