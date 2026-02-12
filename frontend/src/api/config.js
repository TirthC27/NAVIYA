/**
 * Centralized API configuration
 *
 * VITE_API_BASE_URL MUST be set:
 * - Production: https://naviyabackend-je3hanh5.b4a.run (Back4App)
 * - Local dev:  Override in .env if testing locally
 */

const baseUrl = import.meta.env.VITE_API_BASE_URL;

if (!baseUrl || baseUrl.trim() === '') {
  throw new Error(
    '❌ VITE_API_BASE_URL is not set.\n' +
    'Set it in Vercel env vars (production) or .env (local dev).'
  );
}

if (import.meta.env.PROD && baseUrl.includes('localhost')) {
  throw new Error(
    `❌ Production build cannot use localhost: ${baseUrl}`
  );
}

export const API_BASE_URL = baseUrl;

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
