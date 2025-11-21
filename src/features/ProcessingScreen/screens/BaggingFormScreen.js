// src/features/ProcessingScreen/screens/BaggingFormScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';
import CustomPicker from '../../../components/CustomPicker';
import {
    postBaggingRecord,
    fetchAvailableLotIds,
    fetchDryingRecordForLot,
    getUnsyncedBaggingRecords,
} from '../../../services/baggingService';

const SYNC_QUEUE_KEY = 'bagging_records_sync_queue';

// Utility Functions
function formatDateForApi(d) {
    const year = d.getFullYear();
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${mon}-${day}`;
}

function formatDateForDisplay(d) {
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${mon}-${year}`;
}

// Calculate average weight per bag
function calculateAverageWeightPerBag(weight, numberOfBags) {
    if (numberOfBags <= 0) return 0;
    return (weight / numberOfBags).toFixed(2);
}

// Calculate outturn percentage
async function calculateOutturn(lotId, baggingWeight) {
    const { record: dryingRecord } = await fetchDryingRecordForLot(lotId);

    if (!dryingRecord || !dryingRecord.weight) return null;

    const firstDryingWeight = Number(dryingRecord.weight);
    const outturn = ((baggingWeight / firstDryingWeight) * 100).toFixed(2);

    return parseFloat(outturn);
}

// Calculate expected outturn
function calculateExpectedOutturn(moistureContent) {
    const targetMoisture = 12;
    const baseOutturn = 62;
    const adjustment = (targetMoisture - moistureContent) * 0.5;

    return (baseOutturn + adjustment).toFixed(2);
}

export default function BaggingFormScreen({ navigation, route = {} }) {
    const [formData, setFormData] = useState({
        lot_id: '',
        weight: '',
        moisture_content: '',
        no_of_bags: '',
        date: new Date(),
        outturn: null,
        expected_outturn: null,
        qr_code: '',
        showDatePicker: false,
    });

    const [availableLots, setAvailableLots] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editRecordId, setEditRecordId] = useState(null);

    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        type: 'info',
        buttons: [],
    });

    // Load available lots on mount
    useEffect(() => {
        const loadLots = async () => {
            setIsLoading(true);
            const result = await fetchAvailableLotIds();
            if (result.success) {
                setAvailableLots(result.lots);
            } else {
                console.warn('[BaggingForm] Failed to load lots');
            }
            setIsLoading(false);
        };

        loadLots();
    }, []);

    // Initialize form with edit data if provided
    useEffect(() => {
        if (route.params?.editData) {
            const editData = route.params.editData;
            setIsEditMode(true);
            setEditRecordId(editData.id);

            const dateStr = editData.date || new Date().toISOString();
            const dateObj = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

            setFormData(prev => ({
                ...prev,
                lot_id: editData.lot_id || '',
                weight: String(editData.weight || ''),
                moisture_content: String(editData.moisture_content || ''),
                no_of_bags: String(editData.no_of_bags || ''),
                date: dateObj,
                outturn: editData.outturn,
                expected_outturn: editData.expected_outturn,
                qr_code: editData.qr_code || '',
            }));

            console.log('[BaggingForm] Edit mode initialized with data:', editData);
        }
    }, [route.params?.editData]);

    // Calculate derived fields when relevant inputs change
    useEffect(() => {
        const calculateFields = async () => {
            const weight = parseFloat(formData.weight) || 0;
            const moisture = parseFloat(formData.moisture_content) || 0;
            const bags = parseInt(formData.no_of_bags) || 0;

            if (!formData.lot_id || weight <= 0 || moisture <= 0 || bags <= 0) {
                return;
            }

            // Calculate outturn
            const outturn = await calculateOutturn(formData.lot_id, weight);

            // Calculate expected outturn
            const expectedOutturn = calculateExpectedOutturn(moisture);

            setFormData(prev => ({
                ...prev,
                outturn: outturn ? parseFloat(outturn) : null,
                expected_outturn: parseFloat(expectedOutturn),
            }));
        };

        calculateFields();
    }, [formData.lot_id, formData.weight, formData.moisture_content, formData.no_of_bags]);

    const updateField = useCallback((key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }, []);

    const onDateChange = (event, selectedDate) => {
        updateField('showDatePicker', Platform.OS === 'ios');
        if (selectedDate) {
            updateField('date', selectedDate);
        }
    };

    const validateForm = () => {
        if (!formData.lot_id) {
            return 'Please select a Lot ID.';
        }

        if (!formData.weight || parseFloat(formData.weight) < 0.01) {
            return 'Weight must be at least 0.01 kg.';
        }

        if (!formData.moisture_content || parseFloat(formData.moisture_content) < 0 || parseFloat(formData.moisture_content) > 100) {
            return 'Moisture content must be between 0-100%.';
        }

        if (!formData.no_of_bags || parseInt(formData.no_of_bags) < 1) {
            return 'Number of bags must be at least 1.';
        }

        return null;
    };

    const handleSubmit = async () => {
        if (isSaving) return;

        const validationError = validateForm();
        if (validationError) {
            setAlertConfig({
                title: 'Validation Error',
                message: validationError,
                type: 'warning',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => setAlertVisible(false),
                    },
                ],
            });
            setAlertVisible(true);
            return;
        }

        setIsSaving(true);

        try {
            const baggingData = {
                id: isEditMode ? editRecordId : `local_${Date.now()}`,
                lot_id: formData.lot_id,
                weight: parseFloat(formData.weight),
                moisture_content: parseFloat(formData.moisture_content),
                no_of_bags: parseInt(formData.no_of_bags),
                date: formatDateForApi(formData.date),
                outturn: formData.outturn,
                expected_outturn: formData.expected_outturn,
                qr_code: formData.qr_code || null,
                synced: false,
            };

            if (isEditMode) {
                // Update existing record (via local storage for now)
                const { records: currentRecords } = await getUnsyncedBaggingRecords();
                const updatedRecords = currentRecords.map(r => (r.id === editRecordId ? baggingData : r));
                await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedRecords));
            } else {
                // Save new record
                await postBaggingRecord(baggingData);
            }

            console.log('[BaggingForm] Saved to local storage:', baggingData);

            // Reset form
            setFormData({
                lot_id: '',
                weight: '',
                moisture_content: '',
                no_of_bags: '',
                date: new Date(),
                outturn: null,
                expected_outturn: null,
                qr_code: '',
                showDatePicker: false,
            });

            setAlertConfig({
                title: 'Success!',
                message: 'Bagging record saved successfully. It will sync when online.',
                type: 'success',
                buttons: [
                    {
                        text: 'Add Another',
                        onPress: () => setAlertVisible(false),
                    },
                    {
                        text: 'View Records',
                        onPress: () => {
                            setAlertVisible(false);
                            navigation.navigate('BaggingSummary');
                        },
                    },
                ],
            });
            setAlertVisible(true);
        } catch (error) {
            console.error('[BaggingForm] Save failed:', error);
            setAlertConfig({
                title: 'Error',
                message: 'Failed to save bagging record. Please try again.',
                type: 'error',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => setAlertVisible(false),
                    },
                ],
            });
            setAlertVisible(true);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
                <Text style={styles.loadingText}>Loading available lots...</Text>
            </View>
        );
    }

    const averageWeightPerBag = calculateAverageWeightPerBag(
        parseFloat(formData.weight) || 0,
        parseInt(formData.no_of_bags) || 0
    );

    const lotOptions = availableLots.map(lot => ({ id: lot, name: lot }));

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader title={isEditMode ? 'Edit Bagging Entry' : 'New Bagging Entry'} />
            <View style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.select({ ios: 'padding', android: undefined })}
                >
                    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                        <Text style={styles.mainTitle}>{isEditMode ? 'Edit Bagging Record' : 'Bagging Record Form'}</Text>

                        {/* Basic Information */}
                        <View style={styles.section}>
                            <Text style={styles.heading}>Basic Information</Text>

                            <CustomPicker
                                label="Lot ID *"
                                selectedValue={formData.lot_id}
                                onValueChange={(val) => updateField('lot_id', val)}
                                items={lotOptions}
                            />

                            <Text style={styles.label}>Date *</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => updateField('showDatePicker', true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color={CoffeeColors.DARK_BROWN} />
                                <Text style={{ marginLeft: 10, fontSize: 16, color: CoffeeColors.DARK_BROWN }}>
                                    {formatDateForDisplay(formData.date)}
                                </Text>
                            </TouchableOpacity>

                            {formData.showDatePicker && (
                                <DateTimePicker
                                    value={formData.date}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onDateChange}
                                    maximumDate={new Date()}
                                />
                            )}
                        </View>

                        {/* Measurements */}
                        <View style={styles.section}>
                            <Text style={styles.heading}>Measurements</Text>

                            <Text style={styles.label}>Weight (kg) *</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={formData.weight}
                                onChangeText={(t) => updateField('weight', t.replace(',', '.'))}
                                placeholder="e.g. 85.5"
                            />

                            <Text style={styles.label}>Moisture Content (%) *</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={formData.moisture_content}
                                onChangeText={(t) => updateField('moisture_content', t.replace(',', '.'))}
                                placeholder="e.g. 11.2"
                            />

                            <Text style={styles.label}>Number of Bags *</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={formData.no_of_bags}
                                onChangeText={(t) => updateField('no_of_bags', t)}
                                placeholder="e.g. 5"
                            />
                        </View>

                        {/* Computed Fields */}
                        <View style={styles.section}>
                            <Text style={styles.heading}>Calculated Metrics</Text>

                            <View style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Average Weight per Bag:</Text>
                                <Text style={styles.metricValue}>{averageWeightPerBag} kg</Text>
                            </View>

                            <View style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Outturn (%):</Text>
                                <Text style={styles.metricValue}>
                                    {formData.outturn !== null ? formData.outturn.toFixed(2) : 'Calculating...'}
                                </Text>
                            </View>

                            <View style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Expected Outturn (%):</Text>
                                <Text style={styles.metricValue}>
                                    {formData.expected_outturn !== null ? formData.expected_outturn : 'Calculating...'}
                                </Text>
                            </View>
                        </View>

                        {/* Optional Fields */}
                        <View style={styles.section}>
                            <Text style={styles.heading}>Optional Information</Text>

                            <Text style={styles.label}>QR Code</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.qr_code}
                                onChangeText={(t) => updateField('qr_code', t)}
                                placeholder="QR code payload (optional)"
                            />
                            <Text style={styles.helperText}>Leave blank for now</Text>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSubmit}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color={'#fff'} />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {isEditMode ? 'Update Bagging Record' : 'Save Bagging Record'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* View Records Button */}
                        <TouchableOpacity
                            style={styles.viewRecordsButton}
                            onPress={() => navigation.navigate('BaggingSummary')}
                        >
                            <Ionicons name="list" size={18} color={CoffeeColors.PRIMARY_BROWN} style={{ marginRight: 6 }} />
                            <Text style={styles.viewRecordsButtonText}>View Bagging Records</Text>
                        </TouchableOpacity>

                        <View style={{ height: 100 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
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
        padding: 16,
        paddingBottom: 32,
        backgroundColor: CoffeeColors.LIGHT_GRAY,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: CoffeeColors.LIGHT_GRAY,
    },
    loadingText: {
        marginTop: 10,
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: Fonts.bold,
        marginBottom: 20,
        color: CoffeeColors.DARK_BROWN,
        textAlign: 'center',
    },
    section: {
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    heading: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        marginBottom: 15,
        color: CoffeeColors.MEDIUM_BROWN,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_BROWN,
        paddingBottom: 5,
    },
    label: {
        marginTop: 15,
        marginBottom: 8,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.DARK_BROWN,
        fontSize: 16,
    },
    helperText: {
        marginTop: 4,
        fontSize: 12,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
        fontStyle: 'italic',
    },
    input: {
        backgroundColor: CoffeeColors.WHITE,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        fontSize: 16,
    },
    dateButton: {
        backgroundColor: CoffeeColors.WHITE,
        padding: 15,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        justifyContent: 'flex-start',
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_GRAY,
    },
    metricLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: CoffeeColors.GRAY_TEXT,
        fontFamily: Fonts.semiBold,
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '700',
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.bold,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 10,
        backgroundColor: CoffeeColors.PRIMARY_BROWN,
        marginTop: 20,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: '800',
        fontFamily: Fonts.bold,
        fontSize: 17,
    },
    viewRecordsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
        borderWidth: 1,
        borderColor: CoffeeColors.PRIMARY_BROWN,
        marginTop: 10,
    },
    viewRecordsButtonText: {
        color: CoffeeColors.PRIMARY_BROWN,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        marginLeft: 6,
    },
});
