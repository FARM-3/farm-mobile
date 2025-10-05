import axios from 'axios';
import { API_BASE_URL as BASE } from '../utils/apiConfig';

// Simple ApiClient wrapper using axios with baseURL
const normalizedBase = BASE.endsWith('/') ? BASE : BASE + '/';
const client = axios.create({
  baseURL: normalizedBase,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
client.interceptors.request.use(
  (config) => {
    const base = config.baseURL || normalizedBase;
    const fullUrl = base.endsWith('/') && config.url && config.url.startsWith('/')
      ? base + config.url.slice(1)
      : base + (config.url || '');
    console.log('[ApiClient] Request:', config.method?.toUpperCase(), fullUrl, config.data || '');
    return config;
  },
  (error) => {
    console.error('[ApiClient] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging
client.interceptors.response.use(
  (response) => {
    console.log('[ApiClient] Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    // Normalize network errors and log useful bits
    if (error.isAxiosError) {
      console.error('[ApiClient] Axios error:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        method: error.config?.method,
        request: !!error.request,
        responseStatus: error.response?.status,
      });
    } else {
      console.error('[ApiClient] Unknown error:', error);
    }
    return Promise.reject(error);
  }
);

// Helper to quickly check API reachability from the app
export const ping = async () => {
  const url = `${BASE}/`;
  try {
    // First try with native fetch (helps diagnose axios vs network issues)
    console.log('[ApiClient] ping using fetch to', url);
    const resp = await fetch(url, { method: 'GET' });
    if (!resp.ok) throw new Error(`Fetch failed status ${resp.status}`);
    const data = await resp.json();
    return data;
  } catch (fetchErr) {
    console.warn('[ApiClient] fetch ping failed, falling back to axios ping', fetchErr.message);
    // Fallback to axios
    try {
      const res = await client.get('/');
      return res.data;
    } catch (e) {
      throw e;
    }
  }
};

export default client;
