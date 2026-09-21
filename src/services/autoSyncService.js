import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncAllRecords } from './harvestRecord';
import { syncAllAggregation } from './aggregationService';
import { syncFieldOpsQueue } from './fieldOpsService';
import { syncAllBaggingRecords } from './baggingService';
import { syncAllHullingRecords } from './hullingService';

let syncing = false;
let debounceTimer = null;
let unsubscribe = null;

async function syncAggregationDrafts() {
  const farmerDraftsJson = await AsyncStorage.getItem('farmer_drafts');
  const harvestDraftsJson = await AsyncStorage.getItem('harvest_drafts');
  const farmerRecords = farmerDraftsJson ? JSON.parse(farmerDraftsJson) : [];
  const harvestRecords = harvestDraftsJson ? JSON.parse(harvestDraftsJson) : [];
  const pendingFarmers = farmerRecords.filter(r => r._isSynced !== true);
  const pendingHarvests = harvestRecords.filter(r => r._isSynced !== true);
  if (pendingFarmers.length || pendingHarvests.length) {
    const { syncAggregationRecords } = await import('./aggregationService');
    return syncAggregationRecords(pendingFarmers, pendingHarvests);
  }
  return syncAllAggregation();
}

export async function runAutoSync({ silent = true } = {}) {
  if (syncing) return { skipped: true };
  const net = await NetInfo.fetch();
  if (!net.isConnected || net.isInternetReachable === false) {
    return { skipped: true, reason: 'offline' };
  }

  syncing = true;
  try {
    const results = {};
    results.harvests = await syncAllRecords();
    results.aggregation = await syncAggregationDrafts();
    results.fieldOps = await syncFieldOpsQueue();
    results.bagging = await syncAllBaggingRecords();
    results.hulling = await syncAllHullingRecords();
    if (!silent) {
      console.log('[AutoSync] Complete:', results);
    }
    return { success: true, results };
  } catch (error) {
    console.warn('[AutoSync] Error:', error.message);
    return { success: false, error: error.message };
  } finally {
    syncing = false;
  }
}

export function startAutoSyncListener() {
  if (unsubscribe) return unsubscribe;

  unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable !== false) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => runAutoSync(), 2500);
    }
  });

  NetInfo.fetch().then(state => {
    if (state.isConnected && state.isInternetReachable !== false) {
      setTimeout(() => runAutoSync(), 3000);
    }
  });

  return unsubscribe;
}

export function stopAutoSyncListener() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  clearTimeout(debounceTimer);
}
