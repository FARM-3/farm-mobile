import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomPicker from '../../../components/CustomPicker';
import CustomAlert from '../../../components/CustomAlert';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import { fetchBlocks, submitSurveillanceReport } from '../../../services/fieldOpsService';
import { buildSyncAlert } from '../../../utils/syncFeedback';
import { pickPhotoWithOptions } from '../../../utils/photoPicker';

const SEVERITY = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const ISSUE_TYPES = [
  { label: 'Pest infestation', value: 'pest' },
  { label: 'Disease', value: 'disease' },
  { label: 'Drought / water stress', value: 'drought' },
  { label: 'Theft / damage', value: 'theft' },
  { label: 'Cherry quality', value: 'quality' },
  { label: 'Compliance', value: 'compliance' },
  { label: 'Other', value: 'other' },
];

const WEATHER = ['sunny', 'cloudy', 'rainy', 'windy', 'humid'];

export default function SurveillanceFormScreen({ navigation }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });
  const [form, setForm] = useState({
    block_id: '', title: '', description: '', severity: 'medium',
    issue_type: 'pest', issue_type_other: '', location: '', weather_conditions: [],
  });

  useEffect(() => {
    fetchBlocks().then(b => {
      setBlocks((b.blocks || []).map(x => ({ label: x.block_id, value: x.block_id })));
    });
  }, []);

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setAlert({ visible: true, title: 'Required', message: 'Title and description are required.' });
      return;
    }
    if (form.issue_type === 'other' && !form.issue_type_other.trim()) {
      setAlert({ visible: true, title: 'Required', message: 'Please specify the issue type.' });
      return;
    }
    setLoading(true);
    const payload = {
      report_id: `SUR-${Date.now().toString().slice(-8)}`,
      block_id: form.block_id,
      title: form.title.trim(),
      description: [
        form.issue_type === 'other' ? `Issue type: ${form.issue_type_other.trim()}` : '',
        form.description.trim(),
      ].filter(Boolean).join('\n'),
      severity: form.severity,
      issue_type: form.issue_type,
      location: form.location || form.block_id,
      weather_conditions: form.weather_conditions,
      status: 'open',
    };
    const result = await submitSurveillanceReport(payload, photoUri);
    setLoading(false);
    const alertMsg = buildSyncAlert({
      synced: result.success,
      offline: result.offline,
      error: result.error,
      successOnline: 'Surveillance report synced. Check Task Management → Surveillance on web.',
      successOffline: 'Saved locally — will sync automatically when online.',
    });
    setAlert({ visible: true, title: alertMsg.title, message: alertMsg.message });
    if (result.success) navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <SimpleHeader title="Surveillance Report" onBackPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <CustomPicker label="Block" selectedValue={form.block_id} items={[{ label: 'Select block (optional)', value: '' }, ...blocks]} onValueChange={v => setForm(f => ({ ...f, block_id: v, location: v }))} />
        <CustomPicker label="Issue type" selectedValue={form.issue_type} items={ISSUE_TYPES} onValueChange={v => setForm(f => ({ ...f, issue_type: v }))} />
        {form.issue_type === 'other' && (
          <>
            <Text style={styles.label}>Specify issue type *</Text>
            <TextInput style={styles.input} value={form.issue_type_other} onChangeText={t => setForm(f => ({ ...f, issue_type_other: t }))} placeholder="e.g. Equipment failure, boundary dispute..." />
          </>
        )}
        <CustomPicker label="Severity" selectedValue={form.severity} items={SEVERITY} onValueChange={v => setForm(f => ({ ...f, severity: v }))} />
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} placeholder="Brief issue title" />
        <Text style={styles.label}>Description *</Text>
        <TextInput style={[styles.input, { minHeight: 100 }]} multiline value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} placeholder="What did you observe? Location in block, affected trees, recommended action..." />
        <Text style={styles.label}>Location detail</Text>
        <TextInput style={styles.input} value={form.location} onChangeText={t => setForm(f => ({ ...f, location: t }))} placeholder="e.g. South-east corner" />
        <Text style={styles.label}>Weather</Text>
        <View style={styles.chips}>
          {WEATHER.map(w => (
            <TouchableOpacity key={w} style={[styles.chip, form.weather_conditions.includes(w) && styles.chipActive]} onPress={() => setForm(f => ({
              ...f,
              weather_conditions: f.weather_conditions.includes(w)
                ? f.weather_conditions.filter(x => x !== w)
                : [...f.weather_conditions, w],
            }))}>
              <Text style={[styles.chipText, form.weather_conditions.includes(w) && styles.chipTextActive]}>{w}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhotoWithOptions(setPhotoUri)}>
          <Text style={styles.photoBtnText}>{photoUri ? 'Photo attached ✓ — tap to change' : 'Add photo evidence (camera or gallery)'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Submit report</Text>}
        </TouchableOpacity>
      </ScrollView>
      <BottomNav activeScreen="Dashboard" />
      <CustomAlert visible={alert.visible} title={alert.title} message={alert.message} buttons={[{ text: 'OK', onPress: () => setAlert(a => ({ ...a, visible: false })) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f3' },
  scroll: { flex: 1 },
  label: { fontFamily: Fonts.regular, fontSize: 13, color: '#666', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontFamily: Fonts.regular },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#eee' },
  chipActive: { backgroundColor: CoffeeColors.PRIMARY_BROWN },
  chipText: { fontSize: 12, textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  photoBtn: { marginTop: 16, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: CoffeeColors.PRIMARY_BROWN, alignItems: 'center' },
  photoBtnText: { color: CoffeeColors.PRIMARY_BROWN, fontFamily: Fonts.semiBold, textAlign: 'center' },
  saveBtn: { marginTop: 20, backgroundColor: CoffeeColors.PRIMARY_BROWN, padding: 16, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontFamily: Fonts.semiBold, fontSize: 16 },
});
