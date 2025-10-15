import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, Pressable, Switch, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// --- UTILITIES AND THEME IMPORTS ---
// NOTE: Assuming these imports are correctly path-resolved in your environment
import CoffeeColors from '../../../theme/colors';
import Header from '../../../components/Header';
import BottomNav from '../../../components/BottomNav';
import { PICKER_MAP, PARISHES_BY_SUB_COUNTY } from '../../../utils/constants'; 
import { initializeAuth, generateRecordId, fetchFarmers, submitFarmer, fetchHarvests, submitHarvest } from '../../../utils/firebaseSetup';
// import { getSingleFieldMode, setSingleFieldMode } from '../../../utils/settings'; // Removed unused setting import


// ===============================================
// === 1. FORM & TABLE FIELD DEFINITIONS (NEW) ===
// ===============================================

// NOTE: Adjusted fields for better consistency (e.g., using 'Yes'/'No' for boolean pickers)

const farmerFieldDefinitions = [
    // Step 1: Personal Info
    {
        title: 'Step 1: Personal & Contact Info',
        fields: [
            { key: 'first_name', label: 'First Name', keyboardType: 'default', required: true },
            { key: 'last_name', label: 'Last Name', keyboardType: 'default' },
            { key: 'gender', label: 'Gender', type: 'picker', pickerKey: 'gender' },
            { key: 'nin', label: 'NIN', keyboardType: 'default' },
            { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
            { key: 'contact', label: 'Contact', keyboardType: 'phone-pad', required: true },
            { key: 'email', label: 'Email (optional)', keyboardType: 'email-address' },
            { key: 'in_cooperative', label: 'Are you in a cooperative?', type: 'yes-no' },
            { key: 'cooperative', label: 'Cooperative Name', keyboardType: 'default', dependsOn: { field: 'in_cooperative', value: true } },
            { key: 'started_farming', label: 'When did you start coffee farming?', type: 'date' },
        ]
    },
    // Step 2: Location & UID
    {
        title: 'Step 2: Location & ID',
        fields: [
            { key: 'district', label: 'District', type: 'picker', pickerKey: 'district' },
            { key: 'sub_county', label: 'Sub-county', type: 'picker', pickerKey: 'sub_county' },
            // Parish will dynamically filter based on sub_county
            { key: 'parish', label: 'Parish', type: 'picker', pickerKey: 'parish', dynamic: true }, 
            { key: 'village', label: 'Village', keyboardType: 'default' },
            { key: 'gps', label: 'GPS Location (optional)', keyboardType: 'default' },
            { key: 'nearest_landmark', label: 'Nearest Landmark', keyboardType: 'default' },
            { key: 'uid', label: 'Farmer UID (Generated)', special: 'generate_uid', readOnly: true },
        ]
    },
    // Step 3: Farm Details
    {
        title: 'Step 3: Farm Details',
        fields: [
            { key: 'coffee_variety', label: 'Coffee Variety', type: 'picker', pickerKey: 'coffee_variety' },
            { key: 'no_of_trees', label: 'Number of Trees', keyboardType: 'numeric' },
            { key: 'all_your_trees', label: 'Are these all your trees?', type: 'yes-no' },
            { key: 'other_farms', label: 'If no, which farms (location, owner)', keyboardType: 'default', dependsOn: { field: 'all_your_trees', value: false } },
            { key: 'planted_date', label: 'Date planted', type: 'date' },
            { key: 'spacing', label: 'Spacing', type: 'picker', pickerKey: 'spacing' },
            { key: 'land_ownership', label: 'Land Ownership', type: 'picker', pickerKey: 'land_ownership' },
            { key: 'deforested', label: 'Has the land ever been deforested?', type: 'yes-no' },
            { key: 'seedling_source', label: 'Source of seedlings', type: 'picker', pickerKey: 'seedling_source' },
            { key: 'seedling_type', label: 'Type of seedlings', keyboardType: 'default' },
            { key: 'age_of_seedlings', label: 'Age of seedlings *', keyboardType: 'default', required: true },
        ]
    },
    // Step 4: Practices & Chemicals
    {
        title: 'Step 4: Farming Practices',
        fields: [
            { key: 'practices', label: 'Standard practices carried out', type: 'multi-select', pickerKey: 'practices' },
            { key: 'irrigation', label: 'Irrigation source', type: 'picker', pickerKey: 'irrigation' },
            { key: 'fertilizers', label: 'Fertilizers', type: 'picker', pickerKey: 'fertilizers', array: true },
            { key: 'uses_pesticides', label: 'Use pesticides?', type: 'yes-no' },
            { key: 'pesticides', label: 'If yes, list pesticides (comma separated)', array: true, dependsOn: { field: 'uses_pesticides', value: true } },
        ]
    }
];

const harvestFieldDefinitions = [
    // Step 1: Farmer & Weight
    {
        title: "Step 1: Farmer's Harvest Details",
        fields: [
            { key: 'farmer_uid', label: 'Farmer UID', keyboardType: 'default', required: true, action: 'lookup' },
            { key: 'weight_on_delivery', label: 'Weight on Delivery (kg)', keyboardType: 'numeric', required: true },
            { key: 'number_of_bags', label: 'Number of Bags', keyboardType: 'numeric' },
            { key: 'date_of_delivery', label: 'Date of Delivery', type: 'date', required: true },
        ]
    },
    // Step 2: Quality & Payment
    {
        title: 'Step 2: Quality & Payment',
        fields: [
            { key: 'coffee_type', label: 'Coffee Type', type: 'picker', pickerKey: 'coffee_type' },
            { key: 'moisture_content', label: 'Moisture Content (%)', keyboardType: 'numeric' },
            { key: 'amount_paid', label: 'Amount Paid', keyboardType: 'numeric' },
            { key: 'paid_by', label: 'Paid By', keyboardType: 'default' },
            { key: 'harvest_id', label: 'Harvest ID (Generated)', special: 'generate_harvest_id', readOnly: true },
        ]
    }
];

const farmerTableFields = [
    { key: 'name', label: 'Name', width: '30%' },
    { key: 'contact', label: 'Contact', width: '20%' },
    { key: 'district', label: 'District', width: '20%' },
    { key: 'number_of_trees', label: 'Trees', width: '15%' },  // FIXED: Changed from num_trees to number_of_trees
    { key: 'uid', label: 'UID', width: '15%' }, // Use UID for farmers
];

const harvestTableFields = [
    { key: 'farmer_name', label: 'Farmer', width: '30%' },
    { key: 'date_of_delivery', label: 'Date', width: '20%' },
    { key: 'weight_on_delivery', label: 'Weight (kg)', width: '20%' },
    { key: 'amount_paid', label: 'Paid', width: '15%' },
    { key: 'id', label: 'ID', width: '15%' },
];

// ===============================================
// === 2. LIGHTWEIGHT LOCAL UI HELPERS (POLISHED)===
// ===============================================

const CustomInput = ({ label, value, onChangeText, keyboardType = 'default', editable = true, placeholder = '' }) => (
    <View style={{ marginBottom: 15 }}>
        {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
        <TextInput 
            value={value} 
            onChangeText={onChangeText} 
            keyboardType={keyboardType} 
            style={[styles.textInput, !editable && styles.readOnlyInput]} 
            editable={editable}
            placeholder={placeholder}
            placeholderTextColor={CoffeeColors.GRAY_TEXT_LIGHT}
        />
    </View>
);

const CustomPicker = ({ label, selectedValue, onValueChange, items = [] }) => (
    <View style={{ marginBottom: 15 }}>
        {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
        <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedValue} onValueChange={onValueChange} style={styles.picker}>
                <Picker.Item label="-- Select --" value="" />
                {items.map((it, index) => {
                    const value = it.value ?? it;
                    const label = it.label ?? String(it);
                    return <Picker.Item key={index} label={label} value={value} />;
                })}
            </Picker>
        </View>
    </View>
);

// Toggle component is now redundant with 'yes-no' picker logic but kept for safety/simplicity if needed elsewhere
const CustomToggle = ({ label, value, onValueChange }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingVertical: 5 }}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Switch value={!!value} onValueChange={onValueChange} trackColor={{ true: CoffeeColors.MEDIUM_BROWN }} thumbColor={value ? CoffeeColors.CREAM : '#fff'} />
    </View>
);

const CustomMultiSelect = ({ label, selectedValues = [], onValueChange, items = [] }) => {
    const [modalVisible, setModalVisible] = useState(false);

    const toggleSelection = (item) => {
        const itemValue = typeof item === 'object' ? item.value : item;
        const newSelection = selectedValues.includes(itemValue)
            ? selectedValues.filter(val => val !== itemValue)
            : [...selectedValues, itemValue];
        onValueChange(newSelection);
    };

    const displayValue = selectedValues.length > 0 ? selectedValues.join(', ') : 'Select practices';

    return (
        <View style={{ marginBottom: 15 }}>
            {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
            <TouchableOpacity
                style={styles.multiSelectButton}
                onPress={() => setModalVisible(true)}
            >
                <Text style={styles.multiSelectText}>{displayValue}</Text>
                <Ionicons name="chevron-down" size={20} color={CoffeeColors.MEDIUM_BROWN} />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.multiSelectModal}>
                        <Text style={styles.modalTitle}>Select Practices</Text>
                        <ScrollView style={styles.multiSelectScroll}>
                            {items.map((item, index) => {
                                const itemValue = typeof item === 'object' ? item.value : item;
                                const itemLabel = typeof item === 'object' ? item.label : item;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.multiSelectItem}
                                        onPress={() => toggleSelection(item)}
                                    >
                                        <Text style={styles.multiSelectItemText}>{itemLabel}</Text>
                                        <View style={styles.checkbox}>
                                            {selectedValues.includes(itemValue) && (
                                                <Ionicons name="checkmark" size={16} color={CoffeeColors.MEDIUM_BROWN} />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.modalCloseText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const CustomDatePicker = ({ label, value, onChange }) => {
    const [showPicker, setShowPicker] = useState(false);
    // Use value if it's a valid date string, otherwise default to today
    const [date, setDate] = useState(value ? new Date(value) : new Date());

    const handleDateChange = (event, selectedDate) => {
        setShowPicker(false);
        if (selectedDate) {
            setDate(selectedDate);
            // Ensure date is formatted as YYYY-MM-DD
            onChange(selectedDate.toISOString().split('T')[0]); 
        }
    };

    const displayValue = value || 'Select Date';

    return (
        <View style={{ marginBottom: 15 }}>
            {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
            <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowPicker(true)}
            >
                <Text style={styles.datePickerText}>{displayValue}</Text>
                <Ionicons name="calendar" size={20} color={CoffeeColors.MEDIUM_BROWN} />
            </TouchableOpacity>
            {showPicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                />
            )}
        </View>
    );
};

const SuccessMessage = ({ message, onExit, onView }) => (
    <View style={[styles.overlay]}>
        <View style={styles.modal}>
            <Text style={styles.modalTitle}>Success 🎉</Text>
            <Text style={styles.modalMessage}>{message}</Text>
            <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: CoffeeColors.MEDIUM_BROWN }]} onPress={onView}><Text style={styles.modalButtonText}>View Records</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: CoffeeColors.GRAY_TEXT, marginTop: 8 }]} onPress={onExit}><Text style={styles.modalButtonText}>Close</Text></TouchableOpacity>
            </View>
        </View>
    </View>
);

const ProgressBar = ({ currentStep, totalSteps }) => {
    const progress = (currentStep / totalSteps) * 100;
    return (
        <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
            <Text style={styles.progressText}>Step {currentStep} of {totalSteps}</Text>
        </View>
    );
};

// --- NEW/REPLACED Table Component: Searchable Data List ---
const SearchableDataList = ({ records = [], fields = [], title = '', onExit, onEdit, isFarmer }) => {
    const [searchText, setSearchText] = useState('');
    
    // Filtering logic based on search text across all listed fields
    const filteredRecords = useMemo(() => {
        if (!searchText) return records;
        const lowerSearch = searchText.toLowerCase();
        
        return records.filter(record => 
            fields.some(f => 
                String(record[f.key] || '').toLowerCase().includes(lowerSearch)
            )
        );
    }, [records, fields, searchText]);
    
    // Renders the summary row for the FlatList
    const renderItem = ({ item }) => {
        // Find a fallback name if farmer_name isn't present for harvests
        const nameKey = isFarmer ? 'name' : (item.farmer_name ? 'farmer_name' : 'farmer_uid');
        const secondKey = fields.length > 1 ? fields[1].key : null;
        const thirdKey = fields.length > 2 ? fields[2].key : null;

        return (
            <TouchableOpacity style={styles.dataListItem} onPress={() => onEdit(item)}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.dataListItemTitle}>
                        {String(item[nameKey] || 'N/A')}
                        <Text style={styles.dataListItemUID}> ({item.uid || item.id || 'No ID'})</Text>
                    </Text>
                    <Text style={styles.dataListItemSubtitle}>
                        {secondKey ? `${fields[1].label}: ${item[secondKey] || 'N/A'}` : ''}
                        {thirdKey ? ` | ${fields[2].label}: ${item[thirdKey] || 'N/A'}` : ''}
                    </Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color={CoffeeColors.GRAY_TEXT} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.recordsContainer}>
            <View style={styles.tableHeaderSection}>
                <Text style={styles.tableTitle}>{title}</Text>
                <CustomInput
                    placeholder="Search by name, ID, or contact..."
                    value={searchText}
                    onChangeText={setSearchText}
                />
                <TouchableOpacity style={{ marginTop: 8 }} onPress={onExit}>
                    <Text style={styles.backToFormText}>← Back to form ({filteredRecords.length} records)</Text>
                </TouchableOpacity>
            </View>
            
            {filteredRecords.length > 0 ? (
                <FlatList
                    data={filteredRecords}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item.id || item.uid || index.toString()}
                    style={styles.listContainer}
                />
            ) : (
                <Text style={styles.noRecords}>No records found matching your search.</Text>
            )}
        </View>
    );
};


// ===============================================
// === 3. MAIN COMPONENT (POLISHED)            ===
// ===============================================

const AggregationScreen = ({ navigation, onNavigate: onNavigateProp }) => {
    const onNavigate = onNavigateProp ?? ((screen) => { if (navigation && navigation.navigate) navigation.navigate(screen); });
    
    // --- State declarations ---
    const [farmersList, setFarmersList] = useState([]);
    const [harvestsList, setHarvestsList] = useState([]);
    // Simplified initial state to ensure 'yes-no' fields are correctly initialized as booleans
    const [farmerForm, setFarmerForm] = useState({
        first_name: '', last_name: '', gender: '', nin: '', date_of_birth: '', contact: '', email: '', in_cooperative: false, cooperative: '', started_farming: '',
        district: '', sub_county: '', parish: '', village: '', gps: '', nearest_landmark: '', uid: '',
        coffee_variety: '', no_of_trees: '', all_your_trees: false, other_farms: '', planted_date: '', spacing: '', land_ownership: '', deforested: false, seedling_source: '', seedling_type: '', age_of_seedlings: '', practices: [], irrigation: '', fertilizers: [], uses_pesticides: false, pesticides: [],
    });
    const [harvestForm, setHarvestForm] = useState({ farmer_uid: '', farmer_name: '', weight_on_delivery: '', harvest_id: '', date_of_delivery: new Date().toISOString().slice(0,10), coffee_type: '', moisture_content: '', amount_paid: '', paid_by: '', number_of_bags: '' });

    const [farmerStep, setFarmerStep] = useState(0);
    const [harvestStep, setHarvestStep] = useState(0);
    const [viewMode, setViewMode] = useState('form');
    const [activeTab, setActiveTab] = useState('farmers');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const isSubmittingRef = useRef(false);
    const [userId, setUserId] = useState('user123'); 

    // --- Data Loading and Initialization ---
    const loadRecords = async () => {
        setLoading(true);
        try {
            const f = await fetchFarmers();
            setFarmersList(f || []);
        } catch (e) {
            console.warn('Failed to load farmers', e);
        }
        try {
            const h = await fetchHarvests();
            setHarvestsList(h || []);
        } catch (e) {
            console.warn('Failed to load harvests', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        (async () => {
            try {
                // Initialize auth service (assuming this fetches the real userId)
                await initializeAuth();
            } catch (e) {
                console.warn('init auth failed', e);
            }
            await loadRecords();
        })();
    }, []);

    const resetForms = () => {
        // Reset boolean fields to false and string fields to ''
        setFarmerForm(p => ({
            ...p,
            first_name: '', last_name: '', gender: '', nin: '', date_of_birth: '', contact: '', email: '', in_cooperative: false, cooperative: '', started_farming: '',
            district: '', sub_county: '', parish: '', village: '', gps: '', nearest_landmark: '', uid: '',
            coffee_variety: '', no_of_trees: '', all_your_trees: false, other_farms: '', planted_date: '', spacing: '', land_ownership: '', deforested: false, seedling_source: '', seedling_type: '', age_of_seedlings: '', practices: [], irrigation: '', fertilizers: [], uses_pesticides: false, pesticides: [],
        }));

        setHarvestForm(p => ({
            ...p,
            farmer_uid: '', farmer_name: '', weight_on_delivery: '', harvest_id: '', date_of_delivery: new Date().toISOString().slice(0,10), coffee_type: '', moisture_content: '', amount_paid: '', paid_by: '', number_of_bags: '',
        }));
        setFarmerStep(0);
        setHarvestStep(0);
    };

    const getFarmerDisplayName = (f) => {
        if (!f) return '';
        return f.name || f.full_name || f.farmer_name || f.displayName || `${f.first_name || ''} ${f.last_name || ''}`.trim();
    };

    // --- Form Update Logic ---
    // FIXED: Update farmer form with special logic for booleans and dependencies
    const updateFarmerForm = (key, value) => {
        console.log(`[Farmer Form] Updating field: ${key}, value:`, value);
        setFarmerForm(p => {
            let newState = { ...p, [key]: value };

            // Logic to reset parish when sub_county changes
            if (key === 'sub_county' && value !== p.sub_county) {
                newState.parish = ''; // Reset parish selection
            }
            // Logic for 'Yes'/'No' pickers (which represent booleans in state)
            if (['in_cooperative', 'all_your_trees', 'deforested', 'uses_pesticides'].includes(key)) {
                 newState[key] = value === 'Yes' || value === true;
            }

            console.log('[Farmer Form] New state after update:', newState);
            return newState;
        });
    };

    // FIXED: Create proper update function for harvest form
    const updateHarvestForm = (key, value) => {
        console.log(`[Harvest Form] Updating field: ${key}, value:`, value);
        setHarvestForm(p => {
            const newState = { ...p, [key]: value };
            console.log('[Harvest Form] New state after update:', newState);
            return newState;
        });
    };

    // --- Submission Handlers (Kept clean) ---
    const handleFarmerSubmit = async () => {
        console.log('[handleFarmerSubmit] ========== STARTING SUBMISSION ==========');
        console.log('[handleFarmerSubmit] Current form state:', farmerForm);

        // ... (Submission logic remains the same)
        if (!farmerForm.first_name || !farmerForm.contact || !userId) {
            console.error('[handleFarmerSubmit] Validation failed - missing required fields');
            Alert.alert("Validation", "Please ensure First name, Contact, and User ID are present.");
            return;
        }

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setLoading(true);

        const newRecordId = farmerForm.uid || generateRecordId('FD');
        const name = `${farmerForm.first_name} ${farmerForm.last_name}`.trim();
        const location = `${farmerForm.district || ''}${farmerForm.sub_county ? ', ' + farmerForm.sub_county : ''}`;

        console.log('[handleFarmerSubmit] Generated ID:', newRecordId);
        console.log('[handleFarmerSubmit] Farmer name:', name);

        // Prepare farmer record with ALL required fields for Django backend
        const farmerRecord = {
            ...farmerForm,
            // Display fields (used by UI)
            name: name,
            uid: newRecordId,
            location: location,
            number_of_trees: parseInt(farmerForm.no_of_trees) || 0,  // FIXED: Changed from num_trees to number_of_trees
            recorder_id: userId,
            timestamp: Date.now(),

            // Backend API fields (match Django model exactly)
            farmer_id: newRecordId,
            farmer_type: 'individual',
            other_district: '',
            other_sub_county: '',

            // Boolean fields - MUST be true/false (backend expects boolean)
            ownership_of_trees: Boolean(farmerForm.all_your_trees),
            defforestation_status: Boolean(farmerForm.deforested),
            standard_practices: Boolean(Array.isArray(farmerForm.practices) && farmerForm.practices.length > 0),

            // Year as integer
            started_coffee_farming_year: farmerForm.started_farming ? new Date(farmerForm.started_farming).getFullYear() : null,

            // String fields
            spacing_between_trees: farmerForm.spacing || '',
            gps_coordinates: farmerForm.gps || '',
            age_of_seedlings: farmerForm.age_of_seedlings || '', // FIXED: Use actual form value!
        };

        console.log('[handleFarmerSubmit] Final farmer record:', JSON.stringify(farmerRecord, null, 2));

        try {
            console.log('[handleFarmerSubmit] Calling submitFarmer...');
            await submitFarmer(farmerRecord);
            console.log('[handleFarmerSubmit] ✅ Submission successful!');
            setSuccessMessage(`Farmer '${name}' recorded successfully! UID: ${newRecordId}`);
            setViewMode('success');
            resetForms();
            await loadRecords();
        } catch (e) {
            console.error("[handleFarmerSubmit] ❌ Submission error:", e);
            console.error("[handleFarmerSubmit] Error details:", {
                message: e.message,
                response: e.response?.data,
                status: e.response?.status
            });
            Alert.alert("Submission Failed", e.message || "Failed to save farmer details.");
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const handleHarvestSubmit = async () => {
        // ... (Submission logic remains the same)
        if (!harvestForm.farmer_uid || !harvestForm.weight_on_delivery || !userId) {
            Alert.alert('Validation', 'Please fill Farmer UID, Weight and ensure you are logged in.');
            return;
        }
        
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setLoading(true);

        const newRecordId = harvestForm.harvest_id || generateRecordId('PA');

        const harvestRecord = {
            ...harvestForm,
            id: newRecordId,
            weight_on_delivery: Number(harvestForm.weight_on_delivery) || 0,
            amount_paid: Number(harvestForm.amount_paid) || 0,
            number_of_bags: Number(harvestForm.number_of_bags) || 0,
            recorder_id: userId,
            timestamp: Date.now(),
        };

        try {
            await submitHarvest(harvestRecord);
            setSuccessMessage(`Harvest for '${harvestForm.farmer_name || harvestForm.farmer_uid}' recorded successfully! ID: ${newRecordId}`);
            setViewMode('success');
            resetForms();
            await loadRecords();
        } catch (e) {
            console.error('Error adding harvest:', e);
            Alert.alert('Submission Failed', e.message || 'Failed to save harvest details.');
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };
    
    // --- Step Form Renderer (Unified Logic) ---

    const renderGroupedStepForm = (type) => {
        const isFarmer = type === 'farmers';
        const steps = isFarmer ? farmerFieldDefinitions : harvestFieldDefinitions;
        const currentStep = isFarmer ? farmerStep : harvestStep;
        const setStep = isFarmer ? setFarmerStep : setHarvestStep;
        const formData = isFarmer ? farmerForm : harvestForm;
        const setFormData = isFarmer ? updateFarmerForm : updateHarvestForm; // FIXED: Use proper update functions for both forms
        const currentStepFields = steps[currentStep];

        const updateForm = (key, value) => {
            setFormData(key, value);
        };
        
        const handleNext = () => {
            // Basic required field validation for current step
            const missingRequired = currentStepFields.fields.some(f =>
                f.required && (!formData[f.key] || (typeof formData[f.key] === 'string' && formData[f.key].trim() === ''))
            );

            if (missingRequired) {
                Alert.alert("Validation", "Please fill all required fields in this step.");
                return;
            }

            // Handle step-specific actions (e.g., UID generation, Farmer lookup) BEFORE advancing
            currentStepFields.fields.forEach(f => {
                if (f.special === 'generate_uid' && isFarmer && !formData.uid) {
                    setFormData('uid', generateRecordId('FD'));
                } else if (f.special === 'generate_harvest_id' && !isFarmer && !formData.harvest_id) {
                     setFormData('harvest_id', generateRecordId('PA'));
                } else if (f.action === 'lookup' && !isFarmer && formData.farmer_uid) {
                    const farmerUID = formData.farmer_uid;
                    const found = farmersList.find(f => String(f.id) === String(farmerUID) || String(f.uid) === String(farmerUID));
                    if (found) {
                        setFormData('farmer_name', getFarmerDisplayName(found));
                    } else {
                        Alert.alert('Farmer Not Found', 'No farmer with that UID was found in local records.');
                    }
                }
            });

            if (currentStep < steps.length - 1) {
                setStep(s => s + 1);
            } else {
                // Final step - trigger submission
                isFarmer ? handleFarmerSubmit() : handleHarvestSubmit();
            }
        };

        const handleBack = () => {
            if (currentStep > 0) setStep(s => s - 1);
        };

        return (
            <View style={styles.formSection}>
                <Text style={styles.formTitle}>{currentStepFields.title}</Text>
                <ProgressBar currentStep={currentStep + 1} totalSteps={steps.length} />

                {/* Form Fields - ScrollView now takes available space */}
                <ScrollView
                    style={styles.stepFormScroll}
                    contentContainerStyle={styles.stepFormContent}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                >
                    {currentStepFields.fields.map(field => {
                        // Handle conditional visibility
                        if (field.dependsOn) {
                            // Check if the dependency value is explicitly 'Yes'/'No' string for boolean state (false/true)
                            const dependencyValue = field.dependsOn.value === true ? 'Yes' : (field.dependsOn.value === false ? 'No' : field.dependsOn.value);
                            
                            // Check the form value, which is stored as a boolean (true/false) in the state
                            const formValue = formData[field.dependsOn.field] === true ? 'Yes' : (formData[field.dependsOn.field] === false ? 'No' : formData[field.dependsOn.field]);
                            
                            if (formValue !== dependencyValue) {
                                return null;
                            }
                        }
                        
                        const fieldValue = (field.special === 'generate_uid' || field.special === 'generate_harvest_id')
                            ? formData[field.key] || 'Press Next to Generate ID'
                            : (field.type === 'multi-select' ? (Array.isArray(formData[field.key]) && formData[field.key].length > 0 ? formData[field.key].join(', ') : '') : (field.array ? (Array.isArray(formData[field.key]) ? formData[field.key].join(', ') : '') : String(formData[field.key] ?? '')));

                        // Determine field type and render
                        if (field.type === 'yes-no') {
                            const selectedValue = formData[field.key] === true ? 'Yes' : (formData[field.key] === false ? 'No' : '');
                            return <CustomPicker key={field.key} label={field.label} selectedValue={selectedValue} onValueChange={(v) => updateForm(field.key, v === 'Yes' ? true : false)} items={['Yes', 'No']} />;
                        }
                        if (field.type === 'multi-select') {
                            const items = PICKER_MAP[field.pickerKey] || [];
                            return <CustomMultiSelect key={field.key} label={field.label} selectedValues={formData[field.key] || []} onValueChange={(v) => updateForm(field.key, v)} items={items} />;
                        }
                        if (field.type === 'date') {
                            return <CustomDatePicker key={field.key} label={`${field.label}${field.required ? ' *' : ''}`} value={formData[field.key]} onChange={(v) => updateForm(field.key, v)} />;
                        }
                        if (field.type === 'picker') {
                            let items = PICKER_MAP[field.pickerKey] || [];

                            // Dynamic filtering for Parish
                            if (field.dynamic && field.pickerKey === 'parish' && formData.sub_county) {
                                items = PARISHES_BY_SUB_COUNTY[formData.sub_county] || [];
                            } else if (field.dynamic && field.pickerKey === 'parish' && !formData.sub_county) {
                                items = [{ label: 'Select Sub-county first', value: '', disabled: true }];
                            }

                            return <CustomPicker key={field.key} label={field.label} selectedValue={formData[field.key]} onValueChange={(v) => updateForm(field.key, v)} items={items} />;
                        }

                        // Default to CustomInput
                        const handleTextChange = (v) => {
                            let processedValue = v;
                            if (field.keyboardType === 'numeric') {
                                processedValue = v.replace(/[^0-9.]/g, ''); 
                            }
                            if (field.array) {
                                processedValue = v.split(',').map(s => s.trim()).filter(Boolean);
                            }
                            updateForm(field.key, processedValue);
                        };

                        return (
                            <CustomInput
                                key={field.key}
                                label={`${field.label}${field.required ? ' *' : ''}`}
                                value={fieldValue}
                                onChangeText={field.readOnly ? null : handleTextChange}
                                keyboardType={field.keyboardType}
                                editable={!field.readOnly}
                                placeholder={field.readOnly ? '' : `Enter ${field.label}`}
                            />
                        );
                    })}

                    {/* GPS special case: button for generation */}
                    {isFarmer && currentStepFields.fields.some(f => f.key === 'gps') && (
                        <TouchableOpacity style={styles.generateButton} onPress={() => updateForm('gps', formData.gps || '0.0000,0.0000')}>
                            <Text style={styles.generateButtonText}>Get Current GPS Location</Text>
                        </TouchableOpacity>
                    )}

                </ScrollView>

                {/* Step Navigation */}
                <View style={styles.stepNav}>
                    {currentStep > 0 && <TouchableOpacity style={styles.stepButton} onPress={handleBack}><Text style={styles.stepButtonText}>Back</Text></TouchableOpacity>}
                    <TouchableOpacity
                        style={[styles.submitButton, currentStep < steps.length - 1 ? styles.nextButton : null]}
                        onPress={handleNext}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color={CoffeeColors.WHITE} /> : (
                            <Text style={styles.submitButtonText}>{currentStep < steps.length - 1 ? 'Next' : `Submit ${isFarmer ? 'Farmer' : 'Harvest'}`}</Text>
                        )}
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.viewRecordsButton, { marginTop: 10 }]} onPress={() => { setActiveTab(type); setViewMode('table'); }}>
                    <Text style={styles.viewRecordsButtonText}>View {isFarmer ? 'Farmer' : 'Harvest'} Records</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // --- Main Content Renderers ---
    const renderFormContent = () => {
        return activeTab === 'farmers' ? renderGroupedStepForm('farmers') : renderGroupedStepForm('harvests');
    };
    
    const renderTableContent = () => {
        if (activeTab === 'farmers') {
            return (
                <SearchableDataList
                    records={farmersList}
                    fields={farmerTableFields}
                    title="Farmer Records"
                    onExit={() => setViewMode('form')}
                    isFarmer={true}
                    onEdit={(r) => Alert.alert('View/Edit Farmer', `Viewing record for: ${r.name} (${r.uid})`)}
                />
            );
        } else {
            return (
                <SearchableDataList
                    records={harvestsList}
                    fields={harvestTableFields}
                    title="Harvest Records"
                    onExit={() => setViewMode('form')}
                    isFarmer={false}
                    onEdit={(r) => Alert.alert('View/Edit Harvest', `Viewing record for: ${r.farmer_name} (ID: ${r.id})`)}
                />
            );
        }
    };
    
    // --- Screen Layout ---
    return (
        <View style={styles.screen}>
            <Header title="Aggregation" onNavigate={onNavigate} />

            {/* FIXED: KeyboardAvoidingView wraps entire scrollable content - optimized for Android */}
            <KeyboardAvoidingView
                style={styles.container}
                behavior="height"
                enabled={Platform.OS === 'android'}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                >
                
                {/* Tab Navigation */}
                {viewMode === 'form' && (
                    <View style={styles.tabContainer}>
                        <TouchableOpacity 
                            style={[styles.tabButton, activeTab === 'farmers' && styles.activeTab]} 
                            onPress={() => { setActiveTab('farmers'); resetForms(); setViewMode('form'); }}>
                            <Text style={[styles.tabText, activeTab === 'farmers' && styles.activeTabText]}>Register Farmer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabButton, activeTab === 'harvests' && styles.activeTab]} 
                            onPress={() => { setActiveTab('harvests'); resetForms(); setViewMode('form'); }}>
                            <Text style={[styles.tabText, activeTab === 'harvests' && styles.activeTabText]}>Record Harvest</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Main Content Area */}
                <View style={styles.contentWrapper}>
                    {loading && viewMode !== 'table' && <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />}

                    {viewMode === 'form' && renderFormContent()}

                    {viewMode === 'table' && renderTableContent()}
                </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modals and Overlays */}
            {viewMode === 'success' && (
                <SuccessMessage
                    message={successMessage}
                    onExit={() => setViewMode('form')}
                    onView={() => { setActiveTab(activeTab); setViewMode('table'); setSuccessMessage(''); }}
                />
            )}

            <BottomNav onNavigate={onNavigate} active="Aggregation" />
        </View>
    );
};


// ===============================================
// === 4. STYLESHEET (POLISHED)                ===
// ===============================================

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: CoffeeColors.LIGHT_GRAY,
    },
    container: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    contentWrapper: {
        flex: 1, // FIXED: Takes remaining space after tabs/header
        paddingBottom: 100, // Make room for BottomNav
    },
    contentContainer: {
        flexGrow: 1,
        paddingBottom: 100, // Make room for BottomNav
    },
    // --- Tabs ---
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: CoffeeColors.CREAM,
        borderRadius: 10,
        padding: 5,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
    },
    tabText: {
        color: CoffeeColors.DARK_BROWN,
        fontWeight: '500',
    },
    activeTabText: {
        color: CoffeeColors.WHITE,
        fontWeight: '700',
    },
    // --- Forms ---
    formSection: {
        flex: 1, // FIXED: Allow form to take available height
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 10,
        padding: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        maxHeight: '100%', // Prevent overflow on small screens
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 10,
    },
    inputLabel: {
        fontSize: 14,
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 5,
        fontWeight: '600',
    },
    textInput: {
        borderWidth: 1,
        borderColor: CoffeeColors.GRAY_TEXT_LIGHT,
        borderRadius: 6,
        padding: 10,
        backgroundColor: CoffeeColors.WHITE,
        fontSize: 16,
        color: CoffeeColors.DARK_BROWN,
    },
    readOnlyInput: {
        backgroundColor: CoffeeColors.LIGHT_GRAY,
        color: CoffeeColors.GRAY_TEXT,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: CoffeeColors.GRAY_TEXT_LIGHT,
        borderRadius: 6,
        backgroundColor: CoffeeColors.WHITE,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
        color: CoffeeColors.DARK_BROWN,
    },
    stepFormScroll: {
        // REMOVED fixed maxHeight to allow proper scrolling on all screen sizes
        // The form will now flex properly within the available space
        flex: 1, // Take remaining space in the KeyboardAvoidingView
    },
    stepFormContent: {
        // Content container for ScrollView - adds padding for last items
        paddingRight: 10,
        paddingBottom: 20, // Extra space at bottom so last field is visible when keyboard appears
    },
    // Date Picker Button
    datePickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CoffeeColors.GRAY_TEXT_LIGHT,
        borderRadius: 6,
        padding: 10,
        backgroundColor: CoffeeColors.WHITE,
    },
    datePickerText: {
        fontSize: 16,
        color: CoffeeColors.DARK_BROWN,
    },
    // Multi-Select Button
    multiSelectButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CoffeeColors.GRAY_TEXT_LIGHT,
        borderRadius: 6,
        padding: 10,
        backgroundColor: CoffeeColors.WHITE,
    },
    multiSelectText: {
        fontSize: 16,
        color: CoffeeColors.DARK_BROWN,
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    multiSelectModal: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 10,
        padding: 20,
    },
    multiSelectScroll: {
        paddingVertical: 10,
        maxHeight: 300,
    },
    multiSelectItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_GRAY,
    },
    multiSelectItemText: {
        fontSize: 16,
        color: CoffeeColors.DARK_BROWN,
    },
    checkbox: {
        height: 24,
        width: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: CoffeeColors.MEDIUM_BROWN,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        marginTop: 20,
        padding: 15,
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalCloseText: {
        color: CoffeeColors.WHITE,
        fontWeight: 'bold',
    },
    // --- Progress Bar ---
    progressBarContainer: {
        height: 15,
        backgroundColor: CoffeeColors.CREAM,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 15,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: CoffeeColors.GRAY_TEXT_LIGHT,
    },
    progressBar: {
        height: '100%',
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        borderRadius: 8,
        position: 'absolute',
        left: 0,
    },
    progressText: {
        color: CoffeeColors.DARK_BROWN,
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        zIndex: 1,
    },
    // --- Step Navigation ---
    stepNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingHorizontal: 5,
    },
    stepButton: {
        backgroundColor: CoffeeColors.CREAM,
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CoffeeColors.MEDIUM_BROWN,
    },
    stepButtonText: {
        color: CoffeeColors.DARK_BROWN,
        fontWeight: 'bold',
    },
    nextButton: {
        backgroundColor: CoffeeColors.DARK_BROWN,
        borderWidth: 0,
    },
    submitButton: {
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    submitButtonText: {
        color: CoffeeColors.WHITE,
        fontWeight: 'bold',
    },
    generateButton: {
        marginTop: 5,
        marginBottom: 10,
        padding: 5,
        backgroundColor: CoffeeColors.CREAM,
        borderRadius: 5,
        alignItems: 'center',
    },
    generateButtonText: {
        color: CoffeeColors.MEDIUM_BROWN,
        fontWeight: '600',
        fontSize: 12,
    },
    viewRecordsButton: {
        padding: 10,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: CoffeeColors.DARK_BROWN,
    },
    viewRecordsButtonText: {
        color: CoffeeColors.DARK_BROWN,
        fontWeight: '600',
    },
    // --- Modal/Success ---
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    modal: {
        width: '80%',
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 16,
        textAlign: 'center',
        color: CoffeeColors.GRAY_TEXT,
        marginBottom: 20,
    },
    modalActions: {
        width: '100%',
    },
    modalButton: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonText: {
        color: CoffeeColors.WHITE,
        fontWeight: 'bold',
    },
    // --- Data List (Replaces Table) ---
    recordsContainer: {
        flex: 1,
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 10,
        elevation: 3,
    },
    tableHeaderSection: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_GRAY,
    },
    tableTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 10,
    },
    backToFormText: {
        color: CoffeeColors.MEDIUM_BROWN,
        fontWeight: '600',
        marginTop: 5,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    dataListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_GRAY,
    },
    dataListItemTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: CoffeeColors.DARK_BROWN,
    },
    dataListItemUID: {
        fontSize: 14,
        fontWeight: '500',
        color: CoffeeColors.MEDIUM_BROWN,
    },
    dataListItemSubtitle: {
        fontSize: 13,
        color: CoffeeColors.GRAY_TEXT,
        marginTop: 4,
    },
    noRecords: {
        textAlign: 'center',
        padding: 20,
        color: CoffeeColors.GRAY_TEXT,
    }
});

export default AggregationScreen;