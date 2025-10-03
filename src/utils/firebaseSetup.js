import axios from 'axios';

// --- Configuration ---
// !!! CRITICAL: REPLACE THIS WITH YOUR ACTUAL DJANGO SERVER ADDRESS !!!
// On mobile simulators/devices, 'localhost' will not work. Use your machine's local IP (e.g., 'http://192.168.1.100:8000/api')
const API_BASE_URL = 'https://api-3181.onrender.com/api'; 

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


// --- API Functions (Assume standard REST endpoints) ---

/**
 * Initializes the app. Simulates successful auth for now, providing a unique user ID.
 * @returns {Promise<string>} Placeholder User ID.
 */
export const initializeAuth = async () => {
    console.log("Authentication simulation complete. Using Django backend.");
    return 'django-user-' + Math.random().toString(36).substring(2, 8); 
};


/**
 * Fetches all registered farmers from the Django API.
 */
export const fetchFarmers = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/aggregation/Farmer/`);
        return response.data;
    } catch (error) {
        console.error("Error fetching farmers:", error);
        return [];
    }
};

/**
 * Submits new farmer details to the Django API.
 */
export const submitFarmer = async (data) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/aggregation/Farmer/`, data);
        return response.data;
    } catch (error) {
        // Detailed logging to help diagnose server 500s
        console.error("Error submitting farmer:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Response data:", error.response.data);
            console.error("Response headers:", error.response.headers);
            // Log request config (headers, url, method) for debugging
            try {
                console.error("Request config:", {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers,
                    data: error.config?.data,
                });
            } catch (e) {
                console.error('Failed to log request config', e);
            }
        } else if (error.request) {
            console.error("No response received. Request:", error.request);
        } else {
            console.error("Error message:", error.message);
        }
        console.error("Request payload:", JSON.stringify(data, null, 2));
        throw new Error("Failed to submit farmer data to Django.");
    }
};

/**
 * Fetches all recorded harvests from the Django API.
 */
export const fetchHarvests = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/aggregation/FarmerHarvest/`);
        return response.data;
    } catch (error) {
        console.error("Error fetching harvests:", error);
        return [];
    }
};

/**
 * Submits new harvest details to the Django API.
 */
export const submitHarvest = async (data) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/aggregation/FarmerHarvest/`, data);
        return response.data;
    } catch (error) {
        console.error("Error submitting harvest:", error.response?.data || error.message);
        throw new Error("Failed to submit harvest data to Django.");
    }
};
