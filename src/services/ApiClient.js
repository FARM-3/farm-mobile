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
/**
 * src/services/ApiClient.js
 * * Centralized API client placeholder. This is needed to resolve the import
 * in LoginScreen.js. It simulates a network call for the login flow.
 */

const MOCK_SUCCESS_PIN = '1234';
const MOCK_RESPONSE_DELAY = 500; // ms

const ApiClient = {
    /**
     * Simulates a POST request to an API endpoint.
     * @param {string} endpoint - The API endpoint (e.g., "login/").
     * @param {object} data - The data payload (e.g., { pin: "1234" }).
     * @returns {Promise<object>} A promise resolving to a mock response object.
     */
    post: async (endpoint, data) => {
        return new Promise((resolve, reject) => {
            // Simulate network delay
            setTimeout(() => {
                if (endpoint === "login/") {
                    const pin = data.pin;
                    if (pin === MOCK_SUCCESS_PIN) {
                        // Successful login simulation
                        resolve({
                            status: 200,
                            data: {
                                success: true,
                                message: "Authentication successful.",
                                token: "mock_jwt_token_123"
                            }
                        });
                    } else {
                        // Failed login simulation
                        reject({
                            response: {
                                status: 401,
                                data: {
                                    detail: "Invalid PIN provided."
                                }
                            }
                        });
                    }
                } else {
                    // Default for other endpoints
                    resolve({ status: 200, data: { message: "Mock response for " + endpoint } });
                }
            }, MOCK_RESPONSE_DELAY);
        });
    },
};

export default ApiClient;
