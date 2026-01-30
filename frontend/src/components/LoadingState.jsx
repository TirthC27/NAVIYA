const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 100px)',
    padding: '40px 20px',
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: '4px solid #1a1a1a',
    borderTopColor: '#00ff88',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '24px',
    boxShadow: '0 0 20px rgba(0, 255, 136, 0.2)',
  },
  message: {
    color: 'white',
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '8px',
    textAlign: 'center',
  },
  subMessage: {
    color: '#666',
    fontSize: '14px',
    textAlign: 'center',
    maxWidth: '400px',
  },
  dots: {
    display: 'flex',
    gap: '8px',
    marginTop: '32px',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
    animation: 'bounce 1.4s ease-in-out infinite both',
    boxShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
  },
  stepLoadingContainer: {
    background: '#111111',
    borderRadius: '20px',
    padding: '40px',
    textAlign: 'center',
    border: '1px solid #1a1a1a',
    margin: '20px auto',
    maxWidth: '500px',
  },
  stepLoadingEmoji: {
    fontSize: '48px',
    marginBottom: '16px',
    animation: 'pulse 2s ease-in-out infinite',
  },
  stepLoadingText: {
    color: 'white',
    fontSize: '16px',
    fontWeight: '500',
  },
  skeleton: {
    background: 'linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '8px',
  },
  skeletonTitle: {
    height: '24px',
    width: '60%',
    marginBottom: '12px',
  },
  skeletonText: {
    height: '16px',
    width: '80%',
    marginBottom: '8px',
  },
  skeletonVideo: {
    height: '180px',
    width: '100%',
    borderRadius: '12px',
    marginTop: '16px',
  },
};

// Add keyframes to document
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('[data-loading-styles]')) {
  styleSheet.setAttribute('data-loading-styles', 'true');
  document.head.appendChild(styleSheet);
}

function LoadingState({ message = "Loading...", subMessage = "", variant = "default" }) {
  if (variant === "step") {
    return (
      <div style={styles.stepLoadingContainer}>
        <div style={styles.stepLoadingEmoji}>🔍</div>
        <div style={styles.stepLoadingText}>{message}</div>
        <div style={styles.subMessage}>{subMessage}</div>
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ ...styles.skeleton, ...styles.skeletonTitle }} />
        <div style={{ ...styles.skeleton, ...styles.skeletonText }} />
        <div style={{ ...styles.skeleton, ...styles.skeletonText, width: '40%' }} />
        <div style={{ ...styles.skeleton, ...styles.skeletonVideo }} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.spinner} />
      <div style={styles.message}>{message}</div>
      {subMessage && <div style={styles.subMessage}>{subMessage}</div>}
      <div style={styles.dots}>
        <div style={{ ...styles.dot, animationDelay: '-0.32s' }} />
        <div style={{ ...styles.dot, animationDelay: '-0.16s' }} />
        <div style={{ ...styles.dot }} />
      </div>
    </div>
  );
}

export default LoadingState;
