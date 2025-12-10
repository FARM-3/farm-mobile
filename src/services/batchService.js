import AsyncStorage from '@react-native-async-storage/async-storage';

const BATCH_STORAGE_KEY = 'batch_records';

/**
 * Batch Service
 * Manages batch creation and retrieval for grouping multiple grade IDs
 */

/**
 * Generate batch ID: BA{XXX} where XXX is a 3-digit sequential number
 * Example: BA001, BA002, ..., BA999
 * @param {number} sequence - The sequence number
 * @returns {string} Batch ID
 */
const generateBatchId = (sequence = 0) => {
  const seq = String(sequence).padStart(3, '0');
  return `BA${seq}`;
};

/**
 * Create a new batch with multiple grade IDs
 * @param {Object} batchData
 * @param {Array<string>} batchData.gradeIds - Array of grade IDs to include in the batch
 * @param {string} batchData.createdBy - User who created the batch
 * @param {string} batchData.notes - Optional notes about the batch
 * @returns {Promise<Object>} Created batch with auto-generated batch_id
 */
export const createBatch = async (batchData) => {
  try {
    console.log('[BatchService] Creating batch with data:', batchData);

    // Load existing batches to determine next sequence number
    const existingData = await AsyncStorage.getItem(BATCH_STORAGE_KEY);
    const existingBatches = existingData ? JSON.parse(existingData) : [];

    // Calculate next sequence number
    const nextSeq = existingBatches.length;
    const batchId = generateBatchId(nextSeq);

    // Create batch object
    const batch = {
      batch_id: batchId,
      grade_ids: batchData.gradeIds,
      created_by: batchData.createdBy || 'Unknown',
      created_at: new Date().toISOString(),
      notes: batchData.notes || '',
      is_synced: false,
    };

    // Add to storage
    existingBatches.push(batch);
    await AsyncStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(existingBatches));

    console.log('[BatchService] Batch created:', batch);
    return batch;
  } catch (error) {
    console.error('[BatchService] Error creating batch:', error);
    throw error;
  }
};

/**
 * Get all batches
 * @returns {Promise<Array>} List of all batches
 */
export const getAllBatches = async () => {
  try {
    const data = await AsyncStorage.getItem(BATCH_STORAGE_KEY);
    const batches = data ? JSON.parse(data) : [];
    console.log('[BatchService] Fetched batches:', batches.length);
    return batches;
  } catch (error) {
    console.error('[BatchService] Error fetching batches:', error);
    throw error;
  }
};

/**
 * Get batch by batch_id
 * @param {string} batchId - Batch ID
 * @returns {Promise<Object|null>} Batch or null if not found
 */
export const getBatchById = async (batchId) => {
  try {
    const batches = await getAllBatches();
    const batch = batches.find(b => b.batch_id === batchId);
    console.log('[BatchService] Fetched batch:', batchId, batch ? 'Found' : 'Not found');
    return batch || null;
  } catch (error) {
    console.error('[BatchService] Error fetching batch:', error);
    throw error;
  }
};

/**
 * Get available batches (batches that haven't been fully processed)
 * @returns {Promise<Array>} List of available batches
 */
export const getAvailableBatches = async () => {
  try {
    const batches = await getAllBatches();
    // For now, return all batches. You can add logic later to filter out fully processed batches
    console.log('[BatchService] Available batches:', batches.length);
    return batches;
  } catch (error) {
    console.error('[BatchService] Error fetching available batches:', error);
    throw error;
  }
};

/**
 * Delete batch by batch_id
 * @param {string} batchId - Batch ID
 * @returns {Promise<void>}
 */
export const deleteBatch = async (batchId) => {
  try {
    const batches = await getAllBatches();
    const updatedBatches = batches.filter(b => b.batch_id !== batchId);
    await AsyncStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(updatedBatches));
    console.log('[BatchService] Batch deleted:', batchId);
  } catch (error) {
    console.error('[BatchService] Error deleting batch:', error);
    throw error;
  }
};

/**
 * Check if a grade ID is already used in any batch
 * @param {string} gradeId - Grade ID to check
 * @returns {Promise<boolean>} True if grade is already in a batch
 */
export const isGradeInBatch = async (gradeId) => {
  try {
    const batches = await getAllBatches();
    const isUsed = batches.some(batch => batch.grade_ids.includes(gradeId));
    console.log('[BatchService] Grade', gradeId, 'in batch:', isUsed);
    return isUsed;
  } catch (error) {
    console.error('[BatchService] Error checking grade:', error);
    throw error;
  }
};

export default {
  createBatch,
  getAllBatches,
  getBatchById,
  getAvailableBatches,
  deleteBatch,
  isGradeInBatch,
};
