import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

const QUEUE_KEY = 'field_ops_queue';

export async function fetchBlocks() {
  try {
    const res = await ApiService.get('/blocks/');
    return { success: true, blocks: res.data?.results || res.data || [] };
  } catch (e) {
    return { success: false, blocks: [], error: e.message };
  }
}

export async function queueFieldOp(entry) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = raw ? JSON.parse(raw) : [];
  queue.push({ ...entry, localId: Date.now().toString(), isSynced: false });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return queue[queue.length - 1];
}

export async function syncFieldOpsQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = raw ? JSON.parse(raw) : [];
  const pending = queue.filter(q => !q.isSynced);
  let synced = 0;

  for (const item of pending) {
    try {
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
        formData.append('photo', {
          uri: item.photoUri,
          name: 'evidence.jpg',
          type: 'image/jpeg',
        });
      }

      const endpoint = item.kind === 'surveillance'
        ? '/field-ops/surveillance/'
        : '/field-ops/block-activities/';

      await ApiService.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      item.isSynced = true;
      synced += 1;
    } catch (e) {
      console.warn('[FieldOps] sync failed:', e.message);
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return { synced, pending: pending.length - synced };
}

export async function submitBlockActivity(payload, photoUri) {
  const entry = await queueFieldOp({ kind: 'activity', payload, photoUri });
  const { synced } = await syncFieldOpsQueue();
  return { success: synced > 0 || !photoUri, queued: !synced, entry };
}

export async function submitSurveillanceReport(payload, photoUri) {
  const entry = await queueFieldOp({ kind: 'surveillance', payload, photoUri });
  const { synced } = await syncFieldOpsQueue();
  return { success: synced > 0 || !photoUri, queued: !synced, entry };
}
