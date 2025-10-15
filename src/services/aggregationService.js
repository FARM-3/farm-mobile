// File: src/services/aggregationService.js - Handles all API interactions for Aggregation (Farmers & Harvests), including offline sync utilities.

import ApiService from './ApiService';
import DatabaseService from './DatabaseService';
import AuthService from './AuthService';

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
        return rawList.map(f => ({
            id: f.id ?? f.pk ?? f._id ?? null,
            name: f.name || f.full_name || f.farmer_name || f.displayName || '',
            // keep original object for reference
            __raw: f,
        }));
    } catch (error) {
        console.error('[aggregationService] Error fetching farmers:', error.response?.data || error.message);

        // If unauthorized, might need to re-login
        if (error.response?.status === 401) {
            console.warn('[aggregationService] Unauthorized - user may need to login again');
        }

        return [];
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
        farmer_type: data.farmer_type || 'individual',
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
        ownership_of_trees: data.all_your_trees !== false,
        planted_date: data.planted_date,
        land_ownership: data.land_ownership,
        spacing_between_trees: data.spacing,
        defforestation_status: data.deforested !== false,
        source_of_seedlings: data.seedling_source,
        type_of_seedlings: data.seedling_type,
        age_of_seedlings: data.age_of_seedlings || '',
        standard_practices: Array.isArray(data.practices) && data.practices.length > 0,
        irrigation_source: data.irrigation,
        fertilizers: Array.isArray(data.fertilizers) ? data.fertilizers.join(', ') : data.fertilizers || '',
        pesticide: Array.isArray(data.pesticides) ? data.pesticides.join(', ') : data.pesticides || '',
    };

    console.log('[aggregationService] API payload:', JSON.stringify(apiPayload, null, 2));

    // Now try to sync to API (silent fail if offline)
    try {
    console.log('[aggregationService] Submitting farmer to API...');
    const response = await ApiService.post('aggregation/farmer/', apiPayload);
        console.log('[aggregationService] Farmer submitted successfully to API');

        // Mark as synced and update server_id
        if (localId && DatabaseService.isInitialized) {
            await DatabaseService.markAsSynced('farmers', localId, response.data.id);
            console.log('[aggregationService] Marked farmer as synced with server ID:', response.data.id);
        }

        return response.data;
    } catch (error) {
        // API failed but data is safe in local DB - will sync later
        console.error('[aggregationService] API submission failed (offline?):');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response data:', error.response.data);
        } else {
            console.error('Error message:', error.message);
        }

        // Return local record info so UI can continue
        return {
            id: localId,
            ...data,
            _localOnly: true,  // Flag to indicate this is not yet synced
        };
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
            const date = h.date_of_delivery ?? h.date_harvested ?? h.harvest_date ?? h.date ?? '';

            const amountPaid = h.amount_paid ?? h.amount ?? h.paid_amount ?? 0;

            return {
                id: h.id ?? h.pk ?? null,
                farmer: (h.farmer && (typeof h.farmer === 'number' || typeof h.farmer === 'string')) ? h.farmer : (h.farmer?.id ?? null),
                farmer_name: farmerName,
                weight_on_delivery: Number(weight) || 0,
                weight_after_floating: Number(h.weight_after_floating ?? h.after_floating ?? 0) || 0,
                date_of_delivery: date,
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

        return normalized;
    } catch (error) {
        console.error('[aggregationService] Error fetching harvests:', error.response?.data || error.message);

        if (error.response?.status === 401) {
            console.warn('[aggregationService] Unauthorized - user may need to login again');
        }

        return [];
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
            return { syncedCount: 0, totalCount: 0 };
        }

        const unsyncedHarvests = await DatabaseService.getAllRecords('harvests', 'synced = 0');
        let syncedCount = 0;

        for (const harvest of unsyncedHarvests) {
            try {
                // Transform data to match Django backend API format
                const apiPayload = {
                    id: harvest.server_id || harvest.id,
                    name: harvest.farmer_name || '',
                    weight_on_delivery: Math.round(Number(harvest.weight) || 0),
                    weight_after_floating: 0, // Default value
                    date_of_delivery: harvest.harvest_date || '',
                    grade: harvest.quality || '',
                    cherry_color: 'Red', // Default value
                    stage: 'fresh_cherry', // Default value
                    amount_paid: '0', // Default value
                    paid_by: 'System', // Default value
                    recorder_id: await initializeAuth(),
                    timestamp: Date.now(),
                };

                const response = await ApiService.post('aggregation/farmer-harvest/', apiPayload);

                // Mark as synced and update server_id
                await DatabaseService.markAsSynced('harvests', harvest.id, response.data.id);
                syncedCount++;

                console.log(`[aggregationService] Synced harvest ${harvest.id}`);
            } catch (error) {
                console.error(`[aggregationService] Failed to sync harvest ${harvest.id}:`, error);
            }
        }

        console.log(`[aggregationService] Synced ${syncedCount}/${unsyncedHarvests.length} harvests`);
        return { syncedCount, totalCount: unsyncedHarvests.length };
    } catch (error) {
        console.error('[aggregationService] Error syncing harvests:', error);
        return { syncedCount: 0, totalCount: 0 };
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
