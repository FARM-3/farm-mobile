// File: src/services/harvestRecord.js - Handles all API interactions for Harvest Records, now including offline sync utilities.

import ApiService from './ApiService';
import AsyncStorage from "@react-native-async-storage/async-storage"; // <-- Added for sync utilities

const SYNC_QUEUE_KEY = "harvests_sync_queue"; // Key for the local queue of unsynced records

// --- Internal Data Mapping (for POST) ---

/**
 * Maps the UI payload (camelCase, internal flags) to the format expected by the backend API (snake_case, strings).
 *
 * API Schema POST: { "name": "string", "weight_on_delivery": integer, "date_of_delivery": "string", "price_per_kg": integer, "amount_paid": "string", "paid_by": "string" }
 *
 * @param {object} payload - The raw payload from the UI or the sync queue.
 * @returns {object} The API-ready payload.
 */
const mapToApiPayload = (payload) => {
    const apiPayload = {};

    // 0. Harvest ID (UI: id (string like "ED2810RA00") -> API: harvest_id (string))
    // This is required by the API
    apiPayload.harvest_id = payload.id;

    // 1. Date (UI: date (Date object/ISO string) -> API: date_of_delivery (YYYY-MM-DD string))
    let dateObj = payload.date;
    if (typeof dateObj === 'string') {
        // Convert ISO string (from AsyncStorage) back to a Date object
        dateObj = new Date(dateObj);
    }

    if (dateObj instanceof Date && !isNaN(dateObj)) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        apiPayload.date_of_delivery = `${year}-${month}-${day}`;
    } else {
        // Fallback for direct date string if parsing failed
        apiPayload.date_of_delivery = payload.date.split('T')[0];
    }

    // 2. Weight (UI: weight (Number) -> API: weight_on_delivery (integer))
    apiPayload.weight_on_delivery = Math.round(Number(payload.weight));

    // 3. Worker Name (UI: workerName (string) -> API: name (string))
    apiPayload.name = payload.workerName;

    // 4. Price per Kg (UI: pricePerKg (Number) -> API: price_per_kg (integer))
    apiPayload.price_per_kg = Math.round(Number(payload.pricePerKg));

    // 5. Amount Paid (UI: amountPaid (Number) -> API: amount_paid (string))
    apiPayload.amount_paid = String(Number(payload.amountPaid).toFixed(2));

    // 6. Paid By (UI: paidBy (string like "RF001") -> API: paid_by (string))
    // Keep as string - API expects staff ID strings like "RF001", "RF002", etc.
    // Handle if paidBy is an object with id property
    if (typeof payload.paidBy === 'object' && payload.paidBy && payload.paidBy.id) {
        apiPayload.paid_by = payload.paidBy.id;
    } else {
        apiPayload.paid_by = String(payload.paidBy || '');
    }

    return apiPayload;
};

// --- Exported API Functions ---

/**
 * Handles the POST request to create a new Harvest record.
 */
export const postHarvestRecord = async (uiPayload) => {
    const apiPayload = mapToApiPayload(uiPayload);
    // Endpoint: aggregation/farmer-harvest/
    const endpoint = 'aggregation/farmer-harvest/';

    // Debug logging for payload
    console.log('[postHarvestRecord] Original UI payload:', uiPayload);
    console.log('[postHarvestRecord] Mapped API payload:', apiPayload);

    try {
        const response = await ApiService.post(endpoint, apiPayload);
        return { success: true, status: response.status, remoteData: response.data };
    } catch (error) {
        // Return 0 for status if network error (offline) to handle offline state robustly
        const status = error.response ? error.response.status : 0;
        const remoteData = error.response ? error.response.data : (error.message || 'Network Error');

        // Debug logging for error
        console.error('[postHarvestRecord] Error details:', {
            status,
            remoteData,
            endpoint,
            apiPayload
        });

        return { success: false, status: status, remoteData: remoteData };
    }
};

/**
 * Fetches a list of all harvest records from the API.
 */
export const fetchAllHarvestRecords = async () => {
    // Endpoint: aggregation/farmer-harvest/
    const endpoint = 'aggregation/farmer-harvest/';

    try {
        const response = await ApiService.get(endpoint);
        return { success: true, status: response.status, remoteData: response.data };
    } catch (error) {
        const status = error.response ? error.response.status : 0;
        const remoteData = error.response ? error.response.data : (error.message || 'Network Error');
        return { success: false, status: status, remoteData: remoteData };
    }
};

/**
 * Fetches a single harvest record by its ID.
 * @param {number} id - The integer ID of the harvest record to fetch.
 */
export const fetchHarvestRecordById = async (id) => {
    // API uses the integer ID field as the path parameter: aggregation/farmer-harvest/{id}/
    const endpoint = `aggregation/farmer-harvest/${id}/`;

    try {
        const response = await ApiService.get(endpoint);
        return { success: true, status: response.status, remoteData: response.data };
    } catch (error) {
        const status = error.response ? error.response.status : 0;
        const remoteData = error.response ? error.response.data : (error.message || 'Network Error');
        return { success: false, status: status, remoteData: remoteData };
    }
};

/**
 * Handles the DELETE request to remove a harvest record.
 * @param {number} id - The integer ID of the harvest record to delete.
 */
export const deleteHarvestRecord = async (id) => {
    const endpoint = `aggregation/farmer-harvest/${id}/`;

    try {
        const response = await ApiService.delete(endpoint);
        return { success: true, status: response.status, remoteData: response.data };
    } catch (error) {
        const status = error.response ? error.response.status : 0;
        const remoteData = error.response ? error.response.data : (error.message || 'Network Error');

        console.error('[deleteHarvestRecord] Error details:', {
            status,
            remoteData,
            endpoint,
            id
        });

        return { success: false, status: status, remoteData: remoteData };
    }
};

/**
 * Handles the PUT request to update an existing harvest record.
 * @param {number} id - The integer ID of the harvest record to update.
 * @param {object} uiPayload - The UI payload containing updated harvest data.
 */
export const updateHarvestRecord = async (id, uiPayload) => {
    const apiPayload = mapToApiPayload(uiPayload);
    const endpoint = `aggregation/farmer-harvest/${id}/`;

    console.log('[updateHarvestRecord] Original UI payload:', uiPayload);
    console.log('[updateHarvestRecord] Mapped API payload:', apiPayload);

    try {
        const response = await ApiService.put(endpoint, apiPayload);
        return { success: true, status: response.status, remoteData: response.data };
    } catch (error) {
        const status = error.response ? error.response.status : 0;
        const remoteData = error.response ? error.response.data : (error.message || 'Network Error');

        console.error('[updateHarvestRecord] Error details:', {
            status,
            remoteData,
            endpoint,
            apiPayload,
            id
        });

        return { success: false, status: status, remoteData: remoteData };
    }
};


// --- OFFLINE SYNC UTILITIES (NEW) ---

/**
 * Retrieves all unsynced harvest records from local storage queue.
 */
export const getUnsyncedRecords = async () => {
    try {
        const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const records = raw ? JSON.parse(raw) : [];
        return { success: true, records };
    } catch (error) {
        console.error("Error retrieving unsynced records:", error);
        return { success: false, records: [] };
    }
};

/**
 * Removes a record from the local queue after a successful sync.
 * We identify the record by its unique, generated ID (e.g., PA120825H).
 * @param {string} localId - The unique local ID of the record to remove.
 */
export const removeRecordFromQueue = async (localId) => {
    try {
        const { records: currentQueue } = await getUnsyncedRecords();
        
        // Filter out the record matching the localId
        const newQueue = currentQueue.filter(record => record.id !== localId);

        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(newQueue));
        return { success: true, remaining: newQueue.length };

    } catch (error) {
        console.error("Error removing record from queue:", error);
        return { success: false, remaining: -1 };
    }
};

/**
 * Tries to sync all locally saved records to the remote API.
 * This is the main function to call when connectivity is restored.
 */
export const syncAllRecords = async () => {
    const { success, records } = await getUnsyncedRecords();
    if (!success || records.length === 0) {
        console.log('[syncAllRecords] No records to sync');
        return { syncedCount: 0, totalCount: 0, failedRecords: [] };
    }

    let syncedCount = 0;
    const totalCount = records.length;
    const failedRecords = [];

    console.log(`[syncAllRecords] Attempting to sync ${totalCount} local records...`);
    console.log('[syncAllRecords] Records in queue:', JSON.stringify(records, null, 2));

    // Use a deep copy to iterate over, in case the queue is modified during iteration
    for (const record of records) {
        console.log(`[syncAllRecords] Processing record ${record.id}:`, JSON.stringify(record, null, 2));

        // Validate required fields before attempting sync
        const validationErrors = [];

        if (!record.paidBy) {
            validationErrors.push(`paidBy is missing or null`);
        } else if (typeof record.paidBy !== 'string') {
            validationErrors.push(`paidBy is not a string (type: ${typeof record.paidBy})`);
        } else if (record.paidBy.trim() === '') {
            validationErrors.push(`paidBy is an empty string`);
        }

        if (!record.workerName) {
            validationErrors.push(`workerName is missing`);
        }

        if (!record.date) {
            validationErrors.push(`date is missing`);
        }

        if (!record.weight && record.weight !== 0) {
            validationErrors.push(`weight is missing`);
        }

        if (validationErrors.length > 0) {
            console.warn(`[syncAllRecords] Skipping record ${record.id}: ${validationErrors.join(', ')}`);
            failedRecords.push({ id: record.id, reason: validationErrors.join(', ') });
            continue;
        }

        // We pass the local record object which mapToApiPayload will correctly transform.
        console.log(`[syncAllRecords] Attempting to POST record ${record.id} to API...`);
        const response = await postHarvestRecord(record);

        if (response.success) {
            // If successful, remove the record from the local queue
            console.log(`[syncAllRecords] Successfully synced record ${record.id}, removing from queue...`);
            await removeRecordFromQueue(record.id);
            syncedCount++;
        } else {
            // Failed (either offline or API issue). We log it and leave it in the queue
            // for the next sync attempt.
            console.error(`[syncAllRecords] Sync failed for record ${record.id}: Status ${response.status}`, {
                errorMessage: response.remoteData,
                record: record
            });
            failedRecords.push({ id: record.id, status: response.status, error: response.remoteData });
        }
    }

    console.log(`[syncAllRecords] Synchronization complete. Synced ${syncedCount} of ${totalCount} records.`);
    if (failedRecords.length > 0) {
        console.log(`[syncAllRecords] Failed records:`, JSON.stringify(failedRecords, null, 2));
    }

    return { syncedCount, totalCount, failedRecords };
};



















// // File: src/services/harvestRecord.js - Handles all API interactions for Harvest Records, now including offline sync utilities.

// import client from './apiClient'; // Corrected case to match actual filename
// import AsyncStorage from "@react-native-async-storage/async-storage"; // <-- Added for sync utilities

// const SYNC_QUEUE_KEY = "harvests_sync_queue"; // Key for the local queue of unsynced records

// // --- Internal Data Mapping (for POST) ---

// /**
//  * Maps the UI payload to the format expected by the backend API based on the provided schema.
//  *
//  * API Schema POST: { "date_of_harvest": "string", "quantity_harvest": "string", "crop_type": "string", "block": "2025-10-06" }
//  *
//  * @param {object} payload - The raw payload from the UI or the sync queue.
//  * @returns {object} The API-ready payload.
//  */
// const mapToApiPayload = (payload) => {
//     const apiPayload = {};

//     // 1. Date (UI: date (Date object/ISO string) -> API: date_of_harvest (YYYY-MM-DD string))
//     let dateObj = payload.date;
//     if (typeof dateObj === 'string') {
//          // Convert ISO string (from AsyncStorage) back to a Date object
//          dateObj = new Date(dateObj);
//     }
    
//     if (dateObj instanceof Date && !isNaN(dateObj)) {
//         const year = dateObj.getFullYear();
//         const month = String(dateObj.getMonth() + 1).padStart(2, '0');
//         const day = String(dateObj.getDate()).padStart(2, '0');
//         apiPayload.date_of_harvest = `${year}-${month}-${day}`;
//     } else if (typeof payload.date === 'string') {
//         // Fallback for string date if necessary
//         apiPayload.date_of_harvest = payload.date.split('T')[0];
//     }

//     // 2. Weight (UI: weight (Number) -> API: quantity_harvest (string/number))
//     apiPayload.quantity_harvest = String(Number(payload.weight)); 

//     // 3. Block (UI: block (string) -> API: block (string))
//     apiPayload.block = payload.block;

//     // Fields like grade, cherryColor, name, amountPaid, id are deliberately excluded from 
//     // the API payload as their mapping to the confirmed minimal API schema is uncertain.

//     return apiPayload;
// };

// // --- Exported API Functions ---

// /**
//  * Handles the POST request to create a new Harvest record.
//  */
// export const postHarvestRecord = async (uiPayload) => {
//     const apiPayload = mapToApiPayload(uiPayload);
//     // Endpoint: harvests/harvests/
//     const endpoint = 'harvests/harvests/';

//     try {
//         const response = await client.post(endpoint, apiPayload);
//         return { success: true, status: response.status, remoteData: response.data };
//     } catch (error) {
//         // Return 0 for status if network error (offline) to handle offline state robustly
//         const status = error.response ? error.response.status : 0;
//         const remoteData = error.response ? error.response.data : (error.message || 'Network Error');
//         return { success: false, status: status, remoteData: remoteData };
//     }
// };

// /**
//  * Fetches a list of all harvest records from the API.
//  */
// export const fetchAllHarvestRecords = async () => {
//     // Endpoint: harvests/harvests/
//     const endpoint = 'harvests/harvests/';

//     try {
//         const response = await client.get(endpoint);
//         return { success: true, status: response.status, remoteData: response.data };
//     } catch (error) {
//         const status = error.response ? error.response.status : 0;
//         const remoteData = error.response ? error.response.data : (error.message || 'Network Error');
//         return { success: false, status: status, remoteData: remoteData };
//     }
// };

// /**
//  * Fetches a single harvest record by its ID (which the API identifies as cherry_color integer).
//  * @param {number} cherryColorId - The integer ID (cherry_color) of the harvest record to fetch.
//  */
// export const fetchHarvestRecordById = async (cherryColorId) => {
//     // API uses the integer cherry_color field as the path parameter: harvests/harvests/{cherry_color}/
//     const endpoint = `harvests/harvests/${cherryColorId}/`;

//     try {
//         const response = await client.get(endpoint);
//         return { success: true, status: response.status, remoteData: response.data };
//     } catch (error) {
//         const status = error.response ? error.response.status : 0;
//         const remoteData = error.response ? error.response.data : (error.message || 'Network Error');
//         return { success: false, status: status, remoteData: remoteData };
//     }
// };


// // --- OFFLINE SYNC UTILITIES (NEW) ---

// /**
//  * Retrieves all unsynced harvest records from local storage queue.
//  */
// export const getUnsyncedRecords = async () => {
//     try {
//         const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
//         const records = raw ? JSON.parse(raw) : [];
//         return { success: true, records };
//     } catch (error) {
//         console.error("Error retrieving unsynced records:", error);
//         return { success: false, records: [] };
//     }
// };

// /**
//  * Removes a record from the local queue after a successful sync.
//  * We identify the record by its unique, generated ID (e.g., PA120825H).
//  * @param {string} localId - The unique local ID of the record to remove.
//  */
// export const removeRecordFromQueue = async (localId) => {
//     try {
//         const { records: currentQueue } = await getUnsyncedRecords();
        
//         // Filter out the record matching the localId
//         const newQueue = currentQueue.filter(record => record.id !== localId);

//         await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(newQueue));
//         return { success: true, remaining: newQueue.length };

//     } catch (error) {
//         console.error("Error removing record from queue:", error);
//         return { success: false, remaining: -1 };
//     }
// };

// /**
//  * Tries to sync all locally saved records to the remote API.
//  * This is the main function to call when connectivity is restored.
//  */
// export const syncAllRecords = async () => {
//     const { success, records } = await getUnsyncedRecords();
//     if (!success || records.length === 0) {
//         return { syncedCount: 0, totalCount: 0 };
//     }

//     let syncedCount = 0;
//     const totalCount = records.length;
    
//     console.log(`Attempting to sync ${totalCount} local records...`);

//     // Use a deep copy to iterate over, in case the queue is modified during iteration
//     for (const record of records) {
//         const response = await postHarvestRecord(record);

//         if (response.success) {
//             // If successful, remove the record from the local queue
//             await removeRecordFromQueue(record.id);
//             syncedCount++;
//         } else {
//             // Failed (either offline or API issue). We log it and leave it in the queue 
//             // for the next sync attempt.
//             console.warn(`Sync failed for record ${record.id}: Status ${response.status}`, response.remoteData);
//         }
//     }

//     console.log(`Synchronization complete. Synced ${syncedCount} of ${totalCount} records.`);

//     return { syncedCount, totalCount };
// };
