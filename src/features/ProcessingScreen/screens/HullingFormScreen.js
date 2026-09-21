import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import CoffeeColors from '../../../theme/colors';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';
import CustomPicker from '../../../components/CustomPicker';
import { postHullingRecord, fetchAvailableLotIds, syncAllHullingRecords } from '../../../services/hullingService';

function formatDateForApi(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HullingFormScreen({ navigation }) {
  const [form, setForm] = useState({
    lot_id: '', weight_before: '', weight_after: '', outturn: '', screen_size: '', staff_id: '', date: new Date(),
  });
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' });

  useEffect(() => {
    (async () => {
      const res = await fetchAvailableLotIds();
      setLots(res.lots || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const before = parseFloat(form.weight_before) || 0;
    const after = parseFloat(form.weight_after) || 0;
    if (before > 0 && after > 0) {
      const pct = ((after / before) * 100).toFixed(2);
      setForm(f => ({ ...f, outturn: pct }));
    }
  }, [form.weight_before, form.weight_after]);

  const save = async () => {
    if (!form.lot_id || !form.weight_before) {
      setAlert({ visible: true, title: 'Missing fields', message: 'Lot ID and weight before are required.', type: 'error' });
      return;
    }
    setSaving(true);
    const payload = {
      lot_id: form.lot_id,
      weight_before: parseFloat(form.weight_before),
      weight_after: form.weight_after ? parseFloat(form.weight_after) : null,
      outturn: form.outturn ? parseFloat(form.outturn) : null,
      screen_size: form.screen_size,
      staff_id: form.staff_id,
      activity: 'hulling',
      date: formatDateForApi(form.date),
    };
    const local = await postHullingRecord(payload);
    const net = await NetInfo.fetch();
    if (net.isConnected && net.isInternetReachable !== false) {
      await syncAllHullingRecords();
    }
    setSaving(false);
    setAlert({
      visible: true,
      title: local.success ? 'Saved' : 'Error',
      message: local.success
        ? (net.isConnected ? 'Hulling record synced to MIS.' : 'Saved offline — will auto-sync when online.')
        : 'Could not save record.',
      type: local.success ? 'success' : 'error',
      buttons: local.success ? [{ text: 'OK', onPress: () => navigation.goBack() }] : [{ text: 'OK' }],
    });
  };

  return (
    <View style={styles.container}>
      <SimpleHeader title="Hulling Record" onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={CoffeeColors.DARK_BROWN} />
      ) : (
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.label}>Lot ID</Text>
          <CustomPicker
            selectedValue={form.lot_id}
            onValueChange={v => setForm(f => ({ ...f, lot_id: v }))}
            items={[{ label: 'Select lot…', value: '' }, ...lots.map(l => ({ label: l, value: l }))]}
          />
          {[
            ['weight_before', 'Weight before (kg)'],
            ['weight_after', 'Weight after (kg)'],
            ['outturn', 'Outturn (%)'],
            ['screen_size', 'Screen size'],
            ['staff_id', 'Staff ID'],
          ].map(([key, label]) => (
            <View key={key}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                keyboardType={key.includes('weight') || key === 'outturn' ? 'decimal-pad' : 'default'}
                value={String(form[key] || '')}
                onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
              />
            </View>
          ))}
          <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
            <Text style={styles.btnText}>{saving ? 'Saving…' : 'Save hulling record'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      <BottomNav navigation={navigation} activeTab="Processing" />
      <CustomAlert {...alert} onClose={() => setAlert(a => ({ ...a, visible: false }))} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  form: { padding: 16, paddingBottom: 100 },
  label: { fontWeight: '600', marginBottom: 6, color: CoffeeColors.DARK_BROWN },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E0E0E0' },
  btn: { backgroundColor: CoffeeColors.DARK_BROWN, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});
