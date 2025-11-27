import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import {
  getFloatingRecords,
  addFloatingRecord,
  getHarvestsWithRipenessScore,
} from '../../../services/qualityControl';

export default function FloatingScreen({ navigation, route }) {
  const [records, setRecords] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHarvests, setLoadingHarvests] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    harvest_id: '',
    grade: 'A',
    weight: '',
    date: new Date().toISOString().split('T')[0],
  });

  const formatDateForDisplay = (date) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDateChange = (_event, date) => {
    setShowDatePicker(Platform.OS === 'ios');

    if (date) {
      setSelectedDate(date);
      setFormData({
        ...formData,
        date: date.toISOString().split('T')[0]
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRecords();
      loadHarvests();
    }, [])
  );

  // Handle navigation params for pre-filling harvest ID from action menu or voucher
  useEffect(() => {
    if (route.params?.harvestId && route.params?.autoOpenForm) {
      console.log('[FloatingScreen] Received harvest ID from navigation:', route.params.harvestId);

      // Wait for harvests to load, then pre-fill and open form
      const setupFormWithHarvest = async () => {
        // Give harvests time to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Find the harvest in the loaded harvests
        const matchingHarvest = harvests.find(h =>
          (h.harvest_id || h.id) === route.params.harvestId
        );

        console.log('[FloatingScreen] Found matching harvest:', matchingHarvest);

        if (matchingHarvest) {
          const harvestId = matchingHarvest.harvest_id || matchingHarvest.id;
          setFormData({
            harvest_id: harvestId,
            grade: 'A',
            weight: '',
            date: new Date().toISOString().split('T')[0],
          });
          setShowForm(true);
          console.log('[FloatingScreen] Form pre-filled with harvest:', harvestId);
        } else {
          // Harvest not found in list, still set the ID and open form
          setFormData({
            harvest_id: route.params.harvestId,
            grade: 'A',
            weight: '',
            date: new Date().toISOString().split('T')[0],
          });
          setShowForm(true);
          console.log('[FloatingScreen] Form opened with harvest ID (not in list):', route.params.harvestId);
        }

        // Clear the params to prevent re-triggering
        navigation.setParams({ harvestId: undefined, autoOpenForm: undefined });
      };

      setupFormWithHarvest();
    }
  }, [route.params?.harvestId, route.params?.autoOpenForm, harvests]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await getFloatingRecords();
      setRecords(data);
    } catch (error) {
      console.error('Error loading floating records:', error);

      // Check if it's a network error or 404
      if (error.response?.status === 404) {
        console.log('[FloatingScreen] No records found (404) - displaying empty state');
        setRecords([]); // Just show empty state, don't alert
      } else if (!error.response) {
        // Network error - backend might be down
        console.log('[FloatingScreen] Backend not reachable - showing empty state');
        setRecords([]); // Show empty state instead of error
      } else {
        Alert.alert('Error', 'Failed to load floating records');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHarvests = async () => {
    try {
      setLoadingHarvests(true);
      console.log('[FloatingScreen] Fetching harvests with ripeness scores...');
      // Only load harvests that have ripeness scores (passed ripeness test stage)
      const data = await getHarvestsWithRipenessScore();
      console.log('[FloatingScreen] ✓ Successfully loaded harvests with ripeness scores:', data.length);
      console.log('[FloatingScreen] First harvest sample:', JSON.stringify(data[0], null, 2));
      console.log('[FloatingScreen] Sample harvest fields:', data[0] ? Object.keys(data[0]) : 'No harvests');
      setHarvests(data);
    } catch (error) {
      console.error('[FloatingScreen] ✗ Error loading harvests:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      // Show error to user so they know what's wrong
      Alert.alert(
        'Harvest Loading Failed',
        `Could not load harvests with ripeness scores.\n\nError: ${error.response?.status || 'Network error'}\n\nYou can still enter Harvest ID manually.`
      );
      setHarvests([]);
    } finally {
      setLoadingHarvests(false);
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

    try {
      // Find the selected harvest to get gross weight
      const selectedHarvest = harvests.find(h =>
        (h.harvest_id || h.id) === formData.harvest_id
      );

      if (!selectedHarvest) {
        Alert.alert('Error', 'Selected harvest not found. Please select again.');
        return;
      }

      const grossWeight = selectedHarvest.weight_on_delivery || selectedHarvest.weight || 0;
      const gradeAWeight = parseFloat(formData.weight);

      // Validate that Grade A weight doesn't exceed gross weight
      if (gradeAWeight > grossWeight) {
        Alert.alert(
          'Validation Error',
          `Grade A weight (${gradeAWeight} kg) cannot exceed gross weight (${grossWeight} kg)`
        );
        return;
      }

      console.log('[FloatingScreen] Submitting Grade A and auto-calculating Grade B...');
      console.log('[FloatingScreen] Gross weight:', grossWeight);
      console.log('[FloatingScreen] Grade A weight:', gradeAWeight);

      // Calculate Grade B weight (remaining weight)
      const gradeBWeight = grossWeight - gradeAWeight;
      console.log('[FloatingScreen] Grade B weight (auto-calculated):', gradeBWeight);

      // Submit Grade A record
      const gradeAData = {
        harvest_id: formData.harvest_id,
        grade: 'A',
        weight: gradeAWeight,
        date: formData.date,
      };

      console.log('[FloatingScreen] Submitting Grade A:', gradeAData);
      const gradeAResponse = await addFloatingRecord(gradeAData);
      console.log('[FloatingScreen] ✓ Grade A submitted successfully:', gradeAResponse);

      // Automatically submit Grade B record
      const gradeBData = {
        harvest_id: formData.harvest_id,
        grade: 'B',
        weight: gradeBWeight,
        date: formData.date,
      };

      console.log('[FloatingScreen] Auto-submitting Grade B:', gradeBData);
      const gradeBResponse = await addFloatingRecord(gradeBData);
      console.log('[FloatingScreen] ✓ Grade B submitted successfully:', gradeBResponse);

      // Show success message with details
      Alert.alert(
        'Success',
        `Both grades recorded successfully!\n\n` +
        `Grade A: ${gradeAWeight} kg (ID: ${gradeAResponse.grade_id || 'N/A'})\n` +
        `Grade B: ${gradeBWeight} kg (ID: ${gradeBResponse.grade_id || 'N/A'})\n\n` +
        `Total: ${grossWeight} kg`
      );

      // Reset form
      setFormData({
        harvest_id: '',
        grade: 'A',
        weight: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
      loadRecords();
    } catch (error) {
      console.error('[FloatingScreen] Error saving floating record:', error);

      // Show more detailed error message
      let errorMessage = 'Failed to save floating record';

      if (error.response?.data) {
        // Backend returned an error response
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.harvest) {
          // Harvest validation error - make it user-friendly
          const harvestError = Array.isArray(errorData.harvest) ? errorData.harvest[0] : errorData.harvest;
          if (harvestError.includes('does not exist') || harvestError.includes('Invalid pk')) {
            errorMessage = `The harvest ID "${formData.harvest_id}" does not exist in the database.\n\nPlease select a valid harvest from the dropdown that has a ripeness score.`;
          } else {
            errorMessage = `Harvest error: ${harvestError}`;
          }
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      } else if (!error.response) {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      }

      Alert.alert('Error', errorMessage);
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

  const renderForm = () => {
    // Get selected harvest to show weight info
    const selectedHarvest = harvests.find(h =>
      (h.harvest_id || h.id) === formData.harvest_id
    );
    const grossWeight = selectedHarvest?.weight_on_delivery || selectedHarvest?.weight || 0;
    const gradeAWeight = parseFloat(formData.weight) || 0;
    const gradeBWeight = grossWeight - gradeAWeight;

    return (
      <View style={styles.formContainer}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Add Floating Record</Text>
          <TouchableOpacity onPress={() => setShowForm(false)}>
            <MaterialCommunityIcons name="close" size={24} color={CoffeeColors.DARK_BROWN} />
          </TouchableOpacity>
        </View>

        {/* Info banner explaining auto-grading */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information" size={20} color={CoffeeColors.COFFEE_BROWN} />
          <Text style={styles.infoBannerText}>
            Enter Grade A weight. Grade B will be automatically calculated and recorded.
          </Text>
        </View>

        <View style={styles.formField}>
          <Text style={styles.formLabel}>Harvest ID *</Text>
          {loadingHarvests ? (
            <View style={styles.pickerLoadingContainer}>
              <ActivityIndicator size="small" color={CoffeeColors.COFFEE_BROWN} />
              <Text style={styles.pickerLoadingText}>Loading harvests...</Text>
            </View>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.harvest_id}
                onValueChange={(value) => setFormData({ ...formData, harvest_id: value })}
                style={styles.picker}
              >
                <Picker.Item
                  label={harvests.length === 0 ? "No harvests with ripeness scores yet" : "Select a harvest..."}
                  value=""
                />
                {harvests.map((harvest) => (
                  <Picker.Item
                    key={harvest.harvest_id || harvest.id}
                    label={`${harvest.harvest_id || harvest.id} - ${harvest.farmer_name || harvest.name || 'Unknown'}`}
                    value={harvest.harvest_id || harvest.id}
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>

        {/* Show gross weight when harvest is selected */}
        {selectedHarvest && (
          <View style={styles.weightInfoBox}>
            <Text style={styles.weightInfoLabel}>Gross Weight (Total):</Text>
            <Text style={styles.weightInfoValue}>{grossWeight} kg</Text>
          </View>
        )}

        <View style={styles.formField}>
          <Text style={styles.formLabel}>Grade A Weight (kg) *</Text>
          <TextInput
            style={styles.formInput}
            value={formData.weight}
            onChangeText={(text) => setFormData({ ...formData, weight: text })}
            placeholder="Enter Grade A weight in kg"
            keyboardType="decimal-pad"
            placeholderTextColor={CoffeeColors.MEDIUM_BROWN + '80'}
          />
          {selectedHarvest && formData.weight && (
            <Text style={styles.helperText}>
              Grade B will be: {gradeBWeight > 0 ? `${gradeBWeight.toFixed(2)} kg` : '0 kg'}
            </Text>
          )}
        </View>

        <View style={styles.formField}>
          <Text style={styles.formLabel}>Date *</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar" size={20} color={CoffeeColors.DARK_BROWN} />
            <Text style={styles.datePickerText}>
              {formatDateForDisplay(formData.date)}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()} // Prevent future dates
            />
          )}
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Save Both Grades</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
  pickerContainer: {
    borderWidth: 1,
    borderColor: CoffeeColors.MEDIUM_BROWN + '40',
    borderRadius: 8,
    backgroundColor: CoffeeColors.WHITE,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: CoffeeColors.DARK_BROWN,
  },
  pickerLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: CoffeeColors.MEDIUM_BROWN + '40',
    borderRadius: 8,
    backgroundColor: CoffeeColors.WHITE,
  },
  pickerLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: CoffeeColors.MEDIUM_BROWN + '40',
    borderRadius: 8,
    padding: 12,
    backgroundColor: CoffeeColors.WHITE,
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: CoffeeColors.DARK_BROWN,
    marginLeft: 10,
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CoffeeColors.COFFEE_BROWN + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: CoffeeColors.DARK_BROWN,
    lineHeight: 18,
  },
  weightInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CoffeeColors.LIGHT_GRAY,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  weightInfoLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
  },
  weightInfoValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.COFFEE_BROWN,
  },
  helperText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: CoffeeColors.COFFEE_BROWN,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
