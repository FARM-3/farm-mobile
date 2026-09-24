import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomPicker from '../../../components/CustomPicker';
import MultiSelectPicker from '../../../components/MultiSelectPicker';
import CustomAlert from '../../../components/CustomAlert';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import { loadPickerMap } from '../../../services/configService';
import { fetchBlocks, submitBlockActivity } from '../../../services/fieldOpsService';
import { buildSyncAlert } from '../../../utils/syncFeedback';
import { pickPhotoWithOptions } from '../../../utils/photoPicker';

const LOG_TYPES = [
  { label: 'Farm practice', value: 'practice' },
  { label: 'Input application', value: 'input' },
  { label: 'Scouting', value: 'scouting' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Other', value: 'other' },
];

const INPUT_TYPES = [
  { label: 'Fertilizer', value: 'fertilizer' },
  { label: 'Pesticide', value: 'pesticide' },
  { label: 'Organic input', value: 'organic' },
  { label: 'Other', value: 'other' },
];

const OTHER_PRACTICE = '__other__';
const WEATHER = ['sunny', 'cloudy', 'rainy', 'windy'];

export default function BlockActivityFormScreen({ navigation }) {
  const [blocks, setBlocks] = useState([]);
  const [pickers, setPickers] = useState({
    practices: [], fertilizers: [], pesticides: [], fertilizerTypes: [],
    organicProducts: [], inorganicProducts: [], mixedProducts: [],
  });
  const [loading, setLoading] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '' });
  const SCOPE_OPTIONS = [
    { label: 'Specific block', value: 'block' },
    { label: 'Whole farm / general', value: 'farm' },
    { label: 'Nursery', value: 'nursery' },
    { label: 'Processing area', value: 'processing' },
    { label: 'Other location', value: 'other' },
  ];

  const [form, setForm] = useState({
    activity_scope: 'block', location_label: '', block_id: '', log_type: 'practice', log_type_other: '', title: '', description: '',
    practices: [], practice_other: '', input_type: 'fertilizer', fertilizer_category: '', input_name: '', input_type_other: '',
    quantity: '', unit: 'kg', activity_date: new Date(), weather_conditions: [], notes: '', harvest_id: '',
  });

  useEffect(() => {
    (async () => {
      const [b, p] = await Promise.all([fetchBlocks(), loadPickerMap()]);
      setBlocks((b.blocks || []).map(x => ({ label: x.block_id, value: x.block_id })));
      const types = p.fertilizer_types || [];
      const organic = p.fertilizer_organic || [];
      const inorganic = p.fertilizer_inorganic || [];
      const mixed = p.fertilizer_mixed || [];
      const allFerts = [...organic, ...inorganic, ...mixed, ...(p.fertilizers || [])];
      const toItems = (list) => (list || []).map(v => ({ label: v, value: v }));
      setPickers({
        practices: toItems(p.practices),
        fertilizers: [...new Set(allFerts)].map(v => ({ label: v, value: v })),
        pesticides: toItems(p.pesticides),
        organicProducts: toItems(organic),
        inorganicProducts: toItems(inorganic),
        mixedProducts: toItems(mixed),
        fertilizerTypes: types.map(t => ({
          label: t.name,
          value: t.name.toLowerCase(),
          products: (t.sub_types || []).filter(s => s.is_active !== false).map(s => ({ label: s.name, value: s.name })),
        })),
      });
    })();
  }, []);

  const practiceItems = useMemo(
    () => [...pickers.practices, { label: 'Other (specify)', value: OTHER_PRACTICE }],
    [pickers.practices],
  );

  const fertilizerCategoryItems = useMemo(() => {
    if (pickers.fertilizerTypes.length) {
      return [{ label: 'Select category', value: '' }, ...pickers.fertilizerTypes.map(t => ({ label: t.label, value: t.value }))];
    }
    return [
      { label: 'Select category', value: '' },
      { label: 'Organic', value: 'organic' },
      { label: 'Inorganic', value: 'inorganic' },
      { label: 'Mixed', value: 'mixed' },
    ];
  }, [pickers.fertilizerTypes]);

  const fertilizerProductItems = useMemo(() => {
    const cat = form.fertilizer_category;
    if (!cat) return [{ label: 'Select category first', value: '' }];
    const fromApi = pickers.fertilizerTypes.find(t => t.value === cat);
    if (fromApi?.products?.length) {
      return [{ label: 'Select product', value: '' }, ...fromApi.products, { label: 'Other (type below)', value: '__other__' }];
    }
    const flatMap = {
      organic: pickers.organicProducts,
      inorganic: pickers.inorganicProducts,
      mixed: pickers.mixedProducts,
    };
    const fallback = flatMap[cat]?.length ? flatMap[cat] : pickers.fertilizers;
    return [{ label: 'Select product', value: '' }, ...fallback, { label: 'Other (type below)', value: '__other__' }];
  }, [form.fertilizer_category, pickers]);

  const buildPractices = () => {
    const list = form.practices.filter(p => p !== OTHER_PRACTICE);
    if (form.practices.includes(OTHER_PRACTICE) && form.practice_other.trim()) {
      list.push(form.practice_other.trim());
    }
    return list;
  };

  const save = async () => {
    if (!form.title.trim()) {
      setAlert({ visible: true, title: 'Required', message: 'Title is required.' });
      return;
    }
    if (form.activity_scope === 'block' && !form.block_id) {
      setAlert({ visible: true, title: 'Required', message: 'Select a block for block-specific activities.' });
      return;
    }
    if (form.activity_scope !== 'block' && !form.location_label.trim() && !form.block_id) {
      setAlert({ visible: true, title: 'Required', message: 'Enter a location label (e.g. Main nursery, fuel store).' });
      return;
    }
    if (form.log_type === 'other' && !form.log_type_other.trim()) {
      setAlert({ visible: true, title: 'Required', message: 'Please describe the activity type.' });
      return;
    }
    if (form.log_type === 'input' && form.input_type === 'other' && !form.input_type_other.trim() && !form.input_name.trim()) {
      setAlert({ visible: true, title: 'Required', message: 'Please specify the input type/name.' });
      return;
    }
    setLoading(true);
    const inputName = form.input_type === 'other'
      ? (form.input_type_other.trim() || form.input_name.trim())
      : form.input_name;
    const fertilizerNote = form.input_type === 'fertilizer' && form.fertilizer_category
      ? `Category: ${form.fertilizer_category}`
      : '';
    const payload = {
      log_id: `BAL-${Date.now().toString().slice(-8)}`,
      activity_scope: form.activity_scope,
      location_label: form.location_label.trim(),
      block_id: form.activity_scope === 'block' ? form.block_id : (form.block_id || ''),
      log_type: form.log_type,
      title: form.title.trim(),
      description: [
        form.log_type === 'other' ? `Activity type: ${form.log_type_other.trim()}` : '',
        form.description,
      ].filter(Boolean).join('\n'),
      practices: buildPractices(),
      input_type: form.log_type === 'input' ? form.input_type : '',
      input_name: form.log_type === 'input' ? inputName : '',
      quantity: form.quantity || '',
      unit: form.unit,
      activity_date: form.activity_date.toISOString().slice(0, 10),
      weather_conditions: form.weather_conditions,
      notes: [fertilizerNote, form.notes].filter(Boolean).join('\n'),
      harvest_id: form.harvest_id,
    };
    const result = await submitBlockActivity(payload, photoUri);
    setLoading(false);
    const alertMsg = buildSyncAlert({
      synced: result.success,
      offline: result.offline,
      error: result.error,
      successOnline: 'Field activity synced. Visible on web Field Activities & Trace Report.',
      successOffline: 'Saved locally — will sync automatically when online.',
    });
    setAlert({ visible: true, title: alertMsg.title, message: alertMsg.message });
    if (result.success) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <SimpleHeader title="Log Field Activity" onBackPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <CustomPicker label="Where did this happen?" selectedValue={form.activity_scope} items={SCOPE_OPTIONS} onValueChange={v => setForm(f => ({ ...f, activity_scope: v, block_id: v === 'block' ? f.block_id : '' }))} />
        {form.activity_scope === 'block' ? (
          <CustomPicker label="Block *" selectedValue={form.block_id} items={[{ label: 'Select block', value: '' }, ...blocks]} onValueChange={v => setForm(f => ({ ...f, block_id: v }))} />
        ) : (
          <>
            <Text style={styles.label}>Location *</Text>
            <TextInput style={styles.input} value={form.location_label} onChangeText={t => setForm(f => ({ ...f, location_label: t }))} placeholder="e.g. Main nursery, workshop, estate road..." />
            <CustomPicker label="Link to block (optional)" selectedValue={form.block_id} items={[{ label: 'None', value: '' }, ...blocks]} onValueChange={v => setForm(f => ({ ...f, block_id: v }))} />
          </>
        )}
        <CustomPicker label="Activity type" selectedValue={form.log_type} items={LOG_TYPES} onValueChange={v => setForm(f => ({ ...f, log_type: v }))} />
        {form.log_type === 'other' && (
          <>
            <Text style={styles.label}>Specify activity type *</Text>
            <TextInput style={styles.input} value={form.log_type_other} onChangeText={t => setForm(f => ({ ...f, log_type_other: t }))} placeholder="e.g. Soil sampling, mulching..." />
          </>
        )}
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} placeholder="e.g. NPK application" />

        {form.log_type === 'practice' && (
          <>
            <MultiSelectPicker label="Practices applied" items={practiceItems} selectedValues={form.practices} onValueChange={v => setForm(f => ({ ...f, practices: v }))} />
            {form.practices.includes(OTHER_PRACTICE) && (
              <>
                <Text style={styles.label}>Other practice *</Text>
                <TextInput style={styles.input} value={form.practice_other} onChangeText={t => setForm(f => ({ ...f, practice_other: t }))} placeholder="Describe the practice" />
              </>
            )}
          </>
        )}

        {form.log_type === 'input' && (
          <>
            <CustomPicker label="Input type" selectedValue={form.input_type} items={INPUT_TYPES} onValueChange={v => setForm(f => ({ ...f, input_type: v, fertilizer_category: '', input_name: '' }))} />
            {form.input_type === 'other' ? (
              <>
                <Text style={styles.label}>Specify input *</Text>
                <TextInput style={styles.input} value={form.input_type_other} onChangeText={t => setForm(f => ({ ...f, input_type_other: t }))} placeholder="Input product or type" />
              </>
            ) : form.input_type === 'fertilizer' ? (
              <>
                <CustomPicker
                  label="Fertilizer category"
                  selectedValue={form.fertilizer_category}
                  items={fertilizerCategoryItems}
                  onValueChange={v => setForm(f => ({ ...f, fertilizer_category: v, input_name: '' }))}
                />
                <CustomPicker
                  label="Fertilizer product"
                  selectedValue={fertilizerProductItems.some(i => i.value === form.input_name) ? form.input_name : ''}
                  items={fertilizerProductItems}
                  onValueChange={v => setForm(f => ({ ...f, input_name: v === '__other__' ? '' : v }))}
                />
                <TextInput style={styles.input} value={form.input_name} onChangeText={t => setForm(f => ({ ...f, input_name: t }))} placeholder="Product name (or type if not listed)" />
              </>
            ) : (
              <>
                <CustomPicker
                  label="Input name"
                  selectedValue={form.input_name}
                  items={[{ label: 'Select or type below', value: '' }, ...(form.input_type === 'pesticide' ? pickers.pesticides : pickers.fertilizers)]}
                  onValueChange={v => setForm(f => ({ ...f, input_name: v }))}
                />
                <TextInput style={styles.input} value={form.input_name} onChangeText={t => setForm(f => ({ ...f, input_name: t }))} placeholder="Input product name" />
              </>
            )}
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

        <Text style={styles.label}>Link harvest ID (optional)</Text>
        <TextInput style={styles.input} value={form.harvest_id} onChangeText={t => setForm(f => ({ ...f, harvest_id: t }))} placeholder="FH-DEMO001" />
        <TextInput style={[styles.input, { minHeight: 70 }]} multiline value={form.notes} onChangeText={t => setForm(f => ({ ...f, notes: t }))} placeholder="Notes" />

        <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhotoWithOptions(setPhotoUri)}>
          <Text style={styles.photoBtnText}>{photoUri ? 'Photo attached ✓ — tap to change' : 'Add photo evidence (camera or gallery)'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save activity</Text>}
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
  row: { flexDirection: 'row' },
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
