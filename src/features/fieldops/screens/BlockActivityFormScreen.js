import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomPicker from '../../../components/CustomPicker';
import MultiSelectPicker from '../../../components/MultiSelectPicker';
import CustomAlert from '../../../components/CustomAlert';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import { loadPickerMap } from '../../../services/configService';
import { fetchBlocks, submitBlockActivity } from '../../../services/fieldOpsService';

const LOG_TYPES = [
  { label: 'Farm practice', value: 'practice' },
  { label: 'Input application', value: 'input' },
  { label: 'Scouting', value: 'scouting' },
  { label: 'Maintenance', value: 'maintenance' },
];

const INPUT_TYPES = [
  { label: 'Fertilizer', value: 'fertilizer' },
  { label: 'Pesticide', value: 'pesticide' },
  { label: 'Organic input', value: 'organic' },
  { label: 'Other', value: 'other' },
];

const WEATHER = ['sunny', 'cloudy', 'rainy', 'windy'];

export default function BlockActivityFormScreen({ navigation }) {
  const [blocks, setBlocks] = useState([]);
  const [pickers, setPickers] = useState({ practices: [], fertilizers: [], pesticides: [] });
  const [loading, setLoading] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });
  const [form, setForm] = useState({
    block_id: '', log_type: 'practice', title: '', description: '',
    practices: [], input_type: 'fertilizer', input_name: '', quantity: '', unit: 'kg',
    activity_date: new Date(), weather_conditions: [], notes: '', harvest_id: '',
  });

  useEffect(() => {
    (async () => {
      const [b, p] = await Promise.all([fetchBlocks(), loadPickerMap()]);
      setBlocks((b.blocks || []).map(x => ({ label: x.block_id, value: x.block_id })));
      setPickers({
        practices: (p.practices || []).map(v => ({ label: v, value: v })),
        fertilizers: (p.fertilizers || []).map(v => ({ label: v, value: v })),
        pesticides: (p.pesticides || []).map(v => ({ label: v, value: v })),
      });
    })();
  }, []);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const toggleWeather = (w) => {
    setForm(f => ({
      ...f,
      weather_conditions: f.weather_conditions.includes(w)
        ? f.weather_conditions.filter(x => x !== w)
        : [...f.weather_conditions, w],
    }));
  };

  const save = async () => {
    if (!form.block_id || !form.title.trim()) {
      setAlert({ visible: true, title: 'Required', message: 'Block and title are required.' });
      return;
    }
    setLoading(true);
    const payload = {
      log_id: `BAL-${Date.now().toString().slice(-8)}`,
      block_id: form.block_id,
      log_type: form.log_type,
      title: form.title.trim(),
      description: form.description,
      practices: form.practices,
      input_type: form.log_type === 'input' ? form.input_type : '',
      input_name: form.log_type === 'input' ? form.input_name : '',
      quantity: form.quantity || '',
      unit: form.unit,
      activity_date: form.activity_date.toISOString().slice(0, 10),
      weather_conditions: form.weather_conditions,
      notes: form.notes,
      harvest_id: form.harvest_id,
    };
    const result = await submitBlockActivity(payload, photoUri);
    setLoading(false);
    setAlert({
      visible: true,
      title: result.success ? 'Saved' : 'Queued offline',
      message: result.success
        ? 'Block activity logged. Visible on web Block Activities & Trace Report.'
        : 'Saved locally — will sync when online.',
    });
    if (result.success) {
      setForm(f => ({ ...f, title: '', description: '', practices: [], notes: '', harvest_id: '' }));
      setPhotoUri(null);
    }
  };

  return (
    <View style={styles.container}>
      <SimpleHeader title="Log Block Activity" onBackPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <CustomPicker label="Block *" selectedValue={form.block_id} items={[{ label: 'Select block', value: '' }, ...blocks]} onValueChange={v => setForm(f => ({ ...f, block_id: v }))} />
        <CustomPicker label="Activity type" selectedValue={form.log_type} items={LOG_TYPES} onValueChange={v => setForm(f => ({ ...f, log_type: v }))} />
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} placeholder="e.g. NPK application" />

        {form.log_type === 'practice' && (
          <MultiSelectPicker label="Practices applied" items={pickers.practices} selectedValues={form.practices} onValueChange={v => setForm(f => ({ ...f, practices: v }))} />
        )}

        {form.log_type === 'input' && (
          <>
            <CustomPicker label="Input type" selectedValue={form.input_type} items={INPUT_TYPES} onValueChange={v => setForm(f => ({ ...f, input_type: v }))} />
            <CustomPicker
              label="Input name"
              selectedValue={form.input_name}
              items={[{ label: 'Select or type below', value: '' }, ...(form.input_type === 'pesticide' ? pickers.pesticides : pickers.fertilizers)]}
              onValueChange={v => setForm(f => ({ ...f, input_name: v }))}
            />
            <TextInput style={styles.input} value={form.input_name} onChangeText={t => setForm(f => ({ ...f, input_name: t }))} placeholder="Input product name" />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} value={form.quantity} onChangeText={t => setForm(f => ({ ...f, quantity: t }))} placeholder="Qty" keyboardType="decimal-pad" />
              <TextInput style={[styles.input, { flex: 1, marginLeft: 8 }]} value={form.unit} onChangeText={t => setForm(f => ({ ...f, unit: t }))} placeholder="Unit (kg, L)" />
            </View>
          </>
        )}

        <Text style={styles.label}>Activity date</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}>
          <Text>{form.activity_date.toISOString().slice(0, 10)}</Text>
        </TouchableOpacity>
        {showDate && (
          <DateTimePicker value={form.activity_date} mode="date" onChange={(_, d) => { setShowDate(false); if (d) setForm(f => ({ ...f, activity_date: d })); }} />
        )}

        <Text style={styles.label}>Weather</Text>
        <View style={styles.chips}>
          {WEATHER.map(w => (
            <TouchableOpacity key={w} style={[styles.chip, form.weather_conditions.includes(w) && styles.chipActive]} onPress={() => toggleWeather(w)}>
              <Text style={[styles.chipText, form.weather_conditions.includes(w) && styles.chipTextActive]}>{w}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Link harvest ID (optional)</Text>
        <TextInput style={styles.input} value={form.harvest_id} onChangeText={t => setForm(f => ({ ...f, harvest_id: t }))} placeholder="FH-DEMO001" />
        <TextInput style={[styles.input, { minHeight: 70 }]} multiline value={form.notes} onChangeText={t => setForm(f => ({ ...f, notes: t }))} placeholder="Notes" />

        <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
          <Text style={styles.photoBtnText}>{photoUri ? 'Photo attached ✓' : 'Add photo evidence'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save activity</Text>}
        </TouchableOpacity>
      </ScrollView>
      <BottomNav activeScreen="Dashboard" />
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={[{ text: 'OK', onPress: () => setAlert(a => ({ ...a, visible: false })) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f3' },
  scroll: { flex: 1 },
  label: { fontFamily: Fonts.regular, fontSize: 13, color: '#666', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontFamily: Fonts.regular },
  row: { flexDirection: 'row' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#eee' },
  chipActive: { backgroundColor: CoffeeColors.PRIMARY_BROWN },
  chipText: { fontSize: 12, textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  photoBtn: { marginTop: 16, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: CoffeeColors.PRIMARY_BROWN, alignItems: 'center' },
  photoBtnText: { color: CoffeeColors.PRIMARY_BROWN, fontFamily: Fonts.semiBold },
  saveBtn: { marginTop: 20, backgroundColor: CoffeeColors.PRIMARY_BROWN, padding: 16, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontFamily: Fonts.semiBold, fontSize: 16 },
});
