// src/services/fermentingService.js
// Fermenting records service - handles CRUD operations and offline sync

import ApiService from './ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_QUEUE_KEY = 'fermenting_records';
const API_ENDPOINT = '/processing/fermenting/';

/**
 * Fetch all fermenting records from backend
 */
export const fetchAllFermentingRecords = async () => {
    try {
        const response = await ApiService.get(API_ENDPOINT);
        return {
            success: true,
            remoteData: response.results || response,
        };
    } catch (error) {
        console.error('[FermentingService] Fetch error:', error.message);
        return {
            success: false,
            remoteData: [],
            error: error.message,
        };
    }
};

/**
 * Get unsynced fermenting records from local storage
 */
export const getUnsyncedFermentingRecords = async () => {
    try {
        const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const records = stored ? JSON.parse(stored) : [];
        return {
            success: true,
            records,
        };
    } catch (error) {
        console.error('[FermentingService] Get unsynced error:', error);
        return {
            success: false,
            records: [],
        };
    }
};

/**
 * Save a new fermenting record to local storage queue
 */
export const postFermentingRecord = async (record) => {
    try {
        const { records: currentRecords } = await getUnsyncedFermentingRecords();
        const newRecord = {
            ...record,
            processing_id: record.processing_id || `local_${Date.now()}`,
            isSynced: false,
        };
        const updatedRecords = [...currentRecords, newRecord];
        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedRecords));

        console.log('[FermentingService] Record saved locally:', newRecord);
        return {
            success: true,
            record: newRecord,
        };
    } catch (error) {
        console.error('[FermentingService] Post error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Update a fermenting record (local or remote)
 */
export const updateFermentingRecord = async (processingId, record) => {
    try {
        // First try to update locally
        const { records: currentRecords } = await getUnsyncedFermentingRecords();
        const recordIndex = currentRecords.findIndex(r => r.processing_id === processingId);

        if (recordIndex !== -1) {
            // Update local record
            currentRecords[recordIndex] = { ...currentRecords[recordIndex], ...record, isSynced: false };
            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(currentRecords));
            return {
                success: true,
                record: currentRecords[recordIndex],
            };
        }

        // If not found locally, try to update on backend (for synced records)
        if (!processingId.startsWith('local_') && !processingId.startsWith('FERM-')) {
            const response = await ApiService.patch(`${API_ENDPOINT}${processingId}/`, record);
            return {
                success: true,
                record: response,
            };
        }

        return {
            success: false,
            error: 'Record not found',
        };
    } catch (error) {
        console.error('[FermentingService] Update error:', error.message);
        return {
            success: false,
            status: error.status,
            error: error.message,
        };
    }
};

/**
 * Delete a fermenting record
 */
export const deleteFermentingRecord = async (processingId) => {
    try {
        // If it's a local ID, just remove from local storage
        if (String(processingId).startsWith('local_') || String(processingId).startsWith('FERM-')) {
            const { records: currentRecords } = await getUnsyncedFermentingRecords();
            const filteredRecords = currentRecords.filter(r => r.processing_id !== processingId);
            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filteredRecords));
            return { success: true };
        }

        // Otherwise, call backend API
        await ApiService.delete(`${API_ENDPOINT}${processingId}/`);
        return { success: true };
    } catch (error) {
        console.error('[FermentingService] Delete error:', error.message);
        return {
            success: false,
            status: error.status,
            error: error.message,
        };
    }
};

/**
 * Sync all unsynced fermenting records to backend
 */
export const syncAllFermentingRecords = async () => {
    try {
        const { records: unsyncedRecords } = await getUnsyncedFermentingRecords();

        // Filter only unsynced records
        const recordsToSync = unsyncedRecords.filter(r => !r.isSynced);

        if (recordsToSync.length === 0) {
            console.log('[FermentingService] No records to sync');
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
                    console.log('[FermentingService] Original record:', JSON.stringify(record, null, 2));

                    // Prepare data for API - match backend model schema
                    // Backend expects: processing_id (from frontend), grade, start_date, end_date, weight
                    const recordData = {
                        processing_id: record.processing_id, // Send frontend-generated ID
                        grade: record.grade,
                        start_date: record.start_date,
                        end_date: record.end_date,
                        weight: String(record.weight),
                    };

                    console.log('[FermentingService] Prepared data for API:', JSON.stringify(recordData, null, 2));
                    console.log('[FermentingService] Making POST request to:', API_ENDPOINT);

                    const response = await ApiService.post(API_ENDPOINT, recordData);

                    updatedRecords.push({
                        ...record,
                        id: response.id,
                        processing_id: response.processing_id, // Use backend-generated ID
                        days: response.days, // Use backend-calculated days
                        isSynced: true,
                    });
                    syncedCount++;
                    console.log('[FermentingService] Synced record successfully:', response.processing_id);
                } else {
                    // Keep already synced records as is
                    updatedRecords.push(record);
                }
            } catch (error) {
                console.error(`[FermentingService] ❌ Sync failed for record ${record.processing_id}:`, error.message);
                console.error('[FermentingService] Full error object:', error);

                if (error.response) {
                    console.error('[FermentingService] Error status:', error.response.status);
                    console.error('[FermentingService] Error headers:', error.response.headers);

                    // Try to extract meaningful error from HTML response
                    if (typeof error.response.data === 'string') {
                        // Extract first 500 chars of HTML error
                        const preview = error.response.data.substring(0, 500);
                        console.error('[FermentingService] Error response preview:', preview);

                        // Try to find error message in HTML
                        const errorMatch = error.response.data.match(/<h1>(.*?)<\/h1>/);
                        if (errorMatch) {
                            console.error('[FermentingService] Error title:', errorMatch[1]);
                        }

                        // Look for exception value
                        const exceptionMatch = error.response.data.match(/<pre class="exception_value">(.*?)<\/pre>/s);
                        if (exceptionMatch) {
                            console.error('[FermentingService] Exception:', exceptionMatch[1]);
                        }
                    } else {
                        console.error('[FermentingService] Error data:', error.response.data);
                    }
                }

                if (error.config) {
                    console.error('[FermentingService] Request config:', {
                        url: error.config.url,
                        method: error.config.method,
                        data: error.config.data,
                    });
                }

                updatedRecords.push(record); // Keep failed record in queue
            }
        }

        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedRecords));

        return {
            success: syncedCount > 0,
            totalCount: recordsToSync.length,
            syncedCount,
        };
    } catch (error) {
        console.error('[FermentingService] Sync error:', error);
        return {
            success: false,
            totalCount: 0,
            syncedCount: 0,
            error: error.message,
        };
    }
};
