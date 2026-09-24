import NetInfo from '@react-native-community/netinfo';

export async function isOnline() {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable !== false);
}

export function buildSyncAlert({ synced, offline, error, successOnline, successOffline }) {
  if (synced) {
    return { title: 'Saved', message: successOnline || 'Record synced successfully.' };
  }
  if (offline) {
    return { title: 'Saved locally', message: successOffline || 'Will sync automatically when you are back online.' };
  }
  return {
    title: 'Saved locally',
    message: error
      ? `${error} Tap the cloud icon on the dashboard to retry.`
      : 'Could not reach the server. Saved locally — tap sync to retry.',
  };
}
