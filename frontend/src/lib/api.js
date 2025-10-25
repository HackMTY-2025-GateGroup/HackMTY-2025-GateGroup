import config from '@/config/api';

// Base URL (frontend .env: VITE_API_URL)
const API_BASE = import.meta.env.VITE_API_URL || '';

function resolvePath(keyOrPath) {
  if (!keyOrPath) throw new Error('Missing API path');
  // Absolute path given
  if (keyOrPath.startsWith('/')) return `${API_BASE}${keyOrPath}`;
  // Known endpoint key in config
  if (config.endpoints && config.endpoints[keyOrPath]) return `${API_BASE}${config.endpoints[keyOrPath]}`;
  // Route-like short path -> prefix with /api/
  if (keyOrPath.includes('/')) return `${API_BASE}/api/${keyOrPath}`;
  throw new Error(`Cannot resolve API path for "${keyOrPath}"`);
}

async function parseResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

/**
 * Generic fetch wrapper that attaches token, parses JSON and throws on non-OK
 * Usage:
 *   fetchJson('users') -> resolves to parsed body
 *   fetchJson('/api/auth/login', { method:'POST', body: JSON.stringify(...) })
 */
export async function fetchJson(keyOrPath, options = {}) {
  const url = resolvePath(keyOrPath);
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const body = await parseResponse(res);

  if (!res.ok) {
    const err = new Error(body?.message || res.statusText || 'API error');
    err.status = res.status;
    err.response = body;
    throw err;
  }

  return body;
}

export const get = (path, opts) => fetchJson(path, { method: 'GET', ...opts });
export const post = (path, body, opts) =>
  fetchJson(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...opts });
export const put = (path, body, opts) =>
  fetchJson(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, ...opts });
export const del = (path, opts) => fetchJson(path, { method: 'DELETE', ...opts });

/* Convenience domain functions */
export const fetchUsers = async () => {
  // backend route: GET /api/users -> see [backend/controllers/userController.js](backend/controllers/userController.js)
  return get('users');
};

export default {
  fetchJson,
  get,
  post,
  put,
  del,
  fetchUsers,
};