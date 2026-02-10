import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { OpikToastContainer } from '../components/OpikMetricsToast';
import api from '../api';  // default-exported axios instance

/* ════════════════════════════════════════════
   OpikToastContext
   Global provider that:
   1. Exposes showOpikToast() so any component can trigger one.
   2. Installs an axios response interceptor that auto-fires
      a toast whenever the backend returns X-Opik-* headers.
   ════════════════════════════════════════════ */
const OpikToastContext = createContext(null);

// Custom hook for convenience
export const useOpikToast = () => useContext(OpikToastContext);

let nextId = 1;

export function OpikToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const maxToasts = 4; // keep at most 4 stacked
  const interceptorAttached = useRef(false);

  const showOpikToast = useCallback((metrics) => {
    const id = nextId++;
    setToasts((prev) => {
      const next = [...prev, { id, ...metrics }];
      // If we exceed max, drop oldest
      return next.length > maxToasts ? next.slice(-maxToasts) : next;
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Auto-attach axios interceptor on mount
  useEffect(() => {
    if (interceptorAttached.current) return;
    interceptorAttached.current = true;
    setupOpikInterceptor(api, showOpikToast);
  }, [showOpikToast]);

  return (
    <OpikToastContext.Provider value={{ showOpikToast }}>
      {children}
      <OpikToastContainer toasts={toasts} removeToast={removeToast} />
    </OpikToastContext.Provider>
  );
}

/* ════════════════════════════════════════════
   setupOpikInterceptor
   Call this ONCE with the axios instance to
   auto-detect X-Opik-Agent header and fire
   a toast.
   ════════════════════════════════════════════ */
export function setupOpikInterceptor(axiosInstance, showOpikToast) {
  axiosInstance.interceptors.response.use(
    (response) => {
      const agent = response.headers['x-opik-agent'];
      if (agent) {
        showOpikToast({
          agent,
          latency:          parseFloat(response.headers['x-opik-latency'] || '0'),
          model:            response.headers['x-opik-model'] || '',
          status:           response.headers['x-opik-status'] || 'unknown',
          promptTokens:     parseInt(response.headers['x-opik-prompt-tokens'] || '0', 10),
          completionTokens: parseInt(response.headers['x-opik-completion-tokens'] || '0', 10),
          totalTokens:      parseInt(response.headers['x-opik-total-tokens'] || '0', 10),
          traceId:          response.headers['x-opik-trace-id'] || '',
        });
      }
      return response;
    },
    (error) => {
      // Even on error responses the headers might have Opik data
      const agent = error?.response?.headers?.['x-opik-agent'];
      if (agent) {
        showOpikToast({
          agent,
          latency:          parseFloat(error.response.headers['x-opik-latency'] || '0'),
          model:            error.response.headers['x-opik-model'] || '',
          status:           'error',
          promptTokens:     parseInt(error.response.headers['x-opik-prompt-tokens'] || '0', 10),
          completionTokens: parseInt(error.response.headers['x-opik-completion-tokens'] || '0', 10),
          totalTokens:      parseInt(error.response.headers['x-opik-total-tokens'] || '0', 10),
          traceId:          error.response.headers['x-opik-trace-id'] || '',
        });
      }
      return Promise.reject(error);
    },
  );
}

export default OpikToastProvider;
