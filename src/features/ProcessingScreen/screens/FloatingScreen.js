import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import {
  getFloatingRecords,
  addFloatingRecord,
} from '../../../services/qualityControl';

export default function FloatingScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    harvest_id: '',
    grade: '',
    weight: '',
    date: new Date().toISOString().split('T')[0],
    ripeness_score: '',
    grade_id: '',
  });

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await getFloatingRecords();
      setRecords(data);
    } catch (error) {
      console.error('Error loading floating records:', error);
      Alert.alert('Error', 'Failed to load floating records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.harvest_id.trim()) {
      Alert.alert('Validation Error', 'Please enter Harvest ID');
      return;
    }
    if (!formData.grade.trim()) {
      Alert.alert('Validation Error', 'Please enter Grade');
      return;
    }
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid Weight');
      return;
    }
    if (!formData.ripeness_score || parseFloat(formData.ripeness_score) < 0 || parseFloat(formData.ripeness_score) > 100) {
      Alert.alert('Validation Error', 'Please enter a valid Ripeness Score (0-100)');
      return;
    }
    if (!formData.grade_id.trim()) {
      Alert.alert('Validation Error', 'Please enter Grade ID');
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        weight: parseFloat(formData.weight),
        ripeness_score: parseFloat(formData.ripeness_score),
      };

      await addFloatingRecord(dataToSave);
      Alert.alert('Success', 'Floating record saved successfully');

      // Reset form
      setFormData({
        harvest_id: '',
        grade: '',
        weight: '',
        date: new Date().toISOString().split('T')[0],
        ripeness_score: '',
        grade_id: '',
      });
      setShowForm(false);
      loadRecords();
    } catch (error) {
      console.error('Error saving floating record:', error);
      Alert.alert('Error', 'Failed to save floating record');
    }
  };

  const renderRecordCard = (record) => (
    <View key={record.id} style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.gradeContainer}>
          <Text style={styles.gradeLabel}>Grade</Text>
          <Text style={styles.gradeText}>{record.grade}</Text>
        </View>
        <View style={styles.recordHeaderInfo}>
          <Text style={styles.recordHarvestId}>Harvest ID: {record.harvest_id}</Text>
          <Text style={styles.recordDate}>{record.date}</Text>
        </View>
      </View>
      <View style={styles.recordDetails}>
        <View style={styles.recordDetailRow}>
          <Text style={styles.recordDetailLabel}>Weight:</Text>
          <Text style={styles.recordDetailValue}>{record.weight} kg</Text>
        </View>
        <View style={styles.recordDetailRow}>
          <Text style={styles.recordDetailLabel}>Ripeness Score:</Text>
          <Text style={styles.recordDetailValue}>{record.ripeness_score}%</Text>
        </View>
        <View style={styles.recordDetailRow}>
          <Text style={styles.recordDetailLabel}>Grade ID:</Text>
          <Text style={styles.recordDetailValue}>{record.grade_id}</Text>
        </View>
      </View>
    </View>
  );

  const renderForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>Add Floating Record</Text>
        <TouchableOpacity onPress={() => setShowForm(false)}>
          <MaterialCommunityIcons name="close" size={24} color={CoffeeColors.DARK_BROWN} />
        </TouchableOpacity>
      </View>

      <View style={styles.formField}>
        <Text style={styles.formLabel}>Harvest ID *</Text>
        <TextInput
          style={styles.formInput}
          value={formData.harvest_id}
          onChangeText={(text) => setFormData({ ...formData, harvest_id: text })}
          placeholder="Enter Harvest ID"
          placeholderTextColor={CoffeeColors.MEDIUM_BROWN + '80'}
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.formLabel}>Grade *</Text>
        <TextInput
          style={styles.formInput}
          value={formData.grade}
          onChangeText={(text) => setFormData({ ...formData, grade: text })}
          placeholder="Enter Grade (e.g., A, B, C)"
          placeholderTextColor={CoffeeColors.MEDIUM_BROWN + '80'}
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.formLabel}>Weight (kg) *</Text>
        <TextInput
          style={styles.formInput}
          value={formData.weight}
          onChangeText={(text) => setFormData({ ...formData, weight: text })}
          placeholder="Enter Weight in kg"
          keyboardType="decimal-pad"
          placeholderTextColor={CoffeeColors.MEDIUM_BROWN + '80'}
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.formLabel}>Date *</Text>
        <TextInput
          style={styles.formInput}
          value={formData.date}
          onChangeText={(text) => setFormData({ ...formData, date: text })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={CoffeeColors.MEDIUM_BROWN + '80'}
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.formLabel}>Ripeness Score (%) *</Text>
        <TextInput
          style={styles.formInput}
          value={formData.ripeness_score}
          onChangeText={(text) => setFormData({ ...formData, ripeness_score: text })}
          placeholder="Enter Ripeness Score (0-100)"
          keyboardType="decimal-pad"
          placeholderTextColor={CoffeeColors.MEDIUM_BROWN + '80'}
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.formLabel}>Grade ID *</Text>
        <TextInput
          style={styles.formInput}
          value={formData.grade_id}
          onChangeText={(text) => setFormData({ ...formData, grade_id: text })}
          placeholder="Enter Grade ID"
          placeholderTextColor={CoffeeColors.MEDIUM_BROWN + '80'}
        />
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Save Floating Record</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SimpleHeader title="Floating Records" navigation={navigation} />

      <View style={{ flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {!showForm && (
            <>
              <View style={styles.headerSection}>
                <MaterialCommunityIcons
                  name="water"
                  size={40}
                  color={CoffeeColors.MEDIUM_BROWN}
                />
                <Text style={styles.headerTitle}>Floating Records</Text>
                <Text style={styles.headerSubtitle}>
                  {records.length} record{records.length !== 1 ? 's' : ''} found
                </Text>
              </View>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowForm(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="plus" size={24} color={CoffeeColors.WHITE} />
                <Text style={styles.addButtonText}>Add Floating Record</Text>
              </TouchableOpacity>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={CoffeeColors.COFFEE_BROWN} />
                  <Text style={styles.loadingText}>Loading records...</Text>
                </View>
              ) : records.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons
                    name="clipboard-text-outline"
                    size={64}
                    color={CoffeeColors.MEDIUM_BROWN + '40'}
                  />
                  <Text style={styles.emptyText}>No floating records yet</Text>
                  <Text style={styles.emptySubtext}>
                    Tap the button above to add your first record
                  </Text>
                </View>
              ) : (
                <View style={styles.recordsList}>
                  {records.map(renderRecordCard)}
                </View>
              )}
            </>
          )}

          {showForm && renderForm()}
        </ScrollView>
      </View>

      <BottomNav activeScreen="Processing" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
    marginTop: 8,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  addButton: {
    backgroundColor: CoffeeColors.DARK_BROWN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: CoffeeColors.WHITE,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: CoffeeColors.MEDIUM_BROWN,
    textAlign: 'center',
  },
  recordsList: {
    gap: 12,
  },
  recordCard: {
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 12,
    padding: 16,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradeContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: CoffeeColors.COFFEE_BROWN + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gradeLabel: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: CoffeeColors.COFFEE_BROWN,
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.COFFEE_BROWN,
  },
  recordHeaderInfo: {
    flex: 1,
  },
  recordHarvestId: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  recordDetails: {
    borderTopWidth: 1,
    borderTopColor: CoffeeColors.LIGHT_GRAY,
    paddingTop: 12,
    gap: 8,
  },
  recordDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordDetailLabel: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  recordDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
  },
  formContainer: {
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 12,
    padding: 20,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: CoffeeColors.MEDIUM_BROWN + '40',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: CoffeeColors.DARK_BROWN,
    backgroundColor: CoffeeColors.WHITE,
  },
  submitButton: {
    backgroundColor: CoffeeColors.DARK_BROWN,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: CoffeeColors.WHITE,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
  },
});
