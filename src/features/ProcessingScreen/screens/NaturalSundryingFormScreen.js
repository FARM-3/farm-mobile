// src/features/ProcessingScreen/screens/NaturalSundryingFormScreen.js
// Form screen for adding/editing natural sundrying records

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
    Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';

const SUNDRYING_STORAGE_KEY = 'natural_sundrying_records';

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

// Generate processing ID: SUND-{YYYYMMDD}-{SEQ}
const generateProcessingId = (date = new Date(), sequence = 0) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const seq = String(sequence).padStart(2, '0');
    return `SUND-${yyyy}${mm}${dd}-${seq}`;
};

const initialFormState = {
    grade: '', // ForeignKey to Floating.grade_id
    start_date: new Date(),
    weight: '', // before sundrying
    processing_id: '', // auto-generated
    showStartDatePicker: false,
};

export default function NaturalSundryingFormScreen({ navigation, route = {} }) {
    const [formData, setFormData] = useState(initialFormState);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editRecordId, setEditRecordId] = useState(null);
    const [showGradePicker, setShowGradePicker] = useState(false);

    // Grade options
    const gradeOptions = [
        { id: 'A', label: 'Grade A' },
        { id: 'B', label: 'Grade B' },
    ];

    // Custom Alert state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        type: 'info',
        buttons: [],
    });

    // Handler for selecting a grade
    const handleGradeSelect = (grade) => {
        updateField('grade', grade.label);
        setShowGradePicker(false);
    };

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
                weight: String(editData.weight || ''),
                processing_id: editData.processing_id || prev.processing_id,
            }));
        }
    }, [route.params?.editData]);

    // Auto-generate processing ID when start date changes
    useEffect(() => {
        if (!isEditMode) {
            const generateUniqueId = async () => {
                try {
                    // Load existing records to determine next sequence number
                    const existingData = await AsyncStorage.getItem(SUNDRYING_STORAGE_KEY);
                    const existingRecords = existingData ? JSON.parse(existingData) : [];

                    // Filter records with same date prefix
                    const dateStr = formatDateForApi(formData.start_date).replace(/-/g, '');
                    const sameDate = existingRecords.filter(record =>
                        record.processing_id && record.processing_id.startsWith(`SUND-${dateStr}`)
                    );

                    // Calculate next sequence number
                    const nextSeq = sameDate.length;
                    const newId = generateProcessingId(formData.start_date, nextSeq);

                    setFormData(prev => ({
                        ...prev,
                        processing_id: newId
                    }));
                } catch (error) {
                    console.error('[NaturalSundryingForm] Error generating ID:', error);
                    // Fallback to timestamp-based ID
                    const newId = `SUND-${Date.now()}`;
                    setFormData(prev => ({
                        ...prev,
                        processing_id: newId
                    }));
                }
            };

            generateUniqueId();
        }
    }, [formData.start_date, isEditMode]);

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

    const validateForm = () => {
        if (!formData.grade || formData.grade.trim() === '') {
            return 'Please select a grade.';
        }
        if (!formData.start_date) {
            return 'Please select a start date.';
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
            const sundryingData = {
                grade: formData.grade.trim(),
                start_date: formatDateForApi(formData.start_date),
                weight: Number(formData.weight),
                processing_id: formData.processing_id,
                created_at: new Date().toISOString(),
                isSynced: false,
            };

            // Load existing records
            const existingData = await AsyncStorage.getItem(SUNDRYING_STORAGE_KEY);
            const existingRecords = existingData ? JSON.parse(existingData) : [];

            if (isEditMode && editRecordId) {
                // Update existing record
                const updatedRecords = existingRecords.map(record =>
                    record.processing_id === editRecordId ? { ...record, ...sundryingData } : record
                );
                await AsyncStorage.setItem(SUNDRYING_STORAGE_KEY, JSON.stringify(updatedRecords));
                console.log('[NaturalSundryingForm] Updated record:', sundryingData);
            } else {
                // Add new record
                existingRecords.push(sundryingData);
                await AsyncStorage.setItem(SUNDRYING_STORAGE_KEY, JSON.stringify(existingRecords));
                console.log('[NaturalSundryingForm] Created record:', sundryingData);
            }

            // Reset form
            setFormData(initialFormState);
            setIsEditMode(false);
            setEditRecordId(null);

            setAlertConfig({
                title: 'Success',
                message: `Natural sundrying record ${isEditMode ? 'updated' : 'created'} successfully.`,
                type: 'success',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertVisible(false);
                            navigation.navigate('NaturalSundryingSummary');
                        }
                    }
                ]
            });
            setAlertVisible(true);

        } catch (error) {
            console.error('[NaturalSundryingForm] Save failed:', error);
            setAlertConfig({
                title: 'Error',
                message: 'Failed to save natural sundrying record. Please try again.',
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
            <SimpleHeader title={isEditMode ? 'Edit Sundrying Record' : 'New Sundrying Record'} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.select({ ios: 'padding', android: undefined })}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.mainTitle}>Natural Sundrying Details</Text>

                    {/* Grade Selection */}
                    <Text style={styles.label}>Grade *</Text>
                    <View style={styles.pickerWrap}>
                        <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => setShowGradePicker(true)}
                        >
                            <Text style={[styles.pickerButtonText, !formData.grade && styles.placeholderText]}>
                                {formData.grade || 'Select Grade'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.helperText}>Select the coffee grade</Text>

                    {/* Grade Picker Modal */}
                    <Modal
                        visible={showGradePicker}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowGradePicker(false)}
                    >
                        <TouchableOpacity
                            style={styles.modalOverlay}
                            activeOpacity={1}
                            onPress={() => setShowGradePicker(false)}
                        >
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Select Grade</Text>
                                    <TouchableOpacity onPress={() => setShowGradePicker(false)}>
                                        <Ionicons name="close" size={24} color={CoffeeColors.DARK_BROWN} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.modalBody}>
                                    {gradeOptions.map((grade) => (
                                        <TouchableOpacity
                                            key={grade.id}
                                            style={[
                                                styles.gradeOption,
                                                formData.grade === grade.label && styles.gradeOptionSelected
                                            ]}
                                            onPress={() => handleGradeSelect(grade)}
                                        >
                                            <Text style={[
                                                styles.gradeOptionText,
                                                formData.grade === grade.label && styles.gradeOptionTextSelected
                                            ]}>
                                                {grade.label}
                                            </Text>
                                            {formData.grade === grade.label && (
                                                <Ionicons name="checkmark-circle" size={24} color="#FF9800" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Modal>

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

                    {/* Weight */}
                    <Text style={styles.label}>Weight Before Sundrying (kg) *</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={formData.weight}
                        onChangeText={(t) => updateField('weight', t.replace(',', '.'))}
                        placeholder="e.g. 43.80"
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
        backgroundColor: CoffeeColors.ACCENT,
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
    placeholderText: {
        color: CoffeeColors.GRAY_TEXT,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 15,
        width: '85%',
        maxHeight: '60%',
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_GRAY,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        color: CoffeeColors.DARK_BROWN,
    },
    modalBody: {
        padding: 10,
    },
    gradeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        marginVertical: 4,
        marginHorizontal: 10,
        borderRadius: 10,
        backgroundColor: CoffeeColors.LIGHT_GRAY_BG,
    },
    gradeOptionSelected: {
        backgroundColor: '#FFF3E0',
        borderWidth: 2,
        borderColor: '#FF9800',
    },
    gradeOptionText: {
        fontSize: 16,
        fontWeight: '500',
        fontFamily: Fonts.regular,
        color: CoffeeColors.DARK_BROWN,
    },
    gradeOptionTextSelected: {
        fontWeight: '700',
        fontFamily: Fonts.bold,
        color: '#FF9800',
    },
});
