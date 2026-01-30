import { motion } from 'framer-motion';
import { 
  CheckCircle2, AlertTriangle, XCircle, Clock, 
  Zap, ExternalLink, ChevronRight 
} from 'lucide-react';

const TraceFeed = ({ traces }) => {
  // Mock traces if none provided
  const traceData = traces?.length > 0 ? traces : [
    {
      id: 'trace-001',
      operation: 'generate_roadmap',
      status: 'success',
      latency_ms: 1250,
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      input_preview: 'Learn React hooks for state management',
      output_preview: '5 steps generated successfully',
    },
    {
      id: 'trace-002',
      operation: 'find_videos',
      status: 'success',
      latency_ms: 890,
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      input_preview: 'Search: useState, useEffect tutorials',
      output_preview: '5 videos found',
    },
    {
      id: 'trace-003',
      operation: 'ai_coach_response',
      status: 'warning',
      latency_ms: 2100,
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      input_preview: 'User: Explain closures in JavaScript',
      output_preview: 'Response flagged for review',
    },
    {
      id: 'trace-004',
      operation: 'generate_roadmap',
      status: 'success',
      latency_ms: 1100,
      timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
      input_preview: 'Machine learning basics',
      output_preview: '8 steps generated',
    },
    {
      id: 'trace-005',
      operation: 'safety_check',
      status: 'blocked',
      latency_ms: 150,
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      input_preview: 'Content moderation check',
      output_preview: 'Potentially harmful content blocked',
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'blocked':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Zap className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'border-green-500/30 bg-green-500/5';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'blocked':
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return 'border-gray-700/50 bg-gray-800/30';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {traceData.map((trace, index) => (
        <motion.div
          key={trace.id || index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`
            p-4 rounded-xl border transition-all cursor-pointer
            hover:border-purple-500/30 ${getStatusColor(trace.status)}
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {getStatusIcon(trace.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">
                    {trace.operation}
                  </span>
                  <span className="px-1.5 py-0.5 bg-gray-700/50 text-gray-400 text-xs rounded">
                    {trace.id}
                  </span>
                </div>
                
                <p className="text-xs text-gray-400 truncate mb-1">
                  Input: {trace.input_preview}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Output: {trace.output_preview}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-4">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {trace.latency_ms}ms
              </div>
              <span className="text-xs text-gray-500">
                {formatTime(trace.timestamp)}
              </span>
            </div>
          </div>

          {/* Expand indicator */}
          <div className="flex items-center justify-end mt-2 pt-2 border-t border-gray-700/30">
            <button className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
              View details
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      ))}

      {traceData.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No traces recorded yet</p>
          <p className="text-xs mt-1">Traces will appear here as you use the platform</p>
        </div>
      )}

      {/* View all link */}
      {traceData.length > 0 && (
        <div className="text-center pt-2">
          <a
            href="https://www.comet.com/opik"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            View all traces in OPIK
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};

export default TraceFeed;
