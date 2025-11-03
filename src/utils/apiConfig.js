/**
 * Central API Configuration
 *
 * API URL is loaded from environment variables (.env file)
 * This allows easy switching between development, staging, and production environments
 *
 * To change API URL:
 * 1. Edit .env file in project root
 * 2. Update EXPO_PUBLIC_API_BASE_URL value
 * 3. Restart Expo dev server (npm start)
 *
 * Example .env file:
 * EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api
 */

// Get API URL from environment variable
// Fallback to production URL if not set
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://142.93.94.236:8000/api';

// Log current API URL on app start (helpful for debugging)
console.log('[API Config] Using API URL:', API_BASE_URL);

// Export additional config if needed
export const API_TIMEOUT = 15000; // 15 seconds
export const MAX_RETRY_ATTEMPTS = 3;
