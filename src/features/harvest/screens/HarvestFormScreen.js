import React, { useState, useEffect, useCallback } from "react";
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUnsyncedRecords, postHarvestRecord, removeRecordFromQueue, updateHarvestRecord } from '../../../services/harvestRecord';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomPicker from '../../../components/CustomPicker';
import SearchableStaffPicker from '../../../components/SearchableStaffPicker';

const SYNC_QUEUE_KEY = "harvests_sync_queue";

import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";


// --- UTILITY FUNCTIONS ---

/**
 * Utility function to format date for API (YYYY-MM-DD string).
 * @param {Date} d - The JavaScript Date object.
 * @returns {string} Date string in YYYY-MM-DD format.
 */
function formatDateForApi(d) {
    const year = d.getFullYear();
    const mon = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${mon}-${day}`;
}

/**
 * Utility function to format date for local display (DD-MM-YYYY string).
 * @param {Date} d - The JavaScript Date object.
 * @returns {string} Date string in DD-MM-YYYY format.
 */
function formatDateForDisplay(d) {
    const day = String(d.getDate()).padStart(2, "0");
    const mon = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear(); 
    return `${day}-${mon}-${year}`;
}

/**
 * Get the next sequential harvest ID suffix (A00, A01, ... A99, B00, ... Z99)
 * Stores counter in localStorage to persist across sessions
 * @returns {string} The suffix like "A00", "A01", "B00", etc.
 */
const getNextHarvestSequentialSuffix = () => {
    try {
        let counter = 0;

        // Try to retrieve from localStorage
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('harvestFormIdCounter');
            counter = stored ? parseInt(stored, 10) : 0;
        }

        // Increment counter for next use
        const nextCounter = counter + 1;

        // Store for next time
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('harvestFormIdCounter', String(nextCounter));
        }

        // Convert counter to Letter+Numbers format (A00 to Z99)
        const letterIndex = Math.floor(counter / 100) % 26;
        const numberPart = counter % 100;

        const letter = String.fromCharCode(65 + letterIndex);
        const numbers = String(numberPart).padStart(2, '0');

        return `${letter}${numbers}`;
    } catch (error) {
        console.warn('Error getting harvest sequential suffix, using fallback:', error);
        return 'A00';
    }
};

function generateHarvestId(workerName = '', date = new Date()) {
    // Ensure workerName is a string
    const nameStr = String(workerName || '');

    // Get first two letters of worker name (not initials)
    const cleanName = nameStr.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const firstTwoLetters = cleanName.substring(0, 2).padEnd(2, 'X');

    // Get date in DDMM format
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");

    // Get next sequential suffix (A00 to Z99)
    const suffix = getNextHarvestSequentialSuffix();

    return `${firstTwoLetters}${dd}${mm}R${suffix}`;
}

// --- STATIC OPTIONS (Aligned with API schema) ---
// Block IDs must match the enum values from the API schema
const BLOCK_DATA = [
    { id: "block01", name: "Block 01" },
    { id: "block02", name: "Block 02" },
    { id: "block03", name: "Block 03" },
    { id: "block04", name: "Block 04" },
    { id: "block05", name: "Block 05" },
    { id: "block06", name: "Block 06" },
];

// Staff data is now fetched dynamically from the API via SearchableStaffPicker
// No longer using hardcoded data



// --- STEP COMPONENTS ---

const Step1_WorkerAndBlock = ({ formData, updateField, onDateChange }) => {

    // Handler to update block ID when a block is selected
    const handleBlockChange = (selectedId) => {
        // selectedId is already an integer from the picker
        updateField('blockId', selectedId);
    };

    return (
        <View style={stepStyles.stepContainer}>
            <Text style={styles.heading}>1. Worker & Block Details</Text>

            <Text style={styles.label}>Worker Name</Text>
            <TextInput
                style={styles.input}
                value={formData.workerName}
                onChangeText={(t) => updateField('workerName', t)}
                placeholder="Name of worker/deliverer"
                autoCapitalize="words"
            />

            <Text style={styles.label}>Date of Delivery</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => updateField('showDatePicker', true)} accessibilityLabel="Select date">
                <Ionicons name="calendar-outline" size={20} color={CoffeeColors.DARK_BROWN} />
                <Text style={{ marginLeft: 10, fontSize: 16, color: CoffeeColors.DARK_BROWN }}>
                    {formatDateForDisplay(formData.date)}
                </Text>
            </TouchableOpacity>

            {formData.showDatePicker && (
                <DateTimePicker
                    value={formData.date}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                />
            )}

            <CustomPicker
                label="Block"
                selectedValue={formData.blockId}
                onValueChange={handleBlockChange}
                items={BLOCK_DATA}
            />

            <Text style={styles.label}>Harvest ID (Local)</Text>
            <View style={[styles.input, { justifyContent: "center" }]}>
                <Text style={{ color: CoffeeColors.MEDIUM_BROWN, fontWeight: 'bold' }}>
                    {formData.generatedId}
                </Text>
            </View>
        </View>
    );
};

const Step2_DeliveryAndFinance = ({ formData, updateField }) => (
    <View style={stepStyles.stepContainer}>
        <Text style={styles.heading}>2. Delivery & Finance</Text>

        <Text style={styles.label}>Weight on Delivery (kg)</Text>
        <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={formData.weight}
            onChangeText={(t) => updateField('weight', t.replace(",", "."))}
            placeholder="e.g. 12.5"
        />

        <Text style={styles.label}>Price per Kg (UGX)</Text>
        <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={formData.pricePerKg}
            onChangeText={(t) => updateField('pricePerKg', t.replace(",", "."))}
            placeholder="e.g. 4000"
        />

        <Text style={styles.label}>Amount Paid (UGX)</Text>
        <TextInput
            style={[styles.input, { backgroundColor: CoffeeColors.VERY_LIGHT_BROWN }]}
            keyboardType="numeric"
            value={formData.amountPaid}
            editable={false}
            placeholder="Auto-calculated"
        />
        <Text style={styles.helperText}>Calculated: Weight × Price per Kg</Text>

        <SearchableStaffPicker
            label="Paid By"
            selectedStaffId={formData.paidBy}
            onStaffSelect={(staff) => updateField('paidBy', staff.id)}
            selectedStaff={formData.selectedStaff}
        />
    </View>
);


// --- MAIN FORM COMPONENT ---

// New steps structure based on the required fields
const STEPS = [
    { title: 'Worker & Block', Component: Step1_WorkerAndBlock, requiredFields: ['workerName', 'date', 'blockId'] },
    { title: 'Delivery & Finance', Component: Step2_DeliveryAndFinance, requiredFields: ['weight', 'pricePerKg', 'paidBy'] },
];

const initialFormState = {
    // Harvest Details
    workerName: "", // maps to Worker_name
    blockId: BLOCK_DATA[0].id, // Integer PK from blocks table
    weight: "", // maps to weight_on_delivery
    date: new Date(), // maps to date_of_delivery
    pricePerKg: "", // maps to price_per_kg
    amountPaid: "", // maps to amount_paid (auto-calculated)
    paidBy: "", // Staff ID - will be set by SearchableStaffPicker
    selectedStaff: null, // Full staff object from SearchableStaffPicker

    // System fields
    showDatePicker: false,
    generatedId: generateHarvestId(new Date()), // Local ID for tracking
};


export default function HarvestFormScreen({ navigation, route = {} }) {
    const [formData, setFormData] = useState(initialFormState);
    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editRecordId, setEditRecordId] = useState(null);

    // Initialize form with edit data if provided
    useEffect(() => {
        if (route.params?.editData) {
            const editData = route.params.editData;
            setIsEditMode(true);
            setEditRecordId(editData.id);

            // Populate form with edit data
            const dateStr = editData.date || editData.dateReadable || new Date().toISOString();
            const dateObj = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

            setFormData(prev => ({
                ...prev,
                workerName: editData.name || editData.workerName || '',
                blockId: editData.block || editData.blockId || BLOCK_DATA[0].id,
                weight: String(editData.weight || ''),
                date: dateObj,
                pricePerKg: String(editData.pricePerKg || ''),
                amountPaid: String(editData.amountPaid || ''),
                paidBy: editData.paidBy || '',
                selectedStaff: null, // Will be populated by SearchableStaffPicker
                generatedId: editData.id || prev.generatedId,
            }));

            console.log('[HarvestForm] Edit mode initialized with data:', editData);
        }
    }, [route.params?.editData]);

    // Update generated ID when worker name or date changes
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            generatedId: generateHarvestId(prev.workerName, prev.date)
        }));
    }, [formData.workerName, formData.date]);

    // Auto-calculate amount paid when weight or pricePerKg changes
    useEffect(() => {
        const weight = Number(formData.weight) || 0;
        const pricePerKg = Number(formData.pricePerKg) || 0;
        const calculatedAmount = weight * pricePerKg;

        setFormData(prev => ({
            ...prev,
            amountPaid: calculatedAmount > 0 ? calculatedAmount.toFixed(2) : ""
        }));
    }, [formData.weight, formData.pricePerKg]);

    // Unified field updater
    const updateField = useCallback((key, value) => {
        setFormData(prev => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    const onDateChange = (event, selectedDate) => {
        updateField('showDatePicker', Platform.OS === "ios");
        if (selectedDate) {
            updateField('date', selectedDate);
        }
    };

    const validateStep = (stepIndex) => {
        const step = STEPS[stepIndex];

        for (const field of step.requiredFields) {
            const value = formData[field];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                return `Please fill in all required fields in Step ${stepIndex + 1}: ${step.title}.`;
            }
        }

        // Custom validation
        if (stepIndex === 0) { // Worker & Block (now includes date)
            // Date validation is already handled by required fields check
        }
        if (stepIndex === 1) { // Delivery & Finance
            if (isNaN(Number(formData.weight)) || Number(formData.weight) <= 0) {
                return "Enter a valid weight (> 0 kg) on delivery.";
            }
            if (formData.pricePerKg === "" || isNaN(Number(formData.pricePerKg)) || Number(formData.pricePerKg) <= 0) {
                return "Enter a valid price per kg (> 0 UGX).";
            }
        }

        return null;
    };

    const handleNext = () => {
        const validationError = validateStep(currentStep);
        if (validationError) {
            Alert.alert("Input Error", validationError); 
            return;
        }

        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSaveDraft = async () => {
        if (isSaving) return;

        setIsSaving(true);
        try {
            // Save current form state as draft to AsyncStorage
            const harvestDraft = {
                ...formData,
                _isDraft: true,
                _draftStep: currentStep,
                _draftSavedAt: new Date().toISOString(),
                id: formData.generatedId || `DRAFT-${Date.now()}`,
            };

            const storageKey = 'harvest_drafts';
            const existingDrafts = await AsyncStorage.getItem(storageKey);
            const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];

            // Check if draft with this ID already exists and update it, otherwise add new
            const draftIndex = draftsArray.findIndex(d => d.id === harvestDraft.id);
            if (draftIndex >= 0) {
                draftsArray[draftIndex] = harvestDraft;
            } else {
                draftsArray.push(harvestDraft);
            }

            await AsyncStorage.setItem(storageKey, JSON.stringify(draftsArray));

            Alert.alert(
                "Draft Saved",
                "Your harvest draft has been saved. You can continue filling it later.",
                [
                    {
                        text: "Continue Editing",
                        style: "default"
                    },
                    {
                        text: "View Records",
                        style: "default",
                        onPress: () => navigation.navigate('Harvests')
                    }
                ]
            );

            console.log('[HarvestForm] Draft saved:', harvestDraft);
        } catch (error) {
            console.error('[HarvestForm] Draft save failed:', error);
            Alert.alert("Error", "Failed to save draft. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSyncNow = async (harvestData) => {
        try {
            console.log('[HarvestForm] Syncing to backend now...');
            const response = await postHarvestRecord(harvestData);

            if (response.success) {
                // Remove from local queue since it's synced
                await removeRecordFromQueue(harvestData.id);
                Alert.alert(
                    "Success!",
                    "Harvest record saved and synced to cloud successfully.",
                    [{ text: "OK", onPress: () => navigation.navigate('Harvests') }]
                );
            } else {
                // Failed to sync, keep in queue
                Alert.alert(
                    "Sync Failed",
                    "Record saved locally but couldn't sync to cloud. It will sync automatically when online.",
                    [{ text: "OK", onPress: () => navigation.navigate('Harvests') }]
                );
            }
        } catch (error) {
            console.error('[HarvestForm] Sync error:', error);
            Alert.alert(
                "Sync Failed",
                "Record saved locally but couldn't sync to cloud. It will sync automatically when online.",
                [{ text: "OK", onPress: () => navigation.navigate('Harvests') }]
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleSyncLater = () => {
        Alert.alert(
            "Saved Locally",
            "Harvest record saved to local database. You can sync it later using the cloud sync button.",
            [{ text: "OK", onPress: () => navigation.navigate('Harvests') }]
        );
        setIsSaving(false);
    };

    const handleSubmit = async () => {
        if (isSaving) return;

        const err = validateStep(currentStep);
        if (err) {
            Alert.alert("Validation Error", err);
            return;
        }

        setIsSaving(true);

        try {
            const harvestData = {
                // Fields aligned with API schema
                workerName: formData.workerName.trim(),
                blockId: formData.blockId, // Integer PK
                weight: Number(formData.weight),
                date: formData.date,
                pricePerKg: Number(formData.pricePerKg),
                amountPaid: Number(formData.amountPaid),
                paidBy: formData.paidBy, // Integer PK (don't trim)
                id: formData.generatedId,

                // System/Internal fields
                synced: false,
                dateReadable: formatDateForApi(formData.date),
            };

            if (isEditMode && editRecordId) {
                // UPDATE MODE: Call the API to update the record
                console.log('[HarvestForm] Updating harvest record:', editRecordId);

                // Show loading
                Alert.alert('Updating', 'Saving changes...', [], { cancelable: false });

                const response = await updateHarvestRecord(editRecordId, harvestData);

                // Close loading alert
                Alert.alert('', '', [{ text: 'OK' }]);

                if (response.success) {
                    Alert.alert(
                        "Updated!",
                        "Your harvest record has been updated successfully.",
                        [
                            {
                                text: "OK",
                                onPress: () => {
                                    setFormData(initialFormState);
                                    setCurrentStep(0);
                                    setIsEditMode(false);
                                    navigation.navigate('Harvests');
                                }
                            }
                        ]
                    );
                } else {
                    Alert.alert(
                        "Update Failed",
                        `Failed to update record. Status: ${response.status}. ${response.remoteData?.detail || ''}`
                    );
                    setIsSaving(false);
                }
            } else {
                // CREATE MODE: Save to local storage for offline sync
                const { records: currentRecords } = await getUnsyncedRecords();
                const updatedRecords = [...currentRecords, harvestData];
                await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedRecords));

                console.log('[HarvestForm] Saved to local storage - Full record:', JSON.stringify(harvestData, null, 2));
                console.log('[HarvestForm] paidBy value check - type:', typeof harvestData.paidBy, 'value:', harvestData.paidBy);

                // Reset form
                setFormData(initialFormState);
                setCurrentStep(0);

                // Show success message
                Alert.alert(
                    "Saved Locally!",
                    "Your harvest record has been saved locally and is ready to sync.",
                    [
                        {
                            text: "OK",
                            onPress: () => navigation.navigate('Harvests')
                        }
                    ]
                );
            }

        } catch (error) {
            console.error('[HarvestForm] Save failed:', error);
            Alert.alert("Error", "Failed to save harvest. Please try again.");
            setIsSaving(false);
        }
    };

    const CurrentStepComponent = STEPS[currentStep].Component;

    // A small placeholder view to navigate back to the summary screen
    const BackButton = () => (
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Harvests')}>
            <Text style={styles.secondaryBtnText}>Back to Rugyeyo Harvests</Text>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader title={isEditMode ? "Edit Harvest Entry" : "New Harvest Entry"} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.select({ ios: "padding", android: undefined })}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    {/* Title */}
                    <Text style={styles.mainTitle}>{isEditMode ? "Edit Harvest Details" : "Rugyeyo Harvest Details"}</Text>

                    {/* Stepper Indicator */}
                    <View style={stepStyles.indicatorContainer}>
                        <View style={stepStyles.stepConnectorLine} />
                        {STEPS.map((step, index) => (
                            <View key={index} style={stepStyles.stepWrapper}>
                                <View
                                    style={[
                                        stepStyles.stepCircle,
                                        { backgroundColor: index === currentStep ? CoffeeColors.ACCENT : (index < currentStep ? CoffeeColors.PRIMARY_BROWN : CoffeeColors.LIGHT_BROWN) }
                                    ]}
                                >
                                    <Text style={stepStyles.stepText}>{index + 1}</Text>
                                </View>
                                <Text 
                                    style={[
                                        stepStyles.stepLabel,
                                        { color: index === currentStep ? CoffeeColors.DARK_BROWN : CoffeeColors.MEDIUM_BROWN }
                                    ]}
                                >
                                    {step.title}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Current Step Component */}
                    <CurrentStepComponent 
                        formData={formData} 
                        updateField={updateField} 
                        onDateChange={onDateChange}
                    />

                    {/* Navigation Buttons */}
                    <View style={stepStyles.navigationContainer}>
                        <View style={stepStyles.stepNav}>
                            {currentStep > 0 && (
                                <TouchableOpacity style={styles.stepButton} onPress={handleBack} disabled={isSaving}>
                                    <Ionicons name="chevron-back" size={20} color={CoffeeColors.PRIMARY_BROWN} style={styles.prevButtonIcon} />
                                    <Text style={styles.stepButtonText}>Previous</Text>
                                </TouchableOpacity>
                            )}
                            {currentStep < STEPS.length - 1 ? (
                                <TouchableOpacity
                                    style={styles.stepButton}
                                    onPress={handleNext}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <ActivityIndicator color={CoffeeColors.PRIMARY_BROWN} /> : (
                                        <>
                                            <Text style={styles.stepButtonText}>Next</Text>
                                            <Ionicons name="chevron-forward" size={20} color={CoffeeColors.PRIMARY_BROWN} style={styles.nextButtonIcon} />
                                        </>
                                    )}
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={handleSubmit}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <ActivityIndicator color={'#fff'} /> : (
                                        <Text style={styles.submitButtonText}>Submit Harvest</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Save Draft Button - Available on all steps */}
                        <TouchableOpacity
                            style={styles.saveDraftButton}
                            onPress={handleSaveDraft}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color={CoffeeColors.PRIMARY_BROWN} />
                            ) : (
                                <>
                                    <Ionicons name="save" size={18} color={CoffeeColors.PRIMARY_BROWN} style={{ marginRight: 6 }} />
                                    <Text style={styles.saveDraftButtonText}>Save Draft</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* View Harvest Records Button - Available on all steps */}
                    <TouchableOpacity
                        style={styles.viewRecordsButton}
                        onPress={() => navigation.navigate('Harvests')}
                    >
                        <Ionicons name="list" size={18} color={CoffeeColors.PRIMARY_BROWN} style={{ marginRight: 6 }} />
                        <Text style={styles.viewRecordsButtonText}>View Harvest Records</Text>
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>
            <BottomNav activeScreen="Harvests" onNavigate={(screen) => navigation.navigate(screen)} />
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
        fontWeight: "800",
        fontFamily: Fonts.bold,
        marginBottom: 20,
        color: CoffeeColors.DARK_BROWN,
        textAlign: 'center',
    },
    heading: {
        fontSize: 18,
        fontWeight: "700",
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
        fontWeight: "600",
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
        paddingVertical: Platform.OS === "ios" ? 14 : 10,
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
    dateButton: {
        backgroundColor: CoffeeColors.WHITE, 
        padding: 15,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN, 
        justifyContent: 'flex-start',
    },
    saveBtn: {
        marginTop: 18,
        backgroundColor: CoffeeColors.ACCENT, // Green for submission
        padding: 16,
        borderRadius: 10,
        alignItems: "center",
        flex: 1, // Take up remaining space
        minWidth: '50%',
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6,
    },
    saveBtnText: {
        color: CoffeeColors.CREAM,
        fontWeight: "800",
        fontFamily: Fonts.bold,
        fontSize: 17,
    },
    secondaryBtn: {
        marginTop: 20,
        alignItems: "center",
        padding: 10,
    },
    secondaryBtnText: {
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.semiBold,
        textDecorationLine: "underline",
        fontSize: 14,
    },
    stepButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    stepButtonText: {
        color: CoffeeColors.PRIMARY_BROWN,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
        fontSize: 14,
    },
    prevButtonIcon: {
        marginRight: 8,
    },
    nextButtonIcon: {
        marginLeft: 8,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        backgroundColor: CoffeeColors.PRIMARY_BROWN,
        marginHorizontal: 5,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    saveDraftButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
        borderWidth: 1,
        borderColor: CoffeeColors.PRIMARY_BROWN,
    },
    saveDraftButtonText: {
        color: CoffeeColors.PRIMARY_BROWN,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        marginLeft: 6,
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

const stepStyles = StyleSheet.create({
    indicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Changed to space-around for only two steps
        marginBottom: 30,
        paddingHorizontal: 5,
        position: 'relative',
    },
    stepConnectorLine: {
        position: 'absolute',
        top: 17,
        left: '25%',
        right: '25%',
        height: 2,
        backgroundColor: CoffeeColors.LIGHT_BROWN,
        zIndex: 0,
    },
    stepWrapper: {
        alignItems: 'center',
        width: '45%', // Adjusted width for two steps
        zIndex: 1,
    },
    stepCircle: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
        borderWidth: 2,
        borderColor: CoffeeColors.CREAM,
    },
    stepText: {
        color: CoffeeColors.WHITE,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
        fontSize: 18,
    },
    stepLabel: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        textAlign: 'center',
        color: CoffeeColors.DARK_BROWN,
    },
    stepContainer: {
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
    navigationContainer: {
        width: '100%',
        marginTop: 20,
        paddingHorizontal: 5,
        gap: 12,
    },
    stepNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});


