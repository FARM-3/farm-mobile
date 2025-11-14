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

        // Seedling info - Django CharField expects strings, not arrays
        source_of_seedlings: data.seedling_source || '',
        type_of_seedlings: Array.isArray(data.seedling_type) && data.seedling_type.length > 0
            ? data.seedling_type.join(', ') // Convert array to comma-separated string for Django CharField
            : (typeof data.seedling_type === 'string' && data.seedling_type.trim()
                ? data.seedling_type.trim()
                : 'Not specified'), // FIXED: Django CharField requires a string, not array
        age_of_seedlings: data.age_of_seedlings && data.age_of_seedlings.trim()
            ? data.age_of_seedlings.trim()
            : 'Not specified', // FIXED: Cannot be blank per Django model

        // Boolean field - MUST be true/false
        standard_practices: Boolean(Array.isArray(data.practices) && data.practices.length > 0),

        // Irrigation - string
        irrigation_source: data.irrigation || '',

        // FIXED: Fertilizers and Pesticides - STRINGS (Django changed back to CharField)
        fertilizers: Array.isArray(data.fertilizers) && data.fertilizers.length > 0
            ? data.fertilizers.join(', ') // Convert array to comma-separated string
            : (typeof data.fertilizers === 'string' && data.fertilizers.trim() ? data.fertilizers.trim() : 'None'), // Use 'None' if empty
        pesticide: data.uses_pesticides === false || !data.pesticides
            ? 'None' // Send 'None' if user didn't select pesticides
            : (Array.isArray(data.pesticides) && data.pesticides.length > 0
                ? data.pesticides.join(', ') // Convert array to comma-separated string
                : (typeof data.pesticides === 'string' && data.pesticides.trim() ? data.pesticides.trim() : 'None')), // Use 'None' if empty
    };

    console.log('[aggregationService] ========== FARMER SUBMISSION ==========');
    console.log('[aggregationService] Input data.seedling_type:', data.seedling_type, '(type:', typeof data.seedling_type, ')');
    console.log('[aggregationService] Converted type_of_seedlings:', apiPayload.type_of_seedlings);
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
        console.error('[aggregationService] ❌ FARMER SUBMISSION ERROR');
        console.error('[aggregationService] Error name:', error.name);
        console.error('[aggregationService] Error message:', error.message);

        if (error.response) {
            // Server responded with error status
            console.error('[aggregationService] Backend Status Code:', error.response.status);
            console.error('[aggregationService] Backend Status Text:', error.response.statusText);
            console.error('[aggregationService] Backend Response Data:', JSON.stringify(error.response.data, null, 2));
            console.error('[aggregationService] Backend Response Headers:', JSON.stringify(error.response.headers, null, 2));

            // For 500 errors, backend crash or signal issue
            if (error.response.status === 500) {
                console.error('[aggregationService] ⚠️  SERVER ERROR 500 - Backend crashed or signal handling issue');
            }

            // For 400 errors, show detailed validation errors
            if (error.response.status === 400) {
                console.error('[aggregationService] ⚠️  VALIDATION ERRORS (400):');
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
            console.error('[aggregationService] ⚠️  No response received from backend');
            console.error('[aggregationService] Network error - backend may not be running');
            console.error('[aggregationService] Request sent to:', error.request.responseURL || 'aggregation/farmer/');
        } else {
            // Error in setting up the request
            console.error('[aggregationService] Error during request setup:', error.message);
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
        console.log('[aggregationService] Harvest form data received:', {
            farmer_uid: data.farmer_uid,
            farmer_name: data.farmer_name,
            name: data.name,
            selectedStaff: data.selectedStaff?.displayName || data.selectedStaff?.name,
        });

        // Build API-friendly payload according to Django FarmerHarvest model
        // IMPORTANT: Match Django field names EXACTLY from models.py
        // The 'name' field in FarmerHarvest should be the farmer's actual name (not UID)
        // Frontend validation should ensure farmer_name is populated from successful farmer lookup
        let farmerName = data.farmer_name || '';

        // If farmer_name is empty, try other sources (though this should not happen with proper validation)
        if (!farmerName && data.selectedStaff?.displayName) {
            farmerName = data.selectedStaff.displayName;
            console.warn('[aggregationService] ⚠️  farmer_name was empty, using selectedStaff.displayName instead');
        }

        // Log warning if still empty - this indicates a data quality issue
        if (!farmerName || farmerName.trim() === '') {
            console.warn('[aggregationService] ⚠️  CRITICAL: farmer_name is still empty. This should have been caught by frontend validation.');
            console.warn('[aggregationService] Available fields:', {
                farmer_name: data.farmer_name,
                farmer_uid: data.farmer_uid,
                name: data.name,
                selectedStaff: data.selectedStaff,
            });
        }

        console.log('[aggregationService] Final farmer name to send:', farmerName);

        const apiPayload = {
            harvest_id: data.harvest_id ?? data.id ?? undefined, // CRITICAL: Primary key in Django
            name: farmerName, // CRITICAL: Django model requires 'name' field (farmer's actual name, not UID)
            coffee_type: data.coffee_type ?? data.grade ?? '',
            weight_on_delivery: Number.isFinite(Number(data.weight_on_delivery)) ? Math.round(Number(data.weight_on_delivery)) : (data.weight_on_delivery ? parseInt(data.weight_on_delivery, 10) : 0),
            date_of_delivery: data.date_of_delivery ?? data.harvest_date ?? '',
            location_of_delivery: data.location_on_delivery ?? '', // CRITICAL: Field name in model is location_of_delivery
            gps_coordinates_delivery: data.gps_coordinates ?? '', // CRITICAL: Field name in model is gps_coordinates_delivery
            price_per_kg: Number.isFinite(Number(data.price_per_kg)) ? Math.round(Number(data.price_per_kg)) : 0,
            amount_paid: data.amount_paid != null ? String(data.amount_paid) : '',
            paid_by: data.paid_by ?? data.who_paid ?? data.payer ?? '',
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
        console.error('[aggregationService] ❌ HARVEST SUBMISSION ERROR');
        console.error('[aggregationService] Error name:', error.name);
        console.error('[aggregationService] Error message:', error.message);

        if (error.response) {
            console.error('[aggregationService] Backend Status Code:', error.response.status);
            console.error('[aggregationService] Backend Status Text:', error.response.statusText);
            console.error('[aggregationService] Backend Response Data:', JSON.stringify(error.response.data, null, 2));
            console.error('[aggregationService] Backend Response Headers:', JSON.stringify(error.response.headers, null, 2));

            // For 500 errors, this indicates a backend crash - might be signal issue
            if (error.response.status === 500) {
                console.error('[aggregationService] ⚠️  SERVER ERROR 500 - Backend may have crashed or signal handling issue');
            }
        } else if (error.request) {
            console.error('[aggregationService] No response received from backend - network issue or backend not running');
            console.error('[aggregationService] Request sent to:', error.request.responseURL);
        } else {
            console.error('[aggregationService] Error without response or request:', error);
        }

        console.error('[aggregationService] Submitted payload was:', JSON.stringify(apiPayload, null, 2));
        console.error('[aggregationService] Original data was:', JSON.stringify(data, null, 2));

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
                    type_of_seedlings: 'Other', // FIXED: Django CharField expects string, not array
                    age_of_seedlings: 'Not specified',
                    standard_practices: false,
                    irrigation_source: 'none',
                    fertilizers: 'None',
                    pesticide: 'None', // FIXED: Cannot be blank per Django model
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
 * Helper to add timeout to a promise
 */
const withTimeout = (promise, timeoutMs = 15000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
};

/**
 * Sync records from AsyncStorage (for AggregationScreen draft/pending records)
 * Handles both CREATE (new records) and UPDATE (existing records)
 * @param {Array} farmerRecords - Farmer records to sync
 * @param {Array} harvestRecords - Harvest records to sync
 * @returns {Promise<Object>} Sync results with success/failure counts
 */
export const syncAggregationRecords = async (farmerRecords = [], harvestRecords = []) => {
    console.log('[aggregationService] ========== STARTING AGGREGATION SYNC ==========');
    console.log(`[aggregationService] Farmers to sync: ${farmerRecords.length}`);
    console.log(`[aggregationService] Harvests to sync: ${harvestRecords.length}`);
    console.log('[aggregationService] Sync started at:', new Date().toISOString());

    if (farmerRecords.length === 0 && harvestRecords.length === 0) {
        console.log('[aggregationService] No records to sync');
        return {
            success: true,
            syncedCount: 0,
            totalCount: 0,
            failedCount: 0,
            syncedFarmerIds: [],
            syncedHarvestIds: [],
            failedRecords: []
        };
    }

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
            if (!farmerId) {
                throw new Error('Farmer ID is missing - cannot sync');
            }

            // Import API service to check if farmer exists
            const ApiService = await import('./ApiService');

            // Check if farmer already exists in the backend
            let isExisting = false;
            try {
                console.log(`[aggregationService] Checking if farmer ${farmerId} exists...`);
                const checkResponse = await withTimeout(
                    ApiService.default.get(`aggregation/farmer/${farmerId}/`),
                    10000 // 10 second timeout for check request
                );
                if (checkResponse.status === 200) {
                    isExisting = true;
                    console.log(`[aggregationService] ✓ Farmer ${farmerId} exists in backend, will update`);
                }
            } catch (checkError) {
                if (checkError.response?.status === 404) {
                    // Farmer doesn't exist, will create
                    console.log(`[aggregationService] Farmer ${farmerId} not found in backend (404), will create new`);
                    isExisting = false;
                } else if (checkError.message?.includes('timeout')) {
                    // Timeout - assume doesn't exist and try to create
                    console.warn(`[aggregationService] ⏱️  Timeout checking farmer existence, will attempt create:`, checkError.message);
                    isExisting = false;
                } else {
                    // Other error - log but assume doesn't exist
                    console.warn(`[aggregationService] Error checking farmer existence (${checkError.response?.status || 'unknown'}):`, checkError.message);
                    isExisting = false;
                }
            }

            let backendFarmerId = null;

            if (isExisting) {
                // UPDATE existing farmer
                console.log(`[aggregationService] Updating existing farmer: ${farmerId}`);

                // Import updateFarmer dynamically to avoid circular dependency
                const { updateFarmer } = await import('../utils/firebaseSetup');
                await updateFarmer(farmerId, farmer);

                console.log(`[aggregationService] ✓ Farmer updated: ${farmerId}`);
                backendFarmerId = farmerId;
            } else {
                // CREATE new farmer
                console.log('[aggregationService] Creating new farmer');
                const submitResponse = await submitFarmer(farmer);
                console.log('[aggregationService] ✓ Farmer created');

                // Capture the actual farmer_id from Django backend
                backendFarmerId = submitResponse.farmer_id || submitResponse.id || farmerId;
                console.log(`[aggregationService] Backend returned farmer_id: ${backendFarmerId}`);
            }

            // Track by both original id and backend farmer_id
            syncedFarmerIds.push(farmer.id);
            if (farmer.uid) syncedFarmerIds.push(farmer.uid);
            if (farmer.farmer_id) syncedFarmerIds.push(farmer.farmer_id);
            if (backendFarmerId) syncedFarmerIds.push(backendFarmerId);
            console.log(`[aggregationService] ✓ Added to syncedFarmerIds:`, {
                localId: farmer.id,
                uid: farmer.uid,
                farmer_id: farmer.farmer_id,
                backendFarmerId: backendFarmerId
            });
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
            if (!harvestId) {
                throw new Error('Harvest ID is missing - cannot sync');
            }

            // Import API service to check if harvest exists
            const ApiService = await import('./ApiService');

            // Check if harvest already exists in the backend
            let isExisting = false;
            try {
                console.log(`[aggregationService] Checking if harvest ${harvestId} exists...`);
                const checkResponse = await withTimeout(
                    ApiService.default.get(`aggregation/farmer-harvest/${harvestId}/`),
                    10000 // 10 second timeout for check request
                );
                if (checkResponse.status === 200) {
                    isExisting = true;
                    console.log(`[aggregationService] ✓ Harvest ${harvestId} exists in backend, will update`);
                }
            } catch (checkError) {
                if (checkError.response?.status === 404) {
                    // Harvest doesn't exist, will create
                    console.log(`[aggregationService] Harvest ${harvestId} not found in backend (404), will create new`);
                    isExisting = false;
                } else if (checkError.message?.includes('timeout')) {
                    // Timeout - assume doesn't exist and try to create
                    console.warn(`[aggregationService] ⏱️  Timeout checking harvest existence, will attempt create:`, checkError.message);
                    isExisting = false;
                } else {
                    // Other error - log but assume doesn't exist
                    console.warn(`[aggregationService] Error checking harvest existence (${checkError.response?.status || 'unknown'}):`, checkError.message);
                    isExisting = false;
                }
            }

            let backendHarvestId = null;

            if (isExisting) {
                // UPDATE existing harvest
                console.log(`[aggregationService] Updating existing harvest: ${harvestId}`);

                // Import updateHarvest dynamically to avoid circular dependency
                const { updateHarvest } = await import('../utils/firebaseSetup');
                await updateHarvest(harvestId, harvest);

                console.log(`[aggregationService] ✓ Harvest updated: ${harvestId}`);
                backendHarvestId = harvestId;
            } else {
                // CREATE new harvest
                console.log('[aggregationService] Creating new harvest');
                const submitResponse = await submitHarvest(harvest);
                console.log('[aggregationService] ✓ Harvest created');

                // Capture the actual harvest_id from Django backend
                backendHarvestId = submitResponse.harvest_id || submitResponse.id || harvestId;
                console.log(`[aggregationService] Backend returned harvest_id: ${backendHarvestId}`);
            }

            // Track by both original id and backend harvest_id
            syncedHarvestIds.push(harvest.id);
            if (harvest.harvest_id) syncedHarvestIds.push(harvest.harvest_id);
            if (backendHarvestId) syncedHarvestIds.push(backendHarvestId);
            console.log(`[aggregationService] ✓ Added to syncedHarvestIds:`, {
                localId: harvest.id,
                harvest_id: harvest.harvest_id,
                backendHarvestId: backendHarvestId
            });
            successCount++;
        } catch (error) {
            console.error(`[aggregationService] ✗ Failed to sync harvest:`, error);

            // Enhanced error logging for debugging
            if (error.response?.status === 400) {
                console.error(`[aggregationService] Validation error:`, error.response.data);
            }

            failureCount++;
            failedRecords.push({
                type: 'harvest',
                id: harvest.id || harvest.harvest_id,
                error: error.message,
                details: error.response?.data
            });
        }
    }

    const totalCount = farmerRecords.length + harvestRecords.length;

    console.log('[aggregationService] ========== SYNC COMPLETE ==========');
    console.log(`[aggregationService] Sync completed at:`, new Date().toISOString());
    console.log(`[aggregationService] Results: ${successCount}/${totalCount} synced successfully, ${failureCount} failed`);
    console.log(`[aggregationService] Synced Farmer IDs (${syncedFarmerIds.length}):`, syncedFarmerIds);
    console.log(`[aggregationService] Synced Harvest IDs (${syncedHarvestIds.length}):`, syncedHarvestIds);

    if (failedRecords.length > 0) {
        console.warn(`[aggregationService] Failed records (${failedRecords.length}):`, failedRecords);
    }

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
