import { useEffect, useRef } from 'react';
import { API_BASE_URL as API_BASE } from '../api/config';

/**
 * useActivityTracker
 * ------------------
 * Drop this hook into any page component to automatically
 * track how long the user stays on that feature.
 *
 * It sends a heartbeat every INTERVAL seconds while the tab
 * is visible and the user isn't idle (mouse/keyboard activity
 * within the last IDLE_TIMEOUT ms).
 *
 * @param {string} feature - one of: 'resume','roadmap','skills','interview','alumni','dashboard'
 */

const HEARTBEAT_INTERVAL = 30_000;  // 30 seconds
const IDLE_TIMEOUT = 120_000;       // 2 minutes of no input = idle

const getUserId = () => {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user?.id || user?.user_id || null;
    }
  } catch { /* ignore */ }
  return null;
};

export default function useActivityTracker(feature) {
  const lastActivity = useRef(Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    const userId = getUserId();
    if (!userId || !feature) return;

    // Track last user interaction
    const onActivity = () => { lastActivity.current = Date.now(); };
    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });
    window.addEventListener('scroll', onActivity, { passive: true });
    window.addEventListener('click', onActivity, { passive: true });

    // Heartbeat sender
    const sendHeartbeat = async () => {
      // Skip if tab hidden or user idle
      if (document.hidden) return;
      if (Date.now() - lastActivity.current > IDLE_TIMEOUT) return;

      try {
        await fetch(`${API_BASE}/api/activity/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            feature,
            seconds: 30,
          }),
        });
      } catch {
        // fire-and-forget; swallow errors silently
      }
    };

    // Send one heartbeat immediately on mount (counts as arrival)
    sendHeartbeat();

    // Then every HEARTBEAT_INTERVAL
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener('click', onActivity);
    };
  }, [feature]);
}
