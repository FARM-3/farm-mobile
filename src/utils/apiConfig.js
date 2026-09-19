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
 * Environment variables supported:
 * - EXPO_PUBLIC_API_BASE_URL: Main API endpoint URL
 * - EXPO_PUBLIC_ENABLE_DEBUG_LOGS: Set to "true" to enable verbose logging
 *
 * Example .env file:
 * EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api
 * EXPO_PUBLIC_ENABLE_DEBUG_LOGS=true
 */

// Get API URL from environment variable
// Fallback to production URL if not set
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// Enable/disable debug logging
export const DEBUG_MODE = process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGS === 'true';

// Determine environment
const determineEnvironment = () => {
  if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
    return 'LOCAL';
  } else if (API_BASE_URL.includes('192.168')) {
    return 'LOCAL_NETWORK';
  } else if (API_BASE_URL.includes('staging')) {
    return 'STAGING';
  } else {
    return 'PRODUCTION';
  }
};

const ENVIRONMENT = determineEnvironment();

// Log current API configuration on app start (helpful for debugging)
console.log('\n========== API CONFIG ==========');
console.log('[API Config] Environment:', ENVIRONMENT);
console.log('[API Config] Using API URL:', API_BASE_URL);
console.log('[API Config] Debug mode:', DEBUG_MODE ? 'ENABLED' : 'DISABLED');
console.log('[API Config] Timeout:', '15000ms (15 seconds)');
console.log('================================\n');

// If in APK (production build) and using external IP, log warning
if (ENVIRONMENT === 'PRODUCTION') {
  console.warn('[API Config] ⚠️  Running against production server');
  console.warn('[API Config] If you get network errors, check:');
  console.warn('[API Config]   1. Device has internet access');
  console.warn('[API Config]   2. Backend server is running and reachable');
  console.warn('[API Config]   3. Firewall is not blocking the connection');
  console.warn('[API Config] To debug: Enable EXPO_PUBLIC_ENABLE_DEBUG_LOGS=true in .env');
}

// Export additional config if needed
export const API_TIMEOUT = 15000; // 15 seconds
export const MAX_RETRY_ATTEMPTS = 3;
export const ENVIRONMENT_TYPE = ENVIRONMENT;
