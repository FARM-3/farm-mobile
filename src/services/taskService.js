// src/services/taskService.js
// Service for task management - fetching assigned tasks and syncing submissions

import ApiService from './ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TASK_SUBMISSIONS_STORAGE_KEY = 'task_submissions';

/** Normalize legacy 'accepted' → 'pending' for display and counts */
export const normalizeTaskStatus = (status) => {
    if (!status || status === 'assigned') return 'assigned';
    if (status === 'accepted') return 'pending';
    return status;
};

export const formatTaskStatusLabel = (status) => {
    const s = normalizeTaskStatus(status);
    const labels = {
        assigned: 'Assigned',
        pending: 'Pending',
        in_progress: 'In Progress',
        completed: 'Completed',
        rejected: 'Rejected',
    };
    return labels[s] || s;
};

export const isTaskNotStarted = (task) => {
    const s = normalizeTaskStatus(task?.submission_status || 'assigned');
    return s === 'assigned' || s === 'pending';
};

export const isTaskIncomplete = (task) => {
    const s = normalizeTaskStatus(task?.submission_status || 'assigned');
    return s !== 'completed' && s !== 'rejected';
};

/**
 * Fetch tasks assigned to the current user from the backend
 * These are tasks created in the web app
 */
export const fetchAssignedTasks = async () => {
    try {
        console.log('[TaskService] Fetching assigned tasks from API...');
        const response = await ApiService.get('/tasks/submissions/my_assigned_tasks/');

        // ApiService returns axios response directly: { data, status, ... }
        // The actual task data is in response.data
        if (response.data) {
            const tasks = Array.isArray(response.data) ? response.data : [];
            console.log('[TaskService] Fetched', tasks.length, 'assigned tasks');
            return {
                success: true,
                tasks: tasks
            };
        } else {
            console.error('[TaskService] No data in response');
            return {
                success: false,
                error: 'No data in response',
                tasks: []
            };
        }
    } catch (error) {
        console.error('[TaskService] Error fetching assigned tasks:', error);
        return {
            success: false,
            error: error.message,
            tasks: []
        };
    }
};

/**
 * Get all unsynced task submissions from AsyncStorage
 */
export const getUnsyncedSubmissions = async () => {
    try {
        const stored = await AsyncStorage.getItem(TASK_SUBMISSIONS_STORAGE_KEY);
        if (!stored) {
            return { success: true, submissions: [] };
        }

        const submissions = JSON.parse(stored);
        const unsynced = submissions.filter(s => !s.isSynced);

        console.log('[TaskService] Found', unsynced.length, 'unsynced submissions');
        return {
            success: true,
            submissions: unsynced
        };
    } catch (error) {
        console.error('[TaskService] Error getting unsynced submissions:', error);
        return {
            success: false,
            error: error.message,
            submissions: []
        };
    }
};

/**
 * Save task submission to AsyncStorage (offline-first)
 * @param {Object} submission - Task submission data
 */
export const saveSubmissionLocally = async (submission) => {
    try {
        const stored = await AsyncStorage.getItem(TASK_SUBMISSIONS_STORAGE_KEY);
        const submissions = stored ? JSON.parse(stored) : [];

        const newSubmission = {
            ...submission,
            localId: Date.now().toString(),
            isSynced: false,
            created_at: new Date().toISOString(),
        };

        // One submission row per assigned task — update in place on accept/start/complete
        const existingIdx = submission.assigned_task_id
            ? submissions.findIndex(s => s.assigned_task_id === submission.assigned_task_id)
            : -1;

        let savedSubmission;
        if (existingIdx >= 0) {
            savedSubmission = {
                ...submissions[existingIdx],
                ...submission,
                isSynced: false,
            };
            submissions[existingIdx] = savedSubmission;
        } else {
            savedSubmission = newSubmission;
            submissions.push(savedSubmission);
        }

        await AsyncStorage.setItem(TASK_SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));

        console.log('[TaskService] Saved submission locally:', savedSubmission.localId);
        return {
            success: true,
            submission: savedSubmission,
        };
    } catch (error) {
        console.error('[TaskService] Error saving submission locally:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Sync all unsynced task submissions to the backend
 * Handles photo uploads as multipart/form-data
 */
export const syncTaskSubmissions = async () => {
    try {
        console.log('[TaskService] Starting task submissions sync...');

        const { success, submissions } = await getUnsyncedSubmissions();
        if (!success || submissions.length === 0) {
            console.log('[TaskService] No submissions to sync');
            return {
                success: true,
                totalCount: 0,
                syncedCount: 0,
                failedCount: 0
            };
        }

        let syncedCount = 0;
        let failedCount = 0;

        for (const submission of submissions) {
            try {
                // Prepare form data for multipart upload
                const formData = new FormData();

                // Add all text fields
                if (submission.assigned_task_id) formData.append('assigned_task_id', submission.assigned_task_id);
                if (submission.title) formData.append('title', submission.title);
                if (submission.description) formData.append('description', submission.description);
                if (submission.activity) formData.append('activity', submission.activity);
                if (submission.priority) formData.append('priority', submission.priority);
                if (submission.block_id) formData.append('block_id', submission.block_id);
                if (submission.status) formData.append('status', submission.status);
                if (submission.accepted_at) formData.append('accepted_at', submission.accepted_at);
                if (submission.rejected_at) formData.append('rejected_at', submission.rejected_at);
                if (submission.started_at) formData.append('started_at', submission.started_at);
                if (submission.completed_at) formData.append('completed_at', submission.completed_at);
                if (submission.duration_minutes) formData.append('duration_minutes', submission.duration_minutes);
                if (submission.completion_comment) formData.append('completion_comment', submission.completion_comment);

                // Add metadata as JSON string
                if (submission.metadata) {
                    formData.append('metadata', JSON.stringify(submission.metadata));
                }

                // Add photos if present
                if (submission.photos && submission.photos.length > 0) {
                    for (let i = 0; i < submission.photos.length; i++) {
                        const photoUri = submission.photos[i];

                        // Create file object from URI
                        const filename = photoUri.split('/').pop();
                        const match = /\.(\w+)$/.exec(filename);
                        const type = match ? `image/${match[1]}` : `image/jpeg`;

                        formData.append('uploaded_photos', {
                            uri: photoUri,
                            type: type,
                            name: filename
                        });
                    }
                }

                console.log('[TaskService] Syncing submission:', submission.localId);
                const uploadHeaders = { 'Content-Type': 'multipart/form-data' };
                const response = submission.serverId
                    ? await ApiService.patch(`/tasks/submissions/${submission.serverId}/`, formData, { headers: uploadHeaders })
                    : await ApiService.post('/tasks/submissions/', formData, { headers: uploadHeaders });

                // ApiService returns axios response: { data, status, ... }
                if (response.data) {
                    // Mark as synced in AsyncStorage
                    await markSubmissionAsSynced(submission.localId, response.data);
                    syncedCount++;
                    console.log('[TaskService] Successfully synced submission:', submission.localId);
                } else {
                    failedCount++;
                    console.error('[TaskService] Failed to sync submission:', submission.localId);
                }
            } catch (error) {
                failedCount++;
                console.error('[TaskService] Error syncing submission:', submission.localId, error);
            }
        }

        console.log(`[TaskService] Sync complete. Synced: ${syncedCount}, Failed: ${failedCount}`);
        return {
            success: true,
            totalCount: submissions.length,
            syncedCount,
            failedCount
        };
    } catch (error) {
        console.error('[TaskService] Error in syncTaskSubmissions:', error);
        return {
            success: false,
            error: error.message,
            totalCount: 0,
            syncedCount: 0,
            failedCount: 0
        };
    }
};

/**
 * Mark a submission as synced in AsyncStorage
 */
const markSubmissionAsSynced = async (localId, serverData) => {
    try {
        const stored = await AsyncStorage.getItem(TASK_SUBMISSIONS_STORAGE_KEY);
        if (!stored) return;

        const submissions = JSON.parse(stored);
        const updated = submissions.map(s => {
            if (s.localId === localId) {
                return {
                    ...s,
                    isSynced: true,
                    serverId: serverData.id,
                    synced_at: new Date().toISOString()
                };
            }
            return s;
        });

        await AsyncStorage.setItem(TASK_SUBMISSIONS_STORAGE_KEY, JSON.stringify(updated));
        console.log('[TaskService] Marked submission as synced:', localId);
    } catch (error) {
        console.error('[TaskService] Error marking submission as synced:', error);
    }
};

/**
 * Get all task submissions (both synced and unsynced) from local storage
 */
export const getAllLocalSubmissions = async () => {
    try {
        const stored = await AsyncStorage.getItem(TASK_SUBMISSIONS_STORAGE_KEY);
        if (!stored) {
            return { success: true, submissions: [] };
        }

        const submissions = JSON.parse(stored);
        return {
            success: true,
            submissions: submissions
        };
    } catch (error) {
        console.error('[TaskService] Error getting local submissions:', error);
        return {
            success: false,
            error: error.message,
            submissions: []
        };
    }
};
