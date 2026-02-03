import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Bell, 
  CheckCircle2, 
  Info, 
  ChevronRight,
  ChevronDown,
  X
} from 'lucide-react';

/**
 * MentorMessageCard - Displays mentor messages on the dashboard
 * 
 * Message types:
 * - welcome: Welcome message after onboarding
 * - notice: System notices (e.g., limited domain)
 * - update: Progress updates
 */

const typeConfig = {
  welcome: {
    icon: MessageSquare,
    gradient: 'from-purple-500 to-blue-500',
    bgGradient: 'from-purple-500/10 to-blue-500/10',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-400'
  },
  notice: {
    icon: Info,
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/10 to-orange-500/10',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400'
  },
  update: {
    icon: CheckCircle2,
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-500/10 to-emerald-500/10',
    borderColor: 'border-green-500/30',
    iconColor: 'text-green-400'
  }
};

// Latest Message Card (Featured)
export const LatestMentorMessage = ({ message, onActionClick, onDismiss }) => {
  if (!message) return null;

  const config = typeConfig[message.message_type] || typeConfig.notice;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-gradient-to-r ${config.bgGradient} border ${config.borderColor} rounded-2xl p-6 mb-6`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          {/* Icon */}
          <div className={`p-3 rounded-xl bg-gradient-to-br ${config.gradient}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              {message.title}
            </h3>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {message.body}
            </p>
            
            {/* Action CTA */}
            {message.action_cta && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onActionClick?.(message.action_cta.route)}
                className={`mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${config.gradient} rounded-lg text-white font-medium text-sm`}
              >
                {message.action_cta.label}
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
        
        {/* Dismiss Button */}
        {onDismiss && (
          <button
            onClick={() => onDismiss(message.id)}
            className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Timestamp */}
      <div className="mt-4 pt-4 border-t border-gray-700/30 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {formatTimestamp(message.created_at)}
        </span>
        {!message.read_at && (
          <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
            New
          </span>
        )}
      </div>
    </motion.div>
  );
};

// Compact Message Card (For History)
export const CompactMentorMessage = ({ message, onClick }) => {
  const config = typeConfig[message.message_type] || typeConfig.notice;
  const Icon = config.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={() => onClick?.(message)}
      className={`bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 cursor-pointer transition-all hover:bg-gray-800/50`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bgGradient.replace('to-', 'to-').replace('from-', 'bg-')}`}>
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-white truncate">
              {message.title}
            </h4>
            {!message.read_at && (
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatTimestamp(message.created_at)}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-500" />
      </div>
    </motion.div>
  );
};

// Message History Panel
export const MessageHistoryPanel = ({ 
  messages, 
  isExpanded, 
  onToggle, 
  onMessageClick,
  unreadCount = 0 
}) => {
  return (
    <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Bell className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-medium">Message History</h3>
            <p className="text-sm text-gray-500">
              {messages.length} messages
              {unreadCount > 0 && ` • ${unreadCount} unread`}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-2 max-h-[300px] overflow-y-auto">
              {messages.length > 0 ? (
                messages.map((message) => (
                  <CompactMentorMessage
                    key={message.id}
                    message={message}
                    onClick={onMessageClick}
                  />
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No messages yet
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Message Detail Modal
export const MessageDetailModal = ({ message, isOpen, onClose, onActionClick }) => {
  if (!message || !isOpen) return null;

  const config = typeConfig[message.message_type] || typeConfig.notice;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-gray-900 border ${config.borderColor} rounded-2xl max-w-lg w-full p-6`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${config.gradient}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {message.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatTimestamp(message.created_at)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Body */}
          <div className="text-gray-300 leading-relaxed whitespace-pre-line mb-6">
            {message.body}
          </div>

          {/* Action */}
          {message.action_cta && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onActionClick?.(message.action_cta.route);
                onClose();
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r ${config.gradient} rounded-xl text-white font-medium`}
            >
              {message.action_cta.label}
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Unread Badge
export const UnreadBadge = ({ count }) => {
  if (!count || count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-purple-500 text-white text-xs font-bold">
      {count > 9 ? '9+' : count}
    </span>
  );
};

// Helper function
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

export default {
  LatestMentorMessage,
  CompactMentorMessage,
  MessageHistoryPanel,
  MessageDetailModal,
  UnreadBadge
};
