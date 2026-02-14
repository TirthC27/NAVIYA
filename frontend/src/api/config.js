/**
 * Centralized API configuration
 *
 * Production  – Uses Vercel rewrites (/api/* → Cloud Run) so requests
 *               stay same-origin and CORS is never an issue.
 * Local dev   – Set VITE_API_BASE_URL in .env (e.g. http://localhost:8080).
 */

const rawUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

// In production, always use relative paths so the Vercel rewrite proxy
// handles routing to the backend (avoids cross-origin / CORS issues).
// In development, fall back to the env var or empty string.
const baseUrl = import.meta.env.PROD ? '' : rawUrl;

if (!import.meta.env.PROD && !rawUrl) {
  console.warn(
    '⚠️  VITE_API_BASE_URL is not set – API requests will use relative paths.\n' +
    'Set it in .env for local development (e.g. http://localhost:8080).'
  );
}

if (!import.meta.env.PROD && rawUrl.includes('localhost') === false && rawUrl !== '') {
  // Not a warning – just informational for dev builds pointing at remote backends
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
