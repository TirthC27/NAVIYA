import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api/config';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Github,
  Linkedin,
  Chrome,
} from 'lucide-react';

/* ─── Carousel config ─── */
const slides = [
  { src: '/Vector_images/img1.png', alt: 'AI-powered career guidance' },
  { src: '/Vector_images/img2.png', alt: 'Personalized learning paths' },
  { src: '/Vector_images/img3.png', alt: 'Skill assessment & growth' },
];
const INTERVAL = 4500;
const imgVariants = {
  enter: (d) => ({ x: d > 0 ? 80 : -80, opacity: 0, scale: 0.96 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (d) => ({ x: d > 0 ? -80 : 80, opacity: 0, scale: 0.96 }),
};

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  /* ─── carousel state ─── */
  const [[page, direction], setPage] = useState([0, 1]);
  const idx = ((page % slides.length) + slides.length) % slides.length;
  const paginate = useCallback((dir) => setPage(([p]) => [p + dir, dir]), []);
  useEffect(() => {
    const id = setInterval(() => paginate(1), INTERVAL);
    return () => clearInterval(id);
  }, [paginate]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email, password: formData.password };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Authentication failed');

      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        localStorage.setItem('refresh_token', data.session.refresh_token);
      }
      window.dispatchEvent(new Event('auth-changed'));
      navigate(isLogin ? '/career/dashboard' : '/onboarding');
    } catch (error) {
      alert(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="min-h-screen flex bg-white" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* ════════════ LEFT — Form ════════════ */}
      <div className="flex-1 flex flex-col justify-between px-8 md:px-16 lg:px-24 py-10 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/Vector_images/logo.png" alt="Logo" className="w-8 h-8" />
      
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm"
          >
            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic' }}>
                {isLogin ? 'Sign in to Account' : 'Create Account'}
              </h1>
              <div className="w-10 h-1 bg-amber-400 rounded-full mx-auto mt-3" />
            </div>

            {/* Social row */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {[
                { Icon: Chrome, label: 'Google' },
                { Icon: Linkedin, label: 'LinkedIn' },
                { Icon: Github, label: 'GitHub' },
              ].map(({ Icon, label }) => (
                <button
                  key={label}
                  className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-500 hover:border-amber-400 hover:text-amber-500 transition-colors"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <p className="text-center text-xs text-slate-400 mb-6">
              or use your email account
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Full Name"
                        className="w-full pl-11 pr-4 py-3 bg-slate-100 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                        required={!isLogin}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full pl-11 pr-4 py-3 bg-slate-100 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className="w-full pl-11 pr-11 py-3 bg-slate-100 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="confirm-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm Password"
                        className="w-full pl-11 pr-4 py-3 bg-slate-100 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                        required={!isLogin}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isLogin && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 accent-amber-500"
                    />
                    <span className="text-slate-500">Remember me</span>
                  </label>
                  <button type="button" className="text-amber-500 hover:text-amber-600 font-medium">
                    Forgot Password?
                  </button>
                </div>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 bg-amber-400 text-slate-900 font-bold rounded-full hover:bg-amber-500 transition-all shadow-lg shadow-amber-200/50 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Sign Up'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Mobile-only toggle link */}
            <p className="text-center mt-6 text-slate-500 text-xs lg:hidden">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button onClick={toggleMode} className="ml-1 text-amber-500 font-semibold">
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
          <span>Privacy Policy</span>
          <span>•</span>
          <span>Terms & Conditions</span>
        </div>
      </div>

      {/* ════════════ RIGHT — Amber panel ════════════ */}
      <div className="hidden lg:flex w-[42%] relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600" />

        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-300/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-amber-600/30 rounded-full blur-3xl" />
        <div className="absolute top-16 left-12 text-amber-300/40 text-3xl select-none">+</div>
        <div className="absolute bottom-20 right-10 text-amber-300/40 text-2xl select-none">+</div>
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-amber-300/40 rounded-full" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-12 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login-panel' : 'signup-panel'}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
              className="flex flex-col items-center"
            >
              {/* Carousel image */}
              <div className="relative w-[340px] h-[320px] mb-10">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                  <motion.img
                    key={page}
                    custom={direction}
                    variants={imgVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    src={slides[idx].src}
                    alt={slides[idx].alt}
                    className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl rounded-2xl"
                    draggable={false}
                  />
                </AnimatePresence>
                {/* Dots */}
                <div className="absolute -bottom-6 inset-x-0 flex items-center justify-center gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage([i, i > idx ? 1 : -1])}
                      className={`rounded-full transition-all duration-300 ${
                        i === idx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <h2 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {isLogin ? 'Hello, Friend!' : 'Welcome Back!'}
              </h2>
              <p className="text-amber-100 text-sm leading-relaxed max-w-xs mb-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {isLogin
                  ? 'Fill up personal information and start your career journey with AI-powered guidance.'
                  : 'Already have an account? Sign in to continue your personalized career path.'}
              </p>

              <button
                onClick={toggleMode}
                className="px-10 py-2.5 border-2 border-white rounded-full text-white text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-amber-500 transition-all duration-300"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Auth;
