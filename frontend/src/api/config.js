/**
 * Centralized API configuration
 *
 * Uses VITE_API_BASE_URL from environment variables.
 * - Local dev:  set in .env            → http://localhost:8000
 * - Production: set in Vercel env vars → https://<your-render-service>.onrender.com
 *
 * IMPORTANT: Never hardcode production URLs here.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://naviya-backend.onrender.com';

/**
 * Lightweight fetch wrapper that prepends the API base URL.
 *
 * Usage:
 *   const res = await apiFetch('/api/auth/login', {
 *     method: 'POST',
 *     body: JSON.stringify(payload),
 *   });
 *
 * For requests that do NOT send JSON (e.g. FormData uploads),
 * pass `headers` explicitly to override the default Content-Type.
 */
export const apiFetch = (path, options = {}) => {
  const { headers, ...rest } = options;
  return fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...rest,
  });
};

/**
 * Fetch wrapper for multipart/form-data (file uploads).
 * Does NOT set Content-Type so the browser can set the boundary automatically.
 */
export const apiFetchMultipart = (path, options = {}) => {
  const { headers, ...rest } = options;
  return fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...headers,
    },
    ...rest,
  });
};
