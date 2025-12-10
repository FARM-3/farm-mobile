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
    console.log('[QualityControl] Creating ripeness test with data:', JSON.stringify(ripenessData, null, 2));

    const payload = {
      harvest: ripenessData.harvest_id, // harvest_id is set to pk (integer) or harvest_id string
      date: ripenessData.date,
      sample_size: parseInt(ripenessData.sample_size),
      no_of_redcherry: parseInt(ripenessData.no_of_red_cherry)
    };

    console.log('[QualityControl] Sending payload to backend:', JSON.stringify(payload, null, 2));
    console.log('[QualityControl] harvest value type:', typeof payload.harvest);
    console.log('[QualityControl] harvest value:', payload.harvest);
    if (typeof payload.harvest === 'number') {
      console.log('[QualityControl] ✓ Sending integer PK from main Harvest model');
    } else {
      console.log('[QualityControl] ℹ Sending harvest_id string (aggregation-only record)');
    }

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

/**
 * Get available (unprocessed) grade IDs from floating tests
 * Returns grade IDs that haven't been assigned to fermenting, washing, or natural sundrying
 * @returns {Promise<Array>} List of available grade IDs with their details
 */
export const getAvailableGradeIds = async () => {
  try {
    // Fetch all floating records
    const floatingRecords = await getFloatingRecords();

    // Fetch all processing type records to check which grades are already used
    const [fermentingResponse, washingResponse, sundryingResponse] = await Promise.all([
      ApiService.get('processing/fermenting/').catch(() => ({ data: [] })),
      ApiService.get('processing/washing/').catch(() => ({ data: [] })),
      ApiService.get('processing/naturalsundrying/').catch(() => ({ data: [] }))
    ]);

    // Extract used grade IDs
    const usedGradeIds = new Set();

    [fermentingResponse.data, washingResponse.data, sundryingResponse.data].forEach(records => {
      const recordsList = Array.isArray(records) ? records : (records.results || []);
      recordsList.forEach(record => {
        if (record.grade || record.grade_id) {
          usedGradeIds.add(record.grade || record.grade_id);
        }
      });
    });

    // Filter floating records to get only available ones
    const availableGrades = floatingRecords
      .filter(record => !usedGradeIds.has(record.grade_id))
      .map(record => ({
        grade_id: record.grade_id,
        harvest: record.harvest,
        grade: record.grade,
        weight: record.weight,
        date: record.date,
        ripeness_score: record.ripeness_score
      }))
      // Sort: Grade A first, then Grade B; within each grade, highest ripeness score first
      .sort((a, b) => {
        // First, sort by grade (A before B)
        if (a.grade !== b.grade) {
          return a.grade.localeCompare(b.grade);
        }

        // Within same grade, sort by ripeness score (highest first)
        // Handle null/undefined ripeness scores by treating them as 0
        const scoreA = a.ripeness_score ?? 0;
        const scoreB = b.ripeness_score ?? 0;
        return scoreB - scoreA; // Descending order (highest first)
      });

    console.log('[QualityControl] Available grade IDs:', availableGrades.length);
    return availableGrades;
  } catch (error) {
    console.error('[QualityControl] Error fetching available grade IDs:', error.response?.data || error.message);
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
 * Fetches from both /api/harvests/ and /api/aggregation/farmer-harvest/ endpoints
 * Combines harvests from both sources to ensure comprehensive coverage
 * NOTE: Includes the database PK from the main Harvest model for backend API calls
 * @returns {Promise<Array>} List of all harvests with pk field for database references
 */
export const getAllHarvests = async () => {
  try {
    let allHarvests = [];
    let harvestPkMap = {}; // Map to store harvest_id -> harvest.pk relationships

    // First, fetch from main harvests endpoint to get the authoritative PKs
    try {
      console.log('[QualityControl] Fetching from /harvests/ (main endpoint)...');
      const harvestsResponse = await ApiService.get('harvests/');

      // Handle response data
      let productionHarvests = [];
      if (harvestsResponse && harvestsResponse.data) {
        productionHarvests = Array.isArray(harvestsResponse.data)
          ? harvestsResponse.data
          : (harvestsResponse.data.results || []);
      } else if (Array.isArray(harvestsResponse)) {
        productionHarvests = harvestsResponse;
      } else if (harvestsResponse.results) {
        productionHarvests = harvestsResponse.results;
      }

      // Build a map of harvest_id -> pk from main harvests
      for (const harvest of productionHarvests) {
        const harvestId = harvest.harvest_id || harvest.id;
        // The PK is the 'id' field for main harvests
        const pk = harvest.id;
        harvestPkMap[harvestId] = pk;
        console.log(`[QualityControl] Mapped harvest ${harvestId} -> pk ${pk}, harvest object keys: ${Object.keys(harvest).join(', ')}`);
      }

      // Ensure all production harvests have the pk field set
      for (const harvest of productionHarvests) {
        if (!harvest.pk) {
          harvest.pk = harvest.id; // Set pk to the database id
        }
      }

      allHarvests = [...allHarvests, ...productionHarvests];
      console.log('[QualityControl] Added production harvests:', productionHarvests.length);
      console.log('[QualityControl] Production harvests sample:', productionHarvests.slice(0, 2));
    } catch (error) {
      console.warn('[QualityControl] Could not fetch from harvests endpoint:', error.message);
    }

    // Then fetch from farmer-harvest endpoint (aggregation)
    try {
      console.log('[QualityControl] Fetching from aggregation/farmer-harvest/...');
      const farmerHarvestResponse = await ApiService.get('aggregation/farmer-harvest/');

      // Handle different response formats
      let farmerHarvests = [];
      if (farmerHarvestResponse && farmerHarvestResponse.data) {
        farmerHarvests = Array.isArray(farmerHarvestResponse.data)
          ? farmerHarvestResponse.data
          : (farmerHarvestResponse.data.results || []);
      } else if (Array.isArray(farmerHarvestResponse)) {
        farmerHarvests = farmerHarvestResponse;
      } else if (farmerHarvestResponse.results) {
        farmerHarvests = farmerHarvestResponse.results;
      }

      // For farmer harvests, try to look up the PK from the main harvests
      for (const fh of farmerHarvests) {
        const farmerHarvestId = fh.harvest_id || fh.id;
        const pk = harvestPkMap[farmerHarvestId];

        if (pk) {
          // We found this harvest in the main harvests, attach the PK
          fh.pk = pk;
          console.log(`[QualityControl] Farmer harvest ${farmerHarvestId} found in main harvests with pk ${pk}`);
        } else {
          // Not found in main harvests
          // Farmer-harvest records don't have a database PK - they're aggregation views
          // We'll use the harvest_id string directly since it's not in the main Harvest model
          console.warn(`[QualityControl] Farmer harvest ${farmerHarvestId} NOT found in main harvests - this is an aggregation-only record`);
          // Don't set pk - we'll handle this case separately
        }
      }

      allHarvests = [...allHarvests, ...farmerHarvests];
      console.log('[QualityControl] Added farmer-harvest records:', farmerHarvests.length);
      console.log('[QualityControl] Sample farmer harvest:', farmerHarvests.length > 0 ? farmerHarvests[0] : 'None');
    } catch (error) {
      console.warn('[QualityControl] Could not fetch from farmer-harvest endpoint:', error.message);
    }

    // Remove duplicate harvest IDs (keep first occurrence)
    const uniqueHarvests = [];
    const seenIds = new Set();

    for (const harvest of allHarvests) {
      const harvestId = harvest.harvest_id || harvest.id;
      if (!seenIds.has(harvestId)) {
        seenIds.add(harvestId);
        uniqueHarvests.push(harvest);
      }
    }

    console.log('[QualityControl] Total unique harvests:', uniqueHarvests.length);

    if (uniqueHarvests.length === 0) {
      console.warn('[QualityControl] No harvests found in either endpoint');
    }

    return uniqueHarvests;
  } catch (error) {
    console.error('[QualityControl] Error fetching all harvests:', error.message);
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
