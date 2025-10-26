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
            // Django returns farmer UID in 'name' field, preserve it for lookup
            // Also try to extract farmer_name if backend provided it
            const farmerName = item.farmer_name || (item.farmer && typeof item.farmer === 'object' && (item.farmer.name || item.farmer.full_name)) || (item.farmer ? String(item.farmer) : '');

            return {
                // id: prefer numeric id, fallback to harvest id string
                id: item.id ?? item.harvest ?? null,

                // IMPORTANT: 'name' field contains farmer UID from Django
                name: item.name || '',
                farmer_name: farmerName,
                farmer_uid: item.name || '', // Also map to farmer_uid for convenience

                weight_on_delivery: (item.weight_on_delivery != null) ? parseFloat(item.weight_on_delivery) : (item.quantity != null ? parseFloat(item.quantity) : 0),
                weight_after_floating: item.weight_after_floating != null ? parseFloat(item.weight_after_floating) : (item.weight_after_floating || 0),
                date_of_delivery: item.date_of_delivery || item.date_harvested || item.date || '',

                // Map grade and coffee_type
                grade: item.grade || '',
                coffee_type: item.grade || '', // Also expose as coffee_type

                cherry_color: item.cherry_color || item.cherry_colour || item.cherryColor || '',
                cherry_colour: item.cherry_color || item.cherry_colour || item.cherryColor || '',
                stage: item.stage || '',

                // Keep amount_paid as both number and string
                amount_paid: item.amount_paid || '0',
                paid_by: item.paid_by || item.who_paid || item.payer || '',
                who_paid: item.paid_by || item.who_paid || item.payer || '',

                recorder_id: item.recorder_id || item.recorder || '',
                timestamp: item.timestamp || null,

                // preserve original payload for debugging
                __raw: item,
            };
        });

        console.log('[firebaseSetup] Normalized harvest count:', normalized.length);
        if (normalized.length > 0) {
            console.log('[firebaseSetup] First harvest sample:', normalized[0]);
        }
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

        // Transform React Native form data to Django API format (/api/aggregation/farmer-harvest/)
        const apiPayload = {
            // REQUIRED: harvest_id field (unique identifier for this harvest)
            harvest_id: data.id || data.harvest_id || '',

            // REQUIRED: name field (farmer identifier - farmer UID or name)
            name: data.farmer_uid || data.farmer_name || '',

            // OPTIONAL: coffee_type field (maps from form's coffee_type)
            coffee_type: data.coffee_type || null,

            // OPTIONAL: weight_on_delivery (farmer's harvest weight in kg)
            weight_on_delivery: data.weight_on_delivery ? Number(data.weight_on_delivery) : null,

            // OPTIONAL: date_of_delivery (when harvest was delivered)
            date_of_delivery: data.date_of_delivery || null,

            // OPTIONAL: moisture_content (percentage, collected from form)
            moisture_content: data.moisture_content ? Number(data.moisture_content) : null,

            // OPTIONAL: amount_paid (payment to farmer, expected as string by API)
            amount_paid: data.amount_paid ? String(data.amount_paid) : null,

            // OPTIONAL: paid_by (staff member who processed payment)
            paid_by: data.paid_by || null,

            // OPTIONAL: no_of_bags (number of bags delivered, collected as number_of_bags in form)
            no_of_bags: data.number_of_bags ? Number(data.number_of_bags) : null,
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

/**
 * Deletes a farmer record from the Django API.
 * Uses JWT authentication automatically via ApiService
 * @param {string} farmerId - The farmer's ID (farmer_id or uid)
 */
export const deleteFarmer = async (farmerId) => {
    try {
        console.log('[firebaseSetup] Deleting farmer:', farmerId);
        const response = await ApiService.delete(`aggregation/farmer/${farmerId}/`);
        console.log('[firebaseSetup] Farmer deleted successfully');
        return response.data;
    } catch (error) {
        console.error('[firebaseSetup] Error deleting farmer:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};

/**
 * Deletes a harvest record from the Django API.
 * Uses JWT authentication automatically via ApiService
 * @param {string} harvestId - The harvest's ID
 */
export const deleteHarvest = async (harvestId) => {
    try {
        console.log('[firebaseSetup] Deleting harvest:', harvestId);
        const response = await ApiService.delete(`aggregation/farmer-harvest/${harvestId}/`);
        console.log('[firebaseSetup] Harvest deleted successfully');
        return response.data;
    } catch (error) {
        console.error('[firebaseSetup] Error deleting harvest:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};

/**
 * Updates a farmer record in the Django API.
 * Uses JWT authentication automatically via ApiService
 * @param {string} farmerId - The farmer's ID
 * @param {Object} data - Updated farmer data
 */
export const updateFarmer = async (farmerId, data) => {
    try {
        console.log('[firebaseSetup] Updating farmer:', farmerId);

        // Transform data to match Django backend API format (same as submitFarmer)
        const apiPayload = {
            farmer_id: data.uid || data.farmer_id,
            first_name: data.first_name,
            last_name: data.last_name,
            gender: data.gender,
            nin: data.nin,
            date_of_birth: data.date_of_birth,
            contact: data.contact,
            email: data.email,
            farmer_type: data.farmer_type || 'individual',
            started_coffee_farming_year: data.started_farming ? new Date(data.started_farming).getFullYear() : null,
            district: data.district,
            other_district: data.other_district || '',
            sub_county: data.sub_county,
            other_sub_county: data.other_sub_county || '',
            parish: data.parish,
            village: data.village,
            gps_coordinates: data.gps || data.gps_coordinates,
            nearest_landmark: data.nearest_landmark,
            coffee_variety: data.coffee_variety,
            number_of_trees: parseInt(data.no_of_trees || data.number_of_trees) || 0,
            ownership_of_trees: data.all_your_trees !== false,
            planted_date: data.planted_date,
            land_ownership: data.land_ownership,
            spacing_between_trees: data.spacing || data.spacing_between_trees,
            defforestation_status: data.deforested !== false,
            source_of_seedlings: data.seedling_source || data.source_of_seedlings,
            type_of_seedlings: data.seedling_type || data.type_of_seedlings,
            age_of_seedlings: data.age_of_seedlings || '',
            standard_practices: Array.isArray(data.practices) && data.practices.length > 0,
            irrigation_source: data.irrigation || data.irrigation_source,
            fertilizers: Array.isArray(data.fertilizers) ? data.fertilizers.join(', ') : data.fertilizers || '',
            pesticide: Array.isArray(data.pesticides) ? data.pesticides.join(', ') : data.pesticides || data.pesticide || '',
        };

        console.log('[firebaseSetup] Update API payload:', JSON.stringify(apiPayload, null, 2));

        const response = await ApiService.put(`aggregation/farmer/${farmerId}/`, apiPayload);
        console.log('[firebaseSetup] Farmer updated successfully');
        return response.data;
    } catch (error) {
        console.error('[firebaseSetup] Error updating farmer:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};

/**
 * Updates a harvest record in the Django API.
 * Uses JWT authentication automatically via ApiService
 * @param {string} harvestId - The harvest's ID
 * @param {Object} data - Updated harvest data
 */
export const updateHarvest = async (harvestId, data) => {
    try {
        console.log('[firebaseSetup] Updating harvest:', harvestId);

        // Transform data to match Django API format (same as submitHarvest)
        const apiPayload = {
            id: data.id || data.harvest_id || harvestId,
            name: data.farmer_uid || data.name || '',
            weight_on_delivery: Number(data.weight_on_delivery) || 0,
            weight_after_floating: Number(data.weight_after_floating) || 0,
            date_of_delivery: data.date_of_delivery || new Date().toISOString().split('T')[0],
            grade: data.coffee_type || data.grade || '',
            cherry_color: data.cherry_colour || data.cherry_color || 'Not specified',
            stage: data.stage || 'Not specified',
            amount_paid: String(data.amount_paid || '0'),
            paid_by: data.paid_by || data.who_paid || '',
        };

        console.log('[firebaseSetup] Update API payload:', JSON.stringify(apiPayload, null, 2));

        const response = await ApiService.put(`aggregation/farmer-harvest/${harvestId}/`, apiPayload);
        console.log('[firebaseSetup] Harvest updated successfully');
        return response.data;
    } catch (error) {
        console.error('[firebaseSetup] Error updating harvest:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};
