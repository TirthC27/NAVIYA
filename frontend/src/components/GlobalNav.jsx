import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Map, BookOpen, Target, Activity, Sparkles, Briefcase, LogOut, User } from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/interests', icon: Target, label: 'Interests' },
  { path: '/career', icon: Briefcase, label: 'Career Intelligence' },
  { path: '/observability', icon: Activity, label: 'Observability' },
];

const GlobalNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, [location]);

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

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Naviya</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = item.path === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                      ${isActive 
                        ? 'text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-purple-500/20 border border-purple-500/30 rounded-lg"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <item.icon className="w-4 h-4 relative z-10" />
                    <span className="text-sm font-medium relative z-10 hidden sm:inline">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            {user ? (
              <div className="flex items-center gap-2 pl-3 border-l border-gray-700">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300 hidden sm:inline">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/30 border border-transparent transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="px-4 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-all text-sm"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default GlobalNav;
