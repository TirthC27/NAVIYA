import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Briefcase, MessageSquare, Calendar, TrendingUp, Search } from 'lucide-react';
import useActivityTracker from '../../hooks/useActivityTracker';

const AlumniNetwork = () => {
  useActivityTracker('alumni');
  const [activeTab, setActiveTab] = useState('directory');

  const tabs = [
    { id: 'directory', label: 'Directory', icon: Users },
    { id: 'connections', label: 'My Connections', icon: MessageSquare },
    { id: 'events', label: 'Alumni Events', icon: Calendar },
    { id: 'success', label: 'Success Stories', icon: TrendingUp },
    { id: 'mentorship', label: 'Mentorship', icon: Briefcase },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors">
      {/* Header */}
      <div className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
            <Users className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">Alumni Network</h1>
            <p className="text-[10px] text-slate-400">Connect with alumni, mentors, and industry professionals</p>
          </div>
        </div>
      </div>

      {/* Top Navigation Bar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 transition-colors">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-3 flex items-center gap-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'text-amber-600 dark:text-lime-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="max-w-7xl mx-auto">
          {activeTab === 'directory' && <DirectoryTab />}
          {activeTab === 'connections' && <ConnectionsTab />}
          {activeTab === 'events' && <EventsTab />}
          {activeTab === 'success' && <SuccessStoriesTab />}
          {activeTab === 'mentorship' && <MentorshipTab />}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Tab Components
// ============================================

const DirectoryTab = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search alumni by name, company, or role..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
        </div>
        <button className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-medium rounded-xl transition-colors text-sm">
          Filters
        </button>
      </div>

      <div className="text-center py-16">
        <div className="w-16 h-16 bg-amber-50 dark:bg-lime-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Alumni Directory</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Browse and connect with thousands of alumni</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Feature coming soon — you'll be able to search alumni by graduation year, industry, location, and company.
        </p>
      </div>
    </div>
  </motion.div>
);

const ConnectionsTab = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">My Connections</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Manage your alumni network</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          View your connected alumni, pending requests, and recommendations for new connections.
        </p>
      </div>
    </div>
  </motion.div>
);

const EventsTab = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-purple-50 dark:bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-purple-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Alumni Events</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Networking events, reunions, and webinars</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Discover upcoming alumni events, RSVP, and connect with attendees.
        </p>
      </div>
    </div>
  </motion.div>
);

const SuccessStoriesTab = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Success Stories</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Inspiring journeys from fellow alumni</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Read about career transitions, startup launches, and achievements from the alumni community.
        </p>
      </div>
    </div>
  </motion.div>
);

const MentorshipTab = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-amber-50 dark:bg-lime-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Alumni Mentorship</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Connect with experienced professionals</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Find alumni mentors in your field, schedule 1-on-1 sessions, and get career guidance.
        </p>
      </div>
    </div>
  </motion.div>
);

export default AlumniNetwork;
