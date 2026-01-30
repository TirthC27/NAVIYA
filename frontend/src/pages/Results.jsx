import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '15px 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  logoIcon: {
    width: '45px',
    height: '45px',
    background: 'linear-gradient(135deg, #ff6b6b, #feca57)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  logoText: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'white',
  },
  topicBadge: {
    background: 'rgba(255,255,255,0.2)',
    padding: '10px 25px',
    borderRadius: '25px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  main: {
    display: 'flex',
    padding: '20px',
    gap: '20px',
    maxWidth: '1800px',
    margin: '0 auto',
    minHeight: 'calc(100vh - 80px)',
  },
  sidebar: {
    width: '300px',
    flexShrink: 0,
  },
  sidebarCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
    position: 'sticky',
    top: '100px',
  },
  sidebarTitle: {
    color: 'white',
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  roadmapItem: {
    padding: '12px 16px',
    marginBottom: '8px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  roadmapItemActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  roadmapItemInactive: {
    background: 'rgba(255,255,255,0.05)',
  },
  roadmapNumber: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    color: 'white',
    flexShrink: 0,
  },
  roadmapText: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  playerSection: {
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  videoPlayer: {
    width: '100%',
    aspectRatio: '16/9',
    background: '#000',
    border: 'none',
  },
  playerInfo: {
    padding: '20px',
  },
  playerTitle: {
    color: 'white',
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '10px',
    lineHeight: '1.4',
  },
  playerMeta: {
    display: 'flex',
    gap: '20px',
    color: '#a0a0c0',
    fontSize: '14px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sectionTitle: {
    color: 'white',
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  videoList: {
    display: 'flex',
    gap: '15px',
    overflowX: 'auto',
    paddingBottom: '10px',
  },
  videoCard: {
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    border: '2px solid transparent',
    cursor: 'pointer',
    minWidth: '280px',
    maxWidth: '280px',
    flexShrink: 0,
  },
  videoCardActive: {
    border: '2px solid #667eea',
    background: 'rgba(102, 126, 234, 0.2)',
  },
  thumbnail: {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
    background: '#2a2a4a',
  },
  videoInfo: {
    padding: '15px',
  },
  videoTitle: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    lineHeight: '1.3',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  channelName: {
    color: '#a0a0c0',
    fontSize: '13px',
    marginBottom: '8px',
  },
  videoMeta: {
    display: 'flex',
    gap: '12px',
    color: '#808090',
    fontSize: '12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: 'white',
  },
  emptyIcon: {
    fontSize: '80px',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '10px',
  },
  emptyText: {
    color: '#a0a0c0',
    fontSize: '16px',
  },
  stat: {
    textAlign: 'center',
    padding: '15px',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#667eea',
  },
  statLabel: {
    fontSize: '12px',
    color: '#a0a0c0',
    marginTop: '5px',
  },
  navButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',
    gap: '15px',
  },
  selectPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '20px',
    border: '2px dashed rgba(255,255,255,0.2)',
  },
  selectIcon: {
    fontSize: '60px',
    marginBottom: '15px',
  },
  selectText: {
    color: '#a0a0c0',
    fontSize: '18px',
  },
};

function formatViews(views) {
  if (!views) return '0 views';
  const num = parseInt(views);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K views`;
  return `${num} views`;
}

function getVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? match[1] : null;
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data, topic } = location.state || {};
  const [activeSubtopic, setActiveSubtopic] = useState(0);
  const [activeVideo, setActiveVideo] = useState(null);

  if (!data) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo} onClick={() => navigate('/')}>
            <div style={styles.logoIcon}>🎓</div>
            <span style={styles.logoText}>LearnTube AI</span>
          </div>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔍</div>
          <div style={styles.emptyTitle}>No Results Found</div>
          <div style={styles.emptyText}>Please go back and search for a topic</div>
          <button
            onClick={() => navigate('/')}
            style={{ ...styles.backButton, marginTop: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            ← Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const learningPlan = data.learning_plan || [];
  const totalVideos = data.total_videos || 0;
  const totalSubtopics = data.roadmap_count || learningPlan.length;
  const displayTopic = data.topic || topic;

  const currentPlan = learningPlan[activeSubtopic] || {};
  const currentSubtopic = currentPlan.subtopic || '';
  const currentVideos = currentPlan.videos || [];

  const handleSubtopicChange = (index) => {
    setActiveSubtopic(index);
    const videos = learningPlan[index]?.videos || [];
    if (videos.length > 0) {
      setActiveVideo(videos[0]);
    } else {
      setActiveVideo(null);
    }
  };

  if (activeVideo === null && currentVideos.length > 0) {
    setActiveVideo(currentVideos[0]);
  }

  const activeVideoId = activeVideo ? getVideoId(activeVideo.url) : null;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo} onClick={() => navigate('/')}>
          <div style={styles.logoIcon}>🎓</div>
          <span style={styles.logoText}>LearnTube AI</span>
        </div>
        
        <div style={styles.topicBadge}>
          📖 Learning: {displayTopic}
        </div>

        <button style={styles.backButton} onClick={() => navigate('/')}>
          ← New Search
        </button>
      </header>

      <div style={styles.main}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarCard}>
            <h2 style={styles.sidebarTitle}>
              🗺️ Learning Roadmap
            </h2>
            
            {learningPlan.map((item, index) => (
              <div
                key={index}
                onClick={() => handleSubtopicChange(index)}
                style={{
                  ...styles.roadmapItem,
                  ...(index === activeSubtopic ? styles.roadmapItemActive : styles.roadmapItemInactive),
                }}
              >
                <div style={styles.roadmapNumber}>{item.order || index + 1}</div>
                <span style={styles.roadmapText}>{item.subtopic}</span>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
              <div style={styles.stat}>
                <div style={styles.statNumber}>{totalSubtopics}</div>
                <div style={styles.statLabel}>Topics</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statNumber}>{totalVideos}</div>
                <div style={styles.statLabel}>Videos</div>
              </div>
            </div>
          </div>
        </aside>

        <main style={styles.content}>
          {activeVideo && activeVideoId ? (
            <div style={styles.playerSection}>
              <iframe
                style={styles.videoPlayer}
                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=0&rel=0`}
                title={activeVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <div style={styles.playerInfo}>
                <h2 style={styles.playerTitle}>{activeVideo.title}</h2>
                <div style={styles.playerMeta}>
                  <span>📺 {activeVideo.channel}</span>
                  <span>👁️ {formatViews(activeVideo.views)}</span>
                  <span>⏱️ {activeVideo.duration}</span>
                  <span style={{ marginLeft: 'auto', color: '#feca57' }}>
                    ⭐ Score: {activeVideo.score?.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.selectPrompt}>
              <div style={styles.selectIcon}>🎬</div>
              <div style={styles.selectText}>Select a video to start learning</div>
            </div>
          )}

          <div>
            <h3 style={styles.sectionTitle}>
              🎬 {currentSubtopic}
            </h3>

            {currentVideos.length > 0 ? (
              <div style={styles.videoList}>
                {currentVideos.map((video, index) => {
                  const videoId = getVideoId(video.url);
                  const isActive = activeVideo?.url === video.url;
                  
                  return (
                    <div
                      key={videoId || index}
                      style={{
                        ...styles.videoCard,
                        ...(isActive ? styles.videoCardActive : {}),
                      }}
                      onClick={() => setActiveVideo(video)}
                    >
                      <div style={{ position: 'relative' }}>
                        <img
                          src={video.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                          alt={video.title}
                          style={styles.thumbnail}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.8)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          {video.duration}
                        </div>
                        {isActive && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: '#667eea',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '700',
                          }}>
                            ▶ NOW PLAYING
                          </div>
                        )}
                      </div>
                      <div style={styles.videoInfo}>
                        <h4 style={styles.videoTitle}>{video.title}</h4>
                        <p style={styles.channelName}>📺 {video.channel}</p>
                        <div style={styles.videoMeta}>
                          <span>👁️ {formatViews(video.views)}</span>
                          <span style={{ color: '#feca57' }}>⭐ {video.score?.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ ...styles.emptyState, padding: '40px' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                <div style={{ fontSize: '16px' }}>No videos for this topic</div>
              </div>
            )}
          </div>

          <div style={styles.navButtons}>
            <button
              onClick={() => handleSubtopicChange(Math.max(0, activeSubtopic - 1))}
              disabled={activeSubtopic === 0}
              style={{
                ...styles.backButton,
                flex: 1,
                justifyContent: 'center',
                background: activeSubtopic === 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                opacity: activeSubtopic === 0 ? 0.5 : 1,
              }}
            >
              ← Previous Topic
            </button>
            <button
              onClick={() => handleSubtopicChange(Math.min(learningPlan.length - 1, activeSubtopic + 1))}
              disabled={activeSubtopic === learningPlan.length - 1}
              style={{
                ...styles.backButton,
                flex: 1,
                justifyContent: 'center',
                background: activeSubtopic === learningPlan.length - 1 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                opacity: activeSubtopic === learningPlan.length - 1 ? 0.5 : 1,
              }}
            >
              Next Topic →
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
