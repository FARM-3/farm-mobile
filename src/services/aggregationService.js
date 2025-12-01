// File: src/services/aggregationService.js - Handles all API interactions for Aggregation (Farmers & Harvests), including offline sync utilities.

import ApiService from './ApiService';
import DatabaseService from './DatabaseService';
import AuthService from './AuthService';
import { logFarmerCreated, logFarmerUpdated, logHarvestCreated, logHarvestUpdated } from './ActivityService';

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

/**
 * Initializes the app and gets the current user
 * @returns {Promise<string|null>} User ID or null
 */
export const initializeAuth = async () => {
    try {
        console.log('[aggregationService] Checking authentication...');
        const user = await AuthService.getStoredUser();

        if (user && user.id) {
            console.log('[aggregationService] User authenticated:', user.id);
            return String(user.id);
        }

        console.warn('[aggregationService] No authenticated user found');
        return null;
    } catch (error) {
        console.error('[aggregationService] Auth initialization error:', error);
        return null;
    }
};

// --- FARMERS API Functions ---

/**
 * Fetches all registered farmers from the Django API.
 * Uses JWT authentication automatically via ApiService
 * @returns {Promise<Array>} Array of farmer objects
 */
export const fetchFarmers = async () => {
    try {
    console.log('[aggregationService] Fetching farmers from API...');
    // API exposes lowercase, hyphenated endpoints (see /api/schema/)
    const response = await ApiService.get('aggregation/farmer/');
        console.log('[aggregationService] Farmers fetched successfully');
        // Normalize common DRF shapes: either an array or a paginated object { results: [...] }
        const payload = response.data;
        const rawList = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.results) ? payload.results : []);

        // Map farmers to a predictable shape: { id, name, ... }
        const farmers = rawList.map(f => ({
            id: f.id ?? f.pk ?? f._id ?? null,
            name: f.name || f.full_name || f.farmer_name || f.displayName || '',
            // keep original object for reference
            __raw: f,
        }));

        console.log('[aggregationService] Normalized farmers:', farmers.length);

        // Return in expected format with success flag
        return {
            success: true,
            farmers: farmers
        };
    } catch (error) {
        console.error('[aggregationService] Error fetching farmers:', error.response?.data || error.message);

        // If unauthorized, might need to re-login
        if (error.response?.status === 401) {
            console.warn('[aggregationService] Unauthorized - user may need to login again');
        }

        return {
            success: false,
            farmers: []
        };
    }
};

/**
 * Submits new farmer details - OFFLINE-FIRST pattern
 * Saves to local DB first, then syncs to API
 * @param {Object} data - Farmer data to submit
 * @returns {Promise<Object>} Created farmer object (from API if online, local if offline)
 */
export const submitFarmer = async (data) => {
    // CRITICAL: Save to local database FIRST (offline-first pattern)
    let localId;
    try {
        if (DatabaseService.isInitialized) {
            const farmerData = {
                name: data.name,
                phone: data.contact || '',
                location: data.location || '',
                plot_size: data.num_trees || 0,
                synced: 0,  // Will be marked as 1 after successful sync
            };

            localId = await DatabaseService.insert('farmers', farmerData);
            console.log('[aggregationService] Farmer saved to local DB with ID:', localId);
        }
    } catch (dbError) {
        console.error('[aggregationService] Failed to save farmer to local DB:', dbError);
        throw new Error('Failed to save farmer locally');
    }

    // DEBUG: Log incoming data to see what we're working with
    console.log('[aggregationService] Incoming data.age_of_seedlings:', data.age_of_seedlings);
    console.log('[aggregationService] Incoming data.fertilizers:', data.fertilizers);
    console.log('[aggregationService] Incoming data.pesticides:', data.pesticides);

    // Transform data to match Django backend API format
    // IMPORTANT: All field names MUST match the backend exactly!
    const apiPayload = {
        // Personal Info - strings
        farmer_id: data.uid || data.farmer_id || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        gender: data.gender || '',
        // FIXED: NIN validation - Must be 14 uppercase chars or empty/null
        nin: data.nin && data.nin.length >= 14
            ? data.nin.toUpperCase().slice(0, 14) // Ensure uppercase and 14 chars
            : null, // Send null if invalid (Django allows blank=True, null=True)
        date_of_birth: data.date_of_birth || null,  // Can be null or YYYY-MM-DD format
        contact: data.contact || '',
        email: data.email || '',

        // Farmer Type - string
        farmer_type: data.farmer_type || 'individual',

        // Started farming - integer (year only, like 2020)
        started_coffee_farming_year: data.started_farming ? new Date(data.started_farming).getFullYear() : null,

        // Location - strings
        district: data.district || '',
        other_district: data.other_district || '',
        sub_county: data.sub_county || '',
        other_sub_county: data.other_sub_county || '',
        parish: data.parish || '',
        village: data.village || '',
        gps_coordinates: data.gps || '',
        nearest_landmark: data.nearest_landmark || '',

        // Coffee details - variety is string, number_of_trees is integer
        coffee_variety: data.coffee_variety || '',
        number_of_trees: parseInt(data.no_of_trees) || parseInt(data.number_of_trees) || 0,

        // Boolean fields - MUST be true/false (not strings)
        ownership_of_trees: Boolean(data.all_your_trees),

        // Dates - YYYY-MM-DD format or null
        planted_date: data.planted_date || null,

        // Land details - strings
        land_ownership: data.land_ownership || '',
        spacing_between_trees: data.spacing || '',

        // Boolean field - MUST be true/false
        defforestation_status: Boolean(data.deforested),

        // Seedling info - strings (FIXED: age_of_seedlings is required)
        source_of_seedlings: data.seedling_source || '',
        type_of_seedlings: data.seedling_type || '',
        age_of_seedlings: data.age_of_seedlings && data.age_of_seedlings.trim()
            ? data.age_of_seedlings.trim()
            : 'Not specified', // FIXED: Cannot be blank per Django model

        // Boolean field - MUST be true/false
        standard_practices: Boolean(Array.isArray(data.practices) && data.practices.length > 0),

        // Irrigation - string
        irrigation_source: data.irrigation || '',

        // FIXED: Fertilizers and Pesticides - STRINGS (Django changed back to CharField)
        fertilizers: Array.isArray(data.fertilizers)
            ? data.fertilizers.join(', ') // Convert array to comma-separated string
            : (data.fertilizers || ''), // Use as-is if string, or empty string
        pesticide: Array.isArray(data.pesticides)
            ? data.pesticides.join(', ') // Convert array to comma-separated string
            : (data.pesticides || ''), // Use as-is if string, or empty string
    };

    console.log('[aggregationService] ========== FARMER SUBMISSION ==========');
    console.log('[aggregationService] API payload:', JSON.stringify(apiPayload, null, 2));

    // Now try to sync to API (silent fail if offline)
    try {
    console.log('[aggregationService] Submitting farmer to API...');
    const response = await ApiService.post('aggregation/farmer/', apiPayload);
        console.log('[aggregationService] ✅ Farmer submitted successfully to API');

        // Mark as synced and update server_id
        if (localId && DatabaseService.isInitialized) {
            await DatabaseService.markAsSynced('farmers', localId, response.data.id);
            console.log('[aggregationService] Marked farmer as synced with server ID:', response.data.id);
        }

        // Log activity
        try {
            const farmerName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.name || 'Unknown';
            await logFarmerCreated(response.data.id || response.data.farmer_id, farmerName);
        } catch (activityError) {
            console.warn('[aggregationService] Failed to log farmer creation activity:', activityError);
        }

        return response.data;
    } catch (error) {
        // Enhanced error logging for debugging
        console.error('[aggregationService] ❌ API submission failed:');
        console.error('[aggregationService] Error type:', error.name);

        if (error.response) {
            // Server responded with error status
            console.error('[aggregationService] Status:', error.response.status);
            console.error('[aggregationService] Status text:', error.response.statusText);
            console.error('[aggregationService] Response data:', JSON.stringify(error.response.data, null, 2));
            console.error('[aggregationService] Response headers:', error.response.headers);

            // For 400 errors, show detailed validation errors
            if (error.response.status === 400) {
                console.error('[aggregationService] ⚠️  VALIDATION ERRORS:');
                const validationErrors = error.response.data;
                Object.keys(validationErrors).forEach(field => {
                    console.error(`  - ${field}: ${JSON.stringify(validationErrors[field])}`);
                });

                // Throw detailed error for UI
                const errorMessage = Object.entries(validationErrors)
                    .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                    .join('\n');
                throw new Error(`Validation failed:\n${errorMessage}`);
            }
        } else if (error.request) {
            // Request made but no response (network issue)
            console.error('[aggregationService] No response received from server');
            console.error('[aggregationService] Network error or server unreachable');
        } else {
            // Error in setting up the request
            console.error('[aggregationService] Error message:', error.message);
        }

        // For offline scenarios, return local record
        if (!error.response) {
            console.log('[aggregationService] Saving as local-only record (offline mode)');
            return {
                id: localId,
                ...data,
                _localOnly: true,
            };
        }

        // Re-throw for UI to handle
        throw error;
    }
};

// --- HARVESTS API Functions ---

/**
 * Fetches all harvest records from the Django API.
 * Uses JWT authentication automatically via ApiService
 * @returns {Promise<Array>} Array of harvest objects
 */
export const fetchHarvests = async () => {
    try {
    console.log('[aggregationService] Fetching harvests from API...');
    // use hyphenated resource name as exposed by the server
    const response = await ApiService.get('aggregation/farmer-harvest/');
        console.log('[aggregationService] Harvests fetched successfully');
        const payload = response.data;
        const rawList = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.results) ? payload.results : []);

        // Normalize each harvest record into the client-expected shape
        const normalized = rawList.map(h => {
            // Farmer name can come as a nested object or a plain field
            let farmerName = '';
            if (h.farmer_name) farmerName = h.farmer_name;
            else if (h.farmer && typeof h.farmer === 'object') farmerName = h.farmer.name || h.farmer.full_name || '';
            else if (h.farmer && (typeof h.farmer === 'string' || typeof h.farmer === 'number')) farmerName = String(h.farmer);
            else if (h.harvest) farmerName = h.harvest;

            // Weight/quantity mapping
            const weight = h.weight_on_delivery ?? h.quantity ?? h.weight ?? h.weight_kg ?? 0;

            // Date mapping
            const date = h.date_of_delivery ?? h.date_harvested ?? h.harvest_date ?? h.date ?? h.created_at ?? '';

            const amountPaid = h.amount_paid ?? h.amount ?? h.paid_amount ?? 0;

            return {
                id: h.id ?? h.pk ?? null,
                farmer: (h.farmer && (typeof h.farmer === 'number' || typeof h.farmer === 'string')) ? h.farmer : (h.farmer?.id ?? null),
                farmer_name: farmerName,
                weight: Number(weight) || 0,
                weight_on_delivery: Number(weight) || 0,
                location_on_delivery: h.location_on_delivery ?? '',
                gps_coordinates: h.gps_coordinates ?? '',
                weight_after_floating: Number(h.weight_after_floating ?? h.after_floating ?? 0) || 0,
                date: date,
                date_of_delivery: date,
                created_at: h.created_at || date,
                grade: h.grade ?? h.quality ?? '',
                cherry_colour: h.cherry_colour ?? h.cherryColor ?? h.cherry_colour ?? '',
                stage: h.stage ?? '',
                amount_paid: Number(amountPaid) || 0,
                who_paid: h.who_paid ?? h.payer ?? '',
                recorder_id: h.recorder_id ?? h.recorder ?? null,
                timestamp: h.timestamp ?? null,
                __raw: h,
            };
        });

        console.log('[aggregationService] Normalized harvests:', normalized.length);

        // Return in expected format with success flag
        return {
            success: true,
            harvests: normalized
        };
    } catch (error) {
        console.error('[aggregationService] Error fetching harvests:', error.response?.data || error.message);

        if (error.response?.status === 401) {
            console.warn('[aggregationService] Unauthorized - user may need to login again');
        }

        return {
            success: false,
            harvests: []
        };
    }
};

/**
 * Submits new harvest/aggregation record to the Django API.
 * Uses JWT authentication automatically via ApiService
 * @param {Object} data - Harvest data to submit
 * @returns {Promise<Object>} Created harvest object
 */
export const submitHarvest = async (data) => {
    try {
    console.log('[aggregationService] Submitting harvest to API...');
        // Build API-friendly payload according to schema (required: id, name)
        const apiPayload = {
            id: data.id ?? data.harvest_id ?? undefined,
            name: data.name ?? data.farmer_name ?? '',
            // Schema expects integer weights - coerce/round
            weight_on_delivery: Number.isFinite(Number(data.weight_on_delivery)) ? Math.round(Number(data.weight_on_delivery)) : (data.weight_on_delivery ? parseInt(data.weight_on_delivery, 10) : 0),
            location_on_delivery: data.location_on_delivery ?? '',
            gps_coordinates: data.gps_coordinates ?? '',
            weight_after_floating: Number.isFinite(Number(data.weight_after_floating)) ? Math.round(Number(data.weight_after_floating)) : (data.weight_after_floating ? parseInt(data.weight_after_floating, 10) : 0),
            date_of_delivery: data.date_of_delivery ?? data.harvest_date ?? '',
            grade: data.grade ?? data.quality ?? '',
            cherry_color: data.cherry_colour ?? data.cherryColor ?? data.cherry_color ?? '',
            stage: data.stage ?? '',
            amount_paid: data.amount_paid != null ? String(data.amount_paid) : '',
            paid_by: data.who_paid ?? data.paid_by ?? data.payer ?? '',
            recorder_id: data.recorder_id ?? data.recorder ?? null,
            timestamp: data.timestamp ?? Date.now(),
        };

        console.log('[aggregationService] Harvest payload for API:', JSON.stringify(apiPayload, null, 2));

        const response = await ApiService.post('aggregation/farmer-harvest/', apiPayload);
        console.log('[aggregationService] Harvest submitted successfully');

        // Store in local database for offline access
        try {
            if (DatabaseService.isInitialized) {
                await DatabaseService.insert('harvests', {
                    server_id: response.data.id,
                    farmer_id: data.farmer,
                    farmer_name: data.farmer_name || '',
                    harvest_date: data.date_of_delivery || '',
                    weight: data.weight_on_delivery || 0,
                    quality: data.grade || '',
                    notes: `Stage: ${data.stage || ''}, Cherry: ${data.cherry_colour || ''}`,
                    synced: 1,
                });
                console.log('[aggregationService] Harvest saved to local database');
            }
        } catch (dbError) {
            console.warn('[aggregationService] Failed to save harvest to local DB:', dbError);
        }

        // Log activity
        try {
            const farmerName = data.name || data.farmer_name || 'Unknown';
            const weight = data.weight_on_delivery || 0;
            await logHarvestCreated(response.data.id, farmerName, weight);
        } catch (activityError) {
            console.warn('[aggregationService] Failed to log harvest creation activity:', activityError);
        }

        return response.data;
    } catch (error) {
        console.error('[aggregationService] Error submitting harvest:');
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

// --- OFFLINE SYNC UTILITIES ---

/**
 * Sync all unsynced farmers to the server
 * @returns {Promise<Object>} Sync results
 */
export const syncFarmers = async () => {
    try {
        if (!DatabaseService.isInitialized) {
            console.warn('[aggregationService] Database not initialized for sync');
            return { syncedCount: 0, totalCount: 0 };
        }

        const unsyncedFarmers = await DatabaseService.getAllRecords('farmers', 'synced = 0');
        let syncedCount = 0;

        for (const farmer of unsyncedFarmers) {
            try {
                // Transform data to match Django backend API format
                const apiPayload = {
                    farmer_id: farmer.id || `FD${Date.now()}`,
                    first_name: farmer.name?.split(' ')[0] || '',
                    last_name: farmer.name?.split(' ').slice(1).join(' ') || '',
                    gender: 'Other', // Default value
                    nin: '',
                    date_of_birth: null,
                    contact: farmer.phone || '',
                    email: '',
                    farmer_type: 'individual',
                    started_coffee_farming_year: null,
                    district: farmer.location?.split(',')[0] || '',
                    other_district: '',
                    sub_county: '',
                    other_sub_county: '',
                    parish: '',
                    village: '',
                    gps_coordinates: '',
                    nearest_landmark: '',
                    coffee_variety: 'Other',
                    number_of_trees: farmer.plot_size || 0,
                    ownership_of_trees: true,
                    planted_date: null,
                    land_ownership: 'owned',
                    spacing_between_trees: '3 metres by 3 metres',
                    defforestation_status: false,
                    source_of_seedlings: 'nursery',
                    type_of_seedlings: 'Other',
                    age_of_seedlings: '',
                    standard_practices: false,
                    irrigation_source: 'none',
                    fertilizers: '',
                    pesticide: '',
                };

                const response = await ApiService.post('aggregation/farmer/', apiPayload);

                // Mark as synced and update server_id
                await DatabaseService.markAsSynced('farmers', farmer.id, response.data.id);
                syncedCount++;

                console.log(`[aggregationService] Synced farmer ${farmer.id}`);
            } catch (error) {
                console.error(`[aggregationService] Failed to sync farmer ${farmer.id}:`, error);
            }
        }

        console.log(`[aggregationService] Synced ${syncedCount}/${unsyncedFarmers.length} farmers`);
        return { syncedCount, totalCount: unsyncedFarmers.length };
    } catch (error) {
        console.error('[aggregationService] Error syncing farmers:', error);
        return { syncedCount: 0, totalCount: 0 };
    }
};

/**
 * Sync all unsynced harvests to the server
 * @returns {Promise<Object>} Sync results
 */
export const syncHarvests = async () => {
    try {
        if (!DatabaseService.isInitialized) {
            console.warn('[aggregationService] Database not initialized for sync');
            return { syncedCount: 0, totalCount: 0, failedRecords: [] };
        }

        const unsyncedHarvests = await DatabaseService.getAllRecords('harvests', 'synced = 0');
        let syncedCount = 0;
        const failedRecords = [];

        console.log(`[aggregationService] Starting sync of ${unsyncedHarvests.length} unsynced harvests`);

        for (const harvest of unsyncedHarvests) {
            try {
                // Get current user ID for recorder_id
                const currentUserId = await initializeAuth();

                // Transform data to match Django backend API format
                // Use actual data from the harvest record instead of hardcoded defaults
                const apiPayload = {
                    id: harvest.harvest_id || harvest.server_id || harvest.id,
                    name: harvest.farmer_name || harvest.worker_name || harvest.name || '',
                    weight_on_delivery: Math.round(Number(harvest.weight) || Number(harvest.weight_on_delivery) || 0),
                    location_on_delivery: harvest.location_on_delivery || harvest.location || '',
                    gps_coordinates: harvest.gps_coordinates || harvest.gps || '',
                    weight_after_floating: Math.round(Number(harvest.weight_after_floating) || 0),
                    date_of_delivery: harvest.harvest_date || harvest.date_of_delivery || harvest.date || '',
                    grade: harvest.quality || harvest.grade || '',
                    cherry_color: harvest.cherry_colour || harvest.cherry_color || harvest.cherryColor || '',
                    stage: harvest.stage || '',
                    amount_paid: harvest.amount_paid ? String(harvest.amount_paid) : (harvest.amountPaid ? String(harvest.amountPaid) : '0'),
                    paid_by: harvest.paid_by || harvest.who_paid || harvest.paidBy || '',
                    recorder_id: currentUserId,
                    timestamp: harvest.timestamp || Date.now(),
                };

                console.log(`[aggregationService] Syncing harvest ${harvest.id}:`, JSON.stringify(apiPayload, null, 2));

                const response = await ApiService.post('aggregation/farmer-harvest/', apiPayload);

                // Mark as synced and update server_id
                await DatabaseService.markAsSynced('harvests', harvest.id, response.data.id);
                syncedCount++;

                console.log(`[aggregationService] ✓ Successfully synced harvest ${harvest.id} to server ID ${response.data.id}`);
            } catch (error) {
                console.error(`[aggregationService] ✗ Failed to sync harvest ${harvest.id}:`, error);

                // Track detailed error information
                const errorDetails = {
                    id: harvest.id,
                    error: error.message,
                    status: error.response?.status || 0,
                    data: error.response?.data || null
                };

                failedRecords.push(errorDetails);

                // Log validation errors if present
                if (error.response?.status === 400) {
                    console.error(`[aggregationService] Validation errors for harvest ${harvest.id}:`, error.response.data);
                }
            }
        }

        console.log(`[aggregationService] Sync complete: ${syncedCount}/${unsyncedHarvests.length} harvests synced`);

        if (failedRecords.length > 0) {
            console.warn(`[aggregationService] ${failedRecords.length} harvests failed to sync:`, failedRecords);
        }

        return {
            syncedCount,
            totalCount: unsyncedHarvests.length,
            failedRecords
        };
    } catch (error) {
        console.error('[aggregationService] Error syncing harvests:', error);
        return { syncedCount: 0, totalCount: 0, failedRecords: [] };
    }
};

/**
 * Sync all aggregation data (farmers and harvests)
 * @returns {Promise<Object>} Combined sync results
 */
export const syncAllAggregation = async () => {
    console.log('[aggregationService] Starting full aggregation sync...');

    const farmerResults = await syncFarmers();
    const harvestResults = await syncHarvests();

    const totalSynced = farmerResults.syncedCount + harvestResults.syncedCount;
    const totalCount = farmerResults.totalCount + harvestResults.totalCount;

    console.log(`[aggregationService] Full sync complete: ${totalSynced}/${totalCount} records synced`);

    return {
        syncedCount: totalSynced,
        totalCount,
        farmers: farmerResults,
        harvests: harvestResults,
    };
};

/**
 * Sync records from AsyncStorage (for AggregationScreen draft/pending records)
 * Handles both CREATE (new records) and UPDATE (existing records)
 * @param {Array} farmerRecords - Farmer records to sync
 * @param {Array} harvestRecords - Harvest records to sync
 * @returns {Promise<Object>} Sync results with success/failure counts
 */
export const syncAggregationRecords = async (farmerRecords = [], harvestRecords = []) => {
    console.log('[aggregationService] Starting AsyncStorage sync...');
    console.log(`[aggregationService] Farmers to sync: ${farmerRecords.length}`);
    console.log(`[aggregationService] Harvests to sync: ${harvestRecords.length}`);

    let successCount = 0;
    let failureCount = 0;
    const syncedFarmerIds = [];
    const syncedHarvestIds = [];
    const failedRecords = [];

    // Sync Farmers
    for (const farmer of farmerRecords) {
        try {
            console.log(`[aggregationService] Syncing farmer: ${farmer.uid || farmer.farmer_id || farmer.id}`);

            const farmerId = farmer.uid || farmer.farmer_id || farmer.id;

            // Import API service to check if farmer exists
            const ApiService = await import('./ApiService');

            // Check if farmer already exists in the backend
            let isExisting = false;
            try {
                const checkResponse = await ApiService.default.get(`aggregation/farmer/${farmerId}/`);
                if (checkResponse.status === 200) {
                    isExisting = true;
                    console.log(`[aggregationService] Farmer ${farmerId} exists in backend, will update`);
                }
            } catch (checkError) {
                if (checkError.response?.status === 404) {
                    // Farmer doesn't exist, will create
                    console.log(`[aggregationService] Farmer ${farmerId} not found in backend, will create`);
                    isExisting = false;
                } else {
                    // Other error - log but assume doesn't exist
                    console.warn(`[aggregationService] Error checking farmer existence:`, checkError.message);
                    isExisting = false;
                }
            }

            if (isExisting) {
                // UPDATE existing farmer
                console.log(`[aggregationService] Updating existing farmer: ${farmerId}`);

                // Import updateFarmer dynamically to avoid circular dependency
                const { updateFarmer } = await import('../utils/firebaseSetup');
                await updateFarmer(farmerId, farmer);

                console.log(`[aggregationService] ✓ Farmer updated: ${farmerId}`);
            } else {
                // CREATE new farmer
                console.log('[aggregationService] Creating new farmer');
                await submitFarmer(farmer);
                console.log('[aggregationService] ✓ Farmer created');
            }

            syncedFarmerIds.push(farmer.id);
            successCount++;
        } catch (error) {
            console.error(`[aggregationService] ✗ Failed to sync farmer:`, error);

            // Enhanced error logging for debugging
            if (error.response?.status === 400) {
                console.error(`[aggregationService] Validation error:`, error.response.data);
            }

            failureCount++;
            failedRecords.push({
                type: 'farmer',
                id: farmer.id || farmer.uid,
                error: error.message,
                details: error.response?.data
            });
        }
    }

    // Sync Harvests
    for (const harvest of harvestRecords) {
        try {
            console.log(`[aggregationService] Syncing harvest: ${harvest.harvest_id || harvest.id}`);

            const harvestId = harvest.harvest_id || harvest.id;

            // Import API service to check if harvest exists
            const ApiService = await import('./ApiService');

            // Check if harvest already exists in the backend
            let isExisting = false;
            try {
                const checkResponse = await ApiService.default.get(`aggregation/farmer-harvest/${harvestId}/`);
                if (checkResponse.status === 200) {
                    isExisting = true;
                    console.log(`[aggregationService] Harvest ${harvestId} exists in backend, will update`);
                }
            } catch (checkError) {
                if (checkError.response?.status === 404) {
                    // Harvest doesn't exist, will create
                    console.log(`[aggregationService] Harvest ${harvestId} not found in backend, will create`);
                    isExisting = false;
                } else {
                    // Other error - log but assume doesn't exist
                    console.warn(`[aggregationService] Error checking harvest existence:`, checkError.message);
                    isExisting = false;
                }
            }

            // Normalize harvest data to ensure correct field mapping
            const normalizedHarvest = {
                id: harvest.harvest_id || harvest.id,
                harvest_id: harvest.harvest_id || harvest.id,
                farmer_uid: harvest.farmer_uid || harvest.name || harvest.farmer_name || '',
                farmer_name: harvest.farmer_name || harvest.name || '',
                coffee_type: harvest.coffee_type || harvest.grade || null,
                weight_on_delivery: harvest.weight_on_delivery || harvest.weight || 0,
                date_of_delivery: harvest.date_of_delivery || harvest.date || '',
                location_on_delivery: harvest.location_on_delivery || harvest.location || '',
                gps_coordinates: harvest.gps_coordinates || harvest.gps || '',
                price_per_kg: harvest.price_per_kg || 0,
                moisture_content: harvest.moisture_content || null,
                amount_paid: harvest.amount_paid || '0',
                paid_by: harvest.paid_by || harvest.who_paid || '',
                number_of_bags: harvest.number_of_bags || harvest.no_of_bags || null,
            };

            console.log(`[aggregationService] Normalized harvest data:`, JSON.stringify(normalizedHarvest, null, 2));

            if (isExisting) {
                // UPDATE existing harvest
                console.log(`[aggregationService] Updating existing harvest: ${harvestId}`);

                // Import updateHarvest dynamically to avoid circular dependency
                const { updateHarvest } = await import('../utils/firebaseSetup');
                await updateHarvest(harvestId, normalizedHarvest);

                console.log(`[aggregationService] ✓ Harvest updated: ${harvestId}`);
            } else {
                // CREATE new harvest - use firebaseSetup submitHarvest for consistency
                console.log('[aggregationService] Creating new harvest');

                // Import submitHarvest from firebaseSetup which has better field mapping
                const { submitHarvest: submitHarvestFirebase } = await import('../utils/firebaseSetup');
                await submitHarvestFirebase(normalizedHarvest);

                console.log('[aggregationService] ✓ Harvest created');
            }

            // Track both id and harvest_id to ensure proper removal from AsyncStorage
            syncedHarvestIds.push(harvest.id);
            if (harvest.harvest_id && harvest.harvest_id !== harvest.id) {
                syncedHarvestIds.push(harvest.harvest_id);
            }
            successCount++;
        } catch (error) {
            console.error(`[aggregationService] ✗ Failed to sync harvest ${harvest.id || harvest.harvest_id}:`, error.message);

            // Enhanced error logging for debugging
            if (error.response?.status === 400) {
                console.error(`[aggregationService] Validation error:`, JSON.stringify(error.response.data, null, 2));
            } else if (error.response?.status === 404) {
                console.error(`[aggregationService] Harvest not found in backend (404)`);
            } else if (error.response) {
                console.error(`[aggregationService] Server error ${error.response.status}:`, error.response.data);
            } else {
                console.error(`[aggregationService] Network or other error:`, error.message);
            }

            failureCount++;

            // Create user-friendly error message
            let userMessage = error.message;
            if (error.response?.status === 400) {
                // Format validation errors
                const validationErrors = error.response.data;
                if (typeof validationErrors === 'object') {
                    userMessage = Object.entries(validationErrors)
                        .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                        .join('; ');
                }
            } else if (error.response?.status === 404) {
                userMessage = 'Harvest record not found in database';
            }

            failedRecords.push({
                type: 'harvest',
                id: harvest.id || harvest.harvest_id,
                harvest_id: harvest.harvest_id || harvest.id,
                error: userMessage,
                status: error.response?.status,
                details: error.response?.data
            });
        }
    }

    const totalCount = farmerRecords.length + harvestRecords.length;

    console.log(`[aggregationService] Sync complete: ${successCount}/${totalCount} synced, ${failureCount} failed`);

    return {
        success: failureCount === 0,
        syncedCount: successCount,
        totalCount,
        failedCount: failureCount,
        syncedFarmerIds,
        syncedHarvestIds,
        failedRecords
    };
};
