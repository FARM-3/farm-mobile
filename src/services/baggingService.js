// src/services/baggingService.js
// Bagging records service - handles CRUD operations and offline sync

import ApiService from './ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_QUEUE_KEY = 'bagging_records_sync_queue';
const API_ENDPOINT = '/processing/bagging/';

/**
 * Fetch all bagging records from backend
 */
export const fetchAllBaggingRecords = async () => {
    try {
        const response = await ApiService.get(API_ENDPOINT);
        return {
            success: true,
            remoteData: response.results || response,
        };
    } catch (error) {
        console.error('[BaggingService] Fetch error:', error.message);
        return {
            success: false,
            remoteData: [],
            error: error.message,
        };
    }
};

/**
 * Get unsynced bagging records from local storage
 */
export const getUnsyncedBaggingRecords = async () => {
    try {
        const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const records = stored ? JSON.parse(stored) : [];
        return {
            success: true,
            records,
        };
    } catch (error) {
        console.error('[BaggingService] Get unsynced error:', error);
        return {
            success: false,
            records: [],
        };
    }
};

/**
 * Save a new bagging record to local storage queue
 */
export const postBaggingRecord = async (record) => {
    try {
        const { records: currentRecords } = await getUnsyncedBaggingRecords();
        const newRecord = {
            ...record,
            id: record.id || `local_${Date.now()}`,
            synced: false,
        };
        const updatedRecords = [...currentRecords, newRecord];
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedRecords));

        console.log('[BaggingService] Record saved locally:', newRecord);
        return {
            success: true,
            record: newRecord,
        };
    } catch (error) {
        console.error('[BaggingService] Post error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Update a bagging record (backend call for synced records)
 */
export const updateBaggingRecord = async (id, record) => {
    try {
        const response = await ApiService.patch(`${API_ENDPOINT}${id}/`, record);
        return {
            success: true,
            record: response,
        };
    } catch (error) {
        console.error('[BaggingService] Update error:', error.message);
        return {
            success: false,
            status: error.status,
            error: error.message,
        };
    }
};

/**
 * Delete a bagging record
 */
export const deleteBaggingRecord = async (id) => {
    try {
        // If it's a local ID, just remove from local storage
        if (String(id).startsWith('local_')) {
            const { records: currentRecords } = await getUnsyncedBaggingRecords();
            const filteredRecords = currentRecords.filter(r => r.id !== id);
            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filteredRecords));
            return { success: true };
        }

        // Otherwise, call backend API
        await ApiService.delete(`${API_ENDPOINT}${id}/`);
        return { success: true };
    } catch (error) {
        console.error('[BaggingService] Delete error:', error.message);
        return {
            success: false,
            status: error.status,
            error: error.message,
        };
    }
};

/**
 * Sync all unsynced bagging records to backend
 */
export const syncAllBaggingRecords = async () => {
    try {
        const { records: unsyncedRecords } = await getUnsyncedBaggingRecords();

        let syncedCount = 0;
        const updatedRecords = [];

        for (const record of unsyncedRecords) {
            try {
                if (String(record.id).startsWith('local_')) {
                    // Create new record on backend
                    const { id: localId, synced, ...recordData } = record;
                    const response = await ApiService.post(API_ENDPOINT, recordData);
                    updatedRecords.push({
                        ...record,
                        id: response.id,
                        synced: true,
                    });
                    syncedCount++;
                } else {
                    // Update existing record
                    const { synced, ...recordData } = record;
                    await ApiService.patch(`${API_ENDPOINT}${record.id}/`, recordData);
                    updatedRecords.push({
                        ...record,
                        synced: true,
                    });
                    syncedCount++;
                }
            } catch (error) {
                console.error(`[BaggingService] Sync failed for record ${record.id}:`, error.message);
                updatedRecords.push(record); // Keep failed record in queue
            }
        }

        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedRecords));

        return {
            success: syncedCount > 0,
            totalCount: unsyncedRecords.length,
            syncedCount,
        };
    } catch (error) {
        console.error('[BaggingService] Sync error:', error);
        return {
            success: false,
            totalCount: 0,
            syncedCount: 0,
        };
    }
};

/**
 * Fetch available lot IDs from drying records
 */
export const fetchAvailableLotIds = async () => {
    try {
        const response = await ApiService.get('/processing/drying/');
        const dryingRecords = response.results || response;
        const uniqueLots = [...new Set(dryingRecords.map(r => r.lot_id))].sort();
        return {
            success: true,
            lots: uniqueLots,
        };
    } catch (error) {
        console.error('[BaggingService] Fetch lots error:', error.message);
        return {
            success: false,
            lots: [],
        };
    }
};

/**
 * Fetch drying record for a specific lot ID (to get first weight for outturn calculation)
 */
export const fetchDryingRecordForLot = async (lotId) => {
    try {
        const response = await ApiService.get('/processing/drying/', {
            params: { lot_id: lotId },
        });
        const records = response.results || response;
        if (records.length === 0) return { success: false, record: null };

        // Return the first (earliest) drying record for this lot
        const sorted = records.sort((a, b) => new Date(a.date) - new Date(b.date));
        return {
            success: true,
            record: sorted[0],
        };
    } catch (error) {
        console.error('[BaggingService] Fetch drying record error:', error.message);
        return {
            success: false,
            record: null,
        };
    }
};
