import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/apiConfig';

/**
 * Core API Service with JWT Authentication
 * Handles token management, automatic refresh, and request/response interceptors
 */
class ApiService {
  constructor() {
    // Normalize base URL
    const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/';

    this.client = axios.create({
      baseURL: normalizedBase,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.isRefreshing = false;
    this.failedQueue = [];

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  setupInterceptors() {
    // Request interceptor - Add JWT token to all requests
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getAccessToken();

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Normalize the request URL to avoid double-slash when baseURL already ends with '/'
        if (config.url) {
          // remove any leading slashes so axios joins baseURL + url cleanly
          config.url = String(config.url).replace(/^\/+/, '');
        }

        // Log request
        const fullUrl = config.baseURL + (config.url || '');
        console.log('[ApiService] Request:', config.method?.toUpperCase(), fullUrl);

        return config;
      },
      (error) => {
        console.error('[ApiService] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle token refresh on 401
    this.client.interceptors.response.use(
      (response) => {
        console.log('[ApiService] Response:', response.status, response.config.url);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Auth endpoints that should not trigger token refresh
        const authEndpoints = [
          'users/login/',
          'users/token/refresh/',
          'users/security-question/',
          'users/reset-pin/',
          'users/random-security-questions/',
          'users/setup-security-answers/',
          'users/verify-answers-reset-pin/',
        ];

        // Check if this is an auth endpoint
        const isAuthEndpoint = authEndpoints.some(endpoint =>
          originalRequest.url?.includes(endpoint)
        );

        // If 401 and we haven't tried to refresh yet, and NOT an auth endpoint
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          if (this.isRefreshing) {
            // Queue the request while token is being refreshed
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(token => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              })
              .catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await this.getRefreshToken();

            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            // Attempt to refresh the access token
            const response = await axios.post(
              `${API_BASE_URL}/users/token/refresh/`,
              { refresh: refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );

            const { access } = response.data;

            // Store new access token
            await this.setAccessToken(access);

            // Retry all queued requests
            this.processQueue(null, access);
            this.failedQueue = [];

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${access}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Token refresh failed - clear tokens and redirect to login
            this.processQueue(refreshError, null);
            this.failedQueue = [];
            await this.clearTokens();

            console.error('[ApiService] Token refresh failed:', refreshError);
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Log error details
        if (error.isAxiosError) {
          console.error('[ApiService] Response error:', {
            message: error.message,
            status: error.response?.status,
            url: error.config?.url,
            data: error.response?.data,
          });
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Process queued requests after token refresh
   */
  processQueue(error, token = null) {
    this.failedQueue.forEach(promise => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(token);
      }
    });
  }

  /**
   * Token Management Methods
   */
  async getAccessToken() {
    try {
      return await AsyncStorage.getItem('access_token');
    } catch (error) {
      console.error('[ApiService] Error getting access token:', error);
      return null;
    }
  }

  async setAccessToken(token) {
    try {
      await AsyncStorage.setItem('access_token', token);
    } catch (error) {
      console.error('[ApiService] Error setting access token:', error);
    }
  }

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem('refresh_token');
    } catch (error) {
      console.error('[ApiService] Error getting refresh token:', error);
      return null;
    }
  }

  async setRefreshToken(token) {
    try {
      await AsyncStorage.setItem('refresh_token', token);
    } catch (error) {
      console.error('[ApiService] Error setting refresh token:', error);
    }
  }

  async setTokens(accessToken, refreshToken) {
    await this.setAccessToken(accessToken);
    await this.setRefreshToken(refreshToken);
  }

  async clearTokens() {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      console.log('[ApiService] Tokens cleared');
    } catch (error) {
      console.error('[ApiService] Error clearing tokens:', error);
    }
  }

  /**
   * User Management Methods
   */
  async setUser(user) {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('[ApiService] Error setting user:', error);
    }
  }

  async getUser() {
    try {
      const userData = await AsyncStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('[ApiService] Error getting user:', error);
      return null;
    }
  }

  /**
   * HTTP Methods
   */
  async get(url, config = {}) {
    return this.client.get(url, config);
  }

  async post(url, data = {}, config = {}) {
    return this.client.post(url, data, config);
  }

  async put(url, data = {}, config = {}) {
    return this.client.put(url, data, config);
  }

  async patch(url, data = {}, config = {}) {
    return this.client.patch(url, data, config);
  }

  async delete(url, config = {}) {
    return this.client.delete(url, config);
  }

  /**
   * Health check
   */
  async ping() {
    try {
      const response = await this.client.get('/');
      return response.data;
    } catch (error) {
      console.error('[ApiService] Ping failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new ApiService();
