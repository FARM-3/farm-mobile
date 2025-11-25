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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomPicker from '../../../components/CustomPicker';
import CustomAlert from '../../../components/CustomAlert';
import {
  getRipenessScores,
  addRipenessScore,
  getAllHarvests,
} from '../../../services/qualityControl';

export default function RipenessScreen({ navigation, route }) {
  const [records, setRecords] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHarvests, setLoadingHarvests] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    harvest_id: '',
    harvest_pk: null, // Store the PK for backend submission
    date: new Date().toISOString().split('T')[0],
    sample_size: '100',
    no_of_red_cherry: '',
  });

  // CustomAlert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    buttons: [],
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

  // Handle navigation params for pre-filling harvest ID from voucher
  useEffect(() => {
    if (route.params?.harvestId && route.params?.autoOpenForm) {
      console.log('[RipenessScreen] Received harvest ID from navigation:', route.params.harvestId);

      // Wait for harvests to load, then pre-fill and open form
      const setupFormWithHarvest = async () => {
        // Give harvests time to load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Find the harvest in the loaded harvests
        const matchingHarvest = harvests.find(h =>
          (h.harvest_id || h.id) === route.params.harvestId
        );

        console.log('[RipenessScreen] Found matching harvest:', matchingHarvest);

        if (matchingHarvest) {
          const harvestId = matchingHarvest.harvest_id || matchingHarvest.id;
          setFormData({
            harvest_id: harvestId,
            harvest_pk: matchingHarvest.pk || harvestId,
            date: new Date().toISOString().split('T')[0],
            sample_size: '100',
            no_of_red_cherry: '',
          });
          setShowForm(true);
          console.log('[RipenessScreen] Form pre-filled with harvest:', harvestId);
        } else {
          // Harvest not found in list, still set the ID and open form
          setFormData({
            harvest_id: route.params.harvestId,
            harvest_pk: route.params.harvestId,
            date: new Date().toISOString().split('T')[0],
            sample_size: '100',
            no_of_red_cherry: '',
          });
          setShowForm(true);
          console.log('[RipenessScreen] Form opened with harvest ID (not in list):', route.params.harvestId);
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
      setAlertConfig({
        title: 'Validation Error',
        message: 'Please select a Harvest ID',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }
    if (!formData.harvest_pk) {
      setAlertConfig({
        title: 'Validation Error',
        message: 'Harvest data is incomplete. Please select a harvest again.',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }
    if (!formData.sample_size || parseInt(formData.sample_size) <= 0) {
      setAlertConfig({
        title: 'Validation Error',
        message: 'Please enter a valid Sample Size',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }
    if (!formData.no_of_red_cherry || parseInt(formData.no_of_red_cherry) < 0) {
      setAlertConfig({
        title: 'Validation Error',
        message: 'Please enter a valid Number of Red Cherry',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }
    if (parseInt(formData.no_of_red_cherry) > parseInt(formData.sample_size)) {
      setAlertConfig({
        title: 'Validation Error',
        message: 'Number of Red Cherry cannot exceed Sample Size',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }

    try {
      const ripenessScore = calculateRipenessScore(
        formData.no_of_red_cherry,
        formData.sample_size
      );

      const dataToSave = {
        harvest_id: formData.harvest_pk, // Use PK for API, not the ID string
        date: formData.date,
        sample_size: formData.sample_size,
        no_of_red_cherry: formData.no_of_red_cherry,
        ripeness_score: parseFloat(ripenessScore),
      };

      await addRipenessScore(dataToSave);

      setAlertConfig({
        title: 'Success',
        message: 'Ripeness score recorded successfully',
        type: 'success',
        buttons: [{
          text: 'OK',
          onPress: () => {
            setAlertVisible(false);
            // Reset form
            setFormData({
              harvest_id: '',
              harvest_pk: null,
              date: new Date().toISOString().split('T')[0],
              sample_size: '100',
              no_of_red_cherry: '',
            });
            setShowForm(false);
            loadRecords();
          }
        }]
      });
      setAlertVisible(true);
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
      let errorTitle = 'Error';

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
          errorTitle = 'Harvest Not Found';
          if (harvestError.includes('does not exist') || harvestError.includes('Invalid pk')) {
            errorMessage = `The selected harvest could not be found in the database.\n\nPlease try:\n1. Refreshing the harvest list\n2. Selecting a different harvest\n3. Creating new harvest records`;
          } else {
            errorMessage = `Harvest error: ${harvestError}`;
          }
        } else if (errorData.no_of_redcherry) {
          errorMessage = `Red cherry field error: ${JSON.stringify(errorData.no_of_redcherry)}`;
        } else {
          errorMessage = JSON.stringify(errorData).substring(0, 200);
        }
      } else if (!error.response) {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
        errorTitle = 'Connection Error';
      } else if (error.response?.status) {
        errorMessage = `Server error (${error.response.status})`;
      }

      setAlertConfig({
        title: errorTitle,
        message: errorMessage,
        type: 'error',
        buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  };

  const renderRecordCard = (record, index) => (
    <View key={`ripeness-${record.id}-${index}`} style={styles.recordCard}>
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
        {loadingHarvests ? (
          <View style={styles.pickerLoadingContainer}>
            <ActivityIndicator size="small" color={CoffeeColors.COFFEE_BROWN} />
            <Text style={styles.pickerLoadingText}>Loading harvests...</Text>
          </View>
        ) : (
          <>
            <CustomPicker
              label="Harvest ID *"
              selectedValue={formData.harvest_id}
              onValueChange={(selectedHarvestId) => {
                // Find the selected harvest object to get its PK
                const selectedHarvest = harvests.find(h => (h.harvest_id || h.id) === selectedHarvestId);

                // Debug: Log the complete harvest object structure
                console.log('[RipenessScreen] Selected harvest object:', JSON.stringify(selectedHarvest, null, 2));
                console.log('[RipenessScreen] Harvest object keys:', selectedHarvest ? Object.keys(selectedHarvest) : 'null');
                console.log('[RipenessScreen] Selected ID value:', selectedHarvestId);
                console.log('[RipenessScreen] harvest.pk (database PK):', selectedHarvest?.pk);
                console.log('[RipenessScreen] harvest.id:', selectedHarvest?.id);
                console.log('[RipenessScreen] harvest.harvest_id:', selectedHarvest?.harvest_id);

                setFormData({
                  ...formData,
                  harvest_id: selectedHarvestId,
                  // Use the pk field (integer) if available, otherwise use harvest_id string
                  // Production harvests: pk is an integer from the main Harvest model
                  // Farmer-harvests in main table: pk is mapped from main table
                  // Aggregation-only harvests: no pk, use harvest_id string
                  harvest_pk: selectedHarvest?.pk || selectedHarvestId,
                });
              }}
              items={harvests.map((harvest) => {
                const harvestId = harvest.harvest_id || harvest.id;
                const displayName = harvest.name || harvest.farmer_name || harvest.worker_name || 'Unknown';
                const upperHarvestId = String(harvestId).toUpperCase();

                return {
                  value: harvestId,
                  label: `${upperHarvestId} - ${displayName}`,
                };
              })}
            />
            {harvests.length === 0 && (
              <Text style={styles.helperText}>
                No harvests found. Please ensure harvest records exist in the database.
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
                  {records.map((record, index) => renderRecordCard(record, index))}
                </View>
              )}
            </>
          )}

          {showForm && renderForm()}
        </ScrollView>
      </View>

      <BottomNav activeScreen="Processing" />

      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
      />
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
