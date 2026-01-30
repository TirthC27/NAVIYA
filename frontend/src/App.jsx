import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Results from './pages/Results';
import LearningPlan from './pages/LearningPlan';

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="/learn" element={<LearningPlan />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
