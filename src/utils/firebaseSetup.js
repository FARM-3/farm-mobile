import ApiService from '../services/ApiService';
import AuthService from '../services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Helper for ID Generation ---

/**
 * Get the next sequential ID suffix (A00, A01, ... A99, B00, ... Z99)
 * Stores counter in AsyncStorage to persist across sessions (offline-first)
 * Uses device-specific prefix to avoid conflicts in offline scenarios
 * @returns {Promise<string>} The suffix like "A00", "A01", "B00", etc.
 */
const getNextSequentialSuffix = async () => {
    try {
        let counter = 0;

        // Retrieve from AsyncStorage
        const stored = await AsyncStorage.getItem('farmerIdCounter');
        counter = stored ? parseInt(stored, 10) : 0;

        // Increment counter for next use
        const nextCounter = counter + 1;

        // Store for next time
        await AsyncStorage.setItem('farmerIdCounter', String(nextCounter));

        console.log('[firebaseSetup] Farmer ID counter incremented:', counter, '->', nextCounter);

        // Convert counter to Letter+Numbers format (A00 to Z99)
        // 0-99 = A00-A99
        // 100-199 = B00-B99
        // ... up to 2599 = Z99
        const letterIndex = Math.floor(counter / 100) % 26; // Which letter (0-25)
        const numberPart = counter % 100; // Which number (0-99)

        const letter = String.fromCharCode(65 + letterIndex); // A-Z
        const numbers = String(numberPart).padStart(2, '0'); // 00-99

        return `${letter}${numbers}`;
    } catch (error) {
        console.warn('[firebaseSetup] Error getting sequential suffix, using fallback:', error);
        // Fallback if AsyncStorage fails
        return 'A00';
    }
};

/**
 * Get the next sequential harvest ID suffix (A00, A01, ... Z99)
 * Stores counter in AsyncStorage to persist across sessions (offline-first)
 * @returns {Promise<string>} The suffix like "A00", "A01", "Z99", etc.
 */
const getNextHarvestSequentialSuffix = async () => {
    try {
        let counter = 0;

        // Retrieve from AsyncStorage
        const stored = await AsyncStorage.getItem('harvestIdCounter');
        console.log('[firebaseSetup] Retrieved harvestIdCounter from AsyncStorage:', stored);
        counter = stored ? parseInt(stored, 10) : 0;

        // Validate counter is a valid number
        if (isNaN(counter) || counter < 0) {
            console.warn('[firebaseSetup] Invalid counter value:', stored, 'resetting to 0');
            counter = 0;
        }

        // Convert counter to Letter+Numbers format (A00 to Z99)
        const letterIndex = Math.floor(counter / 100) % 26; // Which letter (0-25)
        const numberPart = counter % 100; // Which number (0-99)

        const letter = String.fromCharCode(65 + letterIndex); // A-Z
        const numbers = String(numberPart).padStart(2, '0'); // 00-99

        // Get the suffix BEFORE incrementing
        const currentSuffix = `${letter}${numbers}`;
        console.log('[firebaseSetup] Harvest ID counter - current:', counter, 'suffix:', currentSuffix);

        // Increment counter for next use
        const nextCounter = counter + 1;

        // Store for next time
        await AsyncStorage.setItem('harvestIdCounter', String(nextCounter));
        console.log('[firebaseSetup] Harvest ID counter incremented:', counter, '->', nextCounter, 'stored to AsyncStorage');

        return currentSuffix;
    } catch (error) {
        console.error('[firebaseSetup] Error getting harvest sequential suffix:', error);
        // Fallback if AsyncStorage fails
        console.warn('[firebaseSetup] Using fallback suffix: A00');
        return 'A00';
    }
};

/**
 * Synchronizes ID counter with backend to prevent conflicts
 * Gets the highest ID from the backend and sets counter accordingly
 * @param {string} idPrefix - Prefix to search for (e.g., 'JK' for farmer with initials JK)
 * @param {string} storageKey - Key to store counter (e.g., 'farmerIdCounter')
 * @returns {Promise<void>}
 */
export const syncIdCounterWithBackend = async (idPrefix, storageKey) => {
    try {
        console.log(`[firebaseSetup] Syncing ${storageKey} with backend for prefix ${idPrefix}...`);

        // Fetch all farmers/harvests to find the highest counter
        let allRecords = [];
        if (storageKey === 'farmerIdCounter') {
            const response = await ApiService.get('aggregation/farmer/?limit=1000');
            allRecords = Array.isArray(response.data) ? response.data : (response.data.results || []);
        } else if (storageKey === 'harvestIdCounter') {
            const response = await ApiService.get('aggregation/farmer-harvest/?limit=1000');
            allRecords = Array.isArray(response.data) ? response.data : (response.data.results || []);
        }

        // Filter records matching this prefix and extract the counter
        let highestCounter = 0;
        const idField = storageKey === 'farmerIdCounter' ? 'id' : 'harvest_id';

        for (const record of allRecords) {
            const recordId = record[idField] || record.name || '';
            if (recordId.startsWith(idPrefix)) {
                // Extract suffix (last 3 characters)
                const suffix = recordId.slice(-3);
                if (/^[A-Z]\d{2}$/.test(suffix)) {
                    const letter = suffix.charCodeAt(0) - 65; // A=0, B=1, ... Z=25
                    const numbers = parseInt(suffix.slice(1), 10);
                    const counter = letter * 100 + numbers;
                    highestCounter = Math.max(highestCounter, counter);
                }
            }
        }

        // Set counter to highest + 1
        const nextCounter = highestCounter + 1;
        await AsyncStorage.setItem(storageKey, String(nextCounter));
        console.log(`[firebaseSetup] Synced ${storageKey}: next counter will be ${nextCounter}`);
    } catch (error) {
        console.warn(`[firebaseSetup] Error syncing ${storageKey}:`, error);
        // Continue anyway - counter will auto-increment from local value
    }
};

/**
 * Utility to generate a unique Farmer ID based on farmer's name and date.
 * Format: [First Initial][Last Initial][DDMM][Letter][Number][Number]
 * Examples: JK0127A00, JK0127A01, JK0127A02
 * The last 3 characters increment sequentially: A00 -> A01 -> ... -> Z99
 * IMPORTANT: This is now async and must be awaited!
 * @param {string} firstName - First name of the farmer
 * @param {string} lastName - Last name of the farmer
 * @returns {Promise<string>} The unique Farmer ID.
 */
export const generateFarmerId = async (firstName, lastName) => {
    // Get initials
    const firstInitial = (firstName || '').charAt(0).toUpperCase();
    const lastInitial = (lastName || '').charAt(0).toUpperCase();

    // Get current date in DDMM format
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    // Get next sequential suffix (A00 -> A01 -> ... -> Z99)
    const suffix = await getNextSequentialSuffix();

    const farmerId = `${firstInitial}${lastInitial}${dd}${mm}${suffix}`;
    console.log('[firebaseSetup] Generated Farmer ID:', farmerId);

    return farmerId;
};

/**
 * Utility to generate a unique Harvest ID (Aggregation Farmer Harvest)
 * Format: [Farmer Initials][DDMM]A[Sequential Letter][Sequential Numbers]
 * The "A" represents Aggregation. Sequential part goes from A00 to Z99 (2600 combinations)
 * Examples: JC1611AA00, JC1611AA01, JC1611AZ99, JC1611BA00, AA1201AA98, etc.
 * IMPORTANT: This is now async and must be awaited!
 * @param {string} farmerName - Full farmer name (first last)
 * @param {string} dateOfDelivery - Date in YYYY-MM-DD format
 * @returns {Promise<string>} The unique Harvest ID.
 */
export const generateHarvestId = async (farmerName = '', dateOfDelivery = '') => {
    // Get farmer initials from first and last name
    const nameParts = farmerName.trim().split(/\s+/);
    const firstInitial = nameParts[0]?.charAt(0)?.toUpperCase() || 'X';
    const lastInitial = nameParts[1]?.charAt(0)?.toUpperCase() || 'X';

    // Get date from dateOfDelivery or current date
    let dateObj;
    if (dateOfDelivery) {
        dateObj = new Date(dateOfDelivery);
    } else {
        dateObj = new Date();
    }

    // Format as DDMM
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');

    // Get next sequential suffix (A00 to Z99)
    const suffix = await getNextHarvestSequentialSuffix();

    // Format: [Initials][DDMM]A[Suffix]
    // The "A" is fixed (Aggregation), suffix contains the sequential letter+numbers
    const harvestId = `${firstInitial}${lastInitial}${dd}${mm}A${suffix}`;
    console.log('[firebaseSetup] Generated Harvest ID:', harvestId, '(Counter incremented to produce suffix:', suffix, ')');

    return harvestId;
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateFarmerId or generateHarvestId instead
 */
export const generateRecordId = (type) => {
    if (type === 'PA') {
        return generateHarvestId();
    }
    // For FD, generate a generic ID (used only if no farmer name is available)
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime();
    const sequenceNumber = Math.floor((timestamp % 26000) / 1000);
    const letter = String.fromCharCode(65 + sequenceNumber);
    const counter = (timestamp % 1000).toString().slice(-2).padStart(2, '0');
    return `FD${dd}${mm}${letter}${counter}`;
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

        // Extract and validate coffee farming year
        let farmerYear = data.started_farming ? new Date(data.started_farming).getFullYear() : null;

        // API requires farming year >= 2010, use current year - 5 as default minimum if value is too old
        const currentYear = new Date().getFullYear();
        if (farmerYear && farmerYear < 2010) {
            console.warn(`[firebaseSetup] Farmer's coffee farming year (${farmerYear}) is before 2010. API requires >= 2010. Using 2010 as minimum.`);
            farmerYear = 2010;
        }

        // Transform data to match Django backend API format
        // For draft records, use sensible defaults for empty/required fields
        const apiPayload = {
            farmer_id: data.uid || data.farmer_id,
            first_name: data.first_name,
            last_name: data.last_name,
            gender: data.gender || 'Unknown',
            nin: data.nin,
            date_of_birth: data.date_of_birth,
            contact: data.contact,
            email: data.email || '',
            farmer_type: data.farmer_type || 'individual', // Default if not provided
            started_coffee_farming_year: farmerYear,
            district: data.district || 'Not specified',
            other_district: data.other_district || '',
            sub_county: data.sub_county || 'Not specified',
            other_sub_county: data.other_sub_county || '',
            parish: data.parish || 'Not specified',
            village: data.village || 'Not specified',
            gps_coordinates: data.gps || '',
            nearest_landmark: data.nearest_landmark || '',
            coffee_variety: data.coffee_variety || 'Not specified', // Default for required field
            number_of_trees: parseInt(data.no_of_trees) || 0,
            ownership_of_trees: data.all_your_trees !== false, // Convert to boolean
            planted_date: data.planted_date || new Date().toISOString().split('T')[0], // Default to today if empty
            land_ownership: data.land_ownership || 'Not specified', // Default for required field
            spacing_between_trees: data.spacing || 'Not specified', // Default for required field
            defforestation_status: data.deforested !== false, // Convert to boolean
            source_of_seedlings: data.seedling_source || 'Not specified', // Default for required field
            type_of_seedlings: Array.isArray(data.seedling_type) && data.seedling_type.length > 0
                ? data.seedling_type[0]
                : 'Not specified', // Default for required field - convert array to string
            age_of_seedlings: data.age_of_seedlings || 'Not specified', // Default for required field
            standard_practices: Array.isArray(data.practices) && data.practices.length > 0, // Convert array to boolean
            irrigation_source: data.irrigation || 'Not specified', // Default for required field
            fertilizers: Array.isArray(data.fertilizers) && data.fertilizers.length > 0
                ? data.fertilizers.join(', ')
                : 'Not specified', // Default for required field
            pesticide: Array.isArray(data.pesticides) && data.pesticides.length > 0
                ? data.pesticides.join(', ')
                : 'Not specified', // Default for required field
        };

        console.log('[firebaseSetup] API payload:', JSON.stringify(apiPayload, null, 2));

        const response = await ApiService.post('aggregation/farmer/', apiPayload);
        console.log('[firebaseSetup] Farmer submitted successfully');
        return response.data;
    } catch (error) {
        // Detailed logging to help diagnose server 500s and 400s
        console.error('[firebaseSetup] Error submitting farmer:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            console.error('Response headers:', error.response.headers);

            // Show field validation errors if any
            if (error.response.data && typeof error.response.data === 'object') {
                Object.entries(error.response.data).forEach(([key, value]) => {
                    console.error(`  Field '${key}': ${Array.isArray(value) ? value.join(', ') : value}`);
                });
            }
        } else if (error.request) {
            console.error('No response received - network error');
        } else {
            console.error('Error message:', error.message);
        }
        console.error('Request payload:', JSON.stringify(data, null, 2));

        // Rethrow original error so callers can inspect response
        throw error;
    }
};

/**
 * Checks if a harvest record is an aggregation/farmer harvest (not a production harvest)
 * Aggregation harvests have farmer_uid or farmer reference
 * Production harvests have block reference
 * @param {object} item - The harvest record from the API
 * @returns {boolean} True if this is an aggregation/farmer harvest
 */
const isAggregationHarvest = (item) => {
    // Check if it has farmer reference (aggregation/farmer-harvest endpoint)
    const hasFarmerReference = item.farmer || item.farmer_uid || item.name;

    // Check if it has block reference (harvests endpoint for production harvests)
    const hasBlockReference = item.block;

    // Production harvests typically have 'block' field and may have 'worker_name' instead of farmer
    // Aggregation harvests have farmer_uid in 'name' field and farmer_name

    // If it has block reference, it's a production harvest - exclude it
    if (hasBlockReference && !hasFarmerReference) {
        console.log('[firebaseSetup] Excluding production harvest (has block, no farmer):', item.id);
        return false;
    }

    // If it has farmer reference, it's an aggregation harvest
    if (hasFarmerReference) {
        return true;
    }

    // Default to including it if unsure (favor aggregation side)
    console.log('[firebaseSetup] Harvest record with unclear type, including it:', item.id);
    return true;
};

/**
 * Fetches all aggregation/farmer harvest records from the Django API.
 * IMPORTANT: Only returns aggregation/farmer harvests, NOT production harvests
 * Uses JWT authentication automatically via ApiService
 */
export const fetchHarvests = async () => {
    try {
        console.log('[firebaseSetup] Fetching aggregation/farmer harvests...');
    const response = await ApiService.get('aggregation/farmer-harvest/');
        console.log('[firebaseSetup] Harvests fetched successfully');
        let payload = response.data;
        // If paginated, use results
        if (payload && Array.isArray(payload.results)) payload = payload.results;

        // Filter to only include aggregation/farmer harvests (exclude production harvests)
        const filteredPayload = (Array.isArray(payload) ? payload : []).filter(item => {
            const isAggregation = isAggregationHarvest(item);
            if (!isAggregation) {
                console.log('[firebaseSetup] ⚠️  Filtered out non-aggregation harvest:', item);
            }
            return isAggregation;
        });

        console.log(`[firebaseSetup] Filtered harvests: ${filteredPayload.length} aggregation / ${payload.length} total`);

        // Normalize records to client-side shape expected by AggregationScreen
        const normalized = filteredPayload.map(item => {
            // Django returns farmer UID in 'name' field, preserve it for lookup
            // Also try to extract farmer_name if backend provided it
            const farmerName = item.farmer_name || (item.farmer && typeof item.farmer === 'object' && (item.farmer.name || item.farmer.full_name)) || (item.farmer ? String(item.farmer) : '');

            return {
                // id: prefer numeric id, fallback to harvest_id string
                id: item.id ?? item.harvest_id ?? null,
                harvest_id: item.harvest_id ?? item.id ?? null,

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
            console.log('[firebaseSetup] First harvest sample:', JSON.stringify(normalized[0], null, 2));
        } else {
            // Log the raw payload for debugging if no harvests were normalized
            console.log('[firebaseSetup] Raw payload received (first item or total):',
                payload && Array.isArray(payload) ? `Array with ${payload.length} items` : typeof payload);
            if (payload && payload.length > 0) {
                console.log('[firebaseSetup] Sample raw harvest:', JSON.stringify(payload[0], null, 2));
            }
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

        const harvestId = data.id || data.harvest_id || '';

        // Transform React Native form data to Django API format (/api/aggregation/farmer-harvest/)
        const apiPayload = {
            // REQUIRED: harvest_id field (unique identifier for this harvest)
            harvest_id: harvestId,

            // REQUIRED: name field (farmer identifier - farmer UID or name)
            name: data.farmer_uid || data.farmer_name || '',

            // OPTIONAL: coffee_type field (maps from form's coffee_type)
            coffee_type: data.coffee_type || null,

            // OPTIONAL: weight_on_delivery (farmer's harvest weight in kg)
            weight_on_delivery: data.weight_on_delivery ? Number(data.weight_on_delivery) : null,

            // OPTIONAL: date_of_delivery (when harvest was delivered)
            date_of_delivery: data.date_of_delivery || null,

            // OPTIONAL: location_of_delivery
            location_on_delivery: data.location_on_delivery || null,

            // OPTIONAL: gps_coordinates
            gps_coordinates_delivery: data.gps_coordinates || null,

            // OPTIONAL: price_per_kg
            price_per_kg: data.price_per_kg ? Number(data.price_per_kg) : null,

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

        // Check if harvest already exists (for re-sync scenarios)
        let response;
        try {
            const existingCheck = await ApiService.get(`aggregation/farmer-harvest/${harvestId}/`);
            if (existingCheck.status === 200) {
                // Harvest exists, use PUT to update
                console.log('[firebaseSetup] Harvest exists, updating...');
                response = await ApiService.put(`aggregation/farmer-harvest/${harvestId}/`, apiPayload);
                console.log('[firebaseSetup] Harvest updated successfully');
            }
        } catch (checkError) {
            // Harvest doesn't exist (404) or other error, use POST to create
            if (checkError.response?.status === 404) {
                console.log('[firebaseSetup] Harvest does not exist, creating...');
                response = await ApiService.post('aggregation/farmer-harvest/', apiPayload);
                console.log('[firebaseSetup] Harvest created successfully');
            } else {
                // Some other error during check, try POST anyway
                console.log('[firebaseSetup] Error checking harvest existence, trying POST...');
                response = await ApiService.post('aggregation/farmer-harvest/', apiPayload);
                console.log('[firebaseSetup] Harvest submitted successfully');
            }
        }

        return response.data;
    } catch (error) {
        console.error('[firebaseSetup] Error submitting harvest:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));

            // Show field validation errors if any
            if (error.response.data && typeof error.response.data === 'object') {
                Object.entries(error.response.data).forEach(([key, value]) => {
                    console.error(`  Field '${key}': ${Array.isArray(value) ? value.join(', ') : value}`);
                });
            }
        } else if (error.request) {
            console.error('No response received - network error');
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
 * Deletes a block record from the Django API.
 * Uses JWT authentication automatically via ApiService
 * @param {string} blockId - The block's ID
 */
export const deleteBlock = async (blockId) => {
    try {
        console.log('[firebaseSetup] Deleting block:', blockId);
        const response = await ApiService.delete(`harvests/blocks/${blockId}/`);
        console.log('[firebaseSetup] Block deleted successfully');
        return response.data;
    } catch (error) {
        console.error('[firebaseSetup] Error deleting block:');
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

        // Extract and validate coffee farming year
        let farmerYear = data.started_farming ? new Date(data.started_farming).getFullYear() : null;

        // API requires farming year >= 2010, use 2010 as minimum if value is too old
        if (farmerYear && farmerYear < 2010) {
            console.warn(`[firebaseSetup] Farmer's coffee farming year (${farmerYear}) is before 2010. API requires >= 2010. Using 2010 as minimum.`);
            farmerYear = 2010;
        }

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
            started_coffee_farming_year: farmerYear,
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

        // Transform data to match Django API format
        // IMPORTANT: Backend model only has these fields
        const apiPayload = {
            // PRIMARY KEY - Required even for updates
            harvest_id: harvestId,

            // Required fields
            name: data.farmer_uid || data.name || '',

            // Optional fields (matching backend model exactly)
            coffee_type: data.coffee_type || null,
            weight_on_delivery: data.weight_on_delivery ? Number(data.weight_on_delivery) : null,
            date_of_delivery: data.date_of_delivery || null,
            location_of_delivery: data.location_on_delivery || null,
            gps_coordinates_delivery: data.gps_coordinates || data.gps_coordinates_delivery || null,
            price_per_kg: data.price_per_kg ? Number(data.price_per_kg) : null,
            amount_paid: data.amount_paid ? String(data.amount_paid) : null,
            paid_by: data.paid_by || data.who_paid || null,
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
