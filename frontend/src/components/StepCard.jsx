import { useState } from 'react';

const styles = {
  card: {
    background: '#111111',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '1px solid #1a1a1a',
    transition: 'all 0.3s ease',
  },
  cardCompleted: {
    border: '1px solid rgba(0, 255, 136, 0.3)',
    background: 'rgba(0, 255, 136, 0.05)',
  },
  stepHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #1a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  stepNumber: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    color: '#000',
    boxShadow: '0 0 15px rgba(0, 255, 136, 0.3)',
  },
  stepNumberCompleted: {
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
  },
  stepTitle: {
    color: 'white',
    fontSize: '18px',
    fontWeight: '700',
  },
  statusBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statusPending: {
    background: '#1a1a1a',
    color: '#666',
  },
  statusCompleted: {
    background: 'rgba(0, 255, 136, 0.1)',
    color: '#00ff88',
  },
  videoSection: {
    padding: '24px',
  },
  videoCard: {
    display: 'flex',
    gap: '20px',
    background: '#0a0a0a',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #1a1a1a',
  },
  thumbnail: {
    width: '320px',
    height: '180px',
    flexShrink: 0,
    background: '#000',
    position: 'relative',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  playButton: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#000',
    boxShadow: '0 0 30px rgba(0, 255, 136, 0.5)',
  },
  duration: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    background: 'rgba(0,0,0,0.8)',
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
  },
  videoInfo: {
    flex: 1,
    padding: '16px 16px 16px 0',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  videoTitle: {
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '1.4',
    marginBottom: '8px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  videoMeta: {
    color: '#666',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  channelName: {
    color: '#888',
    fontWeight: '500',
  },
  videoStats: {
    display: 'flex',
    gap: '16px',
    color: '#555',
    fontSize: '13px',
  },
  actionArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: 'auto',
  },
  watchButton: {
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    color: '#000',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    boxShadow: '0 0 15px rgba(0, 255, 136, 0.3)',
  },
  completeButton: {
    background: '#1a1a1a',
    border: '1px solid #333',
    padding: '10px 20px',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  completeButtonDisabled: {
    background: '#111',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  completedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#00ff88',
    fontSize: '14px',
    fontWeight: '600',
  },
  noVideo: {
    padding: '40px',
    textAlign: 'center',
    color: '#555',
  },
};

function StepCard({ step, isCompleted, isLoading, onComplete, stepIndex }) {
  const [isHovering, setIsHovering] = useState(false);
  const video = step.video;

  const formatViews = (views) => {
    if (!views) return '0 views';
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  const openVideo = () => {
    const videoId = video?.id || video?.video_id;
    if (videoId) {
      window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    }
  };

  return (
    <div 
      style={{ 
        ...styles.card, 
        ...(isCompleted ? styles.cardCompleted : {}),
        animationDelay: `${stepIndex * 0.1}s`,
      }}
    >
      {/* Step Header */}
      <div style={styles.stepHeader}>
        <div style={styles.stepInfo}>
          <div style={{ 
            ...styles.stepNumber, 
            ...(isCompleted ? styles.stepNumberCompleted : {}) 
          }}>
            {isCompleted ? '✓' : step.step_number}
          </div>
          <h3 style={styles.stepTitle}>{step.title}</h3>
        </div>
        <div style={{ 
          ...styles.statusBadge, 
          ...(isCompleted ? styles.statusCompleted : styles.statusPending) 
        }}>
          {isCompleted ? '✓ Completed' : 'Pending'}
        </div>
      </div>

      {/* Video Section */}
      <div style={styles.videoSection}>
        {video ? (
          <div style={styles.videoCard}>
            {/* Thumbnail */}
            <div 
              style={styles.thumbnail}
              onClick={openVideo}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <img 
                src={video.thumbnail || `https://img.youtube.com/vi/${video.id || video.video_id}/mqdefault.jpg`}
                alt={video.title}
                style={{ 
                  ...styles.thumbnailImg,
                  transform: isHovering ? 'scale(1.05)' : 'scale(1)'
                }}
              />
              <div style={{ 
                ...styles.playOverlay,
                opacity: isHovering ? 1 : 0
              }}>
                <div style={styles.playButton}>▶</div>
              </div>
              {video.duration && (
                <div style={styles.duration}>{video.duration}</div>
              )}
            </div>

            {/* Video Info */}
            <div style={styles.videoInfo}>
              <div>
                <h4 style={styles.videoTitle}>{video.title}</h4>
                <div style={styles.videoMeta}>
                  <span style={styles.channelName}>{video.channel || 'Unknown Channel'}</span>
                </div>
                <div style={styles.videoStats}>
                  {video.views && <span>{formatViews(video.views)}</span>}
                  {video.published_at && <span>{video.published_at}</span>}
                  {video.has_captions && <span>🔤 Captions</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={styles.actionArea}>
                <button 
                  style={styles.watchButton}
                  onClick={openVideo}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  ▶ Watch Video
                </button>
                
                {isCompleted ? (
                  <div style={styles.completedBadge}>
                    ✓ Done
                  </div>
                ) : (
                  <button 
                    style={{ 
                      ...styles.completeButton,
                      ...(isLoading ? styles.completeButtonDisabled : {})
                    }}
                    onClick={onComplete}
                    disabled={isLoading}
                    onMouseOver={(e) => !isLoading && (e.target.style.transform = 'scale(1.05)')}
                    onMouseOut={(e) => !isLoading && (e.target.style.transform = 'scale(1)')}
                  >
                    {isLoading ? (
                      <>⏳ Saving...</>
                    ) : (
                      <>✓ Mark Complete</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.noVideo}>
            <p>🔍 Finding the best video for this step...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StepCard;
