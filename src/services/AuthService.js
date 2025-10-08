import ApiService from './ApiService';

/**
 * Authentication Service
 * Handles user authentication, PIN management, and session handling
 */
class AuthService {
  /**
   * Login with phone number and PIN
   * @param {string} phone - 10-digit phone number
   * @param {string} pin - 4-digit PIN
   * @returns {Promise<Object>} - User data and tokens
   */
  async login(phone, pin) {
    try {
      console.log('[AuthService] Attempting login for phone:', phone);

      const response = await ApiService.post('/users/login/', {
        phone: phone,
        pin: pin,
      });

      const { user, access, refresh, message } = response.data;

      if (!access || !refresh) {
        throw new Error('Invalid response from server - missing tokens');
      }

      // Store tokens
      await ApiService.setTokens(access, refresh);

      // Store user data
      await ApiService.setUser(user);

      console.log('[AuthService] Login successful for user:', user.phone);

      return {
        success: true,
        user,
        message: message || 'Login successful',
      };
    } catch (error) {
      console.error('[AuthService] Login error:', error.response?.data || error.message);

      // Handle specific error responses
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }

      throw new Error(error.message || 'Login failed. Please try again.');
    }
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
      console.error('[AuthService] Get current user error:', error.response?.data || error.message);

      if (error.response?.status === 401) {
        // Token is invalid, clear and require re-login
        await ApiService.clearTokens();
        throw new Error('Session expired. Please login again.');
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
}

// Export singleton instance
export default new AuthService();
