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
        const response = await ApiService.get('/aggregation/Farmer/');
        console.log('[aggregationService] Farmers fetched successfully');
        return response.data;
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
 * Submits new farmer details to the Django API.
 * Uses JWT authentication automatically via ApiService
 * @param {Object} data - Farmer data to submit
 * @returns {Promise<Object>} Created farmer object
 */
export const submitFarmer = async (data) => {
    try {
        console.log('[aggregationService] Submitting farmer to API...');
        const response = await ApiService.post('/aggregation/Farmer/', data);
        console.log('[aggregationService] Farmer submitted successfully');

        // Store in local database for offline access
        try {
            if (DatabaseService.isInitialized) {
                await DatabaseService.insert('farmers', {
                    server_id: response.data.id,
                    name: data.name,
                    phone: data.contact || '',
                    location: data.location || '',
                    plot_size: data.num_trees || 0,
                    synced: 1,
                });
                console.log('[aggregationService] Farmer saved to local database');
            }
        } catch (dbError) {
            console.warn('[aggregationService] Failed to save farmer to local DB:', dbError);
        }

        return response.data;
    } catch (error) {
        // Detailed logging to help diagnose server 500s
        console.error('[aggregationService] Error submitting farmer:');
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

// --- HARVESTS API Functions ---

/**
 * Fetches all harvest records from the Django API.
 * Uses JWT authentication automatically via ApiService
 * @returns {Promise<Array>} Array of harvest objects
 */
export const fetchHarvests = async () => {
    try {
        console.log('[aggregationService] Fetching harvests from API...');
        const response = await ApiService.get('aggregation/FarmerHarvest');
        console.log('[aggregationService] Harvests fetched successfully');
        return response.data;
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
        const response = await ApiService.post('aggregation/FarmerHarvest', data);
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
                const data = {
                    name: farmer.name,
                    contact: farmer.phone,
                    location: farmer.location,
                    num_trees: farmer.plot_size,
                    recorder_id: await initializeAuth(),
                };

                const response = await ApiService.post('/aggregation/Farmer/', data);

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
                const data = {
                    farmer: harvest.farmer_id,
                    farmer_name: harvest.farmer_name,
                    weight_on_delivery: harvest.weight,
                    date_of_delivery: harvest.harvest_date,
                    grade: harvest.quality,
                    recorder_id: await initializeAuth(),
                };

                const response = await ApiService.post('aggregation/FarmerHarvest', data);

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
