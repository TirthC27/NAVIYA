import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Theme
import { ThemeProvider } from './context/ThemeContext';

// Auth Pages
import Welcome from './pages/Welcome';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';

// Route Guards
import { ProtectedRoute, PublicRoute } from './hooks/useAuthGuard';

// Dashboard State Context - Single Source of Truth
import { DashboardStateProvider } from './context/DashboardStateContext';

// Career Intelligence Module (Main App)
import CareerLayout from './components/career/CareerLayout';
import {
  CareerDashboard,
  CareerRoadmap,
  ResumeAnalysis,
  YourCareer,
  SkillsAssessment,
  MockInterview,
  AlumniNetwork,
  Observability
} from './pages/career';

// Read user ID from localStorage
const readUserId = () => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user?.id || user?.user_id || null;
    }
  } catch (e) {
    console.error('Error getting user ID:', e);
  }
  return null;
};

function App() {
  // Reactive userId state — updates on login/logout so DashboardStateProvider
  // always receives the current user's ID (fixes cross-user resume leak).
  const [userId, setUserId] = useState(readUserId);

  const refreshUserId = useCallback(() => {
    setUserId(readUserId());
  }, []);

  useEffect(() => {
    // Auth.jsx and CareerLayout.jsx dispatch this event on login / logout
    window.addEventListener('auth-changed', refreshUserId);
    // Also handle cross-tab changes
    window.addEventListener('storage', refreshUserId);
    return () => {
      window.removeEventListener('auth-changed', refreshUserId);
      window.removeEventListener('storage', refreshUserId);
    };
  }, [refreshUserId]);

  return (
    <ThemeProvider>
    <Router>
      <Routes>
        {/* Public Routes - Redirect to dashboard if authenticated */}
        <Route path="/" element={
          <PublicRoute>
            <Welcome />
          </PublicRoute>
        } />
        <Route path="/auth" element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        } />
        <Route path="/login" element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        } />

        {/* Onboarding - Required for new users */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Protected Routes - Career Intelligence Module */}
        <Route path="/career" element={
          <ProtectedRoute>
            <DashboardStateProvider key={userId || 'no-user'} userId={userId}>
              <CareerLayout />
            </DashboardStateProvider>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/career/dashboard" replace />} />
          <Route path="dashboard" element={<CareerDashboard />} />
          <Route path="roadmap" element={<CareerRoadmap />} />
          <Route path="resume" element={<ResumeAnalysis />} />
          <Route path="your-career" element={<YourCareer />} />
          <Route path="skills" element={<SkillsAssessment />} />
          <Route path="interview" element={<MockInterview />} />
          <Route path="alumni" element={<AlumniNetwork />} />
          <Route path="observability" element={<Observability />} />
        </Route>

        {/* Catch all - redirect to welcome */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </ThemeProvider>
  );
}

export default App;
