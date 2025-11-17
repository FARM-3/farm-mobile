// File: src/services/SyncLogService.js - Persistent logging for sync operations
// Logs are stored in AsyncStorage and can be viewed at any time

import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_LOG_KEY = 'sync_debug_logs';
const MAX_LOG_ENTRIES = 100; // Keep last 100 sync log entries

/**
 * Add a sync log entry (persisted in AsyncStorage)
 * @param {string} module - Module name (e.g., 'productionHarvestService')
 * @param {string} operation - Operation (e.g., 'POST', 'PUT', 'SYNC')
 * @param {string} status - Status (e.g., 'SUCCESS', 'ERROR', 'PENDING')
 * @param {string} message - Log message
 * @param {object} details - Additional details (payload, response, error)
 */
export const addSyncLog = async (module, operation, status, message, details = {}) => {
    try {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            module,
            operation,
            status,
            message,
            details: {
                ...details,
                // Don't log large payloads - just capture key info
                harvest_id: details.harvest_id || details.payload?.harvest_id,
                response_status: details.status,
                error_message: details.error_message,
            },
        };

        // Get existing logs
        const logsJson = await AsyncStorage.getItem(SYNC_LOG_KEY);
        let logs = logsJson ? JSON.parse(logsJson) : [];

        // Add new entry
        logs.push(logEntry);

        // Keep only last MAX_LOG_ENTRIES
        if (logs.length > MAX_LOG_ENTRIES) {
            logs = logs.slice(-MAX_LOG_ENTRIES);
        }

        // Save back to storage
        await AsyncStorage.setItem(SYNC_LOG_KEY, JSON.stringify(logs));

        // Also log to console for real-time visibility
        console.log(`[${module}] [${operation}] [${status}] ${message}`);
    } catch (error) {
        console.error('[SyncLogService] Error writing log:', error);
    }
};

/**
 * Get all sync logs
 * @returns {Promise<Array>} Array of log entries
 */
export const getSyncLogs = async () => {
    try {
        const logsJson = await AsyncStorage.getItem(SYNC_LOG_KEY);
        return logsJson ? JSON.parse(logsJson) : [];
    } catch (error) {
        console.error('[SyncLogService] Error reading logs:', error);
        return [];
    }
};

/**
 * Get sync logs filtered by module/status
 * @param {string} module - Filter by module (optional)
 * @param {string} status - Filter by status: 'ERROR', 'SUCCESS', 'PENDING' (optional)
 * @returns {Promise<Array>} Filtered log entries
 */
export const getFilteredSyncLogs = async (module, status) => {
    try {
        const logs = await getSyncLogs();
        return logs.filter(log => {
            if (module && log.module !== module) return false;
            if (status && log.status !== status) return false;
            return true;
        });
    } catch (error) {
        console.error('[SyncLogService] Error filtering logs:', error);
        return [];
    }
};

/**
 * Get last N sync errors for debugging
 * @param {number} count - Number of errors to return (default: 10)
 * @returns {Promise<Array>} Last N error entries
 */
export const getRecentErrors = async (count = 10) => {
    try {
        const errorLogs = await getFilteredSyncLogs(null, 'ERROR');
        return errorLogs.slice(-count);
    } catch (error) {
        console.error('[SyncLogService] Error getting recent errors:', error);
        return [];
    }
};

/**
 * Clear all sync logs
 */
export const clearSyncLogs = async () => {
    try {
        await AsyncStorage.removeItem(SYNC_LOG_KEY);
        console.log('[SyncLogService] All sync logs cleared');
    } catch (error) {
        console.error('[SyncLogService] Error clearing logs:', error);
    }
};

/**
 * Format and print sync logs to console (for debugging)
 */
export const printSyncLogs = async () => {
    try {
        const logs = await getSyncLogs();
        console.log('\n' + '='.repeat(80));
        console.log('SYNC DEBUG LOGS - Last 50 entries');
        console.log('='.repeat(80));

        logs.slice(-50).forEach((log, index) => {
            console.log(
                `\n[${index + 1}] ${log.timestamp}`
            );
            console.log(
                `    Module: ${log.module} | Op: ${log.operation} | Status: ${log.status}`
            );
            console.log(`    Message: ${log.message}`);

            if (log.details?.harvest_id) {
                console.log(`    Harvest ID: ${log.details.harvest_id}`);
            }
            if (log.details?.response_status) {
                console.log(`    HTTP Status: ${log.details.response_status}`);
            }
            if (log.details?.error_message) {
                console.log(`    Error: ${log.details.error_message}`);
            }
        });

        console.log('\n' + '='.repeat(80));
        console.log(`Total logs: ${logs.length}`);
        console.log('='.repeat(80) + '\n');
    } catch (error) {
        console.error('[SyncLogService] Error printing logs:', error);
    }
};

export default {
    addSyncLog,
    getSyncLogs,
    getFilteredSyncLogs,
    getRecentErrors,
    clearSyncLogs,
    printSyncLogs,
};
