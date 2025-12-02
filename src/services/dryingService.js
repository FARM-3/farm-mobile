// File: src/services/dryingService.js - Handles all API interactions for Drying Records

import ApiService from './ApiService';
import AsyncStorage from "@react-native-async-storage/async-storage";

const SYNC_QUEUE_KEY = "drying_records_sync_queue";

/**
 * Maps the UI payload (camelCase) to the format expected by the backend API (snake_case).
 *
 * API expects all fields to be sent from frontend (offline-first, frontend does all calculations)
 */
const mapToApiPayload = (payload) => {
    const apiPayload = {};

    // Basic fields
    apiPayload.id = payload.id || null;
    apiPayload.processing_id = payload.processing_id || payload.processingId || '';
    apiPayload.lot_id = payload.lot_id || payload.lotId || '';
    apiPayload.weather_condition = payload.weather_condition || payload.weatherCondition || '';
    apiPayload.moisture_content = Number(payload.moisture_content || payload.moistureContent || 0);
    apiPayload.weight = payload.weight ? Number(payload.weight) : null;
    apiPayload.moisture_before = payload.moisture_before ? Number(payload.moisture_before) : null;
    apiPayload.weight_before = payload.weight_before ? Number(payload.weight_before) : null;

    // Calculated fields (calculated on frontend)
    apiPayload.processing_type = payload.processing_type || payload.processingType || '';
    apiPayload.type_of_coffee = payload.type_of_coffee || payload.typeOfCoffee || '';
    apiPayload.days = payload.days ? Number(payload.days) : null;
    apiPayload.moisture_deviation = payload.moisture_deviation ? Number(payload.moisture_deviation) : 0;
    apiPayload.rate_of_drying = payload.rate_of_drying ? Number(payload.rate_of_drying) : 0;
    apiPayload.rate_of_weightloss = payload.rate_of_weightloss ? Number(payload.rate_of_weightloss) : 0;
    apiPayload.outturn = payload.outturn ? Number(payload.outturn) : 0;
    apiPayload.outturn_deviation = payload.outturn_deviation ? Number(payload.outturn_deviation) : 0;

    // Date handling
    let dateObj = payload.date;
    if (typeof dateObj === 'string') {
        dateObj = new Date(dateObj);
    }
    if (dateObj instanceof Date && !isNaN(dateObj)) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        apiPayload.date = `${year}-${month}-${day}`;
    } else {
        apiPayload.date = payload.date ? payload.date.split('T')[0] : '';
    }

    return apiPayload;
};

/**
 * POST - Create a new drying record
 */
export const postDryingRecord = async (uiPayload) => {
    const apiPayload = mapToApiPayload(uiPayload);
    const endpoint = 'processing/drying/';

    console.log('[postDryingRecord] Original UI payload:', uiPayload);
    console.log('[postDryingRecord] Mapped API payload:', apiPayload);

    try {
        const response = await ApiService.post(endpoint, apiPayload);
        console.log('[postDryingRecord] Success:', response);

        return {
            success: true,
            remoteData: response.data,
            status: response.status
        };
    } catch (error) {
        console.error('[postDryingRecord] Error:', error);
        return {
            success: false,
            remoteData: error.response?.data || null,
            status: error.response?.status || 500,
            message: error.message
        };
    }
};

/**
 * GET - Fetch all drying records
 */
export const fetchAllDryingRecords = async () => {
    const endpoint = 'processing/drying/';

    try {
        const response = await ApiService.get(endpoint);
        console.log('[fetchAllDryingRecords] Success:', response);

        return {
            success: true,
            remoteData: response.data,
            status: response.status
        };
    } catch (error) {
        console.error('[fetchAllDryingRecords] Error:', error);
        return {
            success: false,
            remoteData: null,
            status: error.response?.status || 500,
            message: error.message
        };
    }
};

/**
 * GET - Fetch single drying record by ID
 */
export const fetchDryingRecordById = async (id) => {
    const endpoint = `processing/drying/${id}/`;

    try {
        const response = await ApiService.get(endpoint);
        console.log('[fetchDryingRecordById] Success:', response);

        return {
            success: true,
            remoteData: response.data,
            status: response.status
        };
    } catch (error) {
        console.error('[fetchDryingRecordById] Error:', error);
        return {
            success: false,
            remoteData: null,
            status: error.response?.status || 500,
            message: error.message
        };
    }
};

/**
 * PATCH/PUT - Update an existing drying record
 */
export const updateDryingRecord = async (id, uiPayload) => {
    const apiPayload = mapToApiPayload(uiPayload);
    const endpoint = `processing/drying/${id}/`;

    console.log('[updateDryingRecord] ID:', id);
    console.log('[updateDryingRecord] Mapped API payload:', apiPayload);

    try {
        const response = await ApiService.patch(endpoint, apiPayload);
        console.log('[updateDryingRecord] Success:', response);

        return {
            success: true,
            remoteData: response.data,
            status: response.status
        };
    } catch (error) {
        console.error('[updateDryingRecord] Error:', error);
        return {
            success: false,
            remoteData: error.response?.data || null,
            status: error.response?.status || 500,
            message: error.message
        };
    }
};

/**
 * DELETE - Delete a drying record
 */
export const deleteDryingRecord = async (id) => {
    const endpoint = `processing/drying/${id}/`;

    try {
        const response = await ApiService.delete(endpoint);
        console.log('[deleteDryingRecord] Success:', response);

        return {
            success: true,
            status: response.status
        };
    } catch (error) {
        console.error('[deleteDryingRecord] Error:', error);
        return {
            success: false,
            remoteData: error.response?.data || null,
            status: error.response?.status || 500,
            message: error.message
        };
    }
};

/**
 * Get unsynced drying records from local storage
 */
export const getUnsyncedDryingRecords = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const records = jsonValue != null ? JSON.parse(jsonValue) : [];

        console.log('[getUnsyncedDryingRecords] Found', records.length, 'unsynced records');

        return {
            success: true,
            records: records
        };
    } catch (error) {
        console.error('[getUnsyncedDryingRecords] Error:', error);
        return {
            success: false,
            records: []
        };
    }
};

/**
 * Sync all unsynced drying records to the backend
 */
export const syncAllDryingRecords = async () => {
    const { success, records } = await getUnsyncedDryingRecords();

    if (!success || records.length === 0) {
        console.log('[syncAllDryingRecords] No records to sync');
        return {
            totalCount: 0,
            syncedCount: 0,
            failedCount: 0
        };
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const record of records) {
        const result = await postDryingRecord(record);

        if (result.success) {
            syncedCount++;
            // Remove from queue
            await removeDryingRecordFromQueue(record.id);
        } else {
            failedCount++;
            console.error('[syncAllDryingRecords] Failed to sync record:', record.id);
        }
    }

    console.log(`[syncAllDryingRecords] Synced ${syncedCount}/${records.length} records`);

    return {
        totalCount: records.length,
        syncedCount,
        failedCount
    };
};

/**
 * Remove a drying record from the local sync queue
 */
export const removeDryingRecordFromQueue = async (recordId) => {
    try {
        const jsonValue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const records = jsonValue != null ? JSON.parse(jsonValue) : [];

        const updatedRecords = records.filter(r => r.id !== recordId);

        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedRecords));

        console.log('[removeDryingRecordFromQueue] Removed record:', recordId);

        return { success: true };
    } catch (error) {
        console.error('[removeDryingRecordFromQueue] Error:', error);
        return { success: false };
    }
};

/**
 * Get all processing IDs from the three processing forms' local storage
 */
export const getAllProcessingIds = async () => {
    try {
        const processingIds = [];

        // Storage keys for the three processing forms
        const storageKeys = [
            'fermenting_records',
            'natural_sundrying_records',
            'washing_records'
        ];

        for (const key of storageKeys) {
            const jsonValue = await AsyncStorage.getItem(key);
            const records = jsonValue != null ? JSON.parse(jsonValue) : [];

            // Extract processing_id from each record
            records.forEach(record => {
                if (record.processing_id) {
                    processingIds.push({
                        id: record.processing_id,
                        name: record.processing_id,
                        type: key.replace('_records', '').replace('natural_', '') // e.g., 'fermenting', 'sundrying', 'washing'
                    });
                }
            });
        }

        console.log('[getAllProcessingIds] Found', processingIds.length, 'processing IDs');

        return {
            success: true,
            processingIds: processingIds
        };
    } catch (error) {
        console.error('[getAllProcessingIds] Error:', error);
        return {
            success: false,
            processingIds: []
        };
    }
};
