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
  getRipenessScores,
  addRipenessScore,
  getAllHarvests,
} from '../../../services/qualityControl';

export default function RipenessScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHarvests, setLoadingHarvests] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    harvest_id: '',
    date: new Date().toISOString().split('T')[0],
    sample_size: '100',
    no_of_red_cherry: '',
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

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS

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

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await getRipenessScores();
      setRecords(data);
    } catch (error) {
      console.error('Error loading ripeness records:', error);

      // Check if it's a network error or 404
      if (error.response?.status === 404) {
        console.log('[RipenessScreen] No records found (404) - displaying empty state');
        setRecords([]); // Just show empty state, don't alert
      } else if (!error.response) {
        // Network error - backend might be down
        console.log('[RipenessScreen] Backend not reachable - showing empty state');
        setRecords([]); // Show empty state instead of error
      } else {
        Alert.alert('Error', 'Failed to load ripeness records');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHarvests = async () => {
    try {
      setLoadingHarvests(true);
      console.log('[RipenessScreen] Fetching harvests from /api/aggregation/farmer-harvest/...');
      const data = await getAllHarvests();
      console.log('[RipenessScreen] ✓ Successfully loaded harvests:', data.length);
      console.log('[RipenessScreen] First harvest sample:', JSON.stringify(data[0], null, 2));
      console.log('[RipenessScreen] Sample harvest fields:', data[0] ? Object.keys(data[0]) : 'No harvests');
      setHarvests(data);
    } catch (error) {
      console.error('[RipenessScreen] ✗ Error loading harvests:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      // Show error to user so they know what's wrong
      Alert.alert(
        'Harvest Loading Failed',
        `Could not load harvests from server.\n\nError: ${error.response?.status || 'Network error'}\n\nYou can still enter Harvest ID manually.`
      );
      setHarvests([]);
    } finally {
      setLoadingHarvests(false);
    }
  };

  const calculateRipenessScore = (redCherry, sampleSize) => {
    if (!redCherry || !sampleSize || sampleSize === 0) return 0;
    return ((parseInt(redCherry) / parseInt(sampleSize)) * 100).toFixed(2);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.harvest_id.trim()) {
      Alert.alert('Validation Error', 'Please enter Harvest ID');
      return;
    }
    if (!formData.sample_size || parseInt(formData.sample_size) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid Sample Size');
      return;
    }
    if (!formData.no_of_red_cherry || parseInt(formData.no_of_red_cherry) < 0) {
      Alert.alert('Validation Error', 'Please enter a valid Number of Red Cherry');
      return;
    }
    if (parseInt(formData.no_of_red_cherry) > parseInt(formData.sample_size)) {
      Alert.alert('Validation Error', 'Number of Red Cherry cannot exceed Sample Size');
      return;
    }

    try {
      const ripenessScore = calculateRipenessScore(
        formData.no_of_red_cherry,
        formData.sample_size
      );

      const dataToSave = {
        ...formData,
        ripeness_score: parseFloat(ripenessScore),
      };

      await addRipenessScore(dataToSave);
      Alert.alert('Success', 'Ripeness score recorded successfully');

      // Reset form
      setFormData({
        harvest_id: '',
        date: new Date().toISOString().split('T')[0],
        sample_size: '',
        no_of_red_cherry: '',
      });
      setShowForm(false);
      loadRecords();
    } catch (error) {
      console.error('Error saving ripeness score:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data,
      });

      // Show more detailed error message
      let errorMessage = 'Failed to save ripeness score';
      let errorDetails = '';

      if (error.response?.data) {
        // Backend returned an error response
        const errorData = error.response.data;
        console.log('[RipenessScreen] Backend error data:', errorData);

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
            errorMessage = `Harvest Not Found\n\nThe harvest "${formData.harvest_id}" does not exist in the database.\n\nPossible reasons:\n1. The harvest was deleted\n2. You need to create harvest records first\n3. The harvest list is outdated\n\nPlease refresh the page or contact your administrator.`;
          } else {
            errorMessage = `Harvest error: ${harvestError}`;
          }
        } else if (errorData.no_of_redcherry) {
          errorMessage = `Red cherry field error: ${JSON.stringify(errorData.no_of_redcherry)}`;
        } else {
          errorMessage = JSON.stringify(errorData).substring(0, 200);
        }
        errorDetails = `\n\nStatus: ${error.response.status}`;
      } else if (!error.response) {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
        errorDetails = `\n\nAPI URL: http://142.93.94.236:8000/api/processing/ripeness/`;
      } else if (error.response?.status) {
        errorMessage = `Server error (${error.response.status})`;
        errorDetails = error.response.statusText || '';
      }

      Alert.alert('Error', errorMessage + errorDetails);
    }
  };

  const renderRecordCard = (record) => (
    <View key={record.id} style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreText}>{record.ripeness_score}%</Text>
        </View>
        <View style={styles.recordHeaderInfo}>
          <Text style={styles.recordHarvestId}>Harvest ID: {record.harvest_id}</Text>
          <Text style={styles.recordDate}>{record.date}</Text>
        </View>
      </View>
      <View style={styles.recordDetails}>
        <View style={styles.recordDetailRow}>
          <Text style={styles.recordDetailLabel}>Sample Size:</Text>
          <Text style={styles.recordDetailValue}>{record.sample_size}</Text>
        </View>
        <View style={styles.recordDetailRow}>
          <Text style={styles.recordDetailLabel}>Red Cherry:</Text>
          <Text style={styles.recordDetailValue}>{record.no_of_red_cherry}</Text>
        </View>
      </View>
    </View>
  );

  const renderForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>Add Ripeness Score</Text>
        <TouchableOpacity onPress={() => setShowForm(false)}>
          <MaterialCommunityIcons name="close" size={24} color={CoffeeColors.DARK_BROWN} />
        </TouchableOpacity>
      </View>

      <View style={styles.formField}>
        <Text style={styles.formLabel}>Harvest ID *</Text>
        {loadingHarvests ? (
          <View style={styles.pickerLoadingContainer}>
            <ActivityIndicator size="small" color={CoffeeColors.COFFEE_BROWN} />
            <Text style={styles.pickerLoadingText}>Loading harvests...</Text>
          </View>
        ) : (
          <>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.harvest_id}
                onValueChange={(value) => setFormData({ ...formData, harvest_id: value })}
                style={styles.picker}
              >
                <Picker.Item
                  label={harvests.length === 0 ? "No harvests available - create harvests first" : "Select a harvest..."}
                  value=""
                />
                {harvests.map((harvest) => (
                  <Picker.Item
                    key={harvest.id}
                    label={`${harvest.harvest_id || harvest.id} - ${harvest.name || harvest.farmer_name || 'Unknown'}`}
                    value={harvest.harvest_id || harvest.id}
                  />
                ))}
              </Picker>
            </View>
            {harvests.length === 0 && (
              <Text style={styles.helperText}>
                No harvests found. Please create harvest records in the Aggregation section first.
              </Text>
            )}
          </>
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

      <View style={styles.formField}>
        <Text style={styles.formLabel}>Sample Size *</Text>
        <TextInput
          style={styles.formInput}
          value={formData.sample_size}
          onChangeText={(text) => {
            // Only allow numbers
            const numericValue = text.replace(/[^0-9]/g, '');
            setFormData({ ...formData, sample_size: numericValue });
          }}
          placeholder="Enter Sample Size"
          keyboardType="numeric"
          placeholderTextColor={CoffeeColors.MEDIUM_BROWN + '80'}
        />
      </View>

      <View style={styles.formField}>
        <Text style={styles.formLabel}>Number of Red Cherry *</Text>
        <TextInput
          style={styles.formInput}
          value={formData.no_of_red_cherry}
          onChangeText={(text) => {
            // Only allow numbers
            const numericValue = text.replace(/[^0-9]/g, '');
            setFormData({ ...formData, no_of_red_cherry: numericValue });
          }}
          placeholder="Enter Number of Red Cherry"
          keyboardType="numeric"
          placeholderTextColor={CoffeeColors.MEDIUM_BROWN + '80'}
        />
      </View>

      {formData.sample_size && formData.no_of_red_cherry && (
        <View style={styles.calculatedScore}>
          <Text style={styles.calculatedScoreLabel}>Calculated Ripeness Score:</Text>
          <Text style={styles.calculatedScoreValue}>
            {calculateRipenessScore(formData.no_of_red_cherry, formData.sample_size)}%
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Save Ripeness Score</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SimpleHeader title="Ripeness Scores" navigation={navigation} />

      <View style={{ flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {!showForm && (
            <>
              <View style={styles.headerSection}>
                <MaterialCommunityIcons
                  name="fruit-cherries"
                  size={40}
                  color={CoffeeColors.COFFEE_BROWN}
                />
                <Text style={styles.headerTitle}>Ripeness Records</Text>
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
                <Text style={styles.addButtonText}>Add Ripeness Score</Text>
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
                  <Text style={styles.emptyText}>No ripeness records yet</Text>
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
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: CoffeeColors.COFFEE_BROWN + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scoreText: {
    fontSize: 16,
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
  calculatedScore: {
    backgroundColor: CoffeeColors.COFFEE_BROWN + '10',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  calculatedScoreLabel: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: CoffeeColors.MEDIUM_BROWN,
    marginBottom: 4,
  },
  calculatedScoreValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.COFFEE_BROWN,
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
  helperText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: CoffeeColors.MEDIUM_BROWN,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
