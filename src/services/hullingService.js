import ApiService from './ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_QUEUE_KEY = 'hulling_records_sync_queue';
const API_ENDPOINT = '/processing/hulling/';

export const fetchAllHullingRecords = async () => {
  try {
    const response = await ApiService.get(API_ENDPOINT);
    const data = response.data;
    const records = Array.isArray(data) ? data : (data.results || []);
    return { success: true, remoteData: records };
  } catch (error) {
    return { success: false, remoteData: [], error: error.message };
  }
};

export const getUnsyncedHullingRecords = async () => {
  try {
    const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return { success: true, records: stored ? JSON.parse(stored) : [] };
  } catch {
    return { success: false, records: [] };
  }
};

export const postHullingRecord = async (record) => {
  try {
    const { records } = await getUnsyncedHullingRecords();
    const newRecord = { ...record, id: record.id || `local_${Date.now()}`, synced: false };
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([...records, newRecord]));
    return { success: true, record: newRecord };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const syncAllHullingRecords = async () => {
  try {
    const { records: unsyncedRecords } = await getUnsyncedHullingRecords();
    let syncedCount = 0;
    const updatedRecords = [];

    for (const record of unsyncedRecords) {
      try {
        const { id: localId, synced, ...recordData } = record;
        if (String(record.id).startsWith('local_')) {
          const response = await ApiService.post(API_ENDPOINT, recordData);
          updatedRecords.push({ ...record, id: response.data.id, synced: true });
        } else {
          await ApiService.patch(`${API_ENDPOINT}${record.id}/`, recordData);
          updatedRecords.push({ ...record, synced: true });
        }
        syncedCount += 1;
      } catch {
        updatedRecords.push(record);
      }
    }

    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedRecords));
    return { success: syncedCount > 0, totalCount: unsyncedRecords.length, syncedCount };
  } catch {
    return { success: false, totalCount: 0, syncedCount: 0 };
  }
};

export const fetchAvailableLotIds = async () => {
  try {
    const response = await ApiService.get('/processing/drying/');
    const data = response.data;
    const dryingRecords = Array.isArray(data) ? data : (data.results || []);
    const lots = [...new Set(dryingRecords.map(r => r.lot_id).filter(Boolean))].sort();
    return { success: true, lots };
  } catch {
    return { success: false, lots: [] };
  }
};

export const deleteHullingRecord = async (id) => {
  if (String(id).startsWith('local_')) {
    const { records } = await getUnsyncedHullingRecords();
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(records.filter(r => r.id !== id)));
    return { success: true };
  }
  try {
    await ApiService.delete(`${API_ENDPOINT}${id}/`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
