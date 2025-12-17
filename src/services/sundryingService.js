// src/services/sundryingService.js
// Natural Sundrying records service - handles CRUD operations and offline sync

import ApiService from './ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_QUEUE_KEY = 'natural_sundrying_records';
const API_ENDPOINT = '/processing/sundrying/'; // Backend uses 'sundrying' not 'natural-sundrying'

/**
 * Fetch all natural sundrying records from backend
 */
export const fetchAllSundryingRecords = async () => {
    try {
        const response = await ApiService.get(API_ENDPOINT);
        return {
            success: true,
            remoteData: response.results || response,
        };
    } catch (error) {
        console.error('[SundryingService] Fetch error:', error.message);
        return {
            success: false,
            remoteData: [],
            error: error.message,
        };
    }
};

/**
 * Get unsynced natural sundrying records from local storage
 */
export const getUnsyncedSundryingRecords = async () => {
    try {
        const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        const records = stored ? JSON.parse(stored) : [];
        return {
            success: true,
            records,
        };
    } catch (error) {
        console.error('[SundryingService] Get unsynced error:', error);
        return {
            success: false,
            records: [],
        };
    }
};

/**
 * Sync all unsynced natural sundrying records to backend
 */
export const syncAllSundryingRecords = async () => {
    try {
        const { records: unsyncedRecords } = await getUnsyncedSundryingRecords();

        // Filter only unsynced records
        const recordsToSync = unsyncedRecords.filter(r => !r.isSynced);

        if (recordsToSync.length === 0) {
            console.log('[SundryingService] No records to sync');
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
                    console.log('[SundryingService] Original record:', JSON.stringify(record, null, 2));

                    // Prepare data for API - match backend model schema
                    // Backend expects: processing_id, grade_ids (array), start_date, weight
                    // The 'grade' field is deprecated and only for backward compatibility
                    const recordData = {
                        processing_id: record.processing_id, // Send frontend-generated ID
                        grade_ids: record.grade_ids || [], // Array of grade IDs for batch processing
                        grade: record.is_batch ? null : (record.grade || null), // Only for single grade (backward compatibility)
                        start_date: record.start_date,
                        weight: String(record.weight),
                    };

                    console.log('[SundryingService] Prepared data for API:', JSON.stringify(recordData, null, 2));
                    console.log('[SundryingService] Making POST request to:', API_ENDPOINT);

                    const response = await ApiService.post(API_ENDPOINT, recordData);

                    updatedRecords.push({
                        ...record,
                        id: response.id,
                        processing_id: response.processing_id, // Use backend response
                        isSynced: true,
                    });
                    syncedCount++;
                    console.log('[SundryingService] Synced record successfully:', response.processing_id);
                } else {
                    // Keep already synced records as is
                    updatedRecords.push(record);
                }
            } catch (error) {
                console.error(`[SundryingService] ❌ Sync failed for record ${record.processing_id}:`, error.message);
                console.error('[SundryingService] Full error object:', JSON.stringify(error, null, 2));

                // Enhanced error logging
                console.error('[SundryingService] Error details:', {
                    hasResponse: !!error.response,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    isAxiosError: error.isAxiosError,
                    code: error.code,
                });

                // Check if this is a duplicate error (record already exists)
                if (error.response?.status === 400 &&
                    error.response?.data?.processing_id &&
                    error.response?.data?.processing_id[0]?.includes('already exists')) {

                    console.log('[SundryingService] ⚠️ Record already exists on backend, marking as synced locally');
                    updatedRecords.push({
                        ...record,
                        isSynced: true, // Mark as synced since it exists on backend
                    });
                    syncedCount++;
                } else {
                    // Other errors - log details
                    if (error.response) {
                        console.error('[SundryingService] ═══ RESPONSE ERROR DETAILS ═══');
                        console.error('[SundryingService] Status:', error.response.status);
                        console.error('[SundryingService] Status Text:', error.response.statusText);
                        console.error('[SundryingService] Headers:', JSON.stringify(error.response.headers, null, 2));

                        // Try to extract meaningful error from HTML response
                        if (typeof error.response.data === 'string') {
                            console.error('[SundryingService] Response is HTML string, length:', error.response.data.length);

                            // Extract first 1000 chars of HTML error
                            const preview = error.response.data.substring(0, 1000);
                            console.error('[SundryingService] HTML Preview:', preview);

                            // Try to find error message in HTML
                            const errorMatch = error.response.data.match(/<h1>(.*?)<\/h1>/);
                            if (errorMatch) {
                                console.error('[SundryingService] HTML Error Title:', errorMatch[1]);
                            }

                            // Look for exception value
                            const exceptionMatch = error.response.data.match(/<pre class="exception_value">(.*?)<\/pre>/s);
                            if (exceptionMatch) {
                                console.error('[SundryingService] HTML Exception:', exceptionMatch[1]);
                            }

                            // Look for request URL in error page
                            const urlMatch = error.response.data.match(/Request URL:.*?<code>(.*?)<\/code>/s);
                            if (urlMatch) {
                                console.error('[SundryingService] Request URL from HTML:', urlMatch[1]);
                            }
                        } else {
                            console.error('[SundryingService] Response Data (JSON):', JSON.stringify(error.response.data, null, 2));
                        }
                    }

                    if (error.config) {
                        console.error('[SundryingService] ═══ REQUEST CONFIG ═══');
                        console.error('[SundryingService] Full URL:', error.config.baseURL + error.config.url);
                        console.error('[SundryingService] Base URL:', error.config.baseURL);
                        console.error('[SundryingService] Endpoint:', error.config.url);
                        console.error('[SundryingService] Method:', error.config.method);
                        console.error('[SundryingService] Headers:', JSON.stringify(error.config.headers, null, 2));
                        console.error('[SundryingService] Data:', error.config.data);
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
        console.error('[SundryingService] Sync error:', error);
        return {
            success: false,
            totalCount: 0,
            syncedCount: 0,
            error: error.message,
        };
    }
};
