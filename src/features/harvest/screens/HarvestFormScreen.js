import React, { useState, useEffect, useCallback } from "react";
// NOTE: We are mocking external imports for code completeness.
const CoffeeColors = {
    DARK_BROWN: '#3D2F2F',
    MEDIUM_BROWN: '#6C4A4A',
    LIGHT_BROWN: '#B4A59E',
    CREAM: '#F4F2F0',
    WHITE: '#FFFFFF',
    LIGHT_GRAY: '#F0F0F0',
    ACCENT: '#4CAF50', // Used for stepper color
};
// NOTE: Assuming these services and components exist in your environment.
// import DatabaseService from "../../../services/DatabaseService"; 
// import SyncService from "../../../services/SyncService"; 
// import Header from '../../../components/Header';
// import BottomNav from '../../../components/BottomNav'; 

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

// --- STATIC OPTIONS (Aligned with 'Production Harvest details (Stage 1)' requirements) ---
// Simulates data coming from the Block details form, including the system-generated ID
const BLOCK_DATA = [
    { id: "BLK-001", name: "Block A-1 (Arabica)" },
    { id: "BLK-002", name: "Block B-2 (Robusta)" },
    { id: "BLK-003", name: "Block C-3 (Mixed)" },
    { id: "BLK-004", name: "Block D-4 (New Crop)" },
];

const PAID_BY_OPTIONS = ["Client", "Manager", "System Transfer"];


// --- STEP COMPONENTS ---

const Step1_WorkerAndBlock = ({ formData, updateField }) => {
    
    // Handler to update both ID and Name when a block is selected
    const handleBlockChange = (selectedId) => {
        const block = BLOCK_DATA.find(b => b.id === selectedId);
        if (block) {
            updateField('blockId', block.id);
            updateField('blockName', block.name);
        }
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

            <Text style={styles.label}>Block ID and Name</Text>
            <View style={styles.pickerWrap}>
                <Picker 
                    selectedValue={formData.blockId} 
                    onValueChange={handleBlockChange}
                >
                    {BLOCK_DATA.map((b) => (
                        <Picker.Item 
                            key={b.id} 
                            // Display the ID before the Name as requested
                            label={`${b.id} - ${b.name}`} 
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
            <Picker selectedValue={formData.paidBy} onValueChange={(v) => updateField('paidBy', v)}>
                {PAID_BY_OPTIONS.map((p) => (
                    <Picker.Item key={p} label={p} value={p} />
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
    // Harvest Details (Removed: grade, cherryColor)
    workerName: "", // maps to Worker_name
    blockId: BLOCK_DATA[0].id, // maps to block_ID
    blockName: BLOCK_DATA[0].name, // for display purposes
    weight: "", // maps to weight on delivery
    date: new Date(), // maps to date of delivery
    amountPaid: "", // maps to amount paid
    paidBy: PAID_BY_OPTIONS[0], // maps to paid by
    
    // System fields
    showDatePicker: false,
    generatedId: generateHarvestId(new Date()), // maps to Harvest_ID
};


export default function HarvestFormScreen({ onNavigate = (screen) => console.log(`[Navigation Fallback] Attempted navigation to: ${screen}`) }) { 
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
                // Fields aligned with 'Production Harvest details (Stage 1)'
                Worker_name: formData.workerName.trim(),
                block_ID: formData.blockId,
                weight_on_delivery: Number(formData.weight),
                date_of_delivery: formatDateForApi(formData.date),
                amount_paid: Number(formData.amountPaid),
                paid_by: formData.paidBy,
                Harvest_ID: formData.generatedId,
                
                // System/Internal fields
                synced: 0, 
                // Adding blockName for better context locally if needed
                block_name: formData.blockName,
                notes: `Worker: ${formData.workerName}, Block ID: ${formData.blockId}, Weight: ${formData.weight} kg, Paid By: ${formData.paidBy}`,
            };

            // NOTE: Using console.log as a placeholder for actual DatabaseService calls
            console.log('[HarvestForm] Simulating Save to local database...', harvestData);
            // const localId = await DatabaseService.insert('harvests', harvestData);
            const localId = 'mock-local-id-123';

            // Try to sync immediately to cloud (silent fail if offline)
            try {
                console.log('[HarvestForm] Attempting immediate sync...');
                // const synced = await SyncService.syncImmediately('harvests', localId);
                const synced = false; // Mocking failure for demonstration
                
                if (synced) {
                    Alert.alert("Success", "Harvest saved and synced to cloud!");
                } else {
                    Alert.alert("Saved Locally", "Harvest saved. Will sync when online.");
                }
            } catch (syncError) {
                console.log('[HarvestForm] Sync failed (offline?), staying in queue:', syncError.message);
                Alert.alert("Saved Locally", "Harvest saved. Will sync when online.");
            }

            // Reset form
            setFormData(initialFormState);
            setCurrentStep(0); // Go back to the first step

            // Navigate back to summary (Now safe due to default prop)
            onNavigate('Harvests');
            
        } catch (error) {
            console.error('[HarvestForm] Local save failed:', error);
            Alert.alert("Error", "Failed to save harvest. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const CurrentStepComponent = STEPS[currentStep].Component;

    // A small placeholder view to navigate back to the summary screen
    const BackButton = () => (
        // Now safe due to default prop
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => onNavigate('Harvests')}>
            <Text style={styles.secondaryBtnText}>Back to Harvest Summary</Text>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            {/* <Header title="Harvest Form" onNavigate={onNavigate} /> */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.select({ ios: "padding", android: undefined })}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.mainTitle}>Production Harvest Details (Stage 1)</Text>
                    
                    {/* Stepper Indicator */}
                    <View style={stepStyles.indicatorContainer}>
                        {STEPS.map((step, index) => (
                            <View key={index} style={stepStyles.stepWrapper}>
                                <View 
                                    style={[
                                        stepStyles.stepCircle, 
                                        { backgroundColor: index <= currentStep ? CoffeeColors.ACCENT : CoffeeColors.LIGHT_BROWN }
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
                        {currentStep > 0 && (
                            <TouchableOpacity style={[styles.navBtn, styles.backBtn]} onPress={handleBack} disabled={isSaving}>
                                <Ionicons name="arrow-back-outline" size={20} color={CoffeeColors.DARK_BROWN} />
                                <Text style={styles.backBtnText}>Back</Text>
                            </TouchableOpacity>
                        )}

                        {currentStep < STEPS.length - 1 ? (
                            <TouchableOpacity style={[styles.navBtn, styles.nextBtn, currentStep === 0 && { marginLeft: 'auto' }]} onPress={handleNext} disabled={isSaving}>
                                <Text style={styles.nextBtnText}>Next Step</Text>
                                <Ionicons name="arrow-forward-outline" size={20} color={CoffeeColors.CREAM} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
                                {isSaving ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <ActivityIndicator color={CoffeeColors.CREAM} style={{ marginRight: 8 }} />
                                        <Text style={styles.saveBtnText}>Submit Harvest</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.saveBtnText}>Submit Harvest</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    <BackButton />

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>
            {/* <BottomNav activeScreen="Harvests" onNavigate={onNavigate} /> */}
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
        marginBottom: 20,
        color: CoffeeColors.DARK_BROWN, 
        textAlign: 'center',
    },
    heading: {
        fontSize: 18,
        fontWeight: "700",
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
        fontSize: 17,
    },
    secondaryBtn: {
        marginTop: 20,
        alignItems: "center",
        padding: 10,
    },
    secondaryBtnText: {
        color: CoffeeColors.MEDIUM_BROWN, 
        textDecorationLine: "underline",
        fontSize: 14,
    },
    navBtn: {
        padding: 12,
        borderRadius: 10,
        alignItems: "center",
        flexDirection: 'row',
    },
    nextBtn: {
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        justifyContent: 'center',
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    nextBtnText: {
        color: CoffeeColors.CREAM,
        fontWeight: '700',
        marginRight: 8,
        fontSize: 16,
    },
    backBtn: {
        backgroundColor: CoffeeColors.LIGHT_GRAY,
        borderWidth: 1,
        borderColor: CoffeeColors.MEDIUM_BROWN,
        justifyContent: 'center',
        marginRight: 10,
    },
    backBtnText: {
        color: CoffeeColors.DARK_BROWN,
        fontWeight: '700',
        marginLeft: 8,
        fontSize: 16,
    }
});

const stepStyles = StyleSheet.create({
    indicatorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Changed to space-around for only two steps
        marginBottom: 30,
        paddingHorizontal: 5,
    },
    stepWrapper: {
        alignItems: 'center',
        width: '45%', // Adjusted width for two steps
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
        fontSize: 18,
    },
    stepLabel: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
});


