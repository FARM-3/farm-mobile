// src/features/ProcessingScreen/screens/WashingFormScreen.js
// Form screen for adding/editing washing records

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

const WASHING_STORAGE_KEY = 'washing_records';

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

// Generate processing ID: WASH-{YYYYMMDD}-{SEQ}
const generateProcessingId = (date = new Date(), sequence = 0) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const seq = String(sequence).padStart(2, '0');
    return `WASH-${yyyy}${mm}${dd}-${seq}`;
};

const initialFormState = {
    grade: '', // ForeignKey to Floating.grade_id
    date: new Date(),
    weight: '', // after washing
    processing_id: '', // auto-generated
    showDatePicker: false,
};

export default function WashingFormScreen({ navigation, route = {} }) {
    const [formData, setFormData] = useState(initialFormState);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editRecordId, setEditRecordId] = useState(null);
    const [showGradePicker, setShowGradePicker] = useState(false);
    const [availableGrades, setAvailableGrades] = useState([]);
    const [isLoadingGrades, setIsLoadingGrades] = useState(false);

    // Custom Alert state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        type: 'info',
        buttons: [],
    });

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

    // Handler for selecting a grade
    const handleGradeSelect = (grade) => {
        updateField('grade', grade.grade_id);
        setShowGradePicker(false);
    };

    // Fetch available grades on component mount
    useEffect(() => {
        const fetchAvailableGrades = async () => {
            setIsLoadingGrades(true);
            try {
                const grades = await getAvailableGradeIds();
                console.log('[WashingForm] Available grades:', grades);
                setAvailableGrades(grades);
            } catch (error) {
                console.error('[WashingForm] Error loading available grades:', error);
                showAlert('Error', 'Failed to load available grade IDs', 'error');
            } finally {
                setIsLoadingGrades(false);
            }
        };

        if (!isEditMode) {
            fetchAvailableGrades();
        }
    }, [isEditMode]);

    // Handle pre-filled grade ID from navigation params (from GradeActionMenu)
    useEffect(() => {
        if (route.params?.gradeId && route.params?.autoFillGrade) {
            console.log('[WashingForm] Received grade ID from navigation:', route.params.gradeId);
            updateField('grade', route.params.gradeId);

            // Clear the params to prevent re-triggering
            navigation.setParams({ gradeId: undefined, autoFillGrade: undefined });
        }
    }, [route.params?.gradeId, route.params?.autoFillGrade]);

    // Initialize form with edit data if provided
    useEffect(() => {
        if (route.params?.editData) {
            const editData = route.params.editData;
            setIsEditMode(true);
            setEditRecordId(editData.processing_id);

            setFormData(prev => ({
                ...prev,
                grade: editData.grade || '',
                date: editData.date ? new Date(editData.date) : new Date(),
                weight: String(editData.weight || ''),
                processing_id: editData.processing_id || prev.processing_id,
            }));
        }
    }, [route.params?.editData]);

    // Auto-generate processing ID when date changes
    useEffect(() => {
        if (!isEditMode) {
            const generateUniqueId = async () => {
                try {
                    // Load existing records to determine next sequence number
                    const existingData = await AsyncStorage.getItem(WASHING_STORAGE_KEY);
                    const existingRecords = existingData ? JSON.parse(existingData) : [];

                    // Filter records with same date prefix
                    const dateStr = formatDateForApi(formData.date).replace(/-/g, '');
                    const sameDate = existingRecords.filter(record =>
                        record.processing_id && record.processing_id.startsWith(`WASH-${dateStr}`)
                    );

                    // Calculate next sequence number
                    const nextSeq = sameDate.length;
                    const newId = generateProcessingId(formData.date, nextSeq);

                    setFormData(prev => ({
                        ...prev,
                        processing_id: newId
                    }));
                } catch (error) {
                    console.error('[WashingForm] Error generating ID:', error);
                    // Fallback to timestamp-based ID
                    const newId = `WASH-${Date.now()}`;
                    setFormData(prev => ({
                        ...prev,
                        processing_id: newId
                    }));
                }
            };

            generateUniqueId();
        }
    }, [formData.date, isEditMode]);

    const updateField = useCallback((key, value) => {
        setFormData(prev => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    const onDateChange = (event, selectedDate) => {
        updateField('showDatePicker', Platform.OS === 'ios');
        if (selectedDate) {
            updateField('date', selectedDate);
        }
    };

    const validateForm = () => {
        if (!formData.grade || formData.grade.trim() === '') {
            return 'Please select a grade.';
        }
        if (!formData.date) {
            return 'Please select a date.';
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
            const washingData = {
                grade: formData.grade.trim(),
                date: formatDateForApi(formData.date),
                weight: Number(formData.weight),
                processing_id: formData.processing_id,
                created_at: new Date().toISOString(),
                isSynced: false,
            };

            // Load existing records
            const existingData = await AsyncStorage.getItem(WASHING_STORAGE_KEY);
            const existingRecords = existingData ? JSON.parse(existingData) : [];

            if (isEditMode && editRecordId) {
                // Update existing record
                const updatedRecords = existingRecords.map(record =>
                    record.processing_id === editRecordId ? { ...record, ...washingData } : record
                );
                await AsyncStorage.setItem(WASHING_STORAGE_KEY, JSON.stringify(updatedRecords));
                console.log('[WashingForm] Updated record:', washingData);
            } else {
                // Add new record
                existingRecords.push(washingData);
                await AsyncStorage.setItem(WASHING_STORAGE_KEY, JSON.stringify(existingRecords));
                console.log('[WashingForm] Created record:', washingData);
            }

            // Reset form
            setFormData(initialFormState);
            setIsEditMode(false);
            setEditRecordId(null);

            setAlertConfig({
                title: 'Success',
                message: `Washing record ${isEditMode ? 'updated' : 'created'} successfully.`,
                type: 'success',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertVisible(false);
                            navigation.navigate('WashingSummary');
                        }
                    }
                ]
            });
            setAlertVisible(true);

        } catch (error) {
            console.error('[WashingForm] Save failed:', error);
            setAlertConfig({
                title: 'Error',
                message: 'Failed to save washing record. Please try again.',
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
            <SimpleHeader title={isEditMode ? 'Edit Washing Record' : 'New Washing Record'} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.select({ ios: 'padding', android: undefined })}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.mainTitle}>Washing Details</Text>

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
                                    {isLoadingGrades ? (
                                        <View style={{ padding: 40, alignItems: 'center' }}>
                                            <ActivityIndicator size="large" color={CoffeeColors.PRIMARY_BROWN} />
                                            <Text style={{ marginTop: 12, color: CoffeeColors.MEDIUM_BROWN }}>
                                                Loading available grades...
                                            </Text>
                                        </View>
                                    ) : availableGrades.length === 0 ? (
                                        <View style={{ padding: 20 }}>
                                            <Text style={styles.emptyText}>
                                                No available grade IDs. Please complete floating tests first.
                                            </Text>
                                        </View>
                                    ) : (
                                        <ScrollView style={{ maxHeight: 400 }}>
                                            {availableGrades.map((grade) => (
                                                <TouchableOpacity
                                                    key={grade.grade_id}
                                                    style={[
                                                        styles.gradeOption,
                                                        formData.grade === grade.grade_id && styles.gradeOptionSelected
                                                    ]}
                                                    onPress={() => handleGradeSelect(grade)}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[
                                                            styles.gradeOptionText,
                                                            formData.grade === grade.grade_id && styles.gradeOptionTextSelected
                                                        ]}>
                                                            {grade.grade_id}
                                                        </Text>
                                                        <Text style={styles.gradeDetailText}>
                                                            Grade: {grade.grade} | Weight: {grade.weight}kg | Harvest: {grade.harvest}
                                                        </Text>
                                                    </View>
                                                    {formData.grade === grade.grade_id && (
                                                        <Ionicons name="checkmark-circle" size={24} color={CoffeeColors.ACCENT} />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Modal>

                    {/* Date */}
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

                    {/* Weight */}
                    <Text style={styles.label}>Weight After Washing (kg) *</Text>
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
        backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
        borderWidth: 2,
        borderColor: CoffeeColors.ACCENT,
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
        color: CoffeeColors.ACCENT,
    },
    gradeDetailText: {
        fontSize: 12,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
        marginTop: 4,
    },
    emptyText: {
        fontSize: 14,
        color: CoffeeColors.GRAY_TEXT,
        fontFamily: Fonts.regular,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
