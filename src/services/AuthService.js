import ApiService from './ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for offline storage
const OFFLINE_USER_KEY = 'offline_user_cache';
const OFFLINE_TOKENS_KEY = 'offline_tokens_cache';
const OFFLINE_LOGIN_KEY = 'offline_login_allowed';

/**
 * Authentication Service
 * Handles user authentication, PIN management, and session handling
 * With offline fallback capability
 */
class AuthService {
  /**
   * Login with phone number and PIN
   * Supports offline mode if backend is unavailable
   * @param {string} phone - 10-digit phone number
   * @param {string} pin - 4-digit PIN
   * @returns {Promise<Object>} - User data and tokens
   */
  async login(phone, pin) {
    console.log('[AuthService] ========== LOGIN ATTEMPT START ==========');
    console.log('[AuthService] Phone:', phone);

    try {
      // Try online login first
      console.log('[AuthService] Attempting online login...');
      const response = await ApiService.post('/users/login/', {
        phone: phone,
        pin: pin,
      });

      console.log('[AuthService] Response received:', {
        status: response.status,
        hasUser: !!response.data?.user,
        hasTokens: !!(response.data?.access && response.data?.refresh),
      });

      const { user, access, refresh, message } = response.data;

      if (!access || !refresh || !user) {
        console.error('[AuthService] ❌ Invalid response - missing required fields:', {
          hasUser: !!user,
          hasAccess: !!access,
          hasRefresh: !!refresh,
        });
        throw new Error('Invalid response from server - missing user or tokens');
      }

      // Store tokens
      await ApiService.setTokens(access, refresh);

      // Store user data
      await ApiService.setUser(user);

      // Cache for offline use
      await this.cacheUserOffline(user, { access, refresh });

      console.log('[AuthService] ✅ Online login successful for user:', user.phone);
      console.log('[AuthService] ========== LOGIN ATTEMPT END ==========\n');

      return {
        success: true,
        user,
        message: message || 'Login successful',
        mode: 'online',
      };
    } catch (error) {
      console.error('[AuthService] ❌ Online login failed');
      console.error('[AuthService] Error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      });

      // Try offline login as fallback
      console.log('[AuthService] Attempting offline login fallback...');
      const offlineResult = await this.tryOfflineLogin(phone, pin);

      if (offlineResult) {
        console.log('[AuthService] ✅ Offline login successful (using cached credentials)');
        console.log('[AuthService] ========== LOGIN ATTEMPT END ==========\n');
        return offlineResult;
      }

      // No offline cache available - throw error
      const errorMessage = this.getHumanReadableError(error);
      console.error('[AuthService] ❌ Login failed - no offline cache available');
      console.error('[AuthService] ========== LOGIN ATTEMPT END ==========\n');
      throw new Error(errorMessage);
    }
  }

  /**
   * Try to login using cached offline credentials
   * @private
   */
  async tryOfflineLogin(phone, pin) {
    try {
      const cachedUserJson = await AsyncStorage.getItem(OFFLINE_USER_KEY);
      const cachedTokensJson = await AsyncStorage.getItem(OFFLINE_TOKENS_KEY);

      if (!cachedUserJson || !cachedTokensJson) {
        console.log('[AuthService] No offline cache available');
        return null;
      }

      const cachedUser = JSON.parse(cachedUserJson);
      const cachedTokens = JSON.parse(cachedTokensJson);

      // Verify phone number matches (security check)
      if (cachedUser.phone !== phone) {
        console.warn('[AuthService] Phone number mismatch with cached user');
        return null;
      }

      console.log('[AuthService] Using offline cached user:', cachedUser.phone);
      console.log('[AuthService] ⚠️  WARNING: Using cached credentials - you are OFFLINE');

      // Restore tokens from cache
      await ApiService.setTokens(cachedTokens.access, cachedTokens.refresh);
      await ApiService.setUser(cachedUser);

      return {
        success: true,
        user: cachedUser,
        message: 'Logged in offline using cached credentials. Some features may be limited.',
        mode: 'offline',
        isOffline: true,
      };
    } catch (err) {
      console.error('[AuthService] Error during offline login:', err);
      return null;
    }
  }

  /**
   * Cache user data for offline access
   * @private
   */
  async cacheUserOffline(user, tokens) {
    try {
      await AsyncStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(OFFLINE_TOKENS_KEY, JSON.stringify(tokens));
      console.log('[AuthService] Cached user for offline use:', user.phone);
    } catch (err) {
      console.error('[AuthService] Error caching user offline:', err);
      // Non-fatal - continue anyway
    }
  }

  /**
   * Convert technical errors to human-readable messages
   * @private
   */
  getHumanReadableError(error) {
    console.log('[AuthService] Converting error to user message:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
    });

    // Network errors
    if (error.code === 'ECONNREFUSED') {
      return 'Cannot connect to server. Please check your internet connection.';
    }
    if (error.code === 'ENOTFOUND') {
      return 'Cannot reach the server. Please check your network connection.';
    }
    if (error.code === 'ETIMEDOUT') {
      return 'Server request timed out. Please check your internet and try again.';
    }
    if (error.message === 'Failed to fetch' || error.message?.includes('network')) {
      return 'Network error. Please check your internet connection.';
    }

    // HTTP errors
    if (error.response?.status === 404) {
      return 'User not found. Please check your phone number.';
    }
    if (error.response?.status === 401) {
      return 'Invalid phone number or PIN. Please try again.';
    }
    if (error.response?.status === 400) {
      const detail = error.response.data?.detail || error.response.data?.error;
      if (detail) return detail;
      return 'Invalid input. Please check your phone and PIN.';
    }
    if (error.response?.status >= 500) {
      return 'Server error. Please try again later.';
    }

    // API response errors
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }

    // Default
    return error.message || 'Login failed. Please try again.';
  }

  /**
   * Logout - Clear tokens and user data
   */
  async logout() {
    try {
      console.log('[AuthService] Logging out...');
      await ApiService.clearTokens();
      console.log('[AuthService] Logout successful');
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Logout error:', error);
      throw error;
    }
  }

  /**
   * Get security question for a phone number (needed for PIN reset)
   * @param {string} phone - 10-digit phone number
   * @returns {Promise<Object>} - Security question
   */
  async getSecurityQuestion(phone) {
    try {
      console.log('[AuthService] Getting security question for phone:', phone);

      const response = await ApiService.post('/users/security-question/', {
        phone: phone,
      });

      const { security_question } = response.data;

      if (!security_question) {
        throw new Error('No security question found');
      }

      console.log('[AuthService] Security question retrieved');

      return {
        success: true,
        phone,
        securityQuestion: security_question,
      };
    } catch (error) {
      console.error('[AuthService] Get security question error:', error.response?.data || error.message);

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }

      throw new Error(error.message || 'Failed to retrieve security question');
    }
  }

  /**
   * Reset PIN using security question answer
   * @param {string} phone - 10-digit phone number
   * @param {string} securityAnswer - Answer to security question
   * @param {string} newPin - New 4-digit PIN
   * @returns {Promise<Object>} - Success message
   */
  async resetPin(phone, securityAnswer, newPin) {
    try {
      console.log('[AuthService] Resetting PIN for phone:', phone);

      const response = await ApiService.post('/users/reset-pin/', {
        phone: phone,
        security_answer: securityAnswer,
        new_pin: newPin,
      });

      const { message } = response.data;

      console.log('[AuthService] PIN reset successful');

      return {
        success: true,
        message: message || 'PIN reset successful. You can now login with your new PIN.',
      };
    } catch (error) {
      console.error('[AuthService] Reset PIN error:', error.response?.data || error.message);

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }

      throw new Error(error.message || 'Failed to reset PIN');
    }
  }

  /**
   * Get current logged-in user information
   * @returns {Promise<Object>} - User data
   */
  async getCurrentUser() {
    try {
      console.log('[AuthService] Getting current user...');

      const response = await ApiService.get('/users/me/');

      const user = response.data;

      // Update stored user data
      await ApiService.setUser(user);

      console.log('[AuthService] Current user retrieved:', user.phone);

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('[AuthService] Get current user error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        responseData: error.response?.data,
        endpoint: '/users/me/'
      });

      if (error.response?.status === 401) {
        // Token is invalid, clear and require re-login
        await ApiService.clearTokens();
        throw new Error('Session expired. Please login again.');
      }

      if (error.response?.status === 500) {
        console.error('[AuthService] ⚠️  Backend server error (500) - the /users/me/ endpoint may have an issue');
        throw new Error('Server error while fetching user info. Please try again later.');
      }

      throw new Error(error.message || 'Failed to get user information');
    }
  }

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    try {
      const accessToken = await ApiService.getAccessToken();
      return !!accessToken;
    } catch (error) {
      console.error('[AuthService] isAuthenticated error:', error);
      return false;
    }
  }

  /**
   * Get stored user from local storage
   * @returns {Promise<Object|null>}
   */
  async getStoredUser() {
    try {
      return await ApiService.getUser();
    } catch (error) {
      console.error('[AuthService] getStoredUser error:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns {Promise<Object>} - New access token
   */
  async refreshToken() {
    try {
      console.log('[AuthService] Manually refreshing token...');

      const refreshToken = await ApiService.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await ApiService.post('/users/token/refresh/', {
        refresh: refreshToken,
      });

      const { access } = response.data;

      if (!access) {
        throw new Error('Invalid response - missing access token');
      }

      await ApiService.setAccessToken(access);

      console.log('[AuthService] Token refreshed successfully');

      return {
        success: true,
        accessToken: access,
      };
    } catch (error) {
      console.error('[AuthService] Token refresh error:', error.response?.data || error.message);

      // If refresh fails, clear tokens
      await ApiService.clearTokens();

      throw new Error('Session expired. Please login again.');
    }
  }

  /**
   * Get 3 random security questions for first-time user setup
   * @param {string} phone - 10-digit phone number
   * @returns {Promise<Object>} - Array of 3 random security questions
   */
  async getRandomSecurityQuestions(phone) {
    try {
      console.log('[AuthService] Getting random security questions for phone:', phone);

      const response = await ApiService.post('/users/random-security-questions/', {
        phone: phone,
      });

      console.log('[AuthService] Full response:', response.data);

      const { questions } = response.data;

      if (!questions) {
        console.error('[AuthService] No questions in response:', response.data);
        throw new Error('Invalid response - no questions found');
      }

      if (questions.length === 0) {
        throw new Error('No security questions available');
      }

      console.log('[AuthService] Retrieved', questions.length, 'security questions');

      return {
        success: true,
        questions: questions, // Array of {id, text}
      };
    } catch (error) {
      console.error('[AuthService] Get random questions error:', error);
      console.error('[AuthService] Error response:', error.response?.data);
      console.error('[AuthService] Error message:', error.message);

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }

      throw new Error(error.message || 'Failed to retrieve security questions');
    }
  }

  /**
   * Setup security answers on first login
   * @param {string} phone - 10-digit phone number
   * @param {Array} answers - Array of {question_id, answer} objects
   * @returns {Promise<Object>} - Success message
   */
  async setupSecurityAnswers(phone, answers) {
    try {
      console.log('[AuthService] Setting up security answers for phone:', phone);

      if (!answers || answers.length !== 3) {
        throw new Error('Must provide exactly 3 answers');
      }

      const response = await ApiService.post('/users/setup-security-answers/', {
        phone: phone,
        answers: answers, // Array of {question_id, answer}
      });

      const { message, security_answers_set } = response.data;

      console.log('[AuthService] Security answers set successfully');

      return {
        success: true,
        message: message || 'Security answers set successfully',
        security_answers_set: security_answers_set,
      };
    } catch (error) {
      console.error('[AuthService] Setup answers error:', error.response?.data || error.message);

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }

      throw new Error(error.message || 'Failed to set security answers');
    }
  }

  /**
   * Verify security answers and reset PIN
   * Used when user forgets PIN and needs to reset it
   * @param {string} phone - 10-digit phone number
   * @param {Array} answers - Array of {question_id, answer} objects
   * @param {string} newPin - New 4-digit PIN
   * @returns {Promise<Object>} - Success message
   */
  async verifyAnswersAndResetPin(phone, answers, newPin) {
    try {
      console.log('[AuthService] Verifying answers and resetting PIN for phone:', phone);

      if (!answers || answers.length !== 3) {
        throw new Error('Must provide exactly 3 answers');
      }

      const response = await ApiService.post('/users/verify-answers-reset-pin/', {
        phone: phone,
        answers: answers,
        new_pin: newPin,
      });

      const { message } = response.data;

      console.log('[AuthService] PIN reset via security answers successful');

      return {
        success: true,
        message: message || 'PIN reset successful. You can now login with your new PIN.',
      };
    } catch (error) {
      console.error('[AuthService] Verify answers and reset PIN error:', error.response?.data || error.message);

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }

      throw new Error(error.message || 'Failed to verify answers and reset PIN');
    }
  }
}

// Export singleton instance
export default new AuthService();
