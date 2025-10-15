import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// --- UTILITIES AND THEME IMPORTS ---
// NOTE: Assuming these imports are correctly path-resolved in your environment
import CoffeeColors from '../../../theme/colors';
import Header from '../../../components/Header';
import BottomNav from '../../../components/BottomNav';
import { PICKER_MAP, PARISHES_BY_SUB_COUNTY } from '../../../utils/constants';
import { initializeAuth, generateRecordId, fetchFarmers, submitFarmer, fetchHarvests, submitHarvest } from '../../../services/aggregationService'; 
import { getSingleFieldMode, setSingleFieldMode } from '../../../utils/settings';


// ===============================================
// === 1. FORM & TABLE FIELD DEFINITIONS (NEW) ===
// ===============================================

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
            { key: 'in_cooperative', label: 'Are you in a cooperative?', type: 'picker', pickerKey: 'all_your_trees' },
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
            { key: 'parish', label: 'Parish', type: 'picker', pickerKey: 'parish' },
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
            { key: 'all_your_trees', label: 'Are these all your trees?', type: 'picker', pickerKey: 'all_your_trees' },
            { key: 'other_farms', label: 'If no, which farms (location, owner)', keyboardType: 'default', dependsOn: { field: 'all_your_trees', value: false } },
            { key: 'planted_date', label: 'Date planted', type: 'date' },
            { key: 'spacing', label: 'Spacing', type: 'picker', pickerKey: 'spacing' },
            { key: 'land_ownership', label: 'Land Ownership', type: 'picker', pickerKey: 'land_ownership' },
            { key: 'deforested', label: 'Has the land ever been deforested?', type: 'picker', pickerKey: 'all_your_trees' },
            { key: 'seedling_source', label: 'Source of seedlings', type: 'picker', pickerKey: 'seedling_source' },
            { key: 'seedling_type', label: 'Type of seedlings', keyboardType: 'default' },
        ]
    },
    // Step 4: Practices & Chemicals
    {
        title: 'Step 4: Farming Practices',
        fields: [
            { key: 'practices', label: 'Standard practices carried out', type: 'multi-select', pickerKey: 'practices' },
            { key: 'irrigation', label: 'Irrigation source', type: 'picker', pickerKey: 'irrigation' },
            { key: 'fertilizers', label: 'Fertilizers', type: 'picker', pickerKey: 'fertilizers', array: true },
            { key: 'uses_pesticides', label: 'Use pesticides?', type: 'picker', pickerKey: 'all_your_trees' },
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
    { key: 'num_trees', label: 'Trees', width: '15%' },
    { key: 'id', label: 'ID', width: '15%' },
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

const CustomInput = ({ label, value, onChangeText, keyboardType = 'default', editable = true }) => (
    <View style={{ marginBottom: 15 }}>
        {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
        <TextInput 
            value={value} 
            onChangeText={onChangeText} 
            keyboardType={keyboardType} 
            style={[styles.textInput, !editable && styles.readOnlyInput]} 
            editable={editable}
        />
    </View>
);

const CustomPicker = ({ label, selectedValue, onValueChange, items = [] }) => (
    <View style={{ marginBottom: 15 }}>
        {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
        <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedValue} onValueChange={onValueChange} style={styles.picker}>
                <Picker.Item label="-- Select --" value="" />
                {items.map((it) => (
                    <Picker.Item key={it.value ?? it} label={it.label ?? String(it)} value={it.value ?? it} />
                ))}
            </Picker>
        </View>
    </View>
);

const CustomToggle = ({ label, value, onValueChange }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingVertical: 5 }}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Switch value={!!value} onValueChange={onValueChange} trackColor={{ true: CoffeeColors.MEDIUM_BROWN }} thumbColor={value ? CoffeeColors.CREAM : '#fff'} />
    </View>
);

const CustomMultiSelect = ({ label, selectedValues = [], onValueChange, items = [] }) => {
    const [modalVisible, setModalVisible] = useState(false);

    const toggleSelection = (item) => {
        const newSelection = selectedValues.includes(item)
            ? selectedValues.filter(val => val !== item)
            : [...selectedValues, item];
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
                            {items.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.multiSelectItem}
                                    onPress={() => toggleSelection(item)}
                                >
                                    <Text style={styles.multiSelectItemText}>{item}</Text>
                                    <View style={styles.checkbox}>
                                        {selectedValues.includes(item) && (
                                            <Ionicons name="checkmark" size={16} color={CoffeeColors.MEDIUM_BROWN} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
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
    const [date, setDate] = useState(value ? new Date(value) : new Date());

    const handleDateChange = (event, selectedDate) => {
        setShowPicker(false);
        if (selectedDate) {
            setDate(selectedDate);
            onChange(selectedDate.toISOString().split('T')[0]); // Format as YYYY-MM-DD
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

const RecordsTable = ({ records = [], fields = [], title = '', onExit, onEdit }) => (
    <View style={styles.recordsContainer}>
        <View style={styles.tableHeaderSection}>
            <Text style={styles.tableTitle}>{title}</Text>
            <TouchableOpacity style={{ marginTop: 8 }} onPress={onExit}><Text style={styles.backToFormText}>← Back to form</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal style={styles.tableScrollHorizontal}>
            <View style={styles.table}>
                {/* Header */}
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    {fields.map(f => (<Text key={f.key} style={[styles.tableHeader, { width: f.width }]}>{f.label}</Text>))}
                    <Text style={[styles.tableHeader, { width: '10%' }]}>Actions</Text>
                </View>
                {/* Rows */}
                <ScrollView style={styles.tableScrollVertical}>
                    {records && records.length > 0 ? records.map((r, idx) => (
                        <View key={r.id ?? idx} style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowAlt : null]}>
                            {fields.map(f => (
                                <Text key={f.key} style={[styles.tableCell, { width: f.width }]}>{String(r[f.key] ?? r[f.key.replace(/_/g, '')] ?? '')}</Text>
                            ))}
                            <TouchableOpacity style={[styles.editRowBtn, { width: '10%' }]} onPress={() => onEdit && onEdit(r)}><Text style={styles.editRowText}>Edit</Text></TouchableOpacity>
                        </View>
                    )) : <Text style={styles.noRecords}>No records found</Text>}
                </ScrollView>
            </View>
        </ScrollView>
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


// ===============================================
// === 3. MAIN COMPONENT (POLISHED)            ===
// ===============================================

const AggregationScreen = ({ navigation, onNavigate: onNavigateProp }) => {
    // Ensure onNavigate exists for Header/BottomNav; fallback to navigation.navigate when available
    const onNavigate = onNavigateProp ?? ((screen) => { if (navigation && navigation.navigate) navigation.navigate(screen); });
    
    // --- State declarations ---
    const [farmersList, setFarmersList] = useState([]);
    const [harvestsList, setHarvestsList] = useState([]);
    const [farmerForm, setFarmerForm] = useState({
        first_name: '', last_name: '', gender: '', nin: '', date_of_birth: '', contact: '', email: '', in_cooperative: false, cooperative: '', started_farming: '',
        district: '', sub_county: '', parish: '', village: '', gps: '', nearest_landmark: '', uid: '',
        coffee_variety: '', no_of_trees: '', all_your_trees: false, other_farms: '', planted_date: '', spacing: '', land_ownership: '', deforested: false, seedling_source: '', seedling_type: '', practices: [], irrigation: '', fertilizers: [], uses_pesticides: false, pesticides: [],
    });
    const [harvestForm, setHarvestForm] = useState({ farmer_uid: '', farmer_name: '', weight_on_delivery: '', harvest_id: '', date_of_delivery: new Date().toISOString().slice(0,10), coffee_type: '', moisture_content: '', amount_paid: '', paid_by: '', number_of_bags: '' });

    const [farmerStep, setFarmerStep] = useState(0);
    const [harvestStep, setHarvestStep] = useState(0);
    const [viewMode, setViewMode] = useState('form');
    const [activeTab, setActiveTab] = useState('farmers');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const isSubmittingRef = useRef(false);
    // Placeholder for actual user ID from auth service
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
        setFarmerForm({
            first_name: '', last_name: '', gender: '', nin: '', date_of_birth: '', contact: '', email: '', in_cooperative: false, cooperative: '', started_farming: '',
            district: '', sub_county: '', parish: '', village: '', gps: '', nearest_landmark: '', uid: '',
            coffee_variety: '', no_of_trees: '', all_your_trees: false, other_farms: '', planted_date: '', spacing: '', land_ownership: '', deforested: false, seedling_source: '', seedling_type: '', practices: [], irrigation: '', fertilizers: [], uses_pesticides: false, pesticides: [],
        });

        setHarvestForm({
            farmer_uid: '', farmer_name: '', weight_on_delivery: '', harvest_id: '', date_of_delivery: new Date().toISOString().slice(0,10), coffee_type: '', moisture_content: '', amount_paid: '', paid_by: '', number_of_bags: '',
        });
        setFarmerStep(0);
        setHarvestStep(0);
    };

    const getFarmerDisplayName = (f) => {
        if (!f) return '';
        // Prioritize full name or explicit display name
        return f.name || f.full_name || f.farmer_name || f.displayName || `${f.first_name || ''} ${f.last_name || ''}`.trim();
    };

    // --- Submission Handlers ---
    const handleFarmerSubmit = async () => {
        if (!farmerForm.first_name || !farmerForm.contact || !userId) {
            Alert.alert("Validation", "Please ensure First name, Contact, and User ID are present.");
            return;
        }

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setLoading(true);

        const newRecordId = farmerForm.uid || generateRecordId('FD');
        const name = `${farmerForm.first_name} ${farmerForm.last_name}`.trim();
        const location = `${farmerForm.district || ''}${farmerForm.sub_county ? ', ' + farmerForm.sub_county : ''}`;
        
        // Final record object construction before sending
        const farmerRecord = {
            ...farmerForm, // Include all form fields
            name: name,
            uid: newRecordId,
            location: location,
            num_trees: parseInt(farmerForm.no_of_trees) || 0,
            recorder_id: userId,
            timestamp: Date.now(),
        };

        try {
            await submitFarmer(farmerRecord);
            setSuccessMessage(`Farmer '${name}' recorded successfully! UID: ${newRecordId}`);
            setViewMode('success');
            resetForms();
            await loadRecords(); 
        } catch (e) {
            console.error("Error adding farmer:", e);
            Alert.alert("Submission Failed", e.message || "Failed to save farmer details.");
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const handleHarvestSubmit = async () => {
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
        const setFormData = isFarmer ? setFarmerForm : setHarvestForm;
        const currentStepFields = steps[currentStep];

        const updateForm = (key, value) => {
            setFormData(p => ({ ...p, [key]: value }));
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
                if (f.special === 'generate_uid' && isFarmer) {
                    // Generate UID only if it hasn't been generated yet
                    if (!formData.uid) {
                        setFormData(p => ({ ...p, uid: generateRecordId('FD') }));
                        Alert.alert('UID Generated', 'Farmer UID created.');
                    }
                } else if (f.special === 'generate_harvest_id' && !isFarmer) {
                    if (!formData.harvest_id) {
                         setFormData(p => ({ ...p, harvest_id: generateRecordId('PA') }));
                         Alert.alert('ID Generated', 'Harvest ID created.');
                    }
                } else if (f.action === 'lookup' && !isFarmer) {
                    const farmerUID = formData.farmer_uid;
                    const found = farmersList.find(f => String(f.id) === String(farmerUID) || String(f.uid) === String(farmerUID));
                    if (found) {
                        setFormData(p => ({ ...p, farmer_name: getFarmerDisplayName(found) }));
                        Alert.alert('Farmer Found', `Name: ${getFarmerDisplayName(found)}`);
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

                {/* Form Fields */}
                <ScrollView style={styles.stepFormScroll}>
                    {currentStepFields.fields.map(field => {
                        // Handle conditional visibility
                        if (field.dependsOn && formData[field.dependsOn.field] !== field.dependsOn.value) {
                            return null;
                        }
                        
                        // Handle special case for UID/Harvest ID to show the generated value
                        const fieldValue = (field.special === 'generate_uid' || field.special === 'generate_harvest_id')
                            ? formData[field.key] || 'Press Next to Generate ID'
                            : (field.type === 'multi-select' ? (Array.isArray(formData[field.key]) && formData[field.key].length > 0 ? formData[field.key].join(', ') : '') : (field.array ? (Array.isArray(formData[field.key]) ? formData[field.key].join(', ') : '') : String(formData[field.key] ?? '')));

                        // Determine field type and render
                        if (field.type === 'toggle') {
                            return <CustomToggle key={field.key} label={field.label} value={!!formData[field.key]} onValueChange={(v) => updateForm(field.key, v)} />;
                        }
                        if (field.type === 'picker' && field.pickerKey === 'all_your_trees') {
                            // Special handling for yes/no picker
                            const yesNoItems = ['Yes', 'No'];
                            return <CustomPicker key={field.key} label={field.label} selectedValue={formData[field.key] ? 'Yes' : 'No'} onValueChange={(v) => updateForm(field.key, v === 'Yes')} items={yesNoItems} />;
                        }
                        if (field.type === 'multi-select') {
                            const items = PICKER_MAP[field.pickerKey] || [];
                            return <CustomMultiSelect key={field.key} label={field.label} selectedValues={formData[field.key] || []} onValueChange={(v) => updateForm(field.key, v)} items={items} />;
                        }
                        if (field.type === 'picker') {
                            let items = PICKER_MAP[field.pickerKey] || [];

                            // Special handling for parish picker - filter based on selected sub-county
                            if (field.pickerKey === 'parish' && formData.sub_county) {
                                items = PARISHES_BY_SUB_COUNTY[formData.sub_county] || [];
                            }

                            return <CustomPicker key={field.key} label={field.label} selectedValue={formData[field.key]} onValueChange={(v) => updateForm(field.key, v)} items={items} />;
                        }
                        if (field.type === 'date') {
                            return <CustomDatePicker key={field.key} label={`${field.label}${field.required ? ' *' : ''}`} value={formData[field.key]} onChange={(v) => updateForm(field.key, v)} />;
                        }

                        // Default to CustomInput
                        const handleTextChange = (v) => {
                            let processedValue = v;
                            if (field.keyboardType === 'numeric') {
                                // Allow decimal points for harvest weight/moisture
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
                <RecordsTable
                    records={farmersList}
                    fields={farmerTableFields}
                    title="Farmer Records"
                    onExit={() => setViewMode('form')}
                    onEdit={(r) => Alert.alert('Edit Farmer', `Edit functionality not implemented yet for: ${r.name}`)}
                />
            );
        } else {
            return (
                <RecordsTable
                    records={harvestsList}
                    fields={harvestTableFields}
                    title="Harvest Records"
                    onExit={() => setViewMode('form')}
                    onEdit={(r) => Alert.alert('Edit Harvest', `Edit functionality not implemented yet for: ${r.farmer_name}`)}
                />
            );
        }
    };
    
    // --- Screen Layout ---
    return (
        <View style={styles.screen}>
            <Header title="Aggregation & Data Entry" onNavigate={onNavigate} />
            <View style={styles.container}>
                
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
                <ScrollView contentContainerStyle={styles.contentContainer}>
                    {loading && viewMode !== 'table' && <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />}
                    
                    {viewMode === 'form' && renderFormContent()}
                    
                    {viewMode === 'table' && renderTableContent()}
                </ScrollView>
            </View>

            {/* Modals and Overlays */}
            {viewMode === 'success' && (
                <SuccessMessage 
                    message={successMessage} 
                    onExit={() => setViewMode('form')} 
                    onView={() => { setViewMode('table'); setSuccessMessage(''); }}
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
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 10,
        padding: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
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
    },
    stepFormScroll: {
        maxHeight: 450, 
        paddingRight: 10,
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
    // --- Table ---
    recordsContainer: {
        flex: 1,
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 10,
        elevation: 3,
        paddingBottom: 10,
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
    },
    backToFormText: {
        color: CoffeeColors.MEDIUM_BROWN,
        fontWeight: '600',
    },
    tableScrollHorizontal: {
        flexDirection: 'row',
    },
    tableScrollVertical: {
        // Enforce maximum height for vertical scrolling within horizontal container
        maxHeight: 350, 
    },
    table: {
        minWidth: 500, // Ensure minimum width for horizontal scroll
    },
    tableHeaderRow: {
        backgroundColor: CoffeeColors.CREAM,
        borderTopWidth: 1,
        borderTopColor: CoffeeColors.GRAY_TEXT_LIGHT,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_GRAY,
    },
    tableRowAlt: {
        backgroundColor: '#f9f9f9',
    },
    tableHeader: {
        fontWeight: 'bold',
        color: CoffeeColors.DARK_BROWN,
        paddingHorizontal: 5,
    },
    tableCell: {
        color: CoffeeColors.GRAY_TEXT,
        fontSize: 14,
        paddingHorizontal: 5,
    },
    editRowBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        borderRadius: 4,
        marginLeft: 10,
        alignItems: 'center',
    },
    editRowText: {
        color: CoffeeColors.WHITE,
        fontSize: 12,
        fontWeight: 'bold',
    },
    noRecords: {
        textAlign: 'center',
        padding: 20,
        color: CoffeeColors.GRAY_TEXT,
    },
    // --- Multi-Select Styles ---
    multiSelectButton: {
        borderWidth: 1,
        borderColor: CoffeeColors.GRAY_TEXT_LIGHT,
        borderRadius: 6,
        padding: 10,
        backgroundColor: CoffeeColors.WHITE,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    multiSelectText: {
        color: CoffeeColors.DARK_BROWN,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    multiSelectModal: {
        width: '80%',
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 10,
        padding: 20,
        maxHeight: '70%',
    },
    multiSelectScroll: {
        maxHeight: 300,
    },
    multiSelectItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_GRAY,
    },
    multiSelectItemText: {
        fontSize: 16,
        color: CoffeeColors.DARK_BROWN,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderColor: CoffeeColors.MEDIUM_BROWN,
        borderRadius: 3,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: CoffeeColors.WHITE,
    },
    modalCloseButton: {
        marginTop: 20,
        padding: 12,
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalCloseText: {
        color: CoffeeColors.WHITE,
        fontWeight: 'bold',
    },
});

export default AggregationScreen;