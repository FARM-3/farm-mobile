import ApiService from './ApiService';

/**
 * Block Service
 * Handles fetching blocks from the backend API
 */

/**
 * Fetch all blocks from the API
 * @returns {Promise<Array>} List of blocks
 */
export const fetchBlocks = async () => {
  try {
    console.log('[BlockService] Fetching blocks from API...');
    const response = await ApiService.get('blocks/');

    // Handle paginated response structure
    let blocksData = [];
    if (response.data && response.data.results) {
      // Paginated response: {count, next, previous, results: [...]}
      blocksData = response.data.results;
    } else if (Array.isArray(response.data)) {
      // Direct array response
      blocksData = response.data;
    } else if (Array.isArray(response)) {
      // Response is array itself
      blocksData = response;
    }

    console.log('[BlockService] Blocks fetched successfully:', blocksData.length);
    console.log('[BlockService] Blocks:', blocksData);
    return blocksData;
  } catch (error) {
    console.error('[BlockService] Error fetching blocks:', error);
    throw error;
  }
};

/**
 * Fetch a single block by ID
 * @param {string} blockId - Block ID
 * @returns {Promise<Object>} Block object
 */
export const fetchBlockById = async (blockId) => {
  try {
    console.log('[BlockService] Fetching block:', blockId);
    const response = await ApiService.get(`blocks/${blockId}/`);
    console.log('[BlockService] Block fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('[BlockService] Error fetching block:', error);
    throw error;
  }
};

export default {
  fetchBlocks,
  fetchBlockById,
};
