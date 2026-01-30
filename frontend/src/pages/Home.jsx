import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
  // Layout
  container: {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  
  // Sidebar
  sidebar: {
    width: '80px',
    background: '#111111',
    borderRight: '1px solid #1a1a1a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 0',
    gap: '8px',
  },
  sidebarLogo: {
    width: '50px',
    height: '50px',
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    marginBottom: '30px',
    boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
  },
  sidebarItem: {
    width: '50px',
    height: '50px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    color: '#666',
    background: 'transparent',
    border: 'none',
  },
  sidebarItemActive: {
    background: 'rgba(0, 255, 136, 0.1)',
    color: '#00ff88',
  },
  
  // Main Content
  mainContent: {
    flex: 1,
    padding: '30px 40px',
    overflowY: 'auto',
  },
  
  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
  },
  heroTitle: {
    fontSize: '48px',
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: '1.2',
  },
  heroTitleAccent: {
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  
  // Create Learning Section
  createSection: {
    background: 'linear-gradient(135deg, #111111 0%, #1a1a1a 100%)',
    borderRadius: '24px',
    padding: '30px',
    marginBottom: '40px',
    border: '1px solid #222',
  },
  createHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  createTitle: {
    color: '#fff',
    fontSize: '20px',
    fontWeight: '700',
  },
  createButton: {
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    border: 'none',
    padding: '12px 28px',
    borderRadius: '12px',
    color: '#000',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
  },
  inputWrapper: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  input: {
    flex: 1,
    padding: '16px 24px',
    fontSize: '16px',
    border: '2px solid #333',
    borderRadius: '14px',
    outline: 'none',
    background: '#0a0a0a',
    color: '#fff',
    transition: 'all 0.3s ease',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '14px',
    color: '#000',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 0 25px rgba(0, 255, 136, 0.4)',
    whiteSpace: 'nowrap',
  },
  
  // Categories
  categories: {
    display: 'flex',
    gap: '12px',
    marginBottom: '30px',
    flexWrap: 'wrap',
  },
  categoryChip: {
    padding: '10px 20px',
    borderRadius: '25px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: 'none',
    background: '#1a1a1a',
    color: '#888',
  },
  categoryChipActive: {
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    color: '#000',
    boxShadow: '0 0 15px rgba(0, 255, 136, 0.3)',
  },
  
  // Section Title
  sectionTitle: {
    color: '#fff',
    fontSize: '22px',
    fontWeight: '700',
    marginBottom: '20px',
  },
  
  // Course Grid
  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  courseCard: {
    background: '#111111',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid #1a1a1a',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  courseCardHover: {
    border: '1px solid #00ff88',
    boxShadow: '0 0 30px rgba(0, 255, 136, 0.1)',
  },
  courseCategory: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  courseCategoryIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(0, 255, 136, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  courseCategoryText: {
    color: '#00ff88',
    fontSize: '12px',
    fontWeight: '600',
  },
  courseRating: {
    marginLeft: 'auto',
    background: 'rgba(0, 255, 136, 0.1)',
    padding: '4px 10px',
    borderRadius: '8px',
    color: '#00ff88',
    fontSize: '12px',
    fontWeight: '700',
  },
  courseTitle: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '12px',
    lineHeight: '1.4',
  },
  courseMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseSteps: {
    color: '#666',
    fontSize: '13px',
  },
  courseProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  progressBar: {
    width: '60px',
    height: '4px',
    background: '#222',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00ff88, #00cc6a)',
    borderRadius: '2px',
  },
  progressText: {
    color: '#00ff88',
    fontSize: '12px',
    fontWeight: '600',
  },
  
  // Right Sidebar
  rightSidebar: {
    width: '320px',
    background: '#111111',
    borderLeft: '1px solid #1a1a1a',
    padding: '30px 24px',
  },
  profileSection: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    margin: '0 auto 16px',
    boxShadow: '0 0 30px rgba(0, 255, 136, 0.3)',
  },
  profileName: {
    color: '#fff',
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  profileLabel: {
    color: '#666',
    fontSize: '14px',
  },
  
  // Stats Card
  statsCard: {
    background: '#0a0a0a',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #1a1a1a',
  },
  statsTitle: {
    color: '#888',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  statItem: {
    textAlign: 'center',
  },
  statValue: {
    color: '#00ff88',
    fontSize: '28px',
    fontWeight: '800',
  },
  statLabel: {
    color: '#666',
    fontSize: '12px',
    marginTop: '4px',
  },
  
  // Activity Chart
  activityChart: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    height: '80px',
    marginTop: '16px',
  },
  activityBar: {
    flex: 1,
    background: 'linear-gradient(180deg, #00ff88 0%, #00cc6a 100%)',
    borderRadius: '4px 4px 0 0',
    minHeight: '10px',
    opacity: 0.8,
  },
  
  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '18px',
    marginBottom: '8px',
    color: '#888',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#555',
  },
};

const categories = ['All', 'In Progress', 'Completed', 'AI & ML', 'Web Dev', 'Data Science'];

// Mock data for past learnings (will be replaced with real data later)
const mockLearnings = [
  {
    id: 1,
    topic: 'Machine Learning Basics',
    category: 'AI & ML',
    totalSteps: 4,
    completedSteps: 4,
    rating: 4.8,
    icon: '🤖',
  },
  {
    id: 2,
    topic: 'React.js Fundamentals',
    category: 'Web Dev',
    totalSteps: 6,
    completedSteps: 4,
    rating: 4.9,
    icon: '⚛️',
  },
  {
    id: 3,
    topic: 'Python for Data Science',
    category: 'Data Science',
    totalSteps: 5,
    completedSteps: 5,
    rating: 4.7,
    icon: '🐍',
  },
  {
    id: 4,
    topic: 'System Design Principles',
    category: 'Web Dev',
    totalSteps: 6,
    completedSteps: 2,
    rating: 4.6,
    icon: '🏗️',
  },
];

export default function Home() {
  const [topic, setTopic] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [hoveredCard, setHoveredCard] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    navigate('/learn', { state: { topic } });
  };

  const handleCourseClick = (learning) => {
    navigate('/learn', { state: { topic: learning.topic } });
  };

  const filteredLearnings = activeCategory === 'All' 
    ? mockLearnings 
    : activeCategory === 'In Progress'
    ? mockLearnings.filter(l => l.completedSteps < l.totalSteps)
    : activeCategory === 'Completed'
    ? mockLearnings.filter(l => l.completedSteps === l.totalSteps)
    : mockLearnings.filter(l => l.category === activeCategory);

  const totalHours = mockLearnings.reduce((acc, l) => acc + l.completedSteps * 0.5, 0);
  const totalCompleted = mockLearnings.filter(l => l.completedSteps === l.totalSteps).length;

  return (
    <div style={styles.container}>
      {/* Left Sidebar */}
      <nav style={styles.sidebar}>
        <div style={styles.sidebarLogo}>🎓</div>
        <button style={{ ...styles.sidebarItem, ...styles.sidebarItemActive }}>🏠</button>
        <button style={styles.sidebarItem}>📚</button>
        <button style={styles.sidebarItem}>📊</button>
        <button style={styles.sidebarItem}>⭐</button>
        <button style={styles.sidebarItem}>⚙️</button>
      </nav>

      {/* Main Content */}
      <main style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.heroTitle}>
            Invest in your<br />
            <span style={styles.heroTitleAccent}>education</span>
          </h1>
        </div>

        {/* Create Learning Section */}
        <div style={styles.createSection}>
          <div style={styles.createHeader}>
            <span style={styles.createTitle}>✨ Start a new learning journey</span>
            {!showInput && (
              <button 
                style={styles.createButton}
                onClick={() => setShowInput(true)}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                + Create Learning
              </button>
            )}
          </div>
          
          {showInput && (
            <form onSubmit={handleSubmit} style={styles.inputWrapper}>
              <input
                type="text"
                placeholder="What do you want to learn? (e.g., Machine Learning, React, Python...)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                style={styles.input}
                autoFocus
                onFocus={(e) => e.target.style.borderColor = '#00ff88'}
                onBlur={(e) => e.target.style.borderColor = '#333'}
              />
              <button
                type="submit"
                disabled={!topic.trim()}
                style={{
                  ...styles.submitButton,
                  opacity: topic.trim() ? 1 : 0.5,
                  cursor: topic.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                🚀 Generate Plan
              </button>
            </form>
          )}
        </div>

        {/* Categories */}
        <div style={styles.categories}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                ...styles.categoryChip,
                ...(activeCategory === cat ? styles.categoryChipActive : {}),
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* My Learnings */}
        <h2 style={styles.sectionTitle}>📖 My Learnings</h2>
        
        {filteredLearnings.length > 0 ? (
          <div style={styles.courseGrid}>
            {filteredLearnings.map((learning) => (
              <div
                key={learning.id}
                style={{
                  ...styles.courseCard,
                  ...(hoveredCard === learning.id ? styles.courseCardHover : {}),
                }}
                onMouseEnter={() => setHoveredCard(learning.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handleCourseClick(learning)}
              >
                <div style={styles.courseCategory}>
                  <div style={styles.courseCategoryIcon}>{learning.icon}</div>
                  <span style={styles.courseCategoryText}>{learning.category}</span>
                  <span style={styles.courseRating}>⭐ {learning.rating}</span>
                </div>
                <h3 style={styles.courseTitle}>{learning.topic}</h3>
                <div style={styles.courseMeta}>
                  <span style={styles.courseSteps}>
                    {learning.completedSteps}/{learning.totalSteps} steps
                  </span>
                  <div style={styles.courseProgress}>
                    <div style={styles.progressBar}>
                      <div 
                        style={{
                          ...styles.progressFill,
                          width: `${(learning.completedSteps / learning.totalSteps) * 100}%`
                        }}
                      />
                    </div>
                    <span style={styles.progressText}>
                      {Math.round((learning.completedSteps / learning.totalSteps) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📚</div>
            <p style={styles.emptyText}>No learnings found</p>
            <p style={styles.emptySubtext}>Start your first learning journey above!</p>
          </div>
        )}
      </main>

      {/* Right Sidebar */}
      <aside style={styles.rightSidebar}>
        <div style={styles.profileSection}>
          <div style={styles.avatar}>👤</div>
          <h3 style={styles.profileName}>Learner</h3>
          <p style={styles.profileLabel}>Knowledge Seeker</p>
        </div>

        <div style={styles.statsCard}>
          <h4 style={styles.statsTitle}>Your Progress</h4>
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{totalHours.toFixed(1)}h</div>
              <div style={styles.statLabel}>Learning Time</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{mockLearnings.length}</div>
              <div style={styles.statLabel}>Courses</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{totalCompleted}</div>
              <div style={styles.statLabel}>Completed</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statValue}>🔥 7</div>
              <div style={styles.statLabel}>Day Streak</div>
            </div>
          </div>
        </div>

        <div style={styles.statsCard}>
          <h4 style={styles.statsTitle}>Weekly Activity</h4>
          <div style={styles.activityChart}>
            {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
              <div
                key={i}
                style={{
                  ...styles.activityBar,
                  height: `${height}%`,
                }}
              />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
