import { useNavigate } from 'react-router-dom';

const styles = {
  nav: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '15px 30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #ff6b6b, #feca57)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'white',
  },
};

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav style={styles.nav}>
      <div style={styles.logo} onClick={() => navigate('/')}>
        <div style={styles.logoIcon}>🎓</div>
        <span style={styles.logoText}>LearnTube AI</span>
      </div>
    </nav>
  );
}
