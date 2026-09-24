import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import { fetchBlockActivities, syncFieldOpsQueue } from '../../../services/fieldOpsService';
import { isOnline } from '../../../utils/syncFeedback';

export default function BlockActivityListScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (await isOnline()) await syncFieldOpsQueue();
    const { items: data } = await fetchBlockActivities();
    setItems(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return (
    <View style={styles.container}>
      <SimpleHeader title="Block Activities" onBackPress={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={CoffeeColors.PRIMARY_BROWN} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id || item.log_id || i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={<Text style={styles.empty}>No activities yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              {item._pending && <Text style={styles.pending}>Pending sync</Text>}
              <Text style={styles.meta}>
                {item.block_id ? `Block ${item.block_id}` : item.location_label || 'Farm-wide'} · {item.log_type || 'activity'}
              </Text>
              <Text style={styles.meta}>{item.activity_date || item.created_at?.slice?.(0, 10)}</Text>
            </View>
          )}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('BlockActivityForm')}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.fabText}>Record activity</Text>
      </TouchableOpacity>
      <BottomNav activeScreen="Dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f3' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  title: { fontFamily: Fonts.semiBold, fontSize: 15, color: CoffeeColors.DARK_BROWN },
  pending: { fontSize: 10, color: '#E65100', marginTop: 4 },
  meta: { fontSize: 12, color: '#888', marginTop: 2 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  fab: {
    position: 'absolute', bottom: 90, left: 20, right: 20, backgroundColor: CoffeeColors.PRIMARY_BROWN,
    borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  fabText: { color: '#fff', fontFamily: Fonts.semiBold, fontSize: 16 },
});
