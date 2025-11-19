import DatabaseService from './DatabaseService';

// Ripeness Score CRUD operations
export const addRipenessScore = async (ripenessData) => {
  try {
    const insertId = await DatabaseService.insert('ripeness_scores', {
      harvest_id: ripenessData.harvest_id,
      date: ripenessData.date,
      sample_size: ripenessData.sample_size,
      no_of_red_cherry: ripenessData.no_of_red_cherry,
      ripeness_score: ripenessData.ripeness_score,
    });
    console.log('[QualityControl] Ripeness score added with ID:', insertId);
    return insertId;
  } catch (error) {
    console.error('[QualityControl] Error adding ripeness score:', error);
    throw error;
  }
};

export const getRipenessScores = async () => {
  try {
    const records = await DatabaseService.getAll(
      'SELECT * FROM ripeness_scores ORDER BY date DESC, id DESC'
    );
    return records;
  } catch (error) {
    console.error('[QualityControl] Error fetching ripeness scores:', error);
    throw error;
  }
};

export const getRipenessScoreById = async (id) => {
  try {
    const record = await DatabaseService.getFirst(
      'SELECT * FROM ripeness_scores WHERE id = ?',
      [id]
    );
    return record;
  } catch (error) {
    console.error('[QualityControl] Error fetching ripeness score by ID:', error);
    throw error;
  }
};

export const getLatestRipenessScore = async () => {
  try {
    const record = await DatabaseService.getFirst(
      'SELECT * FROM ripeness_scores ORDER BY date DESC, id DESC LIMIT 1'
    );
    return record;
  } catch (error) {
    console.error('[QualityControl] Error fetching latest ripeness score:', error);
    throw error;
  }
};

// Floating Record CRUD operations
export const addFloatingRecord = async (floatingData) => {
  try {
    const insertId = await DatabaseService.insert('floating_records', {
      harvest_id: floatingData.harvest_id,
      grade: floatingData.grade,
      weight: floatingData.weight,
      date: floatingData.date,
      ripeness_score: floatingData.ripeness_score,
      grade_id: floatingData.grade_id,
    });
    console.log('[QualityControl] Floating record added with ID:', insertId);
    return insertId;
  } catch (error) {
    console.error('[QualityControl] Error adding floating record:', error);
    throw error;
  }
};

export const getFloatingRecords = async () => {
  try {
    const records = await DatabaseService.getAll(
      'SELECT * FROM floating_records ORDER BY date DESC, id DESC'
    );
    return records;
  } catch (error) {
    console.error('[QualityControl] Error fetching floating records:', error);
    throw error;
  }
};

export const getFloatingRecordById = async (id) => {
  try {
    const record = await DatabaseService.getFirst(
      'SELECT * FROM floating_records WHERE id = ?',
      [id]
    );
    return record;
  } catch (error) {
    console.error('[QualityControl] Error fetching floating record by ID:', error);
    throw error;
  }
};

export const getLatestFloatingRecord = async () => {
  try {
    const record = await DatabaseService.getFirst(
      'SELECT * FROM floating_records ORDER BY date DESC, id DESC LIMIT 1'
    );
    return record;
  } catch (error) {
    console.error('[QualityControl] Error fetching latest floating record:', error);
    throw error;
  }
};

export default {
  addRipenessScore,
  getRipenessScores,
  getRipenessScoreById,
  getLatestRipenessScore,
  addFloatingRecord,
  getFloatingRecords,
  getFloatingRecordById,
  getLatestFloatingRecord,
};
