import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let CameraView, useCameraPermissions;
try {
  const camera = require('expo-camera');
  CameraView = camera.CameraView;
  useCameraPermissions = camera.useCameraPermissions;
} catch (e) {
  CameraView = null;
  useCameraPermissions = null;
}

import CoffeeColors from '../../../theme/colors';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import { scanTraceCode } from '../../../services/traceService';

function StageRow({ stage, index }) {
  const statusColor = {
    completed: '#34A853',
    skipped: '#9E9E9E',
    in_progress: '#FBBC04',
    pending: '#BDBDBD',
  }[stage.status] || '#BDBDBD';

  return (
    <View style={styles.stageRow}>
      <View style={styles.stageNum}><Text style={styles.stageNumText}>{index + 1}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stageName}>{stage.name}{stage.optional ? ' (optional)' : ''}</Text>
        <Text style={[styles.stageStatus, { color: statusColor }]}>{stage.status}{stage.date ? ` · ${stage.date}` : ''}</Text>
      </View>
    </View>
  );
}

export default function ScanLotTraceScreen({ navigation, route }) {
  const [manualCode, setManualCode] = useState(route?.params?.prefillCode || '');
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState(null);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [null, null];

  const handleCode = async (code) => {
    setLoading(true);
    setError('');
    setTrace(null);
    const result = await scanTraceCode(code);
    setLoading(false);
    if (result.success) {
      setTrace(result.data);
      setShowScanner(false);
    } else {
      setError(result.error || 'No trace found for this code');
    }
  };

  const onBarcode = ({ data }) => {
    if (data) handleCode(data);
  };

  useEffect(() => {
    const code = route?.params?.prefillCode;
    if (code) handleCode(code);
  }, [route?.params?.prefillCode]);

  return (
    <View style={styles.container}>
      <SimpleHeader title="Scan Lot Trace" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>Scan a lot QR (LOT:…), block QR (BLOCK:…), or enter the code manually.</Text>

        {CameraView && (
          <TouchableOpacity style={styles.scanBtn} onPress={async () => {
            if (!permission?.granted) {
              await requestPermission();
            }
            setShowScanner(!showScanner);
          }}>
            <Ionicons name="qr-code-outline" size={22} color="#fff" />
            <Text style={styles.scanBtnText}>{showScanner ? 'Hide camera' : 'Scan QR code'}</Text>
          </TouchableOpacity>
        )}

        {showScanner && CameraView && permission?.granted && (
          <View style={styles.cameraWrap}>
            <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onBarcode} />
          </View>
        )}

        <View style={styles.manualRow}>
          <TextInput
            style={styles.input}
            placeholder="LOT:W38, BLOCK:B01, or harvest ID"
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.lookupBtn} onPress={() => handleCode(manualCode)}>
            <Text style={styles.lookupBtnText}>Look up</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator color={CoffeeColors.DARK_BROWN} style={{ marginVertical: 16 }} />}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {trace && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {trace.scan_type === 'block'
                ? `Block ${trace.block_id}`
                : trace.scanned_lot_id
                  ? `Lot ${trace.scanned_lot_id}`
                  : trace.harvest_id || 'Trace result'}
            </Text>

            {trace.scan_type === 'block' && trace.block && (
              <>
                <Text style={styles.line}>Trees: {trace.block.no_of_trees}</Text>
                <Text style={styles.line}>Coffee: {trace.block.type_of_coffee}</Text>
                <Text style={styles.line}>Planted: {trace.block.date_planted}</Text>
                <Text style={styles.line}>Seedling: {trace.block.type_of_seedling}</Text>
                <Text style={styles.line}>GAP: {trace.block.standard_practices || '—'}</Text>
                <Text style={styles.line}>Fertilizers: {trace.block.fertilizer_names || trace.block.fertilizers || '—'}</Text>
                {trace.field_history?.block_activities?.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent activities ({trace.activity_count || trace.field_history.block_activities.length})</Text>
                    {trace.field_history.block_activities.slice(0, 5).map((a, i) => (
                      <Text key={a.log_id || i} style={styles.line}>{a.activity_date}: {a.title} ({a.log_type})</Text>
                    ))}
                  </View>
                )}
                {trace.harvests?.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Harvests from block</Text>
                    {trace.harvests.slice(0, 5).map((h, i) => (
                      <Text key={h.harvest_id || i} style={styles.line}>{h.harvest_id} — {h.weight_on_delivery} kg</Text>
                    ))}
                  </View>
                )}
              </>
            )}

            {trace.scan_type !== 'block' && trace.farmer_name && <Text style={styles.line}>Supplier: {trace.farmer_name}</Text>}
            {trace.scan_type !== 'block' && trace.source?.coffee_type && <Text style={styles.line}>Coffee: {trace.source.coffee_type}</Text>}
            {trace.scan_type !== 'block' && trace.source?.gps_coordinates && <Text style={styles.line}>GPS: {trace.source.gps_coordinates}</Text>}
            {trace.scan_type !== 'block' && trace.current_stage && <Text style={styles.line}>Stage: {trace.current_stage}</Text>}

            {trace.stages?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Processing timeline</Text>
                {trace.stages.map((s, i) => <StageRow key={i} stage={s} index={i} />)}
              </View>
            )}

            {trace.loss_summary?.stages?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Weight chain</Text>
                {trace.loss_summary.stages.map((s, i) => (
                  <Text key={i} style={styles.line}>{s.stage}: {s.input_kg}kg → {s.output_kg}kg</Text>
                ))}
              </View>
            )}

            {trace.note && <Text style={styles.note}>{trace.note}</Text>}
          </View>
        )}
      </ScrollView>

      <BottomNav navigation={navigation} activeTab="Dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 100 },
  hint: { color: CoffeeColors.GRAY_TEXT, marginBottom: 12 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: CoffeeColors.DARK_BROWN, padding: 14, borderRadius: 12, marginBottom: 12,
  },
  scanBtnText: { color: '#fff', fontWeight: '700' },
  cameraWrap: { height: 220, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  camera: { flex: 1 },
  manualRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  lookupBtn: {
    backgroundColor: CoffeeColors.PRIMARY_BROWN, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10,
  },
  lookupBtnText: { color: '#fff', fontWeight: '600' },
  error: { color: '#c62828', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: CoffeeColors.DARK_BROWN, marginBottom: 8 },
  line: { fontSize: 14, color: '#444', marginBottom: 4 },
  section: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  sectionTitle: { fontWeight: '700', color: CoffeeColors.DARK_BROWN, marginBottom: 8 },
  stageRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  stageNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: CoffeeColors.DARK_BROWN,
    alignItems: 'center', justifyContent: 'center',
  },
  stageNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stageName: { fontWeight: '600', color: '#333' },
  stageStatus: { fontSize: 12, textTransform: 'capitalize' },
  note: { marginTop: 10, fontSize: 12, color: '#888', fontStyle: 'italic' },
});
