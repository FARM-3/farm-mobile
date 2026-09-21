import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../../../theme/colors';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import { fetchAllHullingRecords, getUnsyncedHullingRecords, syncAllHullingRecords } from '../../../services/hullingService';

export default function HullingSummaryScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let merged = [];
    const net = await NetInfo.fetch();
    if (net.isConnected && net.isInternetReachable !== false) {
      setStatus('Syncing…');
      await syncAllHullingRecords();
      const remote = await fetchAllHullingRecords();
      if (remote.success) {
        merged = (remote.remoteData || []).map(r => ({ ...r, isSynced: true }));
      }
      setStatus('Online — records synced with MIS');
    } else {
      setStatus('Offline — showing local queue');
    }
    const local = await getUnsyncedHullingRecords();
    const pending = (local.records || []).filter(r => !r.synced).map(r => ({ ...r, isSynced: false }));
    const ids = new Set(merged.map(r => r.id));
    pending.forEach(r => { if (!ids.has(r.id)) merged.unshift(r); });
    setRecords(merged);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      <SimpleHeader title="Hulling Records" onBack={() => navigation.goBack()} />
      <View style={styles.toolbar}>
        <Text style={styles.status}>{status}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('HullingForm')}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addText}>New</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={CoffeeColors.DARK_BROWN} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.empty}>No hulling records yet</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.lot}>{item.lot_id}</Text>
              <Text style={styles.meta}>{item.weight_before} kg → {item.weight_after || '?'} kg</Text>
              <Text style={styles.meta}>Outturn: {item.outturn || '—'}% · {item.date}</Text>
              <Text style={[styles.badge, item.isSynced ? styles.synced : styles.pending]}>
                {item.isSynced ? 'Synced' : 'Pending sync'}
              </Text>
            </View>
          )}
        />
      )}
      <BottomNav navigation={navigation} activeTab="Processing" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  status: { flex: 1, fontSize: 12, color: '#666', marginRight: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: CoffeeColors.DARK_BROWN, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 4 },
  addText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  lot: { fontWeight: '700', fontSize: 16, color: CoffeeColors.DARK_BROWN },
  meta: { color: '#555', marginTop: 4 },
  badge: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, fontSize: 11, overflow: 'hidden' },
  synced: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  pending: { backgroundColor: '#FFF3E0', color: '#E65100' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
