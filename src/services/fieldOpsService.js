import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

const QUEUE_KEY = 'field_ops_queue';

async function isOnline() {
  try {
    const NetInfo = require('@react-native-community/netinfo').default;
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return true;
  }
}

export async function fetchBlocks() {
  try {
    const res = await ApiService.get('/blocks/');
    return { success: true, blocks: res.data?.results || res.data || [] };
  } catch (e) {
    return { success: false, blocks: [], error: e.message };
  }
}

async function readQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function queueFieldOp(entry) {
  const queue = await readQueue();
  queue.push({ ...entry, localId: Date.now().toString(), isSynced: false, created_at: new Date().toISOString() });
  await writeQueue(queue);
  return queue[queue.length - 1];
}

async function postFieldOpItem(item) {
  const formData = new FormData();
  Object.entries(item.payload || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (k === 'practices' || k === 'weather_conditions') {
      formData.append(k, JSON.stringify(Array.isArray(v) ? v : [v]));
    } else {
      formData.append(k, String(v));
    }
  });
  if (item.photoUri) {
    formData.append('photo', { uri: item.photoUri, name: 'evidence.jpg', type: 'image/jpeg' });
  }
  const endpoint = item.kind === 'surveillance'
    ? '/field-ops/surveillance/'
    : '/field-ops/block-activities/';
  return ApiService.post(endpoint, formData);
}

export async function syncFieldOpsQueue() {
  const queue = await readQueue();
  const pending = queue.filter(q => !q.isSynced);
  let synced = 0;
  let error = null;

  for (const item of pending) {
    try {
      await postFieldOpItem(item);
      item.isSynced = true;
      synced += 1;
    } catch (e) {
      error = e.response?.data?.detail || e.message || 'Sync failed';
      console.warn('[FieldOps] sync failed:', error);
    }
  }

  const remaining = queue.filter(q => !q.isSynced);
  await writeQueue(remaining);
  return { synced, pending: remaining.length, error };
}

async function submitFieldOp(kind, payload, photoUri) {
  const entry = await queueFieldOp({ kind, payload, photoUri });
  if (!(await isOnline())) {
    return { success: false, offline: true, entry, error: null };
  }
  await syncFieldOpsQueue();
  return {
    success: !!entry.isSynced,
    offline: false,
    entry,
    error: entry.isSynced ? null : 'Could not reach server — saved locally',
  };
}

export async function submitBlockActivity(payload, photoUri) {
  return submitFieldOp('activity', payload, photoUri);
}

export async function submitSurveillanceReport(payload, photoUri) {
  return submitFieldOp('surveillance', payload, photoUri);
}

function mapLocal(item) {
  return {
    ...item.payload,
    id: item.localId,
    _pending: !item.isSynced,
    created_at: item.created_at || new Date().toISOString(),
  };
}

export async function fetchBlockActivities() {
  const local = (await readQueue()).filter(q => q.kind === 'activity').map(mapLocal);
  try {
    const res = await ApiService.get('/field-ops/block-activities/');
    return { success: true, items: [...local, ...(res.data?.results || res.data || [])] };
  } catch (e) {
    return { success: false, items: local, error: e.message };
  }
}

export async function fetchSurveillanceReports() {
  const local = (await readQueue()).filter(q => q.kind === 'surveillance').map(mapLocal);
  try {
    const res = await ApiService.get('/field-ops/surveillance/');
    return { success: true, items: [...local, ...(res.data?.results || res.data || [])] };
  } catch (e) {
    return { success: false, items: local, error: e.message };
  }
}

export async function getPendingFieldOpsCount() {
  return (await readQueue()).filter(q => !q.isSynced).length;
}
