import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

// Utilities and Theme Imports
import CoffeeColors from '../../../theme/colors'; 
import { initializeAuth, generateRecordId, fetchHarvests, submitProcessingLog } from '../../../utils/firebaseSetup'; 

// --- CONSTANTS ---
const PROCESSING_METHODS = ['Washed (Wet)', 'Natural (Dry)', 'Honey'];
const DRYING_METHODS = ['Raised Beds', 'Patios', 'Mechanical Dryer'];

// --- COMPONENTS ---
const CustomInput = ({ label, value, onChangeText, keyboardType = 'default', editable = true }) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
            style={[styles.textInput, !editable && styles.textInputDisabled]}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            placeholder={`Enter ${label.toLowerCase()}`}
            placeholderTextColor={CoffeeColors.GRAY_TEXT}
            editable={editable}
        />
    </View>
);

const CustomPicker = ({ label, selectedValue, onValueChange, items }) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.pickerContainer}>
            <Picker
                selectedValue={selectedValue}
                onValueChange={onValueChange}
                style={styles.picker}
                itemStyle={{ color: CoffeeColors.DARK_BROWN, fontSize: 16 }}
            >
                {items && items.length > 0 ? (
                    items.map((item) => (
                        <Picker.Item key={item} label={item} value={item} />
                    ))
                ) : (
                    <Picker.Item label={`-- No ${label} available --`} value="" />
                )}
            </Picker>
        </View>
    </View>
);

const ProcessingScreen = ({ onNavigate }) => {
    console.log('Rendering ProcessingScreen');
    React.useEffect(() => {
        console.log('ProcessingScreen mounted');
        return () => console.log('ProcessingScreen unmounted');
    }, []);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [harvestRecords, setHarvestRecords] = useState([]); // Used to link processing to harvest
    const [activeTab, setActiveTab] = useState('milling'); 

    const [form, setForm] = useState({
        // General Tracking
        sourceHarvestId: '',
        batchName: '',
        processingMethod: PROCESSING_METHODS[0],
        
        // Wet Milling/Drying Log
        wetWeightIn: '',
        parchmentWeightOut: '',
        moistureContent: '',
        dryingMethod: DRYING_METHODS[0],
        dryingStartDate: new Date().toISOString().slice(0, 10),
        dryingEndDate: '',

        // Quality/Storage
        storageLocation: '',
        notes: '',
    });

    // --- Data Initialization ---
    useEffect(() => {
        const init = async () => {
            const id = await initializeAuth(); 
            setUserId(id);
            await loadSourceRecords();
            setLoading(false);
        };
        init();
    }, []);

    const loadSourceRecords = async () => {
        // In a real app, we would fetch aggregated harvest records (from Django API)
        // For now, we simulate with mock harvest IDs
        const fetchedHarvests = await fetchHarvests(); 
        console.log('Fetched harvests (raw):', fetchedHarvests);
        // Ensure we always store an array
        if (Array.isArray(fetchedHarvests)) {
            setHarvestRecords(fetchedHarvests);
            if (fetchedHarvests.length > 0) {
                setForm(p => ({ ...p, sourceHarvestId: fetchedHarvests[0].id }));
            }
        } else {
            // If backend returned an object or null, default to empty array
            console.warn('Expected array for fetchedHarvests but got:', typeof fetchedHarvests);
            setHarvestRecords([]);
        }
    };

    // --- Submission Logic ---
    const handleSubmission = async () => {
        if (!form.sourceHarvestId || !form.batchName || !form.wetWeightIn || !userId) {
            Alert.alert("Validation", "Please fill in Source Harvest ID, Batch Name, and Wet Weight In.");
            return;
        }

        setLoading(true);
        const newRecordId = generateRecordId('PL'); // Processing Log
        const processingRecord = {
            id: newRecordId,
            source_harvest_id: form.sourceHarvestId,
            batch_name: form.batchName,
            processing_method: form.processingMethod,
            wet_weight_in: parseFloat(form.wetWeightIn) || 0,
            parchment_weight_out: parseFloat(form.parchmentWeightOut) || 0,
            moisture_content: parseFloat(form.moistureContent) || 0,
            drying_method: form.dryingMethod,
            drying_start_date: form.dryingStartDate,
            drying_end_date: form.dryingEndDate,
            storage_location: form.storageLocation,
            notes: form.notes,
            recorder_id: userId,
            timestamp: Date.now(),
        };

        try {
            // await submitProcessingLog(processingRecord); // Integrate with Django API
            
            Alert.alert("Success", `Processing Log '${form.batchName}' recorded! ID: ${newRecordId}`);
            // Reset form for next entry
            setForm(p => ({
                ...p,
                batchName: '', wetWeightIn: '', parchmentWeightOut: '',
                moistureContent: '', dryingEndDate: '', storageLocation: '', notes: ''
            }));
            
        } catch (e) {
            console.error("Error adding processing log:", e);
            Alert.alert("Submission Failed", e.message || "Failed to save processing details.");
        } finally {
            setLoading(false);
        }
    };


    // --- Render Content ---
    const renderFormContent = () => {
        // Defensive mapping: ensure harvestRecords is an array before using map
        let availableHarvests = [];
        try {
            console.log('renderFormContent: harvestRecords value:', harvestRecords);
            const hr = Array.isArray(harvestRecords) ? harvestRecords : [];
            availableHarvests = hr.map(r => r.id);
        } catch (err) {
            console.error('Error while building availableHarvests from harvestRecords:', err, 'harvestRecords=', harvestRecords);
            availableHarvests = [];
        }

        return (
            <View style={styles.formSection}>
                <Text style={styles.formTitle}>Batch Tracking</Text>

                {availableHarvests.length > 0 ? (
                    <CustomPicker
                        label="Source Harvest Record ID"
                        selectedValue={form.sourceHarvestId}
                        onValueChange={(id) => setForm(p => ({ ...p, sourceHarvestId: id }))}
                        items={availableHarvests}
                    />
                ) : (
                    <Text style={styles.noDataWarning}>No harvest records found. Please aggregate first.</Text>
                )}

                <CustomInput label="Batch Name/ID" value={form.batchName} onChangeText={(v) => setForm(p => ({ ...p, batchName: v }))} />
                <CustomPicker label="Processing Method" selectedValue={form.processingMethod} onValueChange={(v) => setForm(p => ({ ...p, processingMethod: v }))} items={PROCESSING_METHODS} />

                <Text style={styles.formTitle}>Milling & Drying</Text>
                <CustomInput label="Wet Weight In (kg)" value={form.wetWeightIn} onChangeText={(v) => setForm(p => ({ ...p, wetWeightIn: v }))} keyboardType="numeric" />
                <CustomInput label="Parchment Weight Out (kg)" value={form.parchmentWeightOut} onChangeText={(v) => setForm(p => ({ ...p, parchmentWeightOut: v }))} keyboardType="numeric" />
                <CustomInput label="Moisture Content (%)" value={form.moistureContent} onChangeText={(v) => setForm(p => ({ ...p, moistureContent: v }))} keyboardType="numeric" />

                <CustomPicker label="Drying Method" selectedValue={form.dryingMethod} onValueChange={(v) => setForm(p => ({ ...p, dryingMethod: v }))} items={DRYING_METHODS} />
                <CustomInput label="Drying Start Date (YYYY-MM-DD)" value={form.dryingStartDate} onChangeText={(v) => setForm(p => ({ ...p, dryingStartDate: v }))} />
                <CustomInput label="Drying End Date (YYYY-MM-DD)" value={form.dryingEndDate} onChangeText={(v) => setForm(p => ({ ...p, dryingEndDate: v }))} />

                <Text style={styles.formTitle}>Storage & Notes</Text>
                <CustomInput label="Storage Location" value={form.storageLocation} onChangeText={(v) => setForm(p => ({ ...p, storageLocation: v }))} />
                <CustomInput label="Notes/Observations" value={form.notes} onChangeText={(v) => setForm(p => ({ ...p, notes: v }))} />

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmission} disabled={loading}>
                    {loading ? <ActivityIndicator color={CoffeeColors.WHITE} /> : <Text style={styles.submitButtonText}>Submit Processing Log</Text>}
                </TouchableOpacity>
            </View>
        );
    };

    // Early guard: if harvestRecords is somehow undefined (observed at runtime), avoid crashes
    if (typeof harvestRecords === 'undefined') {
        console.warn('ProcessingScreen render: harvestRecords is undefined, showing placeholder');
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
                    <Text style={styles.loadingText}>Loading records...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header displaying User ID and Back Button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => onNavigate('Dashboard')} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={28} color={CoffeeColors.CREAM} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Milling & Processing Log</Text>
                <Text style={styles.userIdText}>Recorder: {userId ? userId.slice(0, 15) + '...' : 'N/A'}</Text>
            </View>
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {loading && !userId ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
                        <Text style={styles.loadingText}>Initializing Auth...</Text>
                    </View>
                ) : (
                    renderFormContent()
                )}
            </ScrollView>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CoffeeColors.LIGHT_GRAY,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 50,
    },
    loadingText: {
        marginTop: 10,
        color: CoffeeColors.DARK_BROWN,
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 10,
        paddingBottom: 15,
        backgroundColor: CoffeeColors.DARK_BROWN,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        padding: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: CoffeeColors.CREAM,
    },
    userIdText: {
        fontSize: 12,
        color: CoffeeColors.LIGHT_BROWN,
        paddingRight: 10,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    formSection: {
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 10,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: CoffeeColors.MEDIUM_BROWN,
        marginTop: 15,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_BROWN,
        paddingBottom: 5,
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: CoffeeColors.MEDIUM_BROWN,
        marginBottom: 5,
    },
    textInput: {
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        color: CoffeeColors.DARK_BROWN,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: CoffeeColors.CREAM,
    },
    picker: {
        height: 50,
        width: '100%',
        color: CoffeeColors.DARK_BROWN,
    },
    noDataWarning: {
        color: '#FF6347',
        textAlign: 'center',
        paddingVertical: 10,
        fontSize: 14,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#FF6347',
        borderRadius: 5,
    },
    submitButton: {
        backgroundColor: CoffeeColors.DARK_BROWN,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 30,
    },
    submitButtonText: {
        color: CoffeeColors.WHITE,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ProcessingScreen;
