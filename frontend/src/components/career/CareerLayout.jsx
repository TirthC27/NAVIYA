import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Briefcase,
  LayoutDashboard,
  Route,
  FileText,
  Zap,
  MessageSquare,
  Users,
  Sparkles,
  BookOpen,
  Activity,
  LogOut,
  User,
  Lock,
  CheckCircle
} from 'lucide-react';
import { useDashboardState } from '../../context/DashboardStateContext';

const careerNavItems = [
  { 
    path: '/career/dashboard', 
    icon: LayoutDashboard, 
    label: 'Dashboard',
    description: 'Overview & insights',
    alwaysUnlocked: true
  },
  { 
    path: '/career/roadmap', 
    icon: Route, 
    label: 'Career Roadmap',
    description: 'Your personalized path',
    featureKey: 'roadmap'
  },
  { 
    path: '/career/resume', 
    icon: FileText, 
    label: 'Resume Analysis',
    description: 'AI-powered review',
    alwaysUnlocked: true // First step, always available
  },
  { 
    path: '/career/skills', 
    icon: Zap, 
    label: 'Skills Assessment',
    description: 'Track & validate skills',
    featureKey: 'skill_assessment'
  },
  { 
    path: '/career/interview', 
    icon: MessageSquare, 
    label: 'Mock Interview',
    description: 'Practice with AI',
    featureKey: 'mock_interview'
  },
  { 
    path: '/career/mentor', 
    icon: Users, 
    label: 'AI Mentor',
    description: 'Get career guidance',
    alwaysUnlocked: true // Mentor always available
  },
];

const additionalNavItems = [
  { 
    path: '/career/learning', 
    icon: BookOpen, 
    label: 'Learning Paths',
    description: 'AI-curated courses'
  },
  { 
    path: '/career/observability', 
    icon: Activity, 
    label: 'Observability',
    description: 'OPIK metrics & traces'
  },
];

const CareerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // Get dashboard state for feature gating
  const { canAccess, state: dashboardState, unlockedFeatures } = useDashboardState();

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    // Note: Route protection is now handled by ProtectedRoute in App.jsx
  }, []);

  const handleLogout = async () => {
    try {
      // Call logout API
      await fetch('http://localhost:8000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Redirect to auth page
      navigate('/auth');
    }
  };

  const renderNavItem = (item) => {
    // Check if feature is unlocked
    const isUnlocked = item.alwaysUnlocked || !item.featureKey || canAccess(item.featureKey);
    const isComplete = item.featureKey && dashboardState?.[`${item.featureKey.replace('_', '_')}_ready`];
    
    // If locked, render a non-clickable item with tooltip
    if (!isUnlocked) {
      // Determine unlock message
      let unlockMsg = "Complete previous steps";
      if (item.label.includes("Roadmap")) unlockMsg = "Upload resume first";
      if (item.label.includes("Skills")) unlockMsg = "Generate roadmap first";
      if (item.label.includes("Interview")) unlockMsg = "Complete assessments first";
      
      return (
        <div
          key={item.path}
          className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 cursor-not-allowed opacity-60 group"
          title={unlockMsg}
        >
          <Lock className="w-5 h-5 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{item.label}</div>
            <div className="text-xs text-slate-300 truncate">
              {unlockMsg}
            </div>
          </div>
          
          {/* Hover tooltip */}
          <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            🔒 {unlockMsg}
          </div>
        </div>
      );
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) => `
          relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
          ${isActive 
            ? 'bg-amber-50 text-amber-800' 
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
        `}
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.div
                layoutId="careerActiveIndicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-400 rounded-r-full"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            
            <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-amber-500' : ''}`} />
            
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${isActive ? 'text-amber-800' : ''}`}>
                {item.label}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {item.description}
              </div>
            </div>
            
            {isComplete && !isActive && (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            )}
            {isActive && (
              <div className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 shadow-sm z-40">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-800">Naviya AI</span>
              <p className="text-xs text-slate-500">Career Intelligence</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Career Tools</span>
          </div>
          {careerNavItems.map(renderNavItem)}
          
          {/* Divider */}
          <div className="my-3 border-t border-slate-100" />
          
          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resources</span>
          </div>
          {additionalNavItems.map(renderNavItem)}
        </nav>

        {/* Agent Status & User Info */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white">
          {/* User Info */}
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {user?.email || ''}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Agent Status */}
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-slate-500">AI Agents Active</span>
              </div>
              <span className="text-xs text-slate-400">
                {unlockedFeatures?.length || 0}/5
              </span>
            </div>
            {dashboardState?.last_updated_by_agent && (
              <p className="text-xs text-slate-400 mt-1 truncate">
                Last: {dashboardState.last_updated_by_agent}
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default CareerLayout;
