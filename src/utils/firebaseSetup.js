import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';

// --- Helper for ID Generation ---

/**
 * Utility to generate a unique ID based on logic requested by user.
 * Format: [Entity Prefix][Date (YYMMDD)][Random A/B/C letter][Last 3 digits of timestamp]
 * @param {string} type 'PA' for Farmer's Harvest (Production Aggregation) or 'FD' for Farmer's Details.
 * @returns {string} The unique ID.
 */
export const generateRecordId = (type) => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prefix = type === 'PA' ? 'PA' : 'FD'; // Production Aggregation or Farmer Details
    const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 3)); // A, B, or C
    const timeSuffix = String(now.getTime()).slice(-3);
    return `${prefix}${yy}${mm}${dd}${randomChar}${timeSuffix}`;
};


// --- API Functions (Using AuthService with JWT tokens) ---

/**
 * Initializes the app and gets the current user
 * @returns {Promise<string|null>} User ID or null
 */
export const initializeAuth = async () => {
    try {
        console.log('[firebaseSetup] Checking authentication...');
        const user = await AuthService.getStoredUser();

        if (user && user.id) {
            console.log('[firebaseSetup] User authenticated:', user.id);
            return String(user.id);
        }

        console.warn('[firebaseSetup] No authenticated user found');
        return null;
    } catch (error) {
        console.error('[firebaseSetup] Auth initialization error:', error);
        return null;
    }
};


/**
 * Fetches all registered farmers from the Django API.
 * Uses JWT authentication automatically via ApiService
 */
export const fetchFarmers = async () => {
    try {
        console.log('[firebaseSetup] Fetching farmers...');
        const response = await ApiService.get('/aggregation/Farmer/');
        console.log('[firebaseSetup] Farmers fetched successfully');
        return response.data;
    } catch (error) {
        console.error('[firebaseSetup] Error fetching farmers:', error.response?.data || error.message);

        // If unauthorized, might need to re-login
        if (error.response?.status === 401) {
            console.warn('[firebaseSetup] Unauthorized - user may need to login again');
        }

        return [];
    }
};

/**
 * Submits new farmer details to the Django API.
 * Uses JWT authentication automatically via ApiService
 */
export const submitFarmer = async (data) => {
    try {
        console.log('[firebaseSetup] Submitting farmer...');
        const response = await ApiService.post('/aggregation/Farmer/', data);
        console.log('[firebaseSetup] Farmer submitted successfully');
        return response.data;
    } catch (error) {
        // Detailed logging to help diagnose server 500s
        console.error('[firebaseSetup] Error submitting farmer:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', error.response.data);
            console.error('Response headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received');
        } else {
            console.error('Error message:', error.message);
        }
        console.error('Request payload:', JSON.stringify(data, null, 2));

        // Rethrow original error so callers can inspect response
        throw error;
    }
};

/**
 * Fetches all harvest records from the Django API.
 * Uses JWT authentication automatically via ApiService
 */
export const fetchHarvests = async () => {
    try {
        console.log('[firebaseSetup] Fetching harvests...');
        const response = await ApiService.get('aggregation/FarmerHarvest');
        console.log('[firebaseSetup] Harvests fetched successfully');
        return response.data;
    } catch (error) {
        console.error('[firebaseSetup] Error fetching harvests:', error.response?.data || error.message);

        if (error.response?.status === 401) {
            console.warn('[firebaseSetup] Unauthorized - user may need to login again');
        }

        return [];
    }
};

/**
 * Submits new harvest/aggregation record to the Django API.
 * Uses JWT authentication automatically via ApiService
 */
export const submitHarvest = async (data) => {
    try {
        console.log('[firebaseSetup] Submitting harvest...');
        const response = await ApiService.post('aggregation/FarmerHarvest/', data);
        console.log('[firebaseSetup] Harvest submitted successfully');
        return response.data;
    } catch (error) {
        console.error('[firebaseSetup] Error submitting harvest:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', error.response.data);
        } else if (error.request) {
            console.error('No response received');
        } else {
            console.error('Error message:', error.message);
        }
        console.error('Request payload:', JSON.stringify(data, null, 2));

        throw error;
    }
};
