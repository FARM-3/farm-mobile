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
import { getAvailableGradeIds } from '../../../services/qualityControl';
import { getAvailableBatches } from '../../../services/batchService';

const FERMENTING_STORAGE_KEY = 'fermenting_records';

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

// Generate processing ID: FER{DDMM}{SEQ}
// Example: FER041200 = Fermenting, 4th December, entry 00
const generateProcessingId = (date = new Date(), sequence = 0) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const seq = String(sequence).padStart(2, '0');
    return `FER${dd}${mm}${seq}`;
};

// Calculate days between two dates
const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const initialFormState = {
    grade: '', // ForeignKey to Floating.grade_id OR Batch.batch_id (backward compatibility)
    grade_ids: [], // Array of grade IDs for multi-select in single grade mode
    isBatch: false, // Flag to indicate if grade is a batch
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
    const [showGradePicker, setShowGradePicker] = useState(false);

    // Available grade IDs from floating tests
    const [availableGrades, setAvailableGrades] = useState([]);
    const [isLoadingGrades, setIsLoadingGrades] = useState(false);

    // Available batches
    const [availableBatches, setAvailableBatches] = useState([]);
    const [selectionMode, setSelectionMode] = useState('grade'); // 'grade' or 'batch'

    // Custom Alert state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        type: 'info',
        buttons: [],
    });

    // Fetch available grade IDs and batches on component mount
    useEffect(() => {
        const fetchAvailableData = async () => {
            setIsLoadingGrades(true);
            try {
                const [grades, batches] = await Promise.all([
                    getAvailableGradeIds(),
                    getAvailableBatches()
                ]);
                setAvailableGrades(grades);
                setAvailableBatches(batches);
                console.log('[FermentingForm] Loaded available grades:', grades.length);
                console.log('[FermentingForm] Loaded available batches:', batches.length);
            } catch (error) {
                console.error('[FermentingForm] Error loading available data:', error);
                showAlert('Error', 'Failed to load available grade IDs and batches', 'error');
            } finally {
                setIsLoadingGrades(false);
            }
        };

        if (!isEditMode) {
            fetchAvailableData();
        }
    }, [isEditMode]);

    // Handler for selecting a grade (supports multi-select)
    const handleGradeSelect = (grade) => {
        const gradeId = grade.grade_id;
        const currentGradeIds = formData.grade_ids || [];

        // Toggle selection
        let updatedGradeIds;
        if (currentGradeIds.includes(gradeId)) {
            // Deselect
            updatedGradeIds = currentGradeIds.filter(id => id !== gradeId);
        } else {
            // Select
            updatedGradeIds = [...currentGradeIds, gradeId];
        }

        updateField('grade_ids', updatedGradeIds);
        updateField('isBatch', false);

        // Keep backward compatibility with grade field (use first selection or empty)
        updateField('grade', updatedGradeIds.length > 0 ? updatedGradeIds[0] : '');
    };

    // Handler for selecting a batch
    const handleBatchSelect = (batch) => {
        updateField('grade', batch.batch_id);
        updateField('grade_ids', batch.grade_ids); // Populate grade_ids from batch
        updateField('isBatch', true);
        setShowGradePicker(false);
    };

    // Helper function to show alert
    const showAlert = (title, message, type = 'info') => {
        setAlertConfig({
            title,
            message,
            type,
            buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
    };

    // Handle pre-filled grade ID from navigation params (from GradeActionMenu)
    useEffect(() => {
        if (route.params?.gradeId && route.params?.autoFillGrade) {
            console.log('[FermentingForm] Received grade ID from navigation:', route.params.gradeId);
            updateField('grade', route.params.gradeId);

            // Clear the params to prevent re-triggering
            navigation.setParams({ gradeId: undefined, autoFillGrade: undefined });
        }
    }, [route.params?.gradeId, route.params?.autoFillGrade]);

    // Handle pre-filled batch from ViewBatchesScreen
    useEffect(() => {
        if (route.params?.batchId && route.params?.autoFillBatch) {
            console.log('[FermentingForm] Received batch from navigation:', route.params.batchId);
            updateField('grade', route.params.batchId);
            updateField('grade_ids', route.params.gradeIds || []);
            updateField('isBatch', true);

            // Clear the params to prevent re-triggering
            navigation.setParams({ batchId: undefined, gradeIds: undefined, autoFillBatch: undefined });
        }
    }, [route.params?.batchId, route.params?.autoFillBatch]);

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
            const generateUniqueId = async () => {
                try {
                    // Load existing records to determine next sequence number
                    const existingData = await AsyncStorage.getItem(FERMENTING_STORAGE_KEY);
                    const existingRecords = existingData ? JSON.parse(existingData) : [];

                    // Filter records with same date prefix (DDMM format)
                    const dd = String(formData.start_date.getDate()).padStart(2, '0');
                    const mm = String(formData.start_date.getMonth() + 1).padStart(2, '0');
                    const datePrefix = `FER${dd}${mm}`;
                    const sameDate = existingRecords.filter(record =>
                        record.processing_id && record.processing_id.startsWith(datePrefix)
                    );

                    // Calculate next sequence number
                    const nextSeq = sameDate.length;
                    const newId = generateProcessingId(formData.start_date, nextSeq);

                    setFormData(prev => ({
                        ...prev,
                        processing_id: newId
                    }));
                } catch (error) {
                    console.error('[FermentingForm] Error generating ID:', error);
                    // Fallback to timestamp-based ID
                    const newId = `FERM-${Date.now()}`;
                    setFormData(prev => ({
                        ...prev,
                        processing_id: newId
                    }));
                }
            };

            generateUniqueId();
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
        // Check if either batch or grade_ids is selected
        if (formData.isBatch) {
            if (!formData.grade || formData.grade.trim() === '') {
                return 'Please select a batch.';
            }
        } else {
            if (!formData.grade_ids || formData.grade_ids.length === 0) {
                return 'Please select at least one grade.';
            }
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
                grade: formData.isBatch ? formData.grade.trim() : '', // Only for backward compatibility
                grade_ids: formData.grade_ids, // Array of grade IDs (supports both single and multi-select)
                is_batch: formData.isBatch, // Flag to indicate if this is a batch
                start_date: formatDateForApi(formData.start_date),
                end_date: formatDateForApi(formData.end_date),
                days: formData.days,
                weight: Number(formData.weight),
                processing_id: formData.processing_id,
                created_at: new Date().toISOString(),
                isSynced: false,
            };

            // Load existing records
            const existingData = await AsyncStorage.getItem(FERMENTING_STORAGE_KEY);
            const existingRecords = existingData ? JSON.parse(existingData) : [];

            if (isEditMode && editRecordId) {
                // Update existing record
                const updatedRecords = existingRecords.map(record =>
                    record.processing_id === editRecordId ? { ...record, ...fermentingData } : record
                );
                await AsyncStorage.setItem(FERMENTING_STORAGE_KEY, JSON.stringify(updatedRecords));
                console.log('[FermentingForm] Updated record:', fermentingData);
            } else {
                // Add new record
                existingRecords.push(fermentingData);
                await AsyncStorage.setItem(FERMENTING_STORAGE_KEY, JSON.stringify(existingRecords));
                console.log('[FermentingForm] Created record:', fermentingData);
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

                    {/* Grade or Batch Selection */}
                    <Text style={styles.label}>Grade / Batch *</Text>
                    <View style={styles.pickerWrap}>
                        <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => setShowGradePicker(true)}
                        >
                            <Text style={[styles.pickerButtonText, !formData.grade && formData.grade_ids.length === 0 && styles.placeholderText]}>
                                {formData.isBatch ?
                                    `Batch: ${formData.grade}` :
                                    formData.grade_ids.length > 0 ?
                                        `${formData.grade_ids.length} grade(s): ${formData.grade_ids.join(', ')}` :
                                        'Select Grade(s) or Batch'
                                }
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.helperText}>Select one or more grade IDs, or choose a batch</Text>

                    {/* Grade/Batch Picker Modal */}
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
                                    <Text style={styles.modalTitle}>
                                        {selectionMode === 'grade' ? 'Select Grade(s)' : 'Select Batch'}
                                    </Text>
                                    <TouchableOpacity onPress={() => setShowGradePicker(false)}>
                                        <Ionicons name="close" size={24} color={CoffeeColors.DARK_BROWN} />
                                    </TouchableOpacity>
                                </View>

                                {/* Mode Toggle */}
                                <View style={styles.modeToggle}>
                                    <TouchableOpacity
                                        style={[styles.modeButton, selectionMode === 'grade' && styles.modeButtonActive]}
                                        onPress={() => setSelectionMode('grade')}
                                    >
                                        <Ionicons
                                            name="cube-outline"
                                            size={20}
                                            color={selectionMode === 'grade' ? '#fff' : CoffeeColors.MEDIUM_BROWN}
                                        />
                                        <Text style={[
                                            styles.modeButtonText,
                                            selectionMode === 'grade' && styles.modeButtonTextActive
                                        ]}>
                                            Single Grade
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modeButton, selectionMode === 'batch' && styles.modeButtonActive]}
                                        onPress={() => setSelectionMode('batch')}
                                    >
                                        <Ionicons
                                            name="layers-outline"
                                            size={20}
                                            color={selectionMode === 'batch' ? '#fff' : CoffeeColors.MEDIUM_BROWN}
                                        />
                                        <Text style={[
                                            styles.modeButtonText,
                                            selectionMode === 'batch' && styles.modeButtonTextActive
                                        ]}>
                                            Batch
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.modalBody}>
                                    {isLoadingGrades ? (
                                        <ActivityIndicator size="large" color={CoffeeColors.PRIMARY_BROWN} />
                                    ) : selectionMode === 'grade' ? (
                                        <>
                                            {availableGrades.length === 0 ? (
                                                <Text style={styles.emptyText}>No available grade IDs. Please complete floating tests first.</Text>
                                            ) : (
                                                <ScrollView style={{ maxHeight: 400 }}>
                                                    {availableGrades.map((grade) => {
                                                        const isSelected = !formData.isBatch && formData.grade_ids.includes(grade.grade_id);
                                                        return (
                                                            <TouchableOpacity
                                                                key={grade.grade_id}
                                                                style={[
                                                                    styles.gradeOption,
                                                                    isSelected && styles.gradeOptionSelected
                                                                ]}
                                                                onPress={() => handleGradeSelect(grade)}
                                                            >
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={[
                                                                        styles.gradeOptionText,
                                                                        isSelected && styles.gradeOptionTextSelected
                                                                    ]}>
                                                                        {grade.grade_id}
                                                                    </Text>
                                                                    <Text style={styles.gradeDetailText}>
                                                                        Grade: {grade.grade} | Weight: {grade.weight}kg | Harvest: {grade.harvest}
                                                                    </Text>
                                                                </View>
                                                                {isSelected && (
                                                                    <Ionicons name="checkmark-circle" size={24} color={CoffeeColors.PRIMARY_BROWN} />
                                                                )}
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </ScrollView>
                                            )}
                                            {/* Done button for multi-select mode */}
                                            {availableGrades.length > 0 && (
                                                <TouchableOpacity
                                                    style={styles.doneButton}
                                                    onPress={() => setShowGradePicker(false)}
                                                >
                                                    <Text style={styles.doneButtonText}>
                                                        Done ({formData.grade_ids.length} selected)
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </>
                                    ) : (
                                        availableBatches.length === 0 ? (
                                            <Text style={styles.emptyText}>No available batches. Create a batch first.</Text>
                                        ) : (
                                            <ScrollView style={{ maxHeight: 400 }}>
                                                {availableBatches.map((batch) => (
                                                    <TouchableOpacity
                                                        key={batch.batch_id}
                                                        style={[
                                                            styles.gradeOption,
                                                            formData.isBatch && formData.grade === batch.batch_id && styles.gradeOptionSelected
                                                        ]}
                                                        onPress={() => handleBatchSelect(batch)}
                                                    >
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[
                                                                styles.gradeOptionText,
                                                                formData.isBatch && formData.grade === batch.batch_id && styles.gradeOptionTextSelected
                                                            ]}>
                                                                {batch.batch_id}
                                                            </Text>
                                                            <Text style={styles.gradeDetailText}>
                                                                Contains {batch.grade_ids.length} grade(s): {batch.grade_ids.join(', ')}
                                                            </Text>
                                                            {batch.notes && (
                                                                <Text style={styles.gradeDetailText}>
                                                                    Notes: {batch.notes}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        {formData.isBatch && formData.grade === batch.batch_id && (
                                                            <Ionicons name="checkmark-circle" size={24} color={CoffeeColors.PRIMARY_BROWN} />
                                                        )}
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        )
                                    )}
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
        backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
        borderWidth: 2,
        borderColor: CoffeeColors.PRIMARY_BROWN,
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
        color: CoffeeColors.PRIMARY_BROWN,
    },
    gradeDetailText: {
        fontSize: 12,
        fontFamily: Fonts.regular,
        color: CoffeeColors.GRAY_TEXT,
        marginTop: 4,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: CoffeeColors.GRAY_TEXT,
        textAlign: 'center',
        padding: 20,
    },
    modeToggle: {
        flexDirection: 'row',
        padding: 10,
        paddingHorizontal: 20,
        gap: 10,
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: CoffeeColors.LIGHT_GRAY,
        gap: 6,
    },
    modeButtonActive: {
        backgroundColor: CoffeeColors.PRIMARY_BROWN,
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.MEDIUM_BROWN,
    },
    modeButtonTextActive: {
        color: '#fff',
    },
    doneButton: {
        backgroundColor: CoffeeColors.PRIMARY_BROWN,
        padding: 14,
        margin: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
});
