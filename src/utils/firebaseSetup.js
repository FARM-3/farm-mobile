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
    const response = await ApiService.get('aggregation/farmer/');
        console.log('[firebaseSetup] Farmers fetched successfully');

        // Handle both paginated and non-paginated responses (same as fetchHarvests)
        let payload = response.data;
        // If paginated, use results array
        if (payload && Array.isArray(payload.results)) {
            console.log('[firebaseSetup] Using paginated results, count:', payload.results.length);
            payload = payload.results;
        }

        // Ensure we always return an array
        const farmers = Array.isArray(payload) ? payload : [];
        console.log('[firebaseSetup] Returning', farmers.length, 'farmers');

        return farmers;
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

        // Transform data to match Django backend API format
        const apiPayload = {
            farmer_id: data.uid || data.farmer_id,
            first_name: data.first_name,
            last_name: data.last_name,
            gender: data.gender,
            nin: data.nin,
            date_of_birth: data.date_of_birth,
            contact: data.contact,
            email: data.email,
            farmer_type: data.farmer_type || 'individual', // Default if not provided
            started_coffee_farming_year: data.started_farming ? new Date(data.started_farming).getFullYear() : null,
            district: data.district,
            other_district: data.other_district || '',
            sub_county: data.sub_county,
            other_sub_county: data.other_sub_county || '',
            parish: data.parish,
            village: data.village,
            gps_coordinates: data.gps,
            nearest_landmark: data.nearest_landmark,
            coffee_variety: data.coffee_variety,
            number_of_trees: parseInt(data.no_of_trees) || 0,
            ownership_of_trees: data.all_your_trees !== false, // Convert to boolean
            planted_date: data.planted_date,
            land_ownership: data.land_ownership,
            spacing_between_trees: data.spacing,
            defforestation_status: data.deforested !== false, // Convert to boolean
            source_of_seedlings: data.seedling_source,
            type_of_seedlings: data.seedling_type,
            age_of_seedlings: data.age_of_seedlings || '',
            standard_practices: Array.isArray(data.practices) && data.practices.length > 0, // Convert array to boolean
            irrigation_source: data.irrigation,
            fertilizers: Array.isArray(data.fertilizers) ? data.fertilizers.join(', ') : data.fertilizers || '',
            pesticide: Array.isArray(data.pesticides) ? data.pesticides.join(', ') : data.pesticides || '',
        };

        console.log('[firebaseSetup] API payload:', JSON.stringify(apiPayload, null, 2));

        const response = await ApiService.post('aggregation/farmer/', apiPayload);
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
    const response = await ApiService.get('aggregation/farmer-harvest/');
        console.log('[firebaseSetup] Harvests fetched successfully');
        let payload = response.data;
        // If paginated, use results
        if (payload && Array.isArray(payload.results)) payload = payload.results;

        // Normalize records to client-side shape expected by AggregationScreen
        const normalized = (Array.isArray(payload) ? payload : []).map(item => {
            // attempt to extract farmer display name if backend returned nested object
            const farmerName = item.farmer_name || (item.farmer && typeof item.farmer === 'object' && (item.farmer.name || item.farmer.full_name)) || (item.farmer ? String(item.farmer) : '');
            return {
                // id: prefer numeric id, fallback to harvest id string
                id: item.id ?? item.harvest ?? null,
                farmer_name: farmerName,
                weight_on_delivery: (item.weight_on_delivery != null) ? parseFloat(item.weight_on_delivery) : (item.quantity != null ? parseFloat(item.quantity) : 0),
                weight_after_floating: item.weight_after_floating != null ? parseFloat(item.weight_after_floating) : (item.weight_after_floating || 0),
                date_of_delivery: item.date_of_delivery || item.date_harvested || item.date || '',
                grade: item.grade || item.grade || '',
                cherry_colour: item.cherry_colour || item.cherryColor || '',
                stage: item.stage || '',
                amount_paid: (item.amount_paid != null) ? parseFloat(item.amount_paid) : (item.amount_paid || 0),
                who_paid: item.who_paid || item.payer || '',
                recorder_id: item.recorder_id || item.recorder || '',
                timestamp: item.timestamp || null,
                // preserve original payload for debugging
                __raw: item,
            };
        });

        console.log('[firebaseSetup] Normalized harvest count:', normalized.length);
        return normalized;
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
 * Transforms React Native form data to match Django API schema
 */
export const submitHarvest = async (data) => {
    try {
        console.log('[firebaseSetup] Submitting harvest...');
        console.log('[firebaseSetup] Raw harvest data received:', data);

        // Transform React Native form data to Django API format
        const apiPayload = {
            // REQUIRED: name field (Django expects farmer identifier here, not farmer_name)
            name: data.farmer_uid || data.farmer_name || '',

            // Weight fields (required by Django)
            weight_on_delivery: Number(data.weight_on_delivery) || 0,
            weight_after_floating: Number(data.weight_after_floating) || 0,

            // Date field (required)
            date_of_delivery: data.date_of_delivery || new Date().toISOString().split('T')[0],

            // Grade field (map from coffee_type)
            grade: data.coffee_type || data.grade || '',

            // Cherry color field (optional, map from form if available)
            cherry_color: data.cherry_colour || data.cherry_color || '',

            // Stage field (optional)
            stage: data.stage || '',

            // Payment fields
            amount_paid: String(data.amount_paid || '0'), // Django expects string
            paid_by: data.paid_by || data.who_paid || '',
        };

        console.log('[firebaseSetup] Transformed API payload:', JSON.stringify(apiPayload, null, 2));

        const response = await ApiService.post('aggregation/farmer-harvest/', apiPayload);
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
        console.error('Original data:', JSON.stringify(data, null, 2));

        throw error;
    }
};
