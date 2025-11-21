import ApiService from './ApiService';

/**
 * Quality Control Service
 * Handles Ripeness and Floating test API calls
 */

// ==================== RIPENESS TEST OPERATIONS ====================

/**
 * Create a new ripeness test
 * Backend auto-calculates ripeness_score: (no_of_redcherry / sample_size) * 100
 *
 * @param {Object} ripenessData
 * @param {string} ripenessData.harvest - Harvest ID (e.g., "ED0711PA1")
 * @param {string} ripenessData.date - Date in YYYY-MM-DD format
 * @param {number} ripenessData.sample_size - Sample size (default: 100)
 * @param {number} ripenessData.no_of_red_cherry - Number of red cherries
 * @returns {Promise<Object>} Created ripeness test with auto-calculated ripeness_score
 */
export const addRipenessScore = async (ripenessData) => {
  try {
    console.log('[QualityControl] Creating ripeness test with data:', ripenessData);

    const payload = {
      harvest: ripenessData.harvest_id, // Map harvest_id to harvest for API
      date: ripenessData.date,
      sample_size: parseInt(ripenessData.sample_size),
      no_of_redcherry: parseInt(ripenessData.no_of_red_cherry)
    };

    console.log('[QualityControl] Sending payload to backend:', JSON.stringify(payload, null, 2));
    console.log('[QualityControl] harvest value type:', typeof payload.harvest);
    console.log('[QualityControl] harvest value:', payload.harvest);

    const response = await ApiService.post('processing/ripeness/', payload);
    console.log('[QualityControl] Ripeness test created:', response.data);
    return response.data;
  } catch (error) {
    console.error('[QualityControl] Error creating ripeness test:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get all ripeness tests
 * @returns {Promise<Array>} List of all ripeness tests
 */
export const getRipenessScores = async () => {
  try {
    const response = await ApiService.get('processing/ripeness/');
    console.log('[QualityControl] Raw response data:', response.data);

    // Handle both array and paginated response (similar to aggregation service)
    const records = Array.isArray(response.data)
      ? response.data
      : (response.data.results || []);

    console.log('[QualityControl] Fetched ripeness tests:', records.length, 'records');
    return records;
  } catch (error) {
    console.error('[QualityControl] Error fetching ripeness tests:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get ripeness test by harvest ID
 * @param {string} harvestId - Harvest ID
 * @returns {Promise<Object>} Ripeness test for the harvest
 */
export const getRipenessScoreByHarvest = async (harvestId) => {
  try {
    const response = await ApiService.get(`processing/ripeness/?harvest=${harvestId}`);
    console.log('[QualityControl] Fetched ripeness test for harvest:', harvestId);
    return response.data.results?.[0] || null;
  } catch (error) {
    console.error('[QualityControl] Error fetching ripeness test:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Update ripeness test
 * @param {string} harvestId - Harvest ID (used as identifier)
 * @param {Object} ripenessData - Updated data
 * @returns {Promise<Object>} Updated ripeness test
 */
export const updateRipenessScore = async (harvestId, ripenessData) => {
  try {
    const payload = {
      date: ripenessData.date,
      sample_size: parseInt(ripenessData.sample_size),
      no_of_redcherry: parseInt(ripenessData.no_of_red_cherry)
    };

    const response = await ApiService.put(`processing/ripeness/${harvestId}/`, payload);
    console.log('[QualityControl] Ripeness test updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('[QualityControl] Error updating ripeness test:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Delete ripeness test
 * @param {string} harvestId - Harvest ID
 * @returns {Promise<void>}
 */
export const deleteRipenessScore = async (harvestId) => {
  try {
    await ApiService.delete(`processing/ripeness/${harvestId}/`);
    console.log('[QualityControl] Ripeness test deleted:', harvestId);
  } catch (error) {
    console.error('[QualityControl] Error deleting ripeness test:', error.response?.data || error.message);
    throw error;
  }
};

// ==================== FLOATING TEST OPERATIONS ====================

/**
 * Create a new floating test
 * Backend auto-generates grade_id and auto-fills ripeness_score from related Ripeness test
 *
 * @param {Object} floatingData
 * @param {string} floatingData.harvest_id - Harvest ID
 * @param {string} floatingData.grade - Grade: "A" (Netweight/Sinkers) or "B" (Floaters)
 * @param {number} floatingData.weight - Weight in kg
 * @param {string} floatingData.date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Created floating test with auto-generated grade_id and ripeness_score
 */
export const addFloatingRecord = async (floatingData) => {
  try {
    console.log('[QualityControl] Creating floating test:', floatingData);

    const payload = {
      harvest: floatingData.harvest_id,
      grade: floatingData.grade,
      weight: parseFloat(floatingData.weight),
      date: floatingData.date
      // Note: ripeness_score and grade_id are auto-generated by backend
    };

    const response = await ApiService.post('processing/floating/', payload);
    console.log('[QualityControl] Floating test created:', response.data);
    return response.data;
  } catch (error) {
    console.error('[QualityControl] Error creating floating test:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get all floating tests
 * @param {Object} filters - Optional filters
 * @param {string} filters.harvest - Filter by harvest ID
 * @param {string} filters.grade - Filter by grade (A or B)
 * @param {string} filters.date - Filter by date
 * @returns {Promise<Array>} List of floating tests
 */
export const getFloatingRecords = async (filters = {}) => {
  try {
    let url = 'processing/floating/';
    const params = new URLSearchParams();

    if (filters.harvest) params.append('harvest', filters.harvest);
    if (filters.grade) params.append('grade', filters.grade);
    if (filters.date) params.append('date', filters.date);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await ApiService.get(url);
    console.log('[QualityControl] Raw response data:', response.data);

    // Handle both array and paginated response
    const records = Array.isArray(response.data)
      ? response.data
      : (response.data.results || []);

    console.log('[QualityControl] Fetched floating tests:', records.length, 'records');
    return records;
  } catch (error) {
    console.error('[QualityControl] Error fetching floating tests:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get floating test by grade_id
 * @param {string} gradeId - Grade ID (e.g., "GRA1401A00")
 * @returns {Promise<Object>} Floating test
 */
export const getFloatingRecordById = async (gradeId) => {
  try {
    const response = await ApiService.get(`processing/floating/${gradeId}/`);
    console.log('[QualityControl] Fetched floating test:', gradeId);
    return response.data;
  } catch (error) {
    console.error('[QualityControl] Error fetching floating test:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Update floating test
 * @param {string} gradeId - Grade ID
 * @param {Object} floatingData - Updated data
 * @returns {Promise<Object>} Updated floating test
 */
export const updateFloatingRecord = async (gradeId, floatingData) => {
  try {
    const payload = {
      grade: floatingData.grade,
      weight: parseFloat(floatingData.weight),
      date: floatingData.date
    };

    const response = await ApiService.put(`processing/floating/${gradeId}/`, payload);
    console.log('[QualityControl] Floating test updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('[QualityControl] Error updating floating test:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Delete floating test
 * @param {string} gradeId - Grade ID
 * @returns {Promise<void>}
 */
export const deleteFloatingRecord = async (gradeId) => {
  try {
    await ApiService.delete(`processing/floating/${gradeId}/`);
    console.log('[QualityControl] Floating test deleted:', gradeId);
  } catch (error) {
    console.error('[QualityControl] Error deleting floating test:', error.response?.data || error.message);
    throw error;
  }
};

// ==================== HARVEST OPERATIONS ====================

/**
 * Get harvests that don't have a ripeness test yet
 * @returns {Promise<Array>} List of harvests without ripeness tests
 */
export const getHarvestsWithoutRipenessTest = async () => {
  try {
    // This assumes your backend has an endpoint or filter for this
    // Adjust the endpoint based on your actual API
    const response = await ApiService.get('api/harvests/?has_ripeness=false');
    console.log('[QualityControl] Fetched harvests without ripeness tests:', response.data.length);
    return response.data;
  } catch (error) {
    console.error('[QualityControl] Error fetching harvests:', error.response?.data || error.message);
    // Fallback: Get all harvests and filter on frontend
    try {
      const allHarvests = await ApiService.get('api/harvests/');
      const allRipeness = await getRipenessScores();
      const harvestsWithRipeness = new Set(allRipeness.map(r => r.harvest));
      return allHarvests.data.filter(h => !harvestsWithRipeness.has(h.harvest_id));
    } catch (fallbackError) {
      console.error('[QualityControl] Fallback also failed:', fallbackError);
      throw error;
    }
  }
};

/**
 * Get all harvests (for ripeness test selection)
 * Fetches from aggregation/farmer-harvest/ endpoint
 * @returns {Promise<Array>} List of all harvests
 */
export const getAllHarvests = async () => {
  try {
    const response = await ApiService.get('aggregation/farmer-harvest/');
    console.log('[QualityControl] Fetched all harvests:', response.data.length || 0);

    // Handle both array and paginated response
    const harvests = Array.isArray(response.data)
      ? response.data
      : (response.data.results || []);

    console.log('[QualityControl] Normalized harvests:', harvests.length);
    return harvests;
  } catch (error) {
    console.error('[QualityControl] Error fetching all harvests:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get harvests that already have a ripeness score (for floating test selection)
 * Only returns harvests that have passed the ripeness test stage
 * @returns {Promise<Array>} List of harvests with ripeness scores
 */
export const getHarvestsWithRipenessScore = async () => {
  try {
    // Get all ripeness tests
    const ripenessTests = await getRipenessScores();
    console.log('[QualityControl] Fetched ripeness tests:', ripenessTests.length);

    // Get all harvests
    const allHarvests = await getAllHarvests();
    console.log('[QualityControl] Fetched all harvests:', allHarvests.length);

    // Create a Set of harvest IDs that have ripeness scores
    const harvestsWithRipeness = new Set(
      ripenessTests.map(test => test.harvest || test.harvest_id)
    );

    // Filter harvests to only include those with ripeness scores
    const filteredHarvests = allHarvests.filter(harvest =>
      harvestsWithRipeness.has(harvest.harvest_id || harvest.id)
    );

    console.log('[QualityControl] Harvests with ripeness scores:', filteredHarvests.length);
    return filteredHarvests;
  } catch (error) {
    console.error('[QualityControl] Error fetching harvests with ripeness scores:', error.response?.data || error.message);
    throw error;
  }
};

export default {
  // Ripeness operations
  addRipenessScore,
  getRipenessScores,
  getRipenessScoreByHarvest,
  updateRipenessScore,
  deleteRipenessScore,

  // Floating operations
  addFloatingRecord,
  getFloatingRecords,
  getFloatingRecordById,
  updateFloatingRecord,
  deleteFloatingRecord,

  // Harvest operations
  getHarvestsWithoutRipenessTest,
  getAllHarvests,
  getHarvestsWithRipenessScore,
};
