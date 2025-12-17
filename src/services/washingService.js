// src/services/washingService.js
// Washing records service - handles CRUD operations and offline sync

import ApiService from './ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_QUEUE_KEY = 'washing_records';
const API_ENDPOINT = '/processing/washing/';

/**
 * Fetch all washing records from backend
 */
export const fetchAllWashingRecords = async () => {
    try {
        const response = await ApiService.get(API_ENDPOINT);
        return {
            success: true,
            remoteData: response.results || response,
        };
    } catch (error) {
        console.error('[WashingService] Fetch error:', error.message);
        return {
            success: false,
            remoteData: [],
            error: error.message,
        };
    }
};

/**
 * Get unsynced washing records from local storage
 */
export const getUnsyncedWashingRecords = async () => {
    try {
        const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const records = stored ? JSON.parse(stored) : [];
        return {
            success: true,
            records,
        };
    } catch (error) {
        console.error('[WashingService] Get unsynced error:', error);
        return {
            success: false,
            records: [],
        };
    }
};

/**
 * Sync all unsynced washing records to backend
 */
export const syncAllWashingRecords = async () => {
    try {
        const { records: unsyncedRecords } = await getUnsyncedWashingRecords();

        // Filter only unsynced records
        const recordsToSync = unsyncedRecords.filter(r => !r.isSynced);

        if (recordsToSync.length === 0) {
            console.log('[WashingService] No records to sync');
            return {
                success: true,
                totalCount: 0,
                syncedCount: 0,
            };
        }

        let syncedCount = 0;
        const updatedRecords = [];

        for (const record of unsyncedRecords) {
            try {
                if (!record.isSynced) {
                    // Log the full record first
                    console.log('[WashingService] Original record:', JSON.stringify(record, null, 2));

                    // Prepare data for API - match backend model schema
                    // Backend expects: processing_id, grade_ids (array), date, weight
                    // The 'grade' field is deprecated and only for backward compatibility
                    const recordData = {
                        processing_id: record.processing_id, // Send frontend-generated ID
                        grade_ids: record.grade_ids || [], // Array of grade IDs for batch processing
                        grade: record.is_batch ? null : (record.grade || null), // Only for single grade (backward compatibility)
                        date: record.date,
                        weight: String(record.weight),
                    };

                    console.log('[WashingService] Prepared data for API:', JSON.stringify(recordData, null, 2));
                    console.log('[WashingService] Making POST request to:', API_ENDPOINT);

                    const response = await ApiService.post(API_ENDPOINT, recordData);

                    updatedRecords.push({
                        ...record,
                        id: response.id,
                        processing_id: response.processing_id, // Use backend response
                        isSynced: true,
                    });
                    syncedCount++;
                    console.log('[WashingService] Synced record successfully:', response.processing_id);
                } else {
                    // Keep already synced records as is
                    updatedRecords.push(record);
                }
            } catch (error) {
                console.error(`[WashingService] ❌ Sync failed for record ${record.processing_id}:`, error.message);
                console.error('[WashingService] Full error object:', error);

                // Check if this is a duplicate error (record already exists)
                if (error.response?.status === 400 &&
                    error.response?.data?.processing_id &&
                    error.response?.data?.processing_id[0]?.includes('already exists')) {

                    console.log('[WashingService] ⚠️ Record already exists on backend, marking as synced locally');
                    updatedRecords.push({
                        ...record,
                        isSynced: true, // Mark as synced since it exists on backend
                    });
                    syncedCount++;
                } else {
                    // Other errors - log details
                    if (error.response) {
                        console.error('[WashingService] Error status:', error.response.status);
                        console.error('[WashingService] Error headers:', error.response.headers);
                        console.error('[WashingService] Error data:', error.response.data);
                    }

                    if (error.config) {
                        console.error('[WashingService] Request config:', {
                            url: error.config.url,
                            method: error.config.method,
                            data: error.config.data,
                        });
                    }

                    updatedRecords.push(record); // Keep failed record in queue
                }
            }
        }

        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedRecords));

        return {
            success: syncedCount > 0,
            totalCount: recordsToSync.length,
            syncedCount,
        };
    } catch (error) {
        console.error('[WashingService] Sync error:', error);
        return {
            success: false,
            totalCount: 0,
            syncedCount: 0,
            error: error.message,
        };
    }
};
