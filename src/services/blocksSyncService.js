import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';

const QUEUE_KEY = 'blocks_sync_queue';

export async function getPendingBlocksCount() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw).length : 0;
}

/** Upload queued block records; keeps only failures in storage. */
export async function syncBlocksQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const pendingBlocks = raw ? JSON.parse(raw) : [];
  if (!pendingBlocks.length) {
    return { synced: 0, pending: 0 };
  }

  let synced = 0;
  const failedBlocks = [];

  for (const block of pendingBlocks) {
    try {
      if (!block.block_id) {
        failedBlocks.push(block);
        continue;
      }
      try {
        const check = await ApiService.get(`harvests/blocks/${block.block_id}/`);
        if (check.status === 200) {
          synced += 1;
          continue;
        }
      } catch {
        // not found — create below
      }
      const response = await ApiService.post('harvests/blocks/', block);
      if (response.status === 201 || response.status === 200) {
        synced += 1;
      } else {
        failedBlocks.push(block);
      }
    } catch {
      failedBlocks.push(block);
    }
  }

  if (failedBlocks.length) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedBlocks));
  } else {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }

  return { synced, pending: failedBlocks.length };
}
