import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

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
  SkillsAssessment,
  MockInterview,
  AIMentor,
  LearningRoadmaps,
  Observability
} from './pages/career';

// Get user ID for dashboard state
const getUserId = () => {
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
  return (
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
            <DashboardStateProvider userId={getUserId()}>
              <CareerLayout />
            </DashboardStateProvider>
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/career/dashboard" replace />} />
          <Route path="dashboard" element={<CareerDashboard />} />
          <Route path="roadmap" element={<CareerRoadmap />} />
          <Route path="resume" element={<ResumeAnalysis />} />
          <Route path="skills" element={<SkillsAssessment />} />
          <Route path="interview" element={<MockInterview />} />
          <Route path="mentor" element={<AIMentor />} />
          <Route path="learning" element={<LearningRoadmaps />} />
          <Route path="observability" element={<Observability />} />
        </Route>

        {/* Catch all - redirect to welcome */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
