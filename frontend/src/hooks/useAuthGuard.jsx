import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Auth Guard Hook
 * Checks authentication and onboarding status
 * 
 * Logic:
 * - After login, fetch user_context
 * - If no row exists → redirect to /onboarding
 * - If onboarding_completed == false → redirect to /onboarding
 * - Else → allow access to protected routes
 */
export const useAuthGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      setIsLoading(true);

      // Check if user is logged in
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');

      if (!userStr || !token) {
        // Not logged in - redirect to auth
        setIsAuthenticated(false);
        setOnboardingCompleted(false);
        setIsLoading(false);
        
        // Don't redirect if already on auth/welcome pages
        if (!['/auth', '/login', '/register', '/'].includes(location.pathname)) {
          navigate('/auth');
        }
        return;
      }

      const user = JSON.parse(userStr);
      setIsAuthenticated(true);

      try {
        // Check onboarding status
        const response = await fetch(`http://localhost:8000/api/onboarding/status?user_id=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (!data.exists || !data.onboarding_completed) {
            // No context or onboarding not completed
            setOnboardingCompleted(false);
            
            // Redirect to onboarding if not already there
            if (location.pathname !== '/onboarding') {
              navigate('/onboarding');
            }
          } else {
            // Onboarding completed
            setOnboardingCompleted(true);
            
            // If on onboarding page, redirect to dashboard
            if (location.pathname === '/onboarding') {
              navigate('/career/dashboard');
            }
          }
        } else if (response.status === 404) {
          // No user_context row exists
          setOnboardingCompleted(false);
          if (location.pathname !== '/onboarding') {
            navigate('/onboarding');
          }
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
        // On error, assume onboarding needed for safety
        setOnboardingCompleted(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndOnboarding();
  }, [navigate, location.pathname]);

  return { isLoading, isAuthenticated, onboardingCompleted };
};

/**
 * Protected Route Component
 * Wraps routes that require authentication and completed onboarding
 */
export const ProtectedRoute = ({ children }) => {
  const { isLoading, isAuthenticated, onboardingCompleted } = useAuthGuard();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or onboarding not completed, the hook handles redirects
  // Just render children if we get here
  return children;
};

/**
 * Public Route Component  
 * For routes that should redirect authenticated users to dashboard
 */
export const PublicRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');

      if (userStr && token) {
        const user = JSON.parse(userStr);
        
        try {
          const response = await fetch(`http://localhost:8000/api/onboarding/status?user_id=${user.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.exists && data.onboarding_completed) {
              // Already completed onboarding - go to dashboard
              navigate('/career/dashboard');
              return;
            } else {
              // Need to complete onboarding
              navigate('/onboarding');
              return;
            }
          }
        } catch (err) {
          console.error('Error checking auth:', err);
        }
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return children;
};

export default useAuthGuard;
