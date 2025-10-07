// File: src/services/harvestRecord.js - Handles all API interactions for Harvest Records, now including offline sync utilities.

import client from './ApiClient'; // Corrected case to match actual filename
import AsyncStorage from "@react-native-async-storage/async-storage"; // <-- Added for sync utilities

const SYNC_QUEUE_KEY = "harvests_sync_queue"; // Key for the local queue of unsynced records

// --- Internal Data Mapping (for POST) ---

/**
 * Maps the UI payload (camelCase, internal flags) to the format expected by the backend API (snake_case, strings).
 *
 * API Schema POST: { "grade": "string", "weight": "string", "block": "string", "cherry_color": "string", "date": "string", "name": "string", "amount_paid": "string" }
 *
 * @param {object} payload - The raw payload from the UI or the sync queue.
 * @returns {object} The API-ready payload.
 */
const mapToApiPayload = (payload) => {
    const apiPayload = {};

    // 1. Date (UI: date (Date object/ISO string) -> API: date (YYYY-MM-DD string))
    let dateObj = payload.date;
    if (typeof dateObj === 'string') {
        // Convert ISO string (from AsyncStorage) back to a Date object
        dateObj = new Date(dateObj);
    }
    
    if (dateObj instanceof Date && !isNaN(dateObj)) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        apiPayload.date = `${year}-${month}-${day}`; // Corrected API key: 'date'
    } else {
        // Fallback for direct date string if parsing failed
        apiPayload.date = payload.date.split('T')[0];
    }

    // 2. Weight (UI: weight (Number) -> API: weight (string))
    // API expects weight as a string
    apiPayload.weight = String(Number(payload.weight)); 

    // 3. Block (UI: block (string) -> API: block (string))
    apiPayload.block = payload.block;

    // 4. Grade (UI: grade (string) -> API: grade (string))
    apiPayload.grade = payload.grade;

    // 5. Cherry Color (UI: cherryColor (string) -> API: cherry_color (string))
    apiPayload.cherry_color = payload.cherryColor;

    // 6. Name (UI: name (string) -> API: name (string))
    apiPayload.name = payload.name;

    // 7. Amount Paid (UI: amountPaid (Number) -> API: amount_paid (string))
    // API expects amount_paid as a string
    apiPayload.amount_paid = String(Number(payload.amountPaid));

    return apiPayload;
};

// --- Exported API Functions ---

/**
 * Handles the POST request to create a new Harvest record.
 */
export const postHarvestRecord = async (uiPayload) => {
    const apiPayload = mapToApiPayload(uiPayload);
    // Endpoint: /api/harvests/harvests/
    const endpoint = '/api/harvests/harvests/';

    try {
        const response = await client.post(endpoint, apiPayload);
        return { success: true, status: response.status, remoteData: response.data };
    } catch (error) {
        // Return 0 for status if network error (offline) to handle offline state robustly
        const status = error.response ? error.response.status : 0;
        const remoteData = error.response ? error.response.data : (error.message || 'Network Error');
        return { success: false, status: status, remoteData: remoteData };
    }
};

/**
 * Fetches a list of all harvest records from the API.
 */
export const fetchAllHarvestRecords = async () => {
    // Endpoint: /api/harvests/harvests/
    const endpoint = '/api/harvests/harvests/';

    try {
        const response = await client.get(endpoint);
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
    // API uses the integer ID field as the path parameter: /api/harvests/harvests/{id}/
    const endpoint = `/api/harvests/harvests/${id}/`;

    try {
        const response = await client.get(endpoint);
        return { success: true, status: response.status, remoteData: response.data };
    } catch (error) {
        const status = error.response ? error.response.status : 0;
        const remoteData = error.response ? error.response.data : (error.message || 'Network Error');
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
        return { syncedCount: 0, totalCount: 0 };
    }

    let syncedCount = 0;
    const totalCount = records.length;
    
    console.log(`Attempting to sync ${totalCount} local records...`);

    // Use a deep copy to iterate over, in case the queue is modified during iteration
    for (const record of records) {
        // We pass the local record object which mapToApiPayload will correctly transform.
        const response = await postHarvestRecord(record);

        if (response.success) {
            // If successful, remove the record from the local queue
            await removeRecordFromQueue(record.id);
            syncedCount++;
        } else {
            // Failed (either offline or API issue). We log it and leave it in the queue 
            // for the next sync attempt.
            console.warn(`Sync failed for record ${record.id}: Status ${response.status}`, response.remoteData);
        }
    }

    console.log(`Synchronization complete. Synced ${syncedCount} of ${totalCount} records.`);

    return { syncedCount, totalCount };
};



















// // File: src/services/harvestRecord.js - Handles all API interactions for Harvest Records, now including offline sync utilities.

// import client from './ApiClient'; // Corrected case to match actual filename
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
//     // Endpoint: /api/harvests/harvests/
//     const endpoint = '/api/harvests/harvests/';

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
//     // Endpoint: /api/harvests/harvests/
//     const endpoint = '/api/harvests/harvests/';

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
//     // API uses the integer cherry_color field as the path parameter: /api/harvests/harvests/{cherry_color}/
//     const endpoint = `/api/harvests/harvests/${cherryColorId}/`;

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
