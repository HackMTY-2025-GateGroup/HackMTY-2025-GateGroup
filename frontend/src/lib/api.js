import config from '@/config/api';

// Base URL (frontend .env: VITE_API_URL)
const API_BASE = import.meta.env.VITE_API_URL || '';

function resolvePath(keyOrPath) {
  if (!keyOrPath) throw new Error('Missing API path');

  // Absolute path given
  if (keyOrPath.startsWith('/')) return `${API_BASE}${keyOrPath}`;

  // If user passed a full URL, return as-is
  if (/^https?:\/\//i.test(keyOrPath)) return keyOrPath;

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

export async function uploadMultipart(keyOrPath, formData, options = {}) {
  const url = resolvePath(keyOrPath);
  const token = localStorage.getItem('token');

  // Do NOT set Content-Type for multipart; the browser will set the boundary
  const headers = {
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method: options.method || 'POST', body: formData, headers, ...options });
  const body = await parseResponse(res);

  if (!res.ok) {
    const err = new Error(body?.message || res.statusText || 'Upload error');
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

export const fetchAlerts = async (query = {}) => {
  // allow optional query params, e.g. { level: 'critical' }
  const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
  return get(`alerts${qs}`);
};

export const fetchInventoryMovements = async (query = {}) => {
  const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
  // resolvePath will turn 'inventories/movements' into `${API_BASE}/api/inventories/movements`
  return get(`inventories/movements${qs}`);
};

export const fetchKPIs = async () => {
  return get('kpis');
};

export const fetchAnalytics = async (query = {}) => {
  const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
  return get(`analytics${qs}`);
};

export const fetchPhotoList = async (query = {}) => {
  const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
  return get(`photoList${qs}`);
};

/**
 * Upload a front+back tray bundle and optionally request immediate analysis.
 * Usage: uploadTrayBundle({ frontFile, backFile, trolleyCode, specName })
 */
export const uploadTrayBundle = async ({ frontFile, backFile, trolleyCode, specName = 'doubleside.mx', meta = {} } = {}) => {
  if (!frontFile || !backFile) {
    throw new Error('Both frontFile and backFile are required');
  }
  const fd = new FormData();
  fd.append('front', frontFile);
  fd.append('back', backFile);
  if (trolleyCode) fd.append('trolleyCode', trolleyCode);
  if (specName) fd.append('specName', specName);

  // include arbitrary metadata fields
  Object.entries(meta).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  });

  // Upload to analyze-tray (config.endpoints.analyzeTray)
  return uploadMultipart('analyzeTray', fd);
};

// Convenience trolleys helper
export const fetchTrolleys = async (query = {}) => {
  const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
  return get(`trolleys${qs}`);
};


export default {
  fetchJson,
  get,
  post,
  put,
  del,
  fetchUsers,
  fetchAlerts,
  fetchInventoryMovements,
  uploadMultipart,
  fetchKPIs,
  fetchAnalytics,
  fetchPhotoList,
  uploadTrayBundle,
  fetchTrolleys
};