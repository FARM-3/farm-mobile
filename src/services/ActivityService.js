// File: src/services/ActivityService.js - Handles activity tracking for CRUD operations

import ApiService from './ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './AuthService';

const ACTIVITY_STORAGE_KEY = 'local_activities';
const MAX_LOCAL_ACTIVITIES = 50; // Keep last 50 activities locally

/**
 * Activity Types
 */
export const ActivityTypes = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    SYNC: 'SYNC',
};

/**
 * Entity Types
 */
export const EntityTypes = {
    FARMER: 'Farmer',
    HARVEST: 'Harvest',
    PRODUCTION_HARVEST: 'Production Harvest',
    BLOCK: 'Block',
    PROCESSING: 'Processing',
};

/**
 * Log an activity locally and optionally sync to backend
 * @param {Object} activityData - Activity data
 * @param {string} activityData.action - Action type (CREATE, UPDATE, DELETE)
 * @param {string} activityData.entityType - Entity type (Farmer, Harvest, etc.)
 * @param {string} activityData.entityId - ID of the affected entity
 * @param {string} activityData.objectRepr - Human-readable representation
 * @param {Object} activityData.metadata - Additional metadata
 * @returns {Promise<Object>} Result of logging activity
 */
export const logActivity = async (activityData) => {
    try {
        // Get current user
        const user = await AuthService.getStoredUser();
        const userName = user?.name || user?.first_name || user?.username || 'Unknown User';
        const userId = user?.id || null;

        // Create activity record
        const activity = {
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            action: activityData.action,
            entity_type: activityData.entityType,
            entity_id: activityData.entityId,
            object_repr: activityData.objectRepr,
            user_name: userName,
            user_id: userId,
            timestamp: new Date().toISOString(),
            metadata: activityData.metadata || {},
            synced: false,
        };

        console.log('[ActivityService] Logging activity:', activity);

        // Store locally first (offline-first approach)
        await storeActivityLocally(activity);

        // Try to sync to backend if online
        try {
            const response = await ApiService.post('activities/', {
                action: activity.action,
                entity_type: activity.entity_type,
                entity_id: activity.entity_id,
                object_repr: activity.object_repr,
                user_id: activity.user_id,
                timestamp: activity.timestamp,
                metadata: activity.metadata,
            });

            if (response.status === 201 || response.status === 200) {
                console.log('[ActivityService] Activity synced to backend successfully');
                // Mark as synced
                await markActivityAsSynced(activity.id);
                return { success: true, synced: true, activity };
            }
        } catch (syncError) {
            console.warn('[ActivityService] Failed to sync activity to backend:', syncError.message);
            // Continue - activity is stored locally and will be shown
        }

        return { success: true, synced: false, activity };
    } catch (error) {
        console.error('[ActivityService] Error logging activity:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Store activity locally in AsyncStorage
 * @param {Object} activity - Activity object
 */
const storeActivityLocally = async (activity) => {
    try {
        // Get existing activities
        const existingData = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
        const existingActivities = existingData ? JSON.parse(existingData) : [];

        // Add new activity at the beginning
        const updatedActivities = [activity, ...existingActivities];

        // Keep only the last MAX_LOCAL_ACTIVITIES
        const trimmedActivities = updatedActivities.slice(0, MAX_LOCAL_ACTIVITIES);

        // Save back to storage
        await AsyncStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(trimmedActivities));
        console.log('[ActivityService] Activity stored locally');
    } catch (error) {
        console.error('[ActivityService] Error storing activity locally:', error);
        throw error;
    }
};

/**
 * Mark an activity as synced
 * @param {string} activityId - Local activity ID
 */
const markActivityAsSynced = async (activityId) => {
    try {
        const existingData = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
        const activities = existingData ? JSON.parse(existingData) : [];

        const updatedActivities = activities.map(act =>
            act.id === activityId ? { ...act, synced: true } : act
        );

        await AsyncStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updatedActivities));
    } catch (error) {
        console.error('[ActivityService] Error marking activity as synced:', error);
    }
};

/**
 * Fetch all activities (local + remote)
 * @param {number} limit - Maximum number of activities to return
 * @returns {Promise<Array>} Array of activities
 */
export const fetchActivities = async (limit = 20) => {
    try {
        const activities = [];

        // 1. Get local activities first (offline-first)
        const localData = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
        const localActivities = localData ? JSON.parse(localData) : [];
        activities.push(...localActivities);

        // 2. Try to fetch from backend
        try {
            const response = await ApiService.get('activities/', { limit });
            if (response.data) {
                // Handle different response formats
                let remoteActivities = [];

                if (Array.isArray(response.data)) {
                    // Direct array response
                    remoteActivities = response.data;
                } else if (response.data.results && Array.isArray(response.data.results)) {
                    // Paginated response { results: [...] }
                    remoteActivities = response.data.results;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    // Alternative nested format { data: [...] }
                    remoteActivities = response.data.data;
                } else {
                    // Unexpected format - log and skip
                    console.warn('[ActivityService] Unexpected response format:', { responseType: typeof response.data, responseKeys: Object.keys(response.data) });
                    remoteActivities = [];
                }

                // Merge remote activities, avoiding duplicates
                if (Array.isArray(remoteActivities) && remoteActivities.length > 0) {
                    remoteActivities.forEach(remoteActivity => {
                        // Check if we already have this activity locally
                        const exists = activities.some(a =>
                            a.entity_id === remoteActivity.entity_id &&
                            a.action === remoteActivity.action &&
                            Math.abs(new Date(a.timestamp) - new Date(remoteActivity.timestamp)) < 5000 // Within 5 seconds
                        );

                        if (!exists) {
                            activities.push({
                                ...remoteActivity,
                                synced: true,
                            });
                        }
                    });

                    console.log('[ActivityService] Fetched activities from backend:', remoteActivities.length);
                } else {
                    console.log('[ActivityService] No remote activities received or empty list');
                }
            }
        } catch (apiError) {
            console.warn('[ActivityService] Could not fetch activities from backend:', apiError.message);
            // Continue with local activities only
        }

        // 3. Sort by timestamp (newest first) and limit
        const sortedActivities = activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);

        console.log('[ActivityService] Returning', sortedActivities.length, 'activities');
        return { success: true, activities: sortedActivities };
    } catch (error) {
        console.error('[ActivityService] Error fetching activities:', error);
        return { success: false, activities: [] };
    }
};

/**
 * Clear local activities (for debugging/testing)
 */
export const clearLocalActivities = async () => {
    try {
        await AsyncStorage.removeItem(ACTIVITY_STORAGE_KEY);
        console.log('[ActivityService] Local activities cleared');
        return { success: true };
    } catch (error) {
        console.error('[ActivityService] Error clearing local activities:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Sync unsynced local activities to backend
 * @returns {Promise<Object>} Sync results
 */
export const syncActivities = async () => {
    try {
        const localData = await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY);
        const localActivities = localData ? JSON.parse(localData) : [];

        const unsyncedActivities = localActivities.filter(a => !a.synced);

        if (unsyncedActivities.length === 0) {
            console.log('[ActivityService] No unsynced activities to sync');
            return { success: true, syncedCount: 0, totalCount: 0 };
        }

        let syncedCount = 0;
        const failedActivities = [];

        for (const activity of unsyncedActivities) {
            try {
                await ApiService.post('activities/', {
                    action: activity.action,
                    entity_type: activity.entity_type,
                    entity_id: activity.entity_id,
                    object_repr: activity.object_repr,
                    user_id: activity.user_id,
                    timestamp: activity.timestamp,
                    metadata: activity.metadata,
                });

                await markActivityAsSynced(activity.id);
                syncedCount++;
            } catch (error) {
                console.error('[ActivityService] Failed to sync activity:', error);
                failedActivities.push(activity.id);
            }
        }

        console.log(`[ActivityService] Synced ${syncedCount}/${unsyncedActivities.length} activities`);
        return {
            success: true,
            syncedCount,
            totalCount: unsyncedActivities.length,
            failedActivities,
        };
    } catch (error) {
        console.error('[ActivityService] Error syncing activities:', error);
        return { success: false, syncedCount: 0, totalCount: 0 };
    }
};

/**
 * Convenience methods for common actions
 */

export const logFarmerCreated = (farmerId, farmerName) =>
    logActivity({
        action: ActivityTypes.CREATE,
        entityType: EntityTypes.FARMER,
        entityId: farmerId,
        objectRepr: `Farmer: ${farmerName}`,
        metadata: { farmer_name: farmerName },
    });

export const logFarmerUpdated = (farmerId, farmerName) =>
    logActivity({
        action: ActivityTypes.UPDATE,
        entityType: EntityTypes.FARMER,
        entityId: farmerId,
        objectRepr: `Farmer: ${farmerName}`,
        metadata: { farmer_name: farmerName },
    });

export const logFarmerDeleted = (farmerId, farmerName) =>
    logActivity({
        action: ActivityTypes.DELETE,
        entityType: EntityTypes.FARMER,
        entityId: farmerId,
        objectRepr: `Farmer: ${farmerName}`,
        metadata: { farmer_name: farmerName },
    });

export const logHarvestCreated = (harvestId, farmerName, weight) =>
    logActivity({
        action: ActivityTypes.CREATE,
        entityType: EntityTypes.HARVEST,
        entityId: harvestId,
        objectRepr: `Harvest: ${farmerName} - ${weight}kg`,
        metadata: { farmer_name: farmerName, weight },
    });

export const logHarvestUpdated = (harvestId, farmerName, weight) =>
    logActivity({
        action: ActivityTypes.UPDATE,
        entityType: EntityTypes.HARVEST,
        entityId: harvestId,
        objectRepr: `Harvest: ${farmerName} - ${weight}kg`,
        metadata: { farmer_name: farmerName, weight },
    });

export const logHarvestDeleted = (harvestId, farmerName) =>
    logActivity({
        action: ActivityTypes.DELETE,
        entityType: EntityTypes.HARVEST,
        entityId: harvestId,
        objectRepr: `Harvest: ${farmerName}`,
        metadata: { farmer_name: farmerName },
    });

export const logProductionHarvestCreated = (harvestId, workerName, weight) =>
    logActivity({
        action: ActivityTypes.CREATE,
        entityType: EntityTypes.PRODUCTION_HARVEST,
        entityId: harvestId,
        objectRepr: `Production Harvest: ${workerName} - ${weight}kg`,
        metadata: { worker_name: workerName, weight },
    });

export const logSyncCompleted = (syncedCount, totalCount) =>
    logActivity({
        action: ActivityTypes.SYNC,
        entityType: 'System',
        entityId: `sync_${Date.now()}`,
        objectRepr: `Synced ${syncedCount}/${totalCount} records`,
        metadata: { synced_count: syncedCount, total_count: totalCount },
    });

export default {
    logActivity,
    fetchActivities,
    clearLocalActivities,
    syncActivities,
    ActivityTypes,
    EntityTypes,
    // Convenience methods
    logFarmerCreated,
    logFarmerUpdated,
    logFarmerDeleted,
    logHarvestCreated,
    logHarvestUpdated,
    logHarvestDeleted,
    logProductionHarvestCreated,
    logSyncCompleted,
};
