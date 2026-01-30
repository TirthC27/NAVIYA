import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RoadmapConfirm from './pages/RoadmapConfirm';
import LearningDashboard from './pages/LearningDashboard';
import InterestDashboard from './pages/InterestDashboard';
import ObservabilityDashboard from './pages/ObservabilityDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Page 1: Home - Landing with prompt box */}
        <Route path="/" element={<Home />} />
        
        {/* Page 2: Roadmap Confirm - Review generated roadmap */}
        <Route path="/roadmap/:plan_id/confirm" element={<RoadmapConfirm />} />
        
        {/* Page 3: Learning Dashboard - Video player & progress */}
        <Route path="/learn/:plan_id" element={<LearningDashboard />} />
        
        {/* Page 4: Interest Dashboard - Knowledge map & achievements */}
        <Route path="/interests" element={<InterestDashboard />} />
        
        {/* Page 5: Observability Dashboard - OPIK metrics */}
        <Route path="/observability" element={<ObservabilityDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
