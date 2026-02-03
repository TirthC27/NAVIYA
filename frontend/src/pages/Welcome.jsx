import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Welcome = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/auth');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleClick = () => {
    navigate('/auth');
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 flex items-center justify-center cursor-pointer relative overflow-hidden"
      onClick={handleClick}
    >
      {/* Decorative Elements */}
      <div className="absolute top-20 left-20 text-amber-300 text-2xl">+</div>
      <div className="absolute top-40 right-32 text-amber-300 text-2xl">+</div>
      <div className="absolute bottom-32 left-16 text-amber-300 text-2xl">+</div>
      
      {/* Blob shapes */}
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-100/50 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

      <div className="container mx-auto px-8 flex items-center justify-between max-w-7xl">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 z-10"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 5L35 35H5L20 5Z" fill="#F59E0B" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-slate-800">NAVIYA</span>
          </div>

          {/* Welcome Text */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold text-amber-500 mb-6"
          >
            Welcome Back!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-xl text-slate-500 mb-8"
          >
            Please sign in to your account
          </motion.p>

          {/* Click hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="flex items-center gap-2 text-slate-400"
          >
            <span className="text-sm">Click anywhere to continue</span>
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              →
            </motion.span>
          </motion.div>
        </motion.div>

        {/* Right Content - Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 flex justify-center items-center z-10"
        >
          <img 
            src="/Vector_images/Welcome Image.png" 
            alt="Welcome Illustration"
            className="max-w-lg w-full h-auto object-contain"
          />
        </motion.div>
      </div>

      {/* Loading bar at bottom */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-amber-400"
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 3, ease: 'linear' }}
      />
    </div>
  );
};

export default Welcome;
