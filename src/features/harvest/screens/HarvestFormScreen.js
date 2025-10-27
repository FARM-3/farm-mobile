import React, { useState, useEffect, useCallback } from "react";
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUnsyncedRecords, postHarvestRecord, removeRecordFromQueue } from '../../../services/harvestRecord';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';

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
import { Picker } from "@react-native-picker/picker";
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

function generateHarvestId(date) {
    // format: PA + DDMMYY + H (example: PA120825H)
    const d = date;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `PA${dd}${mm}${yy}H`;
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

// Staff IDs - these are auto-generated strings like "RF001", "RF002"
// You need to fetch these from /api/staff/ endpoint or add them manually
const STAFF_DATA = [
    { id: "RF001", name: "Grace" },
    { id: "RF002", name: "Kevin" },
    { id: "RF003", name: "Edna" },
    { id: "RF004", name: "John" },
    { id: "RF005", name: "Mary" },
];



// --- STEP COMPONENTS ---

const Step1_WorkerAndBlock = ({ formData, updateField }) => {

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

            <Text style={styles.label}>Block</Text>
            <View style={styles.pickerWrap}>
                <Picker
                    selectedValue={formData.blockId}
                    onValueChange={handleBlockChange}
                >
                    {BLOCK_DATA.map((b) => (
                        <Picker.Item
                            key={b.id}
                            label={b.name}
                            value={b.id}
                        />
                    ))}
                </Picker>
            </View>

            <Text style={styles.label}>Harvest ID (Local)</Text>
            <View style={[styles.input, { justifyContent: "center" }]}>
                <Text style={{ color: CoffeeColors.MEDIUM_BROWN, fontWeight: 'bold' }}>
                    {formData.generatedId}
                </Text>
            </View>
        </View>
    );
};

const Step2_DeliveryAndFinance = ({ formData, updateField, onDateChange }) => (
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

        <Text style={styles.label}>Amount Paid (UGX)</Text>
        <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={formData.amountPaid}
            onChangeText={(t) => updateField('amountPaid', t.replace(",", "."))}
            placeholder="e.g. 5000"
        />

        <Text style={styles.label}>Paid By</Text>
        <View style={styles.pickerWrap}>
            <Picker
                selectedValue={formData.paidBy}
                onValueChange={(selectedId) => updateField('paidBy', selectedId)}
            >
                {STAFF_DATA.map((w) => (
                    <Picker.Item
                        key={w.id}
                        label={w.name}
                        value={w.id}
                    />
                ))}
            </Picker>
        </View>
    </View>
);


// --- MAIN FORM COMPONENT ---

// New steps structure based on the required fields
const STEPS = [
    { title: 'Worker & Block', Component: Step1_WorkerAndBlock, requiredFields: ['workerName', 'blockId'] },
    { title: 'Delivery & Finance', Component: Step2_DeliveryAndFinance, requiredFields: ['weight', 'date', 'amountPaid', 'paidBy'] },
];

const initialFormState = {
    // Harvest Details
    workerName: "", // maps to Worker_name
    blockId: BLOCK_DATA[0].id, // Integer PK from blocks table
    weight: "", // maps to weight_on_delivery
    date: new Date(), // maps to date_of_delivery
    amountPaid: "", // maps to amount_paid
    paidBy: STAFF_DATA[0].id, // Integer PK from users table

    // System fields
    showDatePicker: false,
    generatedId: generateHarvestId(new Date()), // Local ID for tracking
};


export default function HarvestFormScreen({ navigation }) {
    const [formData, setFormData] = useState(initialFormState);
    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false); 

    // Update generated ID when date changes
    useEffect(() => {
        setFormData(prev => ({ 
            ...prev, 
            generatedId: generateHarvestId(prev.date) 
        }));
    }, [formData.date]);

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
        if (stepIndex === 1) { // Delivery & Finance
            if (isNaN(Number(formData.weight)) || Number(formData.weight) <= 0) {
                return "Enter a valid weight (> 0 kg) on delivery.";
            }
            if (formData.amountPaid === "" || isNaN(Number(formData.amountPaid)) || Number(formData.amountPaid) < 0) {
                return "Enter a valid amount paid (>= 0 UGX).";
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
                [{ text: "OK" }]
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
            // CRITICAL: Save to local database FIRST (offline-first pattern)
            const harvestData = {
                // Fields aligned with API schema
                workerName: formData.workerName.trim(),
                blockId: formData.blockId, // Integer PK
                weight: Number(formData.weight),
                date: formData.date,
                amountPaid: Number(formData.amountPaid),
                paidBy: formData.paidBy, // Integer PK (don't trim)
                id: formData.generatedId,

                // System/Internal fields
                synced: false,
                dateReadable: formatDateForApi(formData.date),
            };

            // Save to local storage for offline sync
            const { records: currentRecords } = await getUnsyncedRecords();
            const updatedRecords = [...currentRecords, harvestData];
            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedRecords));

            console.log('[HarvestForm] Saved to local storage:', harvestData);

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

        } catch (error) {
            console.error('[HarvestForm] Local save failed:', error);
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
            <SimpleHeader title="New Harvest Entry" />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.select({ ios: "padding", android: undefined })}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    {/* Title */}
                    <Text style={styles.mainTitle}>Rugyeyo Harvest Details</Text>

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


