// src/features/ProcessingScreen/screens/FermentingFormScreen.js
// Form screen for adding/editing fermenting records

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
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';

// Utility function to format date for API (YYYY-MM-DD)
function formatDateForApi(d) {
    const year = d.getFullYear();
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${mon}-${day}`;
}

// Utility function to format date for display (DD-MM-YYYY)
function formatDateForDisplay(d) {
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${mon}-${year}`;
}

// Generate processing ID: FERM-{YYYYMMDD}-{SEQ}
const generateProcessingId = (date = new Date(), sequence = 0) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const seq = String(sequence).padStart(2, '0');
    return `FERM-${yyyy}${mm}${dd}-${seq}`;
};

// Calculate days between two dates
const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const initialFormState = {
    grade: '', // ForeignKey to Floating.grade_id
    start_date: new Date(),
    end_date: new Date(),
    days: 0, // auto-calculated
    weight: '', // after fermenting
    processing_id: '', // auto-generated
    showStartDatePicker: false,
    showEndDatePicker: false,
};

export default function FermentingFormScreen({ navigation, route = {} }) {
    const [formData, setFormData] = useState(initialFormState);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editRecordId, setEditRecordId] = useState(null);
    const [grades, setGrades] = useState([]); // List of available grades from Floating table
    const [loadingGrades, setLoadingGrades] = useState(false);

    // Custom Alert state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        type: 'info',
        buttons: [],
    });

    // Load available grades from Floating API
    const loadGrades = useCallback(async () => {
        setLoadingGrades(true);
        try {
            // TODO: Implement API call to fetch floating grades
            // const response = await fetchFloatingGrades();
            // setGrades(response.data);

            // Placeholder data for now
            setGrades([
                { id: 'GRA1401A00', label: 'GRA1401A00 - Grade A' },
                { id: 'GRB1401A00', label: 'GRB1401A00 - Grade B' },
            ]);
        } catch (error) {
            console.error('[FermentingForm] Error loading grades:', error);
        } finally {
            setLoadingGrades(false);
        }
    }, []);

    useEffect(() => {
        loadGrades();
    }, [loadGrades]);

    // Initialize form with edit data if provided
    useEffect(() => {
        if (route.params?.editData) {
            const editData = route.params.editData;
            setIsEditMode(true);
            setEditRecordId(editData.processing_id);

            setFormData(prev => ({
                ...prev,
                grade: editData.grade || '',
                start_date: editData.start_date ? new Date(editData.start_date) : new Date(),
                end_date: editData.end_date ? new Date(editData.end_date) : new Date(),
                days: editData.days || 0,
                weight: String(editData.weight || ''),
                processing_id: editData.processing_id || prev.processing_id,
            }));
        }
    }, [route.params?.editData]);

    // Auto-generate processing ID when start date changes
    useEffect(() => {
        if (!isEditMode) {
            const newId = generateProcessingId(formData.start_date, 0);
            setFormData(prev => ({
                ...prev,
                processing_id: newId
            }));
        }
    }, [formData.start_date, isEditMode]);

    // Auto-calculate days when dates change
    useEffect(() => {
        const days = calculateDays(formData.start_date, formData.end_date);
        setFormData(prev => ({
            ...prev,
            days: days
        }));
    }, [formData.start_date, formData.end_date]);

    const updateField = useCallback((key, value) => {
        setFormData(prev => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    const onStartDateChange = (event, selectedDate) => {
        updateField('showStartDatePicker', Platform.OS === 'ios');
        if (selectedDate) {
            updateField('start_date', selectedDate);
        }
    };

    const onEndDateChange = (event, selectedDate) => {
        updateField('showEndDatePicker', Platform.OS === 'ios');
        if (selectedDate) {
            updateField('end_date', selectedDate);
        }
    };

    const validateForm = () => {
        if (!formData.grade || formData.grade.trim() === '') {
            return 'Please select a grade.';
        }
        if (!formData.start_date) {
            return 'Please select a start date.';
        }
        if (!formData.end_date) {
            return 'Please select an end date.';
        }
        if (formData.end_date < formData.start_date) {
            return 'End date cannot be before start date.';
        }
        if (!formData.weight || isNaN(Number(formData.weight)) || Number(formData.weight) <= 0) {
            return 'Please enter a valid weight (> 0 kg).';
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
                        onPress: () => setAlertVisible(false)
                    }
                ]
            });
            setAlertVisible(true);
            return;
        }

        setIsSaving(true);

        try {
            const fermentingData = {
                grade: formData.grade.trim(),
                start_date: formatDateForApi(formData.start_date),
                end_date: formatDateForApi(formData.end_date),
                days: formData.days,
                weight: Number(formData.weight),
                processing_id: formData.processing_id,
            };

            if (isEditMode && editRecordId) {
                // TODO: Implement update API call
                // const response = await updateFermentingRecord(editRecordId, fermentingData);
                console.log('[FermentingForm] Update data:', fermentingData);
            } else {
                // TODO: Implement create API call
                // const response = await createFermentingRecord(fermentingData);
                console.log('[FermentingForm] Create data:', fermentingData);
            }

            // Reset form
            setFormData(initialFormState);
            setIsEditMode(false);
            setEditRecordId(null);

            setAlertConfig({
                title: 'Success',
                message: `Fermenting record ${isEditMode ? 'updated' : 'created'} successfully.`,
                type: 'success',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertVisible(false);
                            navigation.navigate('FermentingSummary');
                        }
                    }
                ]
            });
            setAlertVisible(true);

        } catch (error) {
            console.error('[FermentingForm] Save failed:', error);
            setAlertConfig({
                title: 'Error',
                message: 'Failed to save fermenting record. Please try again.',
                type: 'error',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => setAlertVisible(false)
                    }
                ]
            });
            setAlertVisible(true);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader title={isEditMode ? 'Edit Fermenting Record' : 'New Fermenting Record'} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.select({ ios: 'padding', android: undefined })}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.mainTitle}>Fermenting Details</Text>

                    {/* Grade Selection */}
                    <Text style={styles.label}>Grade ID *</Text>
                    {loadingGrades ? (
                        <ActivityIndicator color={CoffeeColors.PRIMARY_BROWN} />
                    ) : (
                        <View style={styles.pickerWrap}>
                            <TouchableOpacity
                                style={styles.pickerButton}
                                onPress={() => {
                                    // TODO: Implement grade picker modal
                                    console.log('Open grade picker');
                                }}
                            >
                                <Text style={styles.pickerButtonText}>
                                    {formData.grade || 'Select Grade'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <Text style={styles.helperText}>Select the grade from Quality Control (Floating)</Text>

                    {/* Start Date */}
                    <Text style={styles.label}>Start Date *</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => updateField('showStartDatePicker', true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color={CoffeeColors.DARK_BROWN} />
                        <Text style={{ marginLeft: 10, fontSize: 16, color: CoffeeColors.DARK_BROWN }}>
                            {formatDateForDisplay(formData.start_date)}
                        </Text>
                    </TouchableOpacity>

                    {formData.showStartDatePicker && (
                        <DateTimePicker
                            value={formData.start_date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onStartDateChange}
                            maximumDate={new Date()}
                        />
                    )}

                    {/* End Date */}
                    <Text style={styles.label}>End Date *</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => updateField('showEndDatePicker', true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color={CoffeeColors.DARK_BROWN} />
                        <Text style={{ marginLeft: 10, fontSize: 16, color: CoffeeColors.DARK_BROWN }}>
                            {formatDateForDisplay(formData.end_date)}
                        </Text>
                    </TouchableOpacity>

                    {formData.showEndDatePicker && (
                        <DateTimePicker
                            value={formData.end_date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onEndDateChange}
                            minimumDate={formData.start_date}
                        />
                    )}

                    {/* Days (Auto-calculated) */}
                    <Text style={styles.label}>Days (Auto-calculated)</Text>
                    <View style={[styles.input, { justifyContent: 'center', backgroundColor: CoffeeColors.VERY_LIGHT_BROWN }]}>
                        <Text style={{ color: CoffeeColors.MEDIUM_BROWN, fontWeight: 'bold' }}>
                            {formData.days} days
                        </Text>
                    </View>

                    {/* Weight */}
                    <Text style={styles.label}>Weight After Fermenting (kg) *</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={formData.weight}
                        onChangeText={(t) => updateField('weight', t.replace(',', '.'))}
                        placeholder="e.g. 44.20"
                    />

                    {/* Processing ID (Auto-generated) */}
                    <Text style={styles.label}>Processing ID (Auto-generated)</Text>
                    <View style={[styles.input, { justifyContent: 'center', backgroundColor: CoffeeColors.VERY_LIGHT_BROWN }]}>
                        <Text style={{ color: CoffeeColors.MEDIUM_BROWN, fontWeight: 'bold' }}>
                            {formData.processing_id}
                        </Text>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {isEditMode ? 'Update Record' : 'Submit Record'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backButtonLink}
                        onPress={() => navigation.navigate('FermentingSummary')}
                    >
                        <Text style={styles.backButtonText}>Back to Fermenting Records</Text>
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>
            <BottomNav activeScreen="Processing" />

            {/* Custom Alert Modal */}
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
    mainTitle: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: Fonts.bold,
        marginBottom: 20,
        color: CoffeeColors.DARK_BROWN,
        textAlign: 'center',
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
    pickerWrap: {
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        overflow: 'hidden',
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
    },
    pickerButtonText: {
        fontSize: 16,
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.regular,
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
    submitButton: {
        marginTop: 24,
        backgroundColor: CoffeeColors.PRIMARY_BROWN,
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
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
    backButtonLink: {
        marginTop: 20,
        alignItems: 'center',
        padding: 10,
    },
    backButtonText: {
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.semiBold,
        textDecorationLine: 'underline',
        fontSize: 14,
    },
});
