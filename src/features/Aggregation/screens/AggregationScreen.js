import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, Pressable, Switch, FlatList, KeyboardAvoidingView, Platform, LogBox } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';

// Suppress all console logs and warnings from appearing on the UI
// Logs will still appear in the terminal for debugging
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews',
  '[ApiService]',
  'Network Error',
]);
// Hide all yellow box warnings on screen
LogBox.ignoreAllLogs(true);

// --- UTILITIES AND THEME IMPORTS ---
// NOTE: Assuming these imports are correctly path-resolved in your environment
import AsyncStorage from '@react-native-async-storage/async-storage';
import Fonts from '../../../theme/fonts';
import CoffeeColors from '../../../theme/colors';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import SearchableStaffPicker from '../../../components/SearchableStaffPicker';
import CustomAlert from '../../../components/CustomAlert';
import HarvestActionMenu from '../../../components/HarvestActionMenu';
import { PICKER_MAP, PARISHES_BY_SUB_COUNTY } from '../../../utils/constants';
import { initializeAuth, generateRecordId, generateFarmerId, generateHarvestId, fetchFarmers, submitFarmer, fetchHarvests, submitHarvest, deleteFarmer, deleteHarvest, updateFarmer, updateHarvest } from '../../../utils/firebaseSetup';
import { formatNumberWithCommas, removeCommas, parseFormattedNumber } from '../../../utils/numberFormatter';
import { fetchCurrentFarmerPrice } from '../../../services/priceService';
import { syncAggregationRecords } from '../../../services/aggregationService';
import { getStaffById } from '../../../services/staffService';
// import { getSingleFieldMode, setSingleFieldMode } from '../../../utils/settings'; // Removed unused setting import

// ================================================
// === DASHBOARD COLOR PALETTE & TYPOGRAPHY ===
// ================================================
const PRIMARY_BROWN = CoffeeColors.PRIMARY_BROWN;
const DARK_BROWN = CoffeeColors.DARK_BROWN;
const LIGHT_BROWN = CoffeeColors.LIGHT_BROWN;
const VERY_LIGHT_BROWN = CoffeeColors.VERY_LIGHT_BROWN;
const CREAM_BG = CoffeeColors.CREAM;
const LIGHT_GRAY_BG = CoffeeColors.LIGHT_GRAY;
const BORDER_LIGHT = CoffeeColors.VERY_LIGHT_BROWN;
const TEXT_DARK = CoffeeColors.DARK_BROWN;
const TEXT_GRAY = CoffeeColors.GRAY_TEXT;


// ===============================================
// === 1. FORM & TABLE FIELD DEFINITIONS (NEW) ===
// ===============================================

// NOTE: Adjusted fields for better consistency (e.g., using 'Yes'/'No' for boolean pickers)

const farmerFieldDefinitions = [
    // Step 1: Personal Info
    {
        title: 'Personal Info',
        fields: [
            { key: 'first_name', label: 'First Name', keyboardType: 'default', required: true },
            { key: 'last_name', label: 'Last Name', keyboardType: 'default', required: true },
            { key: 'gender', label: 'Gender', type: 'picker', pickerKey: 'gender' },
            { key: 'nin', label: 'NIN', keyboardType: 'default', required: true },
            { key: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
            { key: 'contact', label: 'Phone Number', keyboardType: 'phone-pad', required: true, placeholder: 'Example: 0770123456' },
            { key: 'email', label: 'Email (optional)', keyboardType: 'email-address', placeholder: 'Example: johnkato@gmail.com' },
            { key: 'in_cooperative', label: 'Are you in a cooperative?', type: 'yes-no' },
            { key: 'cooperative', label: 'Cooperative Name', keyboardType: 'default', dependsOn: { field: 'in_cooperative', value: true } },
            { key: 'started_farming', label: 'When did you start coffee farming?', type: 'date', required: true },
        ]
    },
    // Step 2: Location & UID
    {
        title: 'Location & ID',
        fields: [
            { key: 'district', label: 'District', type: 'picker', pickerKey: 'district', required: true },
            { key: 'sub_county', label: 'Sub-county', type: 'picker', pickerKey: 'sub_county', required: true },
            // Parish will dynamically filter based on sub_county
            { key: 'parish', label: 'Parish', type: 'picker', pickerKey: 'parish', dynamic: true, required: true },
            { key: 'village', label: 'Village', keyboardType: 'default' },
            { key: 'gps', label: 'GPS Location (optional)', keyboardType: 'default' },
            { key: 'nearest_landmark', label: 'Nearest Landmark', keyboardType: 'default', required: true },
            { key: 'uid', label: 'Farmer UID (Generated)', special: 'generate_uid', readOnly: true },
        ]
    },
    // Step 3: Farm Details
    {
        title: 'Farm Details',
        fields: [
            { key: 'coffee_variety', label: 'Coffee Variety', type: 'picker', pickerKey: 'coffee_variety', required: true },
            { key: 'no_of_trees', label: 'Number of Trees', keyboardType: 'numeric', required: true },
            { key: 'all_your_trees', label: 'Are these all your trees?', type: 'yes-no', required: true },
            { key: 'other_farms', label: 'If no, which farms (location, owner)', keyboardType: 'default', dependsOn: { field: 'all_your_trees', value: false } },
            { key: 'planted_date', label: 'Date planted', type: 'date', required: true },
            { key: 'spacing', label: 'Spacing', type: 'picker', pickerKey: 'spacing', required: true },
            { key: 'land_ownership', label: 'Land Ownership', type: 'picker', pickerKey: 'land_ownership', required: true },
            { key: 'deforested', label: 'Has the land ever been deforested?', type: 'yes-no', required: true },
            { key: 'seedling_source', label: 'Source of seedlings', type: 'picker', pickerKey: 'seedling_source', required: true },
            { key: 'seedling_type', label: 'Type of seedlings', type: 'multi-select', pickerKey: 'seedling_type', required: true },
            { key: 'age_of_seedlings', label: 'Age of seedlings (Days)', keyboardType: 'numeric', required: true },
        ]
    },
    // Step 4: Practices & Chemicals
    {
        title: 'Farming Practices',
        fields: [
            { key: 'practices', label: 'Standard practices carried out', type: 'multi-select', pickerKey: 'practices', required: true },
            { key: 'irrigation', label: 'Irrigation source', type: 'picker', pickerKey: 'irrigation', required: true },
            { key: 'fertilizers', label: 'Fertilizers', type: 'picker', pickerKey: 'fertilizers', array: true, required: true },
            { key: 'uses_pesticides', label: 'Use pesticides?', type: 'yes-no', required: true },
            { key: 'pesticides', label: 'If yes, list pesticides (comma separated)', array: true, dependsOn: { field: 'uses_pesticides', value: true } },
        ]
    }
];

const harvestFieldDefinitions = [
    // Step 1: Farmer & Weight
    {
        title: "Harvest Details",
        fields: [
            { key: 'farmer_uid', label: 'Farmer UID', keyboardType: 'default', required: true, action: 'lookup' },
            { key: 'weight_on_delivery', label: 'Weight on Delivery (kg)', keyboardType: 'numeric', required: true },
            { key: 'location_of_delivery', label: 'Location on Delivery', keyboardType: 'default' },
            { key: 'gps_coordinates_delivery', label: 'GPS Coordinates', keyboardType: 'default', action: 'capture_gps' },
            { key: 'date_of_delivery', label: 'Date of Delivery', type: 'date', required: true },
        ]
    },
    // Step 2: Quality & Payment
    {
        title: 'Quality & Payment',
        fields: [
            { key: 'coffee_type', label: 'Coffee Type', type: 'picker', pickerKey: 'coffee_type', required: true },
            { key: 'price_per_kg', label: 'Price per Kg (UGX)', keyboardType: 'numeric', required: true },
            { key: 'amount_paid', label: 'Amount Paid (UGX)', keyboardType: 'numeric', readOnly: true, calculated: true },
            { key: 'paid_by', label: 'Paid By', type: 'searchable-staff', required: true },
            { key: 'harvest_id', label: 'Harvest ID (Generated)', special: 'generate_harvest_id', readOnly: true },
        ]
    }
];

const farmerTableFields = [
    { key: 'name', label: 'Name', width: '30%' },
    { key: 'contact', label: 'Contact', width: '20%' },
    { key: 'sub_county', label: 'Sub-county', width: '20%' },
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
// === GPS LOCATION HELPER ===
// ===============================================

/**
 * Get current device GPS location
 * @returns {Promise<string>} Formatted GPS string "latitude,longitude" or error message
 */
const getCurrentGPSLocation = async () => {
    try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            return 'Location permission denied. Please enable location access in settings.';
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        const { latitude, longitude } = location.coords;

        // Format as latitude,longitude with 4 decimal places
        const formattedGPS = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
        console.log('[GPS] Current location:', formattedGPS);

        return formattedGPS;
    } catch (error) {
        console.error('[GPS] Error getting location:', error);
        return `Error: ${error.message || 'Unable to get GPS location'}`;
    }
};

// ===============================================
// === 2. LIGHTWEIGHT LOCAL UI HELPERS (POLISHED)===
// ===============================================

const CustomInput = ({ label, value, onChangeText, keyboardType = 'default', editable = true, placeholder = '', error = '' }) => (
    <View style={{ marginBottom: 15 }}>
        {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
        <TextInput
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            style={[styles.textInput, !editable && styles.readOnlyInput, error && styles.errorInput]}
            editable={editable}
            placeholder={placeholder}
            placeholderTextColor={BORDER_LIGHT}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
);

/**
 * Capitalize first letter of a string
 */
const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return String(str).charAt(0).toUpperCase() + String(str).slice(1).toLowerCase();
};

const CustomPicker = ({ label, selectedValue, onValueChange, items = [] }) => {
    const [modalVisible, setModalVisible] = useState(false);

    const getSelectedLabel = () => {
        if (!selectedValue) return '-- Select --';
        const selected = items.find(it => (it.value ?? it) === selectedValue);
        return capitalizeFirstLetter(selected?.label ?? selectedValue ?? '-- Select --');
    };

    const handleSelect = (value) => {
        onValueChange(value);
        setModalVisible(false);
    };

    return (
        <View style={{ marginBottom: 15 }}>
            {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
            <View style={styles.pickerContainer}>
                <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setModalVisible(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={styles.pickerButtonText}>{getSelectedLabel()}</Text>
                    <Ionicons name="chevron-down" size={20} color={DARK_BROWN} />
                </TouchableOpacity>
                <Picker
                    selectedValue={selectedValue}
                    onValueChange={onValueChange}
                    style={styles.picker}
                >
                    <Picker.Item label="-- Select --" value="" />
                    {items.map((it, index) => {
                        const value = it.value ?? it;
                        const displayLabel = capitalizeFirstLetter(it.label ?? String(it));
                        return <Picker.Item key={index} label={displayLabel} value={value} />;
                    })}
                </Picker>
            </View>

            {/* Custom Modal Picker */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable style={styles.pickerModalContainer} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalPickerContent}>
                        <View style={styles.modalPickerHeader}>
                            <Text style={styles.modalPickerTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={DARK_BROWN} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={items}
                            keyExtractor={(_, index) => String(index)}
                            renderItem={({ item }) => {
                                const value = item.value ?? item;
                                const displayLabel = capitalizeFirstLetter(item.label ?? String(item));
                                const isSelected = value === selectedValue;

                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.modalPickerItem,
                                            isSelected && styles.modalPickerItemSelected
                                        ]}
                                        onPress={() => handleSelect(value)}
                                    >
                                        <Text style={[
                                            styles.modalPickerItemText,
                                            isSelected && styles.modalPickerItemTextSelected
                                        ]}>
                                            {displayLabel}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons name="checkmark" size={20} color={PRIMARY_BROWN} />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            scrollEnabled={true}
                        />
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

// Toggle component is now redundant with 'yes-no' picker logic but kept for safety/simplicity if needed elsewhere
const CustomToggle = ({ label, value, onValueChange }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingVertical: 5 }}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Switch value={!!value} onValueChange={onValueChange} trackColor={{ true: PRIMARY_BROWN }} thumbColor={value ? VERY_LIGHT_BROWN : '#fff'} />
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

    const displayValue = selectedValues.length > 0 ? selectedValues.join(', ') : 'Select seedling line';

    return (
        <View style={{ marginBottom: 15 }}>
            {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
            <TouchableOpacity
                style={styles.multiSelectButton}
                onPress={() => setModalVisible(true)}
            >
                <Text style={styles.multiSelectText}>{displayValue}</Text>
                <Ionicons name="chevron-down" size={20} color={PRIMARY_BROWN} />
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
                                                <Ionicons name="checkmark" size={16} color={PRIMARY_BROWN} />
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
                <Ionicons name="calendar" size={20} color={PRIMARY_BROWN} />
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

/**
 * AutocompleteInput - Provides autocomplete suggestions for farmer UID
 * Shows dropdown with matching farmers as user types
 */
const AutocompleteInput = ({ label, value, onChangeText, onSelect, suggestions = [], keyboardType = 'default', placeholder = '' }) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);

    // Filter suggestions based on input value
    useEffect(() => {
        if (value && value.length > 0) {
            const searchText = value.toLowerCase();
            const filtered = suggestions.filter(item => {
                const farmerId = (item.farmer_id || item.uid || item.id || '').toLowerCase();
                const farmerName = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
                const contact = (item.contact || '').toLowerCase();

                return farmerId.includes(searchText) || farmerName.includes(searchText) || contact.includes(searchText);
            }).slice(0, 5); // Limit to 5 suggestions

            setFilteredSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setFilteredSuggestions([]);
            setShowSuggestions(false);
        }
    }, [value, suggestions]);

    const handleSelect = (item) => {
        const selectedId = item.farmer_id || item.uid || item.id;
        onSelect(item, selectedId);
        setShowSuggestions(false);
    };

    return (
        <View style={{ marginBottom: 15, zIndex: 1000 }}>
            {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
            <TextInput
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                style={styles.textInput}
                placeholder={placeholder}
                placeholderTextColor={BORDER_LIGHT}
                onFocus={() => {
                    if (value && filteredSuggestions.length > 0) {
                        setShowSuggestions(true);
                    }
                }}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
                <View style={styles.autocompleteDropdown}>
                    <ScrollView style={styles.autocompleteScroll} nestedScrollEnabled={true}>
                        {filteredSuggestions.map((item, index) => {
                            const farmerId = item.farmer_id || item.uid || item.id;
                            const farmerName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unnamed';
                            const contact = item.contact || 'No contact';

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.autocompleteSuggestion}
                                    onPress={() => handleSelect(item)}
                                >
                                    <View>
                                        <Text style={styles.autocompleteName}>{farmerName}</Text>
                                        <Text style={styles.autocompleteDetails}>
                                            ID: {farmerId} | {contact}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={TEXT_GRAY} />
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.autocompleteClose}
                        onPress={() => setShowSuggestions(false)}
                    >
                        <Text style={styles.autocompleteCloseText}>Close</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const SuccessMessage = ({ message, onExit }) => (
    <View style={[styles.overlay]}>
        <View style={styles.modal}>
            <Text style={styles.modalTitle}>Success 🎉</Text>
            <Text style={styles.modalMessage}>{message}</Text>
            <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: TEXT_GRAY }]} onPress={onExit}><Text style={styles.modalButtonText}>Close</Text></TouchableOpacity>
            </View>
        </View>
    </View>
);

const StepIndicator = ({ currentStep, totalSteps, steps }) => {
    return (
        <View style={styles.stepIndicatorContainer}>
            {/* Step Circles and Connectors */}
            <View style={styles.stepCirclesContainer}>
                {steps && steps.length > 0 ? steps.map((step, index) => (
                    <View key={index} style={styles.stepItemWrapper}>
                        {/* Step Circle */}
                        <View style={[
                            styles.stepCircle,
                            index < currentStep && styles.stepCircleCompleted,
                            index === currentStep - 1 && styles.stepCircleActive
                        ]}>
                            <Text style={[
                                styles.stepCircleText,
                                (index < currentStep || index === currentStep - 1) && styles.stepCircleTextActive
                            ]}>
                                {index + 1}
                            </Text>
                        </View>

                        {/* Connector Line (except for last step) */}
                        {index < steps.length - 1 && (
                            <View style={[
                                steps.length === 2 ? styles.stepConnectorTwoStep : styles.stepConnector,
                                index < currentStep - 1 && (steps.length === 2 ? styles.stepConnectorTwoStepActive : styles.stepConnectorActive)
                            ]} />
                        )}
                    </View>
                )) : null}
            </View>

            {/* Step Labels */}
            <View style={styles.stepLabelsContainer}>
                {steps && steps.length > 0 ? steps.map((step, index) => (
                    <View key={index} style={styles.stepLabelWrapper}>
                        <Text style={[
                            styles.stepLabel,
                            (index < currentStep || index === currentStep - 1) && styles.stepLabelActive
                        ]}>
                            {step.title}
                        </Text>
                    </View>
                )) : null}
            </View>
        </View>
    );
};

// --- NEW/REPLACED Table Component: Searchable Data List ---
const SearchableDataList = ({ records = [], fields = [], title = '', onExit, onEdit, onDelete, onSyncDraft, onVoucher, isFarmer, farmersList = [], onHarvestAction }) => {
    const [searchText, setSearchText] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Generate autocomplete suggestions based on search text
    const suggestions = useMemo(() => {
        if (!searchText || searchText.trim() === '') {
            return [];
        }

        const safeRecords = Array.isArray(records) ? records : [];
        const lowerSearch = searchText.toLowerCase().trim();
        const suggestionSet = new Set();
        const suggestionList = [];

        safeRecords.forEach(record => {
            if (isFarmer) {
                // For farmers: suggest names and contact
                const firstName = record.first_name ? record.first_name.toLowerCase() : '';
                const lastName = record.last_name ? record.last_name.toLowerCase() : '';
                const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim();
                const contact = record.contact ? record.contact.toLowerCase() : '';

                // Check for matches
                if (firstName.includes(lowerSearch) || lastName.includes(lowerSearch) || contact.includes(lowerSearch)) {
                    if (fullName && !suggestionSet.has(fullName)) {
                        suggestionSet.add(fullName);
                        suggestionList.push({
                            name: fullName,
                            subtitle: contact || record.farmer_id || record.id,
                            record
                        });
                    }
                }
            } else {
                // For harvests: suggest farmer names
                const farmerUID = record.name || record.farmer_uid;
                const farmer = Array.isArray(farmersList) ? farmersList.find(f =>
                    String(f.farmer_id) === String(farmerUID) ||
                    String(f.uid) === String(farmerUID) ||
                    String(f.id) === String(farmerUID)
                ) : null;

                if (farmer) {
                    const farmerName = `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim();
                    const farmerNameLower = farmerName.toLowerCase();
                    if (farmerNameLower.includes(lowerSearch) && !suggestionSet.has(farmerName)) {
                        suggestionSet.add(farmerName);
                        suggestionList.push({
                            name: farmerName,
                            subtitle: `Harvest: ${record.date_of_delivery || 'N/A'}`,
                            record
                        });
                    }
                }
            }
        });

        return suggestionList.slice(0, 5); // Limit to 5 suggestions
    }, [searchText, records, isFarmer, farmersList]);

    // Filtering logic based on search text across all listed fields
    // FIXED: Ensure records is always an array to prevent .filter() errors
    // FEATURE: Sort by newest first and show last 10 records
    const filteredRecords = useMemo(() => {
        const safeRecords = Array.isArray(records) ? records : [];

        // Sort by timestamp/id (newest first) - assumes records have timestamp or id field
        const sortedRecords = [...safeRecords].sort((a, b) => {
            // Try to sort by timestamp first
            if (a.timestamp && b.timestamp) {
                return b.timestamp - a.timestamp;
            }
            // Try to sort by date_of_delivery for harvests (newest first)
            if (a.date_of_delivery && b.date_of_delivery) {
                return new Date(b.date_of_delivery) - new Date(a.date_of_delivery);
            }
            // Try to sort by created_at or updated_at
            if (a.created_at && b.created_at) {
                return new Date(b.created_at) - new Date(a.created_at);
            }
            if (a.updated_at && b.updated_at) {
                return new Date(b.updated_at) - new Date(a.updated_at);
            }
            // Fallback: sort by ID (assuming higher ID = newer)
            if (a.id && b.id) {
                return String(b.id).localeCompare(String(a.id));
            }
            return 0;
        });

        // If no search text, return first 10 records (newest)
        if (!searchText || searchText.trim() === '') {
            return sortedRecords.slice(0, 10);
        }

        // If searching, filter and return up to 10 matching records
        const lowerSearch = searchText.toLowerCase().trim();
        const filtered = sortedRecords.filter(record => {
            // For farmers: search in first_name, last_name, contact, district, farmer_id, uid
            if (isFarmer) {
                const searchableText = [
                    record.first_name,
                    record.last_name,
                    `${record.first_name} ${record.last_name}`,
                    record.contact,
                    record.district,
                    record.farmer_id,
                    record.uid,
                    record.id
                ].filter(Boolean).join(' ').toLowerCase();

                return searchableText.includes(lowerSearch);
            } else {
                // For harvests: search in farmer UID and lookup farmer name
                const farmerUID = record.name || record.farmer_uid;
                const farmer = Array.isArray(farmersList) ? farmersList.find(f =>
                    String(f.farmer_id) === String(farmerUID) ||
                    String(f.uid) === String(farmerUID) ||
                    String(f.id) === String(farmerUID)
                ) : null;

                const farmerName = farmer ? `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() : '';
                const searchableText = [
                    farmerName,
                    farmerUID,
                    record.id,
                    record.date_of_delivery,
                    record.paid_by
                ].filter(Boolean).join(' ').toLowerCase();

                return searchableText.includes(lowerSearch);
            }
        });

        return filtered.slice(0, 10);
    }, [records, fields, searchText, isFarmer, farmersList]);
    
    // Renders the summary row for the FlatList
    const renderItem = ({ item }) => {
        // For farmers: compute name from first_name + last_name if 'name' field doesn't exist
        // For harvests: lookup farmer name from farmersList using the UID/name field
        let displayName = 'N/A';
        let displayId = 'No ID';

        if (isFarmer) {
            // Farmer record - construct name from first_name and last_name
            displayName = item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'N/A';
            displayId = item.uid || item.farmer_id || item.id || 'No ID';
        } else {
            // Harvest record - lookup farmer name and ID from the farmers list
            // Django returns farmer UID in the 'name' field, so we need to find the actual farmer
            const farmerUID = item.name || item.farmer_name || item.farmer_uid;
            if (farmerUID && Array.isArray(farmersList)) {
                // Try to find the farmer in the farmers list
                const farmer = farmersList.find(f => {
                    // Construct full name from farmer record
                    const farmerFullName = `${f.first_name || ''} ${f.last_name || ''}`.trim();

                    return (
                        String(f.farmer_id) === String(farmerUID) ||
                        String(f.uid) === String(farmerUID) ||
                        String(f.id) === String(farmerUID) ||
                        farmerFullName === String(farmerUID)  // Match by full name
                    );
                });

                if (farmer) {
                    displayName = `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() || farmer.name || farmerUID;
                } else {
                    // Farmer not found in list, just show the UID
                    displayName = farmerUID;
                }
            } else {
                displayName = farmerUID || 'N/A';
            }
            // For harvest records, always display the harvest ID (not farmer ID)
            displayId = item.harvest_id || item.id || 'No ID';
        }

        const secondKey = fields.length > 1 ? fields[1].key : null;
        const thirdKey = fields.length > 2 ? fields[2].key : null;

        // Check if this is a harvest record (not a farmer record)
        const isHarvest = !isFarmer;

        return (
            <View style={[styles.dataListItem, item._isDraft && styles.draftListItem, !item._isDraft && !item._isSynced && styles.pendingListItem]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => onEdit(item)} activeOpacity={0.7}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Text style={styles.dataListItemTitle}>
                                {String(displayName)}
                            </Text>
                            {isHarvest ? (
                                <TouchableOpacity
                                    onPress={() => {
                                        console.log('[AggregationScreen] Harvest ID tapped:', displayId);
                                        if (onHarvestAction) {
                                            onHarvestAction(item);
                                        }
                                    }}
                                    style={styles.harvestIdButton}
                                    activeOpacity={0.6}
                                >
                                    <Text style={styles.dataListItemUID}> ({displayId})</Text>
                                    <Ionicons name="chevron-down-circle" size={16} color={PRIMARY_BROWN} style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                            ) : (
                                <Text style={styles.dataListItemUID}> ({displayId})</Text>
                            )}
                        </View>
                        {/* Draft Badge - Shows only for incomplete draft records */}
                        {item._isDraft && (
                            <View style={styles.draftBadge}>
                                <Text style={styles.draftBadgeText}>DRAFT</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.dataListItemSubtitle}>
                        {secondKey ? `${fields[1].label}: ${item[secondKey] || 'N/A'}` : ''}
                        {thirdKey ? ` | ${fields[2].label}: ${item[thirdKey] || 'N/A'}` : ''}
                    </Text>
                    {/* Show draft step if it's a draft */}
                    {item._isDraft && (
                        <Text style={styles.draftStepText}>
                            Saved at: {item._draftStepTitle || 'Unknown Step'}
                        </Text>
                    )}
                    {/* Pending Status - Shows for submitted but unsynced records */}
                    {!item._isDraft && !item._isSynced && (
                        <View style={styles.syncStatusInline}>
                            <Ionicons name="cloud-upload-outline" size={14} color={LIGHT_BROWN} />
                            <Text style={[styles.syncStatusText, { color: LIGHT_BROWN }]}>Pending</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Edit, Sync Draft (if draft), Voucher (for harvests), and Delete Icon Buttons */}
                <View style={styles.recordActions}>
                    {/* Sync Draft Button - Only shows for draft records */}
                    {item._isDraft && onSyncDraft && (
                        <TouchableOpacity
                            style={[styles.iconButton, styles.syncButton]}
                            onPress={() => {
                                onSyncDraft(item); // Sync draft to database
                            }}
                        >
                            <Ionicons name="cloud-upload-outline" size={20} color="#4CAF50" />
                        </TouchableOpacity>
                    )}

                    {/* Voucher Button - Only shows for harvest records */}
                    {!isFarmer && onVoucher && (
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => {
                                onVoucher(item);
                            }}
                        >
                            <Ionicons name="document-text" size={20} color={PRIMARY_BROWN} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => {
                            onEdit(item, true); // Pass true to indicate edit mode vs view mode
                        }}
                    >
                        <Ionicons name="pencil" size={20} color={PRIMARY_BROWN} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => {
                            onDelete(item);
                        }}
                    >
                        <Ionicons name="trash" size={20} color={'#d32f2f' || '#d32f2f'} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.recordsContainer}>
            <View style={styles.tableHeaderSection}>
                <Text style={styles.tableTitle}>{title}</Text>

                {/* Search field with autocomplete suggestions */}
                <View style={{ position: 'relative', zIndex: 100 }}>
                    <View style={styles.searchContainer}>
                        <View style={{ flex: 1 }}>
                            <CustomInput
                                placeholder="Search by name, ID, or contact..."
                                value={searchText}
                                onChangeText={(text) => {
                                    setSearchText(text);
                                    setShowSuggestions(text.trim().length > 0 && suggestions.length > 0);
                                }}
                                onFocus={() => {
                                    setShowSuggestions(searchText.trim().length > 0 && suggestions.length > 0);
                                }}
                                onBlur={() => {
                                    // Delay hiding to allow selection
                                    setTimeout(() => setShowSuggestions(false), 200);
                                }}
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={() => {/* Search is automatic via useMemo */}}
                        >
                            <Ionicons name="search" size={22} color={'#fff'} />
                        </TouchableOpacity>
                    </View>

                    {/* Autocomplete suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <View style={[styles.suggestionsDropdown, { maxHeight: 250 }]}>
                            <FlatList
                                data={suggestions}
                                keyExtractor={(item, index) => `${item.name}-${index}`}
                                scrollEnabled={suggestions.length > 4}
                                nestedScrollEnabled={true}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.suggestionItem}
                                        onPress={() => {
                                            setSearchText(item.name);
                                            setShowSuggestions(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.suggestionName}>{item.name}</Text>
                                            <Text style={styles.suggestionSubtitle}>{item.subtitle}</Text>
                                        </View>
                                        <Ionicons name="arrow-forward" size={16} color={PRIMARY_BROWN} />
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: PRIMARY_BROWN, flex: 1, marginRight: 8 }]}
                        onPress={onExit}
                    >
                        <Ionicons name="add-circle" size={20} color={CoffeeColors.CREAM} style={{ marginRight: 8 }} />
                        <Text style={styles.actionButtonText}>Add {isFarmer ? 'Farmer' : 'Harvest'}</Text>
                    </TouchableOpacity>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text style={styles.recordCount}>{filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}</Text>
                    </View>
                </View>
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
// === 3. FARMER DETAIL VIEW COMPONENT        ===
// ===============================================

/**
 * FarmerDetailView - Mobile-friendly detail screen for viewing farmer information
 * Displays all farmer data organized in logical sections with proper labels
 */
const FarmerDetailView = ({ farmer, onBack }) => {
    if (!farmer) return null;

    // Helper to format field values properly
    const formatValue = (value) => {
        if (value === null || value === undefined || value === '') return 'Not provided';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Not provided';
        return String(value);
    };

    // Field sections for organized display
    const sections = [
        {
            title: 'Personal Information',
            fields: [
                { label: 'Full Name', value: `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() },
                { label: 'Farmer ID', value: farmer.farmer_id || farmer.uid || farmer.id },
                { label: 'Gender', value: farmer.gender },
                { label: 'Date of Birth', value: farmer.date_of_birth },
                { label: 'NIN', value: farmer.nin },
                { label: 'Contact', value: farmer.contact },
                { label: 'Email', value: farmer.email },
            ]
        },
        {
            title: 'Location Details',
            fields: [
                { label: 'District', value: farmer.district },
                { label: 'Sub-county', value: farmer.sub_county },
                { label: 'Parish', value: farmer.parish },
                { label: 'Village', value: farmer.village },
                { label: 'GPS Coordinates', value: farmer.gps_coordinates || farmer.gps },
                { label: 'Nearest Landmark', value: farmer.nearest_landmark },
            ]
        },
        {
            title: 'Farm Information',
            fields: [
                { label: 'Coffee Variety', value: farmer.coffee_variety },
                { label: 'Number of Trees', value: farmer.number_of_trees },
                { label: 'Owns All Trees', value: farmer.ownership_of_trees },
                { label: 'Date Planted', value: farmer.planted_date },
                { label: 'Spacing Between Trees', value: farmer.spacing_between_trees || farmer.spacing },
                { label: 'Land Ownership', value: farmer.land_ownership },
                { label: 'Started Farming Year', value: farmer.started_coffee_farming_year },
            ]
        },
        {
            title: 'Seedling Information',
            fields: [
                { label: 'Source of Seedlings', value: farmer.source_of_seedlings || farmer.seedling_source },
                { label: 'Type of Seedlings', value: farmer.type_of_seedlings || farmer.seedling_type },
                { label: 'Age of Seedlings', value: farmer.age_of_seedlings },
            ]
        },
        {
            title: 'Farming Practices',
            fields: [
                { label: 'Standard Practices', value: farmer.standard_practices },
                { label: 'Irrigation Source', value: farmer.irrigation_source || farmer.irrigation },
                { label: 'Fertilizers Used', value: farmer.fertilizers },
                { label: 'Pesticides Used', value: farmer.pesticide || farmer.pesticides },
                { label: 'Deforestation Status', value: farmer.defforestation_status || farmer.deforested },
            ]
        }
    ];

    return (
        <View style={styles.detailViewContainer}>
            {/* Header with back button */}
            <View style={styles.detailHeader}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={DARK_BROWN} />
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>Farmer Details</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Scrollable content */}
            <ScrollView style={styles.detailScrollView} contentContainerStyle={styles.detailContent}>
                {/* Farmer Name Card */}
                <View style={styles.detailNameCard}>
                    <Text style={styles.detailFarmerName}>
                        {`${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() || 'Unnamed Farmer'}
                    </Text>
                    <Text style={styles.detailFarmerId}>
                        ID: {farmer.farmer_id || farmer.uid || farmer.id || 'N/A'}
                    </Text>
                </View>

                {/* Information Sections */}
                {sections.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>{section.title}</Text>
                        {section.fields.map((field, fieldIndex) => (
                            <View key={fieldIndex} style={styles.detailFieldRow}>
                                <Text style={styles.detailFieldLabel}>{field.label}:</Text>
                                <Text style={styles.detailFieldValue}>{formatValue(field.value)}</Text>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

// ===============================================
// === 3B. HARVEST DETAIL VIEW COMPONENT      ===
// ===============================================

/**
 * HarvestDetailView - Mobile-friendly detail screen for viewing harvest information
 * Displays all harvest data organized in logical sections with proper labels
 */
const HarvestDetailView = ({ harvest, onBack, farmersList }) => {
    if (!harvest) return null;

    // Helper to format field values properly
    const formatValue = (value) => {
        if (value === null || value === undefined || value === '') return 'Not provided';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Not provided';
        return String(value);
    };

    // Lookup farmer details from farmersList using the harvest.name field (which contains farmer's full name)
    const harvestFarmerName = harvest.name || harvest.farmer_uid;
    let farmerDetails = null;
    let farmerUID = null;
    if (harvestFarmerName && Array.isArray(farmersList)) {
        // Try multiple lookup strategies
        farmerDetails = farmersList.find(f => {
            // Construct full name from farmer record
            const farmerFullName = `${f.first_name || ''} ${f.last_name || ''}`.trim();

            return (
                String(f.farmer_id) === String(harvestFarmerName) ||
                String(f.uid) === String(harvestFarmerName) ||
                String(f.id) === String(harvestFarmerName) ||
                String(f.name) === String(harvestFarmerName) ||
                farmerFullName === String(harvestFarmerName)  // Match by full name
            );
        });

        // Set farmerUID to the actual farmer_id from the matched farmer record
        if (farmerDetails) {
            farmerUID = farmerDetails.farmer_id || farmerDetails.uid || farmerDetails.id;
        }

        // Log for debugging
        if (!farmerDetails) {
            console.warn('[HarvestDetailView] Farmer not found for name:', harvestFarmerName);
            console.log('[HarvestDetailView] Available farmers:', farmersList.map(f => ({
                farmer_id: f.farmer_id,
                full_name: `${f.first_name || ''} ${f.last_name || ''}`.trim(),
                uid: f.uid,
                id: f.id
            })));
        }
    }

    const farmerDisplayName = farmerDetails
        ? `${farmerDetails.first_name || ''} ${farmerDetails.last_name || ''}`.trim()
        : 'Unknown Farmer';

    // Helper function to get staff name from ID using staff service
    const [staffNameCache, setStaffNameCache] = useState({});

    useEffect(() => {
        const fetchStaffNames = async () => {
            if (harvest?.paid_by && !staffNameCache[harvest.paid_by]) {
                try {
                    const staff = await getStaffById(harvest.paid_by);
                    if (staff) {
                        setStaffNameCache(prev => ({
                            ...prev,
                            [harvest.paid_by]: staff.displayName || staff.firstName + ' ' + staff.lastName || 'Unknown Staff'
                        }));
                    }
                } catch (error) {
                    console.error('[HarvestDetailView] Error fetching staff name:', error);
                }
            }
        };
        fetchStaffNames();
    }, [harvest?.paid_by, staffNameCache]);

    const getStaffNameById = (staffId) => {
        if (!staffId) return 'Not provided';
        // Check cache first
        if (staffNameCache[staffId]) {
            return staffNameCache[staffId];
        }
        // Fallback to showing the ID if not in cache yet
        return 'Loading...';
    };

    // Field sections for organized display
    // Only display fields that are actually in the harvest form
    // Match exact field names from the API response
    const sections = [
        {
            title: 'Farmer Information',
            fields: [
                { label: 'Farmer Name', value: farmerDisplayName || harvest.name },
                { label: 'Farmer ID', value: farmerUID || harvest.farmer_uid },
                { label: 'Contact', value: farmerDetails?.contact || 'Not available' },
                { label: 'District', value: farmerDetails?.district || 'Not available' },
            ]
        },
        {
            title: 'Harvest Details',
            fields: [
                { label: 'Harvest ID', value: formatValue(harvest.harvest_id || harvest.id || harvest.code) },
                { label: 'Date of Delivery', value: formatValue(harvest.date_of_delivery) },
                { label: 'Weight on Delivery', value: harvest.weight_on_delivery ? `${harvest.weight_on_delivery} kg` : 'Not provided' },
                { label: 'Location on Delivery', value: formatValue(harvest.location_of_delivery || harvest.location_on_delivery) },
                { label: 'GPS Coordinates', value: harvest.gps_coordinates_delivery || harvest.gps_coordinates || 'Not captured' },
            ]
        },
        {
            title: 'Coffee Information',
            fields: [
                { label: 'Coffee Type', value: harvest.coffee_type || 'Not provided' },
            ]
        },
        {
            title: 'Payment Information',
            fields: [
                { label: 'Price per kg', value: harvest.price_per_kg ? `UGX ${Number(harvest.price_per_kg).toLocaleString()}` : 'Not provided' },
                { label: 'Amount Paid', value: harvest.amount_paid ? `UGX ${Number(harvest.amount_paid).toLocaleString()}` : 'Not provided' },
                { label: 'Paid By', value: getStaffNameById(harvest.paid_by) },
            ]
        }
    ];

    return (
        <View style={styles.detailViewContainer}>
            {/* Header with back button */}
            <View style={styles.detailHeader}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={DARK_BROWN} />
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>Harvest Details</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Scrollable content */}
            <ScrollView style={styles.detailScrollView} contentContainerStyle={styles.detailContent}>
                {/* Harvest ID Card */}
                <View style={styles.detailNameCard}>
                    <Text style={styles.detailFarmerName}>
                        {farmerDisplayName}
                    </Text>
                    <Text style={styles.detailFarmerId}>
                        Harvest ID: {harvest.id || harvest.harvest_id || 'N/A'}
                    </Text>
                </View>

                {/* Information Sections */}
                {sections.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>{section.title}</Text>
                        {section.fields.map((field, fieldIndex) => (
                            <View key={fieldIndex} style={styles.detailFieldRow}>
                                <Text style={styles.detailFieldLabel}>{field.label}:</Text>
                                <Text style={styles.detailFieldValue}>{formatValue(field.value)}</Text>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

// ===============================================
// === 4. MAIN COMPONENT (POLISHED)            ===
// ===============================================

const AggregationScreen = ({ navigation, route, onNavigate: onNavigateProp }) => {
    const onNavigate = onNavigateProp ?? ((screen) => { if (navigation && navigation.navigate) navigation.navigate(screen); });

    // --- State declarations ---
    const [farmersList, setFarmersList] = useState([]);
    const [harvestsList, setHarvestsList] = useState([]);
    // Simplified initial state to ensure 'yes-no' fields are correctly initialized as booleans
    const [farmerForm, setFarmerForm] = useState({
        first_name: '', last_name: '', gender: '', nin: '', date_of_birth: '', contact: '', email: '', in_cooperative: false, cooperative: '', started_farming: '',
        district: '', sub_county: '', parish: '', village: '', gps: '', nearest_landmark: '', uid: '',
        coffee_variety: '', no_of_trees: '', all_your_trees: false, other_farms: '', planted_date: '', spacing: '', land_ownership: '', deforested: false, seedling_source: '', seedling_type: [], age_of_seedlings: '', practices: [], irrigation: '', fertilizers: [], uses_pesticides: false, pesticides: [],
    });
    const [harvestForm, setHarvestForm] = useState({ farmer_uid: '', farmer_name: '', weight_on_delivery: '', location_of_delivery: '', gps_coordinates_delivery: '', harvest_id: '', date_of_delivery: new Date().toISOString().slice(0,10), coffee_type: '', price_per_kg: '4,600', amount_paid: '', paid_by: '', selectedStaff: null });

    const [farmerStep, setFarmerStep] = useState(0);
    const [harvestStep, setHarvestStep] = useState(0);
    const [viewMode, setViewMode] = useState('table'); // CHANGED: Show records first instead of form
    const [activeTab, setActiveTab] = useState('farmers');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const isSubmittingRef = useRef(false);
    const paramsProcessedRef = useRef(false);
    const [userId, setUserId] = useState('user123');

    // NEW: State for detail view
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [selectedHarvest, setSelectedHarvest] = useState(null);

    // State for unsynced records count
    const [unsyncedCount, setUnsyncedCount] = useState(0);

    // State for sync status message
    const [syncStatus, setSyncStatus] = useState('');

    // State for custom alert modal
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', buttons: [] });

    // State for sync loading indicator
    const [isSyncing, setIsSyncing] = useState(false);

    // State for validation errors
    const [farmerErrors, setFarmerErrors] = useState({});
    const [harvestErrors, setHarvestErrors] = useState({});

    // State for current farmer price
    const [currentFarmerPrice, setCurrentFarmerPrice] = useState(null);
    const [isPriceLoading, setIsPriceLoading] = useState(false);

    // State for harvest action menu
    const [actionMenuVisible, setActionMenuVisible] = useState(false);
    const [selectedHarvestForAction, setSelectedHarvestForAction] = useState(null);

    // Handle navigation params from Dashboard quick actions
    useEffect(() => {
        if (route?.params?.activeTab || route?.params?.viewMode) {
            if (!paramsProcessedRef.current) {
                paramsProcessedRef.current = true;
                const { activeTab: tab, viewMode: mode } = route.params;
                if (tab) setActiveTab(tab);
                if (mode) setViewMode(mode);
                // Clear params after handling to prevent re-triggering
                navigation.setParams({ activeTab: undefined, viewMode: undefined });
            }
        } else {
            // Reset the flag when params are cleared
            paramsProcessedRef.current = false;
        }
    }, [route?.params?.activeTab, route?.params?.viewMode, navigation]);

    // --- Data Loading and Initialization ---
    const loadRecords = async () => {
        console.log('[loadRecords] ========== FETCHING RECORDS ==========');
        setLoading(true);
        try {
            // Fetch submitted farmers from backend
            const f = await fetchFarmers();
            console.log('[loadRecords] Fetched farmers count:', Array.isArray(f) ? f.length : 0);
            console.log('[loadRecords] First 3 farmers:', Array.isArray(f) ? f.slice(0, 3) : 'Not an array');
            console.log('[loadRecords] Full farmers response:', JSON.stringify(f, null, 2));

            // Mark backend farmers as synced (not drafts, not pending)
            const syncedFarmers = Array.isArray(f) ? f.map(farmer => ({
                ...farmer,
                _isDraft: false,
                _isSynced: true
            })) : [];

            // Load farmer drafts from AsyncStorage
            const farmerDraftsJson = await AsyncStorage.getItem('farmer_drafts');
            const farmerDrafts = farmerDraftsJson ? JSON.parse(farmerDraftsJson) : [];
            console.log('[loadRecords] Loaded farmer drafts count:', farmerDrafts.length);

            // Log any farmer drafts that claim to be synced (this shouldn't happen)
            const incorrectlySyncedFarmerDrafts = farmerDrafts.filter(f => f._isSynced === true);
            if (incorrectlySyncedFarmerDrafts.length > 0) {
                console.warn('[loadRecords] ⚠️ Found farmer drafts incorrectly marked as synced:', incorrectlySyncedFarmerDrafts.map(f => f.uid || f.farmer_id || f.id));
            }

            // Create a Set of farmer IDs that exist in backend (truly synced)
            const backendFarmerIds = new Set(syncedFarmers.map(f => f.uid || f.farmer_id || f.id));

            // Filter out any drafts that already exist in backend (avoid duplicates)
            // Also ensure remaining drafts are marked as not synced
            const uniqueFarmerDrafts = farmerDrafts
                .filter(draft => {
                    const draftId = draft.uid || draft.farmer_id || draft.id;
                    if (backendFarmerIds.has(draftId)) {
                        console.log(`[loadRecords] Removing duplicate draft for farmer ${draftId} (already in backend)`);
                        return false;
                    }
                    return true;
                })
                .map(draft => ({
                    ...draft,
                    // Ensure drafts are not marked as synced if they're still in AsyncStorage
                    _isSynced: false
                }));

            console.log('[loadRecords] Unique farmer drafts after deduplication:', uniqueFarmerDrafts.length);

            // If we removed duplicates, update AsyncStorage
            if (uniqueFarmerDrafts.length !== farmerDrafts.length) {
                console.log('[loadRecords] Cleaning up farmer duplicates in AsyncStorage...');
                if (uniqueFarmerDrafts.length > 0) {
                    await AsyncStorage.setItem('farmer_drafts', JSON.stringify(uniqueFarmerDrafts));
                } else {
                    await AsyncStorage.removeItem('farmer_drafts');
                }
                console.log('[loadRecords] ✓ Farmer drafts cleaned up');
            }

            // Combine synced farmers from backend and local drafts
            const allFarmers = [...syncedFarmers, ...uniqueFarmerDrafts];
            console.log('[loadRecords] Total farmers (submitted + drafts):', allFarmers.length);
            setFarmersList(allFarmers);

        } catch (e) {
            console.error('[loadRecords] Failed to load farmers:', e);
            console.error('[loadRecords] Error details:', JSON.stringify(e, null, 2));
            setFarmersList([]);
        }
        try {
            // Fetch submitted harvests from backend
            const h = await fetchHarvests();
            console.log('[loadRecords] Fetched harvests count:', Array.isArray(h) ? h.length : 0);

            // Mark backend harvests as synced (not drafts, not pending)
            const syncedHarvests = Array.isArray(h) ? h.map(harvest => ({
                ...harvest,
                _isDraft: false,
                _isSynced: true
            })) : [];

            // Load harvest drafts from AsyncStorage
            const harvestDraftsJson = await AsyncStorage.getItem('harvest_drafts');
            const harvestDrafts = harvestDraftsJson ? JSON.parse(harvestDraftsJson) : [];
            console.log('[loadRecords] Loaded harvest drafts count:', harvestDrafts.length);

            // Log any harvest drafts that claim to be synced (this shouldn't happen)
            const incorrectlySyncedDrafts = harvestDrafts.filter(h => h._isSynced === true);
            if (incorrectlySyncedDrafts.length > 0) {
                console.warn('[loadRecords] ⚠️ Found harvest drafts incorrectly marked as synced:', incorrectlySyncedDrafts.map(h => h.harvest_id || h.id));
            }

            // Create a Set of harvest IDs that exist in backend (truly synced)
            const backendHarvestIds = new Set(syncedHarvests.map(h => h.harvest_id || h.id));

            // Filter out any drafts that already exist in backend (avoid duplicates)
            // Also ensure remaining drafts are marked as not synced
            const uniqueHarvestDrafts = harvestDrafts
                .filter(draft => {
                    const draftId = draft.harvest_id || draft.id;
                    if (backendHarvestIds.has(draftId)) {
                        console.log(`[loadRecords] Removing duplicate draft for harvest ${draftId} (already in backend)`);
                        return false;
                    }
                    return true;
                })
                .map(draft => ({
                    ...draft,
                    // Ensure drafts are not marked as synced if they're still in AsyncStorage
                    _isSynced: false
                }));

            console.log('[loadRecords] Unique harvest drafts after deduplication:', uniqueHarvestDrafts.length);

            // If we removed duplicates, update AsyncStorage
            if (uniqueHarvestDrafts.length !== harvestDrafts.length) {
                console.log('[loadRecords] Cleaning up harvest duplicates in AsyncStorage...');
                if (uniqueHarvestDrafts.length > 0) {
                    await AsyncStorage.setItem('harvest_drafts', JSON.stringify(uniqueHarvestDrafts));
                } else {
                    await AsyncStorage.removeItem('harvest_drafts');
                }
                console.log('[loadRecords] ✓ Harvest drafts cleaned up');
            }

            // Combine synced harvests from backend and local drafts
            const allHarvests = [...syncedHarvests, ...uniqueHarvestDrafts];
            setHarvestsList(allHarvests);

        } catch (e) {
            console.error('[loadRecords] Failed to load harvests:', e);
            setHarvestsList([]);
        }
        setLoading(false);
    };

    // Count unsynced records from drafts
    const countUnsyncedRecords = async () => {
        try {
            const farmerDraftsJson = await AsyncStorage.getItem('farmer_drafts');
            const harvestDraftsJson = await AsyncStorage.getItem('harvest_drafts');
            const farmerDrafts = farmerDraftsJson ? JSON.parse(farmerDraftsJson) : [];
            const harvestDrafts = harvestDraftsJson ? JSON.parse(harvestDraftsJson) : [];
            const total = farmerDrafts.length + harvestDrafts.length;
            setUnsyncedCount(total);
            return total;
        } catch (error) {
            console.error('[countUnsyncedRecords] Error:', error);
            return 0;
        }
    };

    // Sync unsynced records - UPDATED to use syncAggregationRecords service
    const handleSyncRecords = async () => {
        setIsSyncing(true);
        try {
            const farmerDraftsJson = await AsyncStorage.getItem('farmer_drafts');
            const harvestDraftsJson = await AsyncStorage.getItem('harvest_drafts');
            const allFarmerRecords = farmerDraftsJson ? JSON.parse(farmerDraftsJson) : [];
            const allHarvestRecords = harvestDraftsJson ? JSON.parse(harvestDraftsJson) : [];

            // Separate drafts from pending records (drafts are incomplete, pending are submitted but unsynced)
            const farmerDrafts = allFarmerRecords.filter(r => r._isDraft === true);
            const farmerPending = allFarmerRecords.filter(r => r._isDraft === false && r._isSynced !== true);
            const harvestDrafts = allHarvestRecords.filter(r => r._isDraft === true);
            const harvestPending = allHarvestRecords.filter(r => r._isDraft === false && r._isSynced !== true);

            // Combine both drafts and pending for syncing (all unsynced records)
            const farmerRecordsToSync = [...farmerDrafts, ...farmerPending];
            const harvestRecordsToSync = [...harvestDrafts, ...harvestPending];

            console.log('[handleSyncRecords] Starting sync...');
            console.log('[handleSyncRecords] Farmer records to sync:', farmerRecordsToSync.length, '(drafts:', farmerDrafts.length, ', pending:', farmerPending.length, ')');
            console.log('[handleSyncRecords] Harvest records to sync:', harvestRecordsToSync.length, '(drafts:', harvestDrafts.length, ', pending:', harvestPending.length, ')');

            // Use the new sync service that handles both CREATE and UPDATE
            const syncResult = await syncAggregationRecords(farmerRecordsToSync, harvestRecordsToSync);

            console.log(`[handleSyncRecords] Sync result:`, syncResult);

            // Only remove records that were successfully synced
            if (syncResult.syncedFarmerIds.length > 0) {
                const remainingFarmerRecords = allFarmerRecords.filter(d => !syncResult.syncedFarmerIds.includes(d.id));
                if (remainingFarmerRecords.length > 0) {
                    await AsyncStorage.setItem('farmer_drafts', JSON.stringify(remainingFarmerRecords));
                } else {
                    await AsyncStorage.removeItem('farmer_drafts');
                }
            }

            if (syncResult.syncedHarvestIds.length > 0) {
                const remainingHarvestRecords = allHarvestRecords.filter(d => !syncResult.syncedHarvestIds.includes(d.id));
                if (remainingHarvestRecords.length > 0) {
                    await AsyncStorage.setItem('harvest_drafts', JSON.stringify(remainingHarvestRecords));
                } else {
                    await AsyncStorage.removeItem('harvest_drafts');
                }
            }

            // Reload records and update count
            await loadRecords();
            await countUnsyncedRecords();

            // Show alert based on sync results
            if (syncResult.failedCount === 0) {
                // All synced successfully
                setAlertConfig({
                    visible: true,
                    title: 'Sync Successful',
                    message: `${syncResult.syncedCount} record${syncResult.syncedCount !== 1 ? 's have' : ' has'} been synced to the cloud successfully!`,
                    type: 'success',
                    buttons: [
                        { text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }
                    ]
                });
            } else if (syncResult.syncedCount > 0) {
                // Some synced, some failed - show detailed error info
                const failedErrors = syncResult.failedRecords
                    .map(f => `${f.harvest_id || f.id}: ${f.error}`)
                    .join('\n');

                setAlertConfig({
                    visible: true,
                    title: 'Partial Sync',
                    message: `Successfully synced ${syncResult.syncedCount} record${syncResult.syncedCount !== 1 ? 's' : ''}, but ${syncResult.failedCount} record${syncResult.failedCount !== 1 ? 's' : ''} failed.\n\nFailed records:\n${failedErrors}\n\nThe failed records remain in your pending list.`,
                    type: 'warning',
                    buttons: [
                        { text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }
                    ]
                });
            } else {
                // All failed - show detailed error info
                const failedErrors = syncResult.failedRecords
                    .map(f => `${f.harvest_id || f.id}: ${f.error}`)
                    .join('\n');

                setAlertConfig({
                    visible: true,
                    title: 'Sync Failed',
                    message: `All records failed to sync.\n\nErrors:\n${failedErrors}\n\nPlease fix the errors and try again. Your records are still saved locally.`,
                    type: 'error',
                    buttons: [
                        { text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }
                    ]
                });
            }
        } catch (error) {
            console.error('[handleSyncRecords] Sync error:', error);
            // Show custom error alert
            setAlertConfig({
                visible: true,
                title: 'Sync Error',
                message: 'An unexpected error occurred during sync. Please try again.',
                type: 'error',
                buttons: [
                    { text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }
                ]
            });
        } finally {
            setIsSyncing(false);
        }
    };

    // Fetch current farmer price when harvest tab is active
    useEffect(() => {
        if (activeTab === 'harvests') {
            const fetchPrice = async () => {
                setIsPriceLoading(true);
                try {
                    const price = await fetchCurrentFarmerPrice();
                    setCurrentFarmerPrice(price);
                    console.log('[AggregationScreen] Fetched current farmer price:', price);
                } catch (error) {
                    console.error('[AggregationScreen] Error fetching farmer price:', error);
                    setCurrentFarmerPrice(null);
                } finally {
                    setIsPriceLoading(false);
                }
            };
            fetchPrice();
        }
    }, [activeTab]);

    useEffect(() => {
        (async () => {
            try {
                // Initialize auth service (assuming this fetches the real userId)
                await initializeAuth();
            } catch (e) {
                console.warn('init auth failed', e);
            }
            await loadRecords();
            await countUnsyncedRecords();
        })();
    }, []);

    // Generate Farmer UID when user moves to step 1 (step 2 in UI)
    useEffect(() => {
        if (farmerStep === 1 && !farmerForm.uid && activeTab === 'farmers' && farmerForm.first_name && farmerForm.last_name) {
            setFarmerForm(p => ({
                ...p,
                uid: generateFarmerId(farmerForm.first_name, farmerForm.last_name)
            }));
        }
    }, [farmerStep, activeTab, farmerForm.first_name, farmerForm.last_name]);

    // Generate Harvest ID when farmer name and date are available
    useEffect(() => {
        if (activeTab === 'harvests' && harvestForm.farmer_name && harvestForm.date_of_delivery && !harvestForm.harvest_id) {
            const harvestId = generateHarvestId(harvestForm.farmer_name, harvestForm.date_of_delivery);
            setHarvestForm(p => ({
                ...p,
                harvest_id: harvestId
            }));
        }
    }, [harvestForm.farmer_name, harvestForm.date_of_delivery, activeTab, harvestForm.harvest_id]);

    const resetForms = () => {
        // Reset boolean fields to false and string fields to ''
        setFarmerForm(p => ({
            ...p,
            first_name: '', last_name: '', gender: '', nin: '', date_of_birth: '', contact: '', email: '', in_cooperative: false, cooperative: '', started_farming: '',
            district: '', sub_county: '', parish: '', village: '', gps: '', nearest_landmark: '', uid: '',
            coffee_variety: '', no_of_trees: '', all_your_trees: false, other_farms: '', planted_date: '', spacing: '', land_ownership: '', deforested: false, seedling_source: '', seedling_type: [], age_of_seedlings: '', practices: [], irrigation: '', fertilizers: [], uses_pesticides: false, pesticides: [],
        }));

        setHarvestForm(p => ({
            ...p,
            farmer_uid: '', farmer_name: '', weight_on_delivery: '', location_of_delivery: '', gps_coordinates_delivery: '', harvest_id: '', date_of_delivery: new Date().toISOString().slice(0,10), coffee_type: '', price_per_kg: currentFarmerPrice ? formatNumberWithCommas(currentFarmerPrice.toString()) : '4,600', amount_paid: '', paid_by: '', selectedStaff: null,
        }));

        // Reset price loading state when resetting forms
        setIsPriceLoading(false);
        setFarmerStep(0);
        setHarvestStep(0);
        setFarmerErrors({});
        setHarvestErrors({});
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

        // Validation for NIN
        if (key === 'nin') {
            if (value) {
                if (value.length > 14) {
                    setFarmerErrors(prev => ({ ...prev, nin: 'NIN must not exceed 14 characters.' }));
                } else if (!/^(CF|CM)[A-Z0-9]*$/.test(value.toUpperCase())) {
                    setFarmerErrors(prev => ({ ...prev, nin: 'NIN must start with CF or CM in uppercase letters.' }));
                } else {
                    setFarmerErrors(prev => ({ ...prev, nin: '' }));
                }
            } else {
                setFarmerErrors(prev => ({ ...prev, nin: '' }));
            }
        }

        // Validation for contact
        if (key === 'contact') {
            if (value && /[^0-9]/.test(value)) {
                setFarmerErrors(prev => ({ ...prev, contact: 'Phone number must contain only digits.' }));
            } else if (value && value.length > 10) {
                setFarmerErrors(prev => ({ ...prev, contact: 'Phone number should not exceed 10 digits.' }));
            } else {
                setFarmerErrors(prev => ({ ...prev, contact: '' }));
            }
        }
    };

    // FIXED: Create proper update function for harvest form
    const updateHarvestForm = (key, value) => {
        console.log(`[Harvest Form] Updating field: ${key}, value:`, value);
        setHarvestForm(p => {
            let processedValue = value;

            // Handle money fields with comma formatting, but prevent editing price_per_kg if it's set from DB
            if (key === 'price_per_kg') {
                // If price_per_kg is set from database, don't allow manual editing
                if (currentFarmerPrice !== null && currentFarmerPrice !== undefined) {
                    console.log('[Harvest Form] price_per_kg is read-only when set from database');
                    return p; // Don't update if price is set from database
                }
                // Remove any non-numeric characters except decimal point
                const cleaned = String(value).replace(/[^0-9.]/g, '');
                // Prevent multiple decimal points
                const parts = cleaned.split('.');
                if (parts.length > 2) {
                    return p; // Don't update if multiple decimal points
                }
                // Format with commas
                processedValue = formatNumberWithCommas(cleaned);
            }

            const newState = { ...p, [key]: processedValue };

            // Auto-calculate amount_paid when weight or price_per_kg changes
            if (key === 'weight_on_delivery' || key === 'price_per_kg') {
                const weight = parseFormattedNumber(key === 'weight_on_delivery' ? processedValue : newState.weight_on_delivery) || 0;
                const pricePerKg = parseFormattedNumber(key === 'price_per_kg' ? processedValue : newState.price_per_kg) || 0;
                const calculatedAmount = weight * pricePerKg;

                // Format calculated amount with commas
                newState.amount_paid = calculatedAmount > 0 ? formatNumberWithCommas(calculatedAmount.toFixed(2)) : '';
                console.log(`[Harvest Form] Auto-calculated amount_paid: ${newState.amount_paid} (${weight} kg × ${pricePerKg} UGX/kg)`);
            }

            console.log('[Harvest Form] New state after update:', newState);
            return newState;
        });
    };

    // --- Submission Handlers (Kept clean) ---
    const handleFarmerSubmit = async () => {
        const isEditing = farmerForm._isEditing;
        console.log(`[handleFarmerSubmit] ========== SAVING FARMER LOCALLY ==========`);
        console.log('[handleFarmerSubmit] Current form state:', farmerForm);

        // Validation
        if (!farmerForm.first_name || !farmerForm.contact || !userId) {
            console.error('[handleFarmerSubmit] Validation failed - missing required fields');
            Alert.alert("Validation", "Please ensure First name, Contact, and User ID are present.");
            return;
        }

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setLoading(true);

        const recordId = isEditing ? farmerForm._originalId : (farmerForm.uid || generateRecordId('FD'));
        const name = `${farmerForm.first_name} ${farmerForm.last_name}`.trim();
        const location = `${farmerForm.district || ''}${farmerForm.sub_county ? ', ' + farmerForm.sub_county : ''}`;

        console.log(`[handleFarmerSubmit] ${isEditing ? 'Updating' : 'Saving'} farmer locally with ID:`, recordId);
        console.log('[handleFarmerSubmit] Farmer name:', name);

        // Prepare farmer record
        const farmerRecord = {
            ...farmerForm,
            name: name,
            uid: recordId,
            location: location,
            number_of_trees: parseInt(farmerForm.no_of_trees) || 0,
            recorder_id: userId,
            timestamp: Date.now(),
            id: recordId,
            _isDraft: false,  // Mark as submitted (not a draft)
            _isSynced: false, // Mark as pending sync
            _syncStatus: 'pending',
        };

        console.log('[handleFarmerSubmit] Final farmer record:', JSON.stringify(farmerRecord, null, 2));

        try {
            // Save to local AsyncStorage as draft
            const storageKey = 'farmer_drafts';
            const existingDrafts = await AsyncStorage.getItem(storageKey);
            const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];

            // Check if draft with this ID already exists and update it, otherwise add new
            const draftIndex = draftsArray.findIndex(d => d.id === recordId);
            if (draftIndex >= 0) {
                draftsArray[draftIndex] = farmerRecord;
                console.log(`[handleFarmerSubmit] Updated existing farmer draft with ID: ${recordId}`);
            } else {
                draftsArray.push(farmerRecord);
                console.log(`[handleFarmerSubmit] Created new farmer draft with ID: ${recordId}`);
            }

            // Save updated drafts array to AsyncStorage
            await AsyncStorage.setItem(storageKey, JSON.stringify(draftsArray));
            console.log(`[handleFarmerSubmit] ✅ Farmer saved locally!`);

            setSuccessMessage(`Farmer '${name}' saved locally and ready to sync!`);
            setViewMode('success');
            resetForms();
            await loadRecords();
            await countUnsyncedRecords();
        } catch (e) {
            console.error(`[handleFarmerSubmit] ❌ Save error:`, e);
            console.error("[handleFarmerSubmit] Error details:", {
                message: e.message,
            });
            Alert.alert(`Save Failed`, e.message || `Failed to save farmer details locally.`);
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    // --- Save Draft Handler ---
    const handleSaveDraft = async () => {
        const type = activeTab === 'farmers' ? 'farmer' : 'harvest';
        const formData = type === 'farmer' ? farmerForm : harvestForm;
        const currentStepNum = type === 'farmer' ? farmerStep : harvestStep;

        console.log(`[handleSaveDraft] ========== SAVING ${type.toUpperCase()} DRAFT - STEP ${currentStepNum + 1} ==========`);
        console.log(`[handleSaveDraft] Current form data:`, formData);

        // Get step information
        const steps = type === 'farmer' ? farmerFieldDefinitions : harvestFieldDefinitions;
        const currentStepData = steps[currentStepNum];

        if (!currentStepData) {
            Alert.alert('Error', 'Unable to save draft. Step information not found.');
            return;
        }

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setLoading(true);

        try {
            // Generate unique ID for draft if not already present
            const draftId = formData.uid || formData.harvest_id || formData.id || generateRecordId(type === 'farmer' ? 'FR' : 'PA');

            // Prepare draft record
            const draftRecord = {
                ...formData,
                id: draftId, // Unique identifier for the draft
                _isDraft: true,
                _draftStep: currentStepNum,
                _draftStepTitle: currentStepData.title,
                _draftSavedAt: new Date().toISOString(),
                _draftType: type,
                recorder_id: userId,
            };

            console.log(`[handleSaveDraft] Saving draft for ${type}:`, JSON.stringify(draftRecord, null, 2));

            // Save draft to AsyncStorage
            const storageKey = type === 'farmer' ? 'farmer_drafts' : 'harvest_drafts';
            const existingDrafts = await AsyncStorage.getItem(storageKey);
            const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];

            // Check if draft with this ID already exists and update it, otherwise add new
            const draftIndex = draftsArray.findIndex(d => d.id === draftId);
            if (draftIndex >= 0) {
                draftsArray[draftIndex] = draftRecord;
                console.log(`[handleSaveDraft] Updated existing draft with ID: ${draftId}`);
            } else {
                draftsArray.push(draftRecord);
                console.log(`[handleSaveDraft] Created new draft with ID: ${draftId}`);
            }

            // Save updated drafts array to AsyncStorage
            await AsyncStorage.setItem(storageKey, JSON.stringify(draftsArray));
            console.log(`[handleSaveDraft] ✅ Draft saved to AsyncStorage successfully`);

            setSuccessMessage(`${type === 'farmer' ? 'Farmer' : 'Harvest'} draft saved successfully at ${currentStepData.title}!`);

            // Show success dialog using CustomAlert
            setAlertConfig({
                visible: true,
                title: 'Draft Saved',
                message: `Your ${type} information has been saved as a draft at "${currentStepData.title}".\n\nYou can continue filling this form later.`,
                type: 'success',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            setViewMode('table');
                            setActiveTab(type + 's');
                        }
                    }
                ]
            });

            // Reload records to show the new draft
            await loadRecords();
            // Update unsynced count
            await countUnsyncedRecords();
        } catch (e) {
            console.error(`[handleSaveDraft] ❌ Error saving draft:`, e);
            Alert.alert('Save Failed', e.message || `Failed to save ${type} draft.`);
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const handleHarvestSubmit = async () => {
        const isEditing = harvestForm._isEditing;
        console.log(`[handleHarvestSubmit] ========== SAVING HARVEST LOCALLY ==========`);
        console.log('[handleHarvestSubmit] Current form state:', harvestForm);

        if (!harvestForm.farmer_uid || !harvestForm.weight_on_delivery || !harvestForm.price_per_kg || !userId) {
            console.error('[handleHarvestSubmit] Validation failed - missing required fields');
            Alert.alert('Validation', 'Please fill Farmer UID, Weight, Price per Kg and ensure you are logged in.');
            return;
        }

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setLoading(true);

        const recordId = isEditing ? harvestForm._originalId : (harvestForm.harvest_id || generateRecordId('PA'));
        console.log(`[handleHarvestSubmit] ${isEditing ? 'Updating' : 'Saving'} harvest locally with ID:`, recordId);

        const harvestRecord = {
            ...harvestForm,
            id: recordId,
            weight_on_delivery: parseFormattedNumber(harvestForm.weight_on_delivery) || 0,
            price_per_kg: parseFormattedNumber(harvestForm.price_per_kg) || 0,
            amount_paid: parseFormattedNumber(harvestForm.amount_paid) || 0,
            recorder_id: userId,
            timestamp: Date.now(),
            _isDraft: false,  // Mark as submitted (not a draft)
            _isSynced: false, // Mark as pending sync
            _syncStatus: 'pending',
        };

        console.log('[handleHarvestSubmit] Final harvest record:', JSON.stringify(harvestRecord, null, 2));

        try {
            // Save to local AsyncStorage as draft
            const storageKey = 'harvest_drafts';
            const existingDrafts = await AsyncStorage.getItem(storageKey);
            const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];

            // Check if draft with this ID already exists and update it, otherwise add new
            const draftIndex = draftsArray.findIndex(d => d.id === recordId);
            if (draftIndex >= 0) {
                draftsArray[draftIndex] = harvestRecord;
                console.log(`[handleHarvestSubmit] Updated existing harvest draft with ID: ${recordId}`);
            } else {
                draftsArray.push(harvestRecord);
                console.log(`[handleHarvestSubmit] Created new harvest draft with ID: ${recordId}`);
            }

            // Save updated drafts array to AsyncStorage
            await AsyncStorage.setItem(storageKey, JSON.stringify(draftsArray));
            console.log(`[handleHarvestSubmit] ✅ Harvest saved locally!`);

            resetForms();
            await loadRecords();
            await countUnsyncedRecords();

            // Auto-generate voucher
            const voucherData = {
                ...harvestRecord,
                workerName: harvestForm.farmer_name || harvestForm.farmer_uid,
                blockId: 'N/A', // Aggregation might not have blocks
                pricePerKg: harvestRecord.price_per_kg, // Use raw numeric value
                amountPaid: harvestRecord.amount_paid, // Use raw numeric value
                paidBy: harvestForm.paid_by,
                date: harvestForm.date_of_delivery,
            };
            onNavigate('PaymentVoucher', { harvestData: voucherData });
        } catch (e) {
            console.error(`[handleHarvestSubmit] ❌ Save error:`, e);
            console.error('[handleHarvestSubmit] Error details:', {
                message: e.message,
            });

            Alert.alert(`Save Failed`, e.message || `Failed to save harvest details locally.`);
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

        // Debug log
        if (!isFarmer && currentStep === 1) {
            console.log('[AggregationScreen] Rendering harvest form step 2 (Quality & Payment)');
            console.log('[AggregationScreen] Fields in step:', currentStepFields.fields.map(f => ({ key: f.key, type: f.type })));
        }

        const updateForm = (key, value) => {
            setFormData(key, value);
        };
        
        const handleNext = () => {
            // Check for validation errors
            const hasErrors = isFarmer ? Object.values(farmerErrors).some(error => error) : Object.values(harvestErrors).some(error => error);
            if (hasErrors) {
                Alert.alert("Input Error", "Please fix the validation errors before proceeding.");
                return;
            }

            // Basic required field validation for current step
            const missingRequired = currentStepFields.fields.some(f =>
                f.required && (!formData[f.key] || (typeof formData[f.key] === 'string' && formData[f.key].trim() === ''))
            );

            if (missingRequired) {
                Alert.alert("Input Error", "Please fill all required fields in this step.");
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
                    // Check for farmer_id (Django API), uid (legacy), or id (fallback)
                    const found = farmersList.find(f =>
                        String(f.farmer_id) === String(farmerUID) ||
                        String(f.uid) === String(farmerUID) ||
                        String(f.id) === String(farmerUID)
                    );
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

        const isEditing = isFarmer ? farmerForm._isEditing : harvestForm._isEditing;

        return (
            <View style={styles.formSection}>
                <Text style={styles.formTitle}>
                    {isEditing ? '✏️ Edit ' : ''}
                    {currentStepFields.title}
                </Text>
                <StepIndicator currentStep={currentStep + 1} totalSteps={steps.length} steps={steps} />

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

                        // Special handling for farmer_uid autocomplete in harvest form
                        if (field.key === 'farmer_uid' && field.action === 'lookup' && !isFarmer) {
                            return (
                                <View key={field.key}>
                                    <AutocompleteInput
                                        label={`${field.label}${field.required ? ' *' : ''}`}
                                        value={fieldValue}
                                        onChangeText={(v) => updateForm(field.key, v)}
                                        onSelect={(farmer, selectedId) => {
                                            // When user selects from dropdown, update both UID and name
                                            updateForm('farmer_uid', selectedId);
                                            updateForm('farmer_name', getFarmerDisplayName(farmer));
                                        }}
                                        suggestions={farmersList}
                                        keyboardType={field.keyboardType}
                                        placeholder="Start typing farmer name, ID, or contact..."
                                    />
                                    {/* Display selected farmer name below the UID field */}
                                    {formData.farmer_name && (
                                        <View style={styles.farmerNameDisplay}>
                                            <Ionicons name="person" size={16} color={PRIMARY_BROWN} style={{ marginRight: 8 }} />
                                            <Text style={styles.farmerNameText}>{formData.farmer_name}</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        }

                        // Special handling for paid_by searchable staff picker in harvest form
                        if (field.key === 'paid_by' && field.type === 'searchable-staff' && !isFarmer) {
                            console.log('[AggregationScreen] Rendering SearchableStaffPicker for paid_by field');
                            return (
                                <SearchableStaffPicker
                                    key={field.key}
                                    label={`${field.label}${field.required ? ' *' : ''}`}
                                    selectedStaffId={formData.paid_by}
                                    onStaffSelect={(staff) => {
                                        // Update both the ID and the staff object
                                        updateForm('paid_by', staff.id);
                                        updateForm('selectedStaff', staff);
                                    }}
                                    selectedStaff={formData.selectedStaff}
                                />
                            );
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

                        // Special handling for price_per_kg field - make it read-only when price is set from DB
                        const isPriceReadOnly = field.key === 'price_per_kg' && !isFarmer && currentFarmerPrice !== null && currentFarmerPrice !== undefined;

                        const inputElement = (
                            <CustomInput
                                key={field.key}
                                label={`${field.label}${field.required ? ' *' : ''}`}
                                value={isPriceLoading && field.key === 'price_per_kg' && !isFarmer ? 'Loading...' : fieldValue}
                                onChangeText={(isPriceReadOnly || field.readOnly) ? null : handleTextChange}
                                keyboardType={field.keyboardType}
                                editable={!(isPriceReadOnly || field.readOnly)}
                                placeholder={field.readOnly ? '' : (field.placeholder || `Enter ${field.label}`)}
                                error={isFarmer ? farmerErrors[field.key] : harvestErrors[field.key]}
                            />
                        );

                        // Show button after GPS field for farmer form
                        if (field.key === 'gps' && isFarmer) {
                            return (
                                <View key={field.key}>
                                    {inputElement}
                                    <TouchableOpacity
                                        style={styles.generateButton}
                                        onPress={async () => {
                                            const gpsLocation = await getCurrentGPSLocation();
                                            updateForm('gps', gpsLocation);
                                            setAlertConfig({
                                                visible: true,
                                                title: 'GPS Location Captured',
                                                message: `Location: ${gpsLocation}`,
                                                type: 'success',
                                                buttons: [
                                                    {
                                                        text: 'OK',
                                                        onPress: () => {
                                                            setAlertConfig(prev => ({ ...prev, visible: false }));
                                                        }
                                                    }
                                                ]
                                            });
                                        }}
                                    >
                                        <Text>
                                            <Text style={styles.generateButtonText}>Get Current GPS Location</Text>
                                            <Text>{'\n'}</Text>
                                            <Text style={styles.generateButtonSubtext}>(Use when on farm site)</Text>
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        }

                        // Show button after GPS coordinates field for harvest form
                        if (field.key === 'gps_coordinates_delivery' && !isFarmer) {
                            return (
                                <View key={field.key}>
                                    {inputElement}
                                    <TouchableOpacity
                                        style={styles.generateButton}
                                        onPress={async () => {
                                            const gpsLocation = await getCurrentGPSLocation();
                                            updateForm('gps_coordinates_delivery', gpsLocation);
                                            setAlertConfig({
                                                visible: true,
                                                title: 'GPS Coordinates Captured',
                                                message: `Coordinates: ${gpsLocation}`,
                                                type: 'success',
                                                buttons: [
                                                    {
                                                        text: 'OK',
                                                        onPress: () => {
                                                            setAlertConfig(prev => ({ ...prev, visible: false }));
                                                        }
                                                    }
                                                ]
                                            });
                                        }}
                                    >
                                        <Text>
                                            <Text style={styles.generateButtonText}>Capture Current GPS Location</Text>
                                            <Text>{'\n'}</Text>
                                            <Text style={styles.generateButtonSubtext}>(Capture exact delivery location)</Text>
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        }

                        // Show helper text for calculated amount_paid field
                        if (field.calculated && field.key === 'amount_paid') {
                            return (
                                <View key={field.key}>
                                    {inputElement}
                                    <Text style={styles.helperText}>Auto-calculated: Weight × Price per Kg</Text>
                                </View>
                            );
                        }

                        // Show helper text for price_per_kg field when it's read-only
                        if (field.key === 'price_per_kg' && !isFarmer && isPriceReadOnly) {
                            return (
                                <View key={field.key}>
                                    {inputElement}
                                    <Text style={styles.helperText}>Price fetched from database (latest price)</Text>
                                </View>
                            );
                        }

                        // Show helper text for price_per_kg field when no price is set
                        if (field.key === 'price_per_kg' && !isFarmer && currentFarmerPrice === null && !isPriceLoading) {
                            return (
                                <View key={field.key}>
                                    {inputElement}
                                    <Text style={styles.helperText}>No price set in database - enter manually</Text>
                                </View>
                            );
                        }

                        return inputElement;
                    })}

                </ScrollView>

                {/* Step Navigation */}
                <View style={styles.stepNavContainer}>
                    <View style={styles.stepNav}>
                        {currentStep > 0 && (
                            <TouchableOpacity style={styles.stepButton} onPress={handleBack}>
                                <Ionicons name="chevron-back" size={20} color={PRIMARY_BROWN} style={styles.prevButtonIcon} />
                                <Text style={styles.stepButtonText}>Previous</Text>
                            </TouchableOpacity>
                        )}
                        {currentStep < steps.length - 1 ? (
                            <TouchableOpacity
                                style={styles.stepButton}
                                onPress={handleNext}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color={PRIMARY_BROWN} /> : (
                                    <>
                                        <Text style={styles.stepButtonText}>Next</Text>
                                        <Ionicons name="chevron-forward" size={20} color={PRIMARY_BROWN} style={styles.nextButtonIcon} />
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={handleNext}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color={'#fff'} /> : (
                                    <Text style={styles.submitButtonText}>
                                        {`${isEditing ? 'Update' : 'Submit'} ${isFarmer ? 'Farmer' : 'Harvest'}`}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Save Draft Button - Available on all steps */}
                    <TouchableOpacity
                        style={styles.saveDraftButton}
                        onPress={handleSaveDraft}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={PRIMARY_BROWN} />
                        ) : (
                            <>
                                <Ionicons name="save" size={18} color={PRIMARY_BROWN} style={{ marginRight: 6 }} />
                                <Text style={styles.saveDraftButtonText}>Save Draft</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // --- Main Content Renderers ---
    const renderFormContent = () => {
        return activeTab === 'farmers' ? renderGroupedStepForm('farmers') : renderGroupedStepForm('harvests');
    };
    
    // Handler for deleting a record with confirmation
    /**
     * Performs the actual delete operation
     */
    const performDelete = async (record, type, displayName) => {
        console.log(`[handleDelete] Deleting ${type}:`, record);
        setLoading(true);

        try {
            // Check if this is a draft record
            const isDraft = record._isDraft === true;

            if (type === 'farmer') {
                const farmerId = record.farmer_id || record.uid || record.id;
                console.log('[handleDelete] Deleting farmer with ID:', farmerId);

                if (isDraft) {
                    // Delete draft from AsyncStorage
                    const storageKey = 'farmer_drafts';
                    const existingDrafts = await AsyncStorage.getItem(storageKey);
                    const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];
                    const updatedDrafts = draftsArray.filter(d => d.id !== farmerId);
                    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDrafts));
                    console.log('[handleDelete] Draft deleted from local storage');
                } else {
                    // Delete submitted farmer from API
                    await deleteFarmer(farmerId);
                    console.log('[handleDelete] Farmer deleted from API');
                }

                // Remove from local state immediately for better UX
                setFarmersList(prev => prev.filter(f =>
                    f.farmer_id !== farmerId && f.uid !== farmerId && f.id !== farmerId
                ));

                // Show success using CustomAlert
                setAlertConfig({
                    visible: true,
                    title: 'Success',
                    message: `Farmer "${displayName}" has been deleted successfully.`,
                    type: 'success',
                    buttons: [
                        {
                            text: 'OK',
                            onPress: async () => {
                                setAlertConfig(prev => ({ ...prev, visible: false }));
                                await loadRecords();
                            }
                        }
                    ]
                });
            } else {
                const harvestId = record.id || record.harvest_id;
                console.log('[handleDelete] Deleting harvest with ID:', harvestId);

                if (isDraft) {
                    // Delete draft from AsyncStorage
                    const storageKey = 'harvest_drafts';
                    const existingDrafts = await AsyncStorage.getItem(storageKey);
                    const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];
                    const updatedDrafts = draftsArray.filter(d => d.id !== harvestId && d.harvest_id !== harvestId);
                    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDrafts));
                    console.log('[handleDelete] Draft deleted from local storage');
                } else {
                    // Try to delete from API first
                    try {
                        await deleteHarvest(harvestId);
                        console.log('[handleDelete] Harvest deleted from API');
                    } catch (apiError) {
                        // If API delete fails (404 or 500), also try to remove from AsyncStorage
                        console.warn('[handleDelete] API delete failed, attempting to remove from local storage:', apiError.message);

                        const storageKey = 'harvest_drafts';
                        const existingDrafts = await AsyncStorage.getItem(storageKey);
                        if (existingDrafts) {
                            const draftsArray = JSON.parse(existingDrafts);
                            const updatedDrafts = draftsArray.filter(d => d.id !== harvestId && d.harvest_id !== harvestId);
                            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDrafts));
                            console.log('[handleDelete] Removed from local storage as fallback');
                        }

                        // Re-throw the error if it's not a 404 (record not found)
                        if (apiError.response?.status !== 404) {
                            throw apiError;
                        } else {
                            console.log('[handleDelete] Record not found in API (404), treating as successful deletion');
                        }
                    }
                }

                // Remove from local state immediately for better UX
                setHarvestsList(prev => prev.filter(h =>
                    h.id !== harvestId && h.harvest_id !== harvestId
                ));

                // Show success using CustomAlert
                setAlertConfig({
                    visible: true,
                    title: 'Success',
                    message: `Harvest record has been deleted successfully.`,
                    type: 'success',
                    buttons: [
                        {
                            text: 'OK',
                            onPress: async () => {
                                setAlertConfig(prev => ({ ...prev, visible: false }));
                                await loadRecords();
                            }
                        }
                    ]
                });
            }
        } catch (error) {
            console.error('[handleDelete] Delete failed:', error);

            // Build user-friendly error message
            let errorMsg = 'Failed to delete record.';
            if (error.response?.status === 500) {
                errorMsg = 'Server error occurred. The record may have been deleted. Please refresh and check.';
            } else if (error.response?.status === 404) {
                errorMsg = 'Record not found. It may have already been deleted.';
            } else if (error.response?.data?.detail) {
                errorMsg = error.response.data.detail;
            } else if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            } else if (error.message) {
                errorMsg = error.message;
            }

            // Show error using CustomAlert
            setAlertConfig({
                visible: true,
                title: 'Delete Failed',
                message: errorMsg,
                type: 'error',
                buttons: [
                    {
                        text: 'Refresh',
                        onPress: async () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            await loadRecords();
                        }
                    },
                    {
                        text: 'OK',
                        style: 'cancel',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                        }
                    }
                ]
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (record, type) => {
        const displayName = type === 'farmer'
            ? `${record.first_name || ''} ${record.last_name || ''}`.trim()
            : `Harvest ${record.id || record.harvest_id || 'Unknown'}`;

        // Show confirmation using CustomAlert
        setAlertConfig({
            visible: true,
            title: 'Delete Record',
            message: `Are you sure you want to delete ${displayName}?`,
            type: 'warning',
            buttons: [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                    }
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                        await performDelete(record, type, displayName);
                    }
                }
            ]
        });
    };

    // Handler for editing a record - populates form with existing data
    const handleEdit = (record, type) => {
        console.log(`[handleEdit] Editing ${type}:`, record);

        if (type === 'farmer') {
            // Populate farmer form with existing data
            // Need to map backend field names to form field names
            setFarmerForm({
                // Personal Info
                first_name: record.first_name || '',
                last_name: record.last_name || '',
                gender: record.gender || '',
                nin: record.nin || '',
                date_of_birth: record.date_of_birth || '',
                contact: record.contact || '',
                email: record.email || '',
                in_cooperative: record.in_cooperative || false,
                cooperative: record.cooperative || '',
                started_farming: record.started_coffee_farming_year ? `${record.started_coffee_farming_year}-01-01` : '',

                // Location
                district: record.district || '',
                sub_county: record.sub_county || '',
                parish: record.parish || '',
                village: record.village || '',
                gps: record.gps_coordinates || record.gps || '',
                nearest_landmark: record.nearest_landmark || '',
                uid: record.farmer_id || record.uid || '',

                // Farm Details
                coffee_variety: record.coffee_variety || '',
                no_of_trees: String(record.number_of_trees || ''),
                all_your_trees: record.ownership_of_trees !== false,
                other_farms: record.other_farms || '',
                planted_date: record.planted_date || '',
                spacing: record.spacing_between_trees || record.spacing || '',
                land_ownership: record.land_ownership || '',
                deforested: record.defforestation_status || false,
                seedling_source: record.source_of_seedlings || record.seedling_source || '',
                seedling_type: Array.isArray(record.type_of_seedlings) ? record.type_of_seedlings : (record.type_of_seedlings ? [record.type_of_seedlings] : []),
                age_of_seedlings: record.age_of_seedlings || '',

                // Practices
                practices: Array.isArray(record.practices) ? record.practices : [],
                irrigation: record.irrigation_source || record.irrigation || '',
                fertilizers: typeof record.fertilizers === 'string'
                    ? record.fertilizers.split(',').map(f => f.trim()).filter(Boolean)
                    : (Array.isArray(record.fertilizers) ? record.fertilizers : []),
                uses_pesticides: record.pesticide ? true : false,
                pesticides: typeof record.pesticide === 'string'
                    ? record.pesticide.split(',').map(p => p.trim()).filter(Boolean)
                    : (Array.isArray(record.pesticides) ? record.pesticides : []),

                // Store the original ID for update
                _isEditing: true,
                _originalId: record.farmer_id || record.uid || record.id,
            });

            // Reset step to beginning
            setFarmerStep(0);
            setViewMode('form');
            setActiveTab('farmers');
        } else {
            // Populate harvest form with existing data
            setHarvestForm({
                farmer_uid: record.name || record.farmer_uid || '',
                farmer_name: record.farmer_name || '',
                weight_on_delivery: String(record.weight_on_delivery || ''),
                location_of_delivery: record.location_of_delivery || record.location_on_delivery || '',
                gps_coordinates_delivery: record.gps_coordinates_delivery || record.gps_coordinates || '',
                date_of_delivery: record.date_of_delivery || '',
                coffee_type: record.grade || record.coffee_type || '',
                price_per_kg: record.price_per_kg ? formatNumberWithCommas(String(record.price_per_kg)) : (currentFarmerPrice ? formatNumberWithCommas(currentFarmerPrice.toString()) : ''),
                amount_paid: record.amount_paid ? formatNumberWithCommas(String(record.amount_paid)) : '',
                paid_by: record.paid_by || record.who_paid || '',
                selectedStaff: null, // Will be set by SearchableStaffPicker
                harvest_id: record.id || record.harvest_id || '',

                // Store the original ID for update
                _isEditing: true,
                _originalId: record.id || record.harvest_id,
            });

            // Reset step to beginning
            setHarvestStep(0);
            setViewMode('form');
            setActiveTab('harvests');
        }
    };

    /**
     * Handles the actual sync operation after confirmation
     */
    const performDraftSync = async (draftRecord, type, displayName) => {
        setLoading(true);
        try {
            if (type === 'farmer') {
                // Sync farmer draft to database
                console.log('[handleSyncDraft] Submitting farmer draft to API...');
                console.log('[handleSyncDraft] Draft record being synced:', draftRecord);

                const farmerData = {
                    uid: draftRecord.uid || draftRecord.farmer_id || draftRecord.id,
                    first_name: draftRecord.first_name || '',
                    last_name: draftRecord.last_name || '',
                    gender: draftRecord.gender || '',
                    nin: draftRecord.nin || '',
                    date_of_birth: draftRecord.date_of_birth || '',
                    contact: draftRecord.contact || '',
                    email: draftRecord.email || '',
                    farmer_type: draftRecord.farmer_type || 'individual',
                    started_farming: draftRecord.started_farming || '',
                    district: draftRecord.district || '',
                    other_district: draftRecord.other_district || '',
                    sub_county: draftRecord.sub_county || '',
                    other_sub_county: draftRecord.other_sub_county || '',
                    parish: draftRecord.parish || '',
                    village: draftRecord.village || '',
                    gps: draftRecord.gps || '',
                    nearest_landmark: draftRecord.nearest_landmark || '',
                    coffee_variety: draftRecord.coffee_variety || '',
                    no_of_trees: draftRecord.no_of_trees || 0,
                    all_your_trees: draftRecord.all_your_trees !== false,
                    other_farms: draftRecord.other_farms || '',
                    planted_date: draftRecord.planted_date || '',
                    spacing: draftRecord.spacing || '',
                    land_ownership: draftRecord.land_ownership || '',
                    deforested: draftRecord.deforested !== false,
                    seedling_source: draftRecord.seedling_source || '',
                    seedling_type: draftRecord.seedling_type || '',
                    age_of_seedlings: draftRecord.age_of_seedlings || '',
                    practices: draftRecord.practices || [],
                    irrigation: draftRecord.irrigation || '',
                    fertilizers: draftRecord.fertilizers || [],
                    pesticides: draftRecord.pesticides || [],
                };

                console.log('[handleSyncDraft] Farmer data prepared for submission:', JSON.stringify(farmerData, null, 2));
                await submitFarmer(farmerData);
                console.log('[handleSyncDraft] Farmer draft synced successfully');
            } else {
                // Sync harvest draft to database
                console.log('[handleSyncDraft] Submitting harvest draft to API...');
                console.log('[handleSyncDraft] Draft record being synced:', draftRecord);

                const harvestData = {
                    id: draftRecord.id || draftRecord.harvest_id,
                    farmer_uid: draftRecord.farmer_uid || draftRecord.name || '',
                    farmer_name: draftRecord.farmer_name || '',
                    weight_on_delivery: draftRecord.weight_on_delivery || 0,
                    location_of_delivery: draftRecord.location_of_delivery || '',
                    gps_coordinates_delivery: draftRecord.gps_coordinates_delivery || '',
                    date_of_delivery: draftRecord.date_of_delivery || '',
                    coffee_type: draftRecord.coffee_type || draftRecord.grade || '',
                    amount_paid: draftRecord.amount_paid || '',
                    paid_by: draftRecord.paid_by || '',
                };

                console.log('[handleSyncDraft] Harvest data prepared for submission:', JSON.stringify(harvestData, null, 2));
                await submitHarvest(harvestData);
                console.log('[handleSyncDraft] Harvest draft synced successfully');
            }

            // Remove draft from AsyncStorage
            const storageKey = type === 'farmer' ? 'farmer_drafts' : 'harvest_drafts';
            const existingDrafts = await AsyncStorage.getItem(storageKey);
            const draftsArray = existingDrafts ? JSON.parse(existingDrafts) : [];
            const updatedDrafts = draftsArray.filter(d => d.id !== draftRecord.id);
            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDrafts));

            console.log(`[handleSyncDraft] Draft removed from local storage`);

            // Update local state to remove the synced draft
            if (type === 'farmer') {
                setFarmersList(prev => prev.filter(f => f.id !== draftRecord.id));
            } else {
                setHarvestsList(prev => prev.filter(h => h.id !== draftRecord.id));
            }

            // Show success using CustomAlert
            setAlertConfig({
                visible: true,
                title: 'Sync Successful',
                message: `${type === 'farmer' ? 'Farmer' : 'Harvest'} draft "${displayName}" has been synced to the database successfully!`,
                type: 'success',
                buttons: [
                    {
                        text: 'OK',
                        onPress: async () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            // Reload records from server to ensure complete sync
                            await loadRecords();
                        }
                    }
                ]
            });
        } catch (error) {
            console.error('[handleSyncDraft] Sync failed:', error);
            const errorMsg = error.response?.data?.detail
                || error.response?.data?.message
                || error.message
                || `Failed to sync ${type} draft`;

            // Show error using CustomAlert
            setAlertConfig({
                visible: true,
                title: 'Sync Failed',
                message: errorMsg,
                type: 'error',
                buttons: [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                        }
                    }
                ]
            });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handles syncing a draft record to the database.
     * This function submits an incomplete draft without requiring full form completion.
     * Empty/missing fields will be filled with sensible defaults by submitFarmer/submitHarvest.
     */
    const handleSyncDraft = async (draftRecord) => {
        const type = draftRecord._draftType || (draftRecord.first_name ? 'farmer' : 'harvest');
        const displayName = type === 'farmer'
            ? `${draftRecord.first_name || ''} ${draftRecord.last_name || ''}`.trim()
            : `Harvest ${draftRecord.id || draftRecord.harvest_id || 'Unknown'}`;

        console.log(`[handleSyncDraft] Syncing ${type} draft:`, draftRecord);

        // Show confirmation using CustomAlert
        setAlertConfig({
            visible: true,
            title: 'Sync Draft to Database',
            message: `Are you sure you want to submit this ${type === 'farmer' ? 'farmer' : 'harvest'} draft to the database?\n\nYou can edit it later if needed.`,
            type: 'info',
            buttons: [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                    }
                },
                {
                    text: 'Sync',
                    onPress: async () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                        await performDraftSync(draftRecord, type, displayName);
                    }
                }
            ]
        });
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
                    onEdit={(r, isEdit) => {
                        if (isEdit) {
                            // Edit mode - populate form
                            handleEdit(r, 'farmer');
                        } else {
                            // View mode - show detail view
                            setSelectedFarmer(r);
                            setViewMode('detail');
                        }
                    }}
                    onDelete={(r) => handleDelete(r, 'farmer')}
                    onSyncDraft={(r) => handleSyncDraft(r)}
                    onVoucher={null}
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
                    farmersList={farmersList}
                    onHarvestAction={(item) => {
                        console.log('[AggregationScreen] Opening action menu for harvest:', item);
                        setSelectedHarvestForAction(item);
                        setActionMenuVisible(true);
                    }}
                    onEdit={(r, isEdit) => {
                        if (isEdit) {
                            // Edit mode - populate form
                            handleEdit(r, 'harvest');
                        } else {
                            // View mode - show detail view
                            setSelectedHarvest(r);
                            setViewMode('detail');
                        }
                    }}
                    onDelete={(r) => handleDelete(r, 'harvest')}
                    onSyncDraft={(r) => handleSyncDraft(r)}
                    onVoucher={(r) => {
                        // Prepare harvest data for voucher - lookup farmer name from farmersList
                        const farmerUID = r.name || r.farmer_name || r.farmer_uid;
                        let farmerName = farmerUID || 'Unknown';

                        // Look up farmer name from farmersList
                        if (farmerUID && Array.isArray(farmersList)) {
                            const farmer = farmersList.find(f =>
                                String(f.farmer_id) === String(farmerUID) ||
                                String(f.uid) === String(farmerUID) ||
                                String(f.id) === String(farmerUID)
                            );

                            if (farmer) {
                                farmerName = `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() || farmer.name || farmerUID;
                            }
                        }

                        const voucherData = {
                            ...r,
                            farmer_name: farmerName, // Use farmer_name to match PaymentVoucherScreen expectations
                            blockId: 'N/A', // Aggregation might not have blocks
                            price_per_kg: parseFormattedNumber(r.price_per_kg) || 0, // Parse formatted strings from API
                            amount_paid: parseFormattedNumber(r.amount_paid) || 0, // Parse formatted strings from API
                            weight_on_delivery: parseFormattedNumber(r.weight_on_delivery) || 0, // Parse formatted strings from API
                            pricePerKg: parseFormattedNumber(r.price_per_kg) || 0,
                            amountPaid: parseFormattedNumber(r.amount_paid) || 0,
                            paidBy: r.paid_by || 'N/A',
                            date: r.date_of_delivery || r.date,
                        };
                        onNavigate('PaymentVoucher', { harvestData: voucherData });
                    }}
                />
            );
        }
    };
    
    // --- Screen Layout ---
    const handleBackPress = () => {
        // If in form or detail view, go back to table view
        if (viewMode === 'form' || viewMode === 'detail') {
            setViewMode('table');
        } else {
            // Otherwise, go back to previous screen
            navigation.goBack();
        }
    };

    return (
        <View style={styles.screen}>
            <SimpleHeader
                title="External Harvest Records"
                onBackPress={handleBackPress}
                unsyncedCount={unsyncedCount}
                onSync={handleSyncRecords}
                isSyncing={isSyncing}
            />

            {/* Main content container - BottomNav will sit below this */}
            <View style={{ flex: 1 }}>
            {/* FIXED: KeyboardAvoidingView wraps entire scrollable content - optimized for Android */}
            <KeyboardAvoidingView
                style={styles.container}
                behavior="height"
                enabled={Platform.OS === 'android'}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                >
                
                {/* Tab Navigation - Always visible */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'farmers' && styles.activeTab]}
                        onPress={() => {
                            setActiveTab('farmers');
                            resetForms();
                            setSelectedFarmer(null);
                            setViewMode('table'); // Go to records view
                        }}>
                        <Text style={[styles.tabText, activeTab === 'farmers' && styles.activeTabText]}>Farmer Registry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'harvests' && styles.activeTab]}
                        onPress={() => {
                            setActiveTab('harvests');
                            resetForms();
                            setViewMode('table'); // Go to records view
                        }}>
                        <Text style={[styles.tabText, activeTab === 'harvests' && styles.activeTabText]}>Farmer Harvests</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Content Area */}
                <View style={styles.contentWrapper}>
                    {loading && viewMode !== 'table' && viewMode !== 'detail' && <ActivityIndicator size="large" color={DARK_BROWN} />}

                    {viewMode === 'form' && renderFormContent()}

                    {viewMode === 'table' && renderTableContent()}

                    {viewMode === 'detail' && activeTab === 'farmers' && selectedFarmer && (
                        <FarmerDetailView
                            farmer={selectedFarmer}
                            onBack={() => {
                                setSelectedFarmer(null);
                                setViewMode('table');
                            }}
                        />
                    )}

                    {viewMode === 'detail' && activeTab === 'harvests' && selectedHarvest && (
                        <HarvestDetailView
                            harvest={selectedHarvest}
                            farmersList={farmersList}
                            onBack={() => {
                                setSelectedHarvest(null);
                                setViewMode('table');
                            }}
                        />
                    )}
                </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modals and Overlays */}
            {viewMode === 'success' && (
                <SuccessMessage
                    message={successMessage}
                    onExit={() => {
                        setViewMode('table');
                        setActiveTab(activeTab); // Keep the current tab (farmers or harvests)
                    }}
                />
            )}

            </View>

            {/* BottomNav now part of layout, not floating */}
            <BottomNav onNavigate={onNavigate} active="Aggregation" />

            {/* Custom Alert Modal */}
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
            />

            {/* Harvest Action Menu */}
            <HarvestActionMenu
                visible={actionMenuVisible}
                onClose={() => {
                    setActionMenuVisible(false);
                    setSelectedHarvestForAction(null);
                }}
                harvestId={selectedHarvestForAction?.harvest_id || selectedHarvestForAction?.id}
                harvestData={selectedHarvestForAction}
                navigation={navigation}
            />
        </View>
    );
};


// ===============================================
// === 4. STYLESHEET (POLISHED)                ===
// ===============================================

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: LIGHT_GRAY_BG,
    },
    container: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    contentWrapper: {
        flex: 1, // FIXED: Takes remaining space after tabs/header
    },
    contentContainer: {
        flexGrow: 1,
        paddingBottom: 100, // Make room for BottomNav
    },
    // --- Tabs ---
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: VERY_LIGHT_BROWN,
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
        backgroundColor: PRIMARY_BROWN,
    },
    tabText: {
        color: DARK_BROWN,
        fontWeight: '500',
        fontFamily: Fonts.regular,
    },
    activeTabText: {
        color: '#fff',
        fontWeight: '700',
        fontFamily: Fonts.semiBold,
    },
    // --- Forms ---
    formSection: {
        flex: 1, // FIXED: Allow form to take available height
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        elevation: 3,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        maxHeight: '100%', // Prevent overflow on small screens
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 10,
    },
    inputLabel: {
        fontSize: 14,
        color: DARK_BROWN,
        marginBottom: 5,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    textInput: {
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
        borderRadius: 6,
        padding: 10,
        backgroundColor: '#fff',
        fontSize: 14,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    readOnlyInput: {
        backgroundColor: LIGHT_GRAY_BG,
        color: TEXT_GRAY,
    },
    errorInput: {
        borderColor: '#d32f2f',
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 12,
        marginTop: 4,
        fontFamily: Fonts.regular,
    },
    helperText: {
        fontSize: 12,
        color: TEXT_GRAY,
        fontFamily: Fonts.regular,
        fontStyle: 'italic',
        marginTop: 4,
        marginBottom: 10,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
        borderRadius: 6,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    pickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    pickerButtonText: {
        fontSize: 14,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
        flex: 1,
    },
    picker: {
        height: 50,
        width: '100%',
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
        display: 'none',
    },
    pickerItem: {
        fontSize: 14,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    // Custom Modal Picker Styles
    pickerModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalPickerContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        maxHeight: '60%',
        width: '80%',
        maxWidth: 400,
        elevation: 8,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    modalPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_LIGHT,
    },
    modalPickerTitle: {
        fontSize: 16,
        fontWeight: Fonts.weights.bold,
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
    },
    modalPickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: VERY_LIGHT_BROWN,
    },
    modalPickerItemSelected: {
        backgroundColor: '#fef5f0',
    },
    modalPickerItemText: {
        fontSize: 14,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
        flex: 1,
    },
    modalPickerItemTextSelected: {
        fontWeight: Fonts.weights.semiBold,
        fontFamily: Fonts.semiBold,
        color: PRIMARY_BROWN,
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
        borderColor: BORDER_LIGHT,
        borderRadius: 6,
        padding: 10,
        backgroundColor: '#fff',
    },
    datePickerText: {
        fontSize: 16,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    // Multi-Select Button
    multiSelectButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
        borderRadius: 6,
        padding: 10,
        backgroundColor: '#fff',
    },
    multiSelectText: {
        fontSize: 16,
        color: DARK_BROWN,
        flex: 1,
        fontFamily: Fonts.regular,
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
        backgroundColor: '#fff',
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
        borderBottomColor: LIGHT_GRAY_BG,
    },
    multiSelectItemText: {
        fontSize: 16,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    checkbox: {
        height: 24,
        width: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: PRIMARY_BROWN,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        marginTop: 20,
        padding: 15,
        backgroundColor: PRIMARY_BROWN,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalCloseText: {
        color: '#fff',
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    // --- Step Indicator ---
    stepIndicatorContainer: {
        marginBottom: 24,
        paddingVertical: 12,
    },
    stepCirclesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    stepItemWrapper: {
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
    },
    stepCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: VERY_LIGHT_BROWN,
        borderWidth: 2,
        borderColor: LIGHT_BROWN,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    stepCircleActive: {
        backgroundColor: PRIMARY_BROWN,
        borderColor: PRIMARY_BROWN,
    },
    stepCircleCompleted: {
        backgroundColor: PRIMARY_BROWN,
        borderColor: PRIMARY_BROWN,
    },
    stepCircleText: {
        fontSize: 16,
        fontWeight: Fonts.weights.bold,
        color: LIGHT_BROWN,
        fontFamily: Fonts.bold,
    },
    stepCircleTextActive: {
        color: '#fff',
    },
    stepConnector: {
        position: 'absolute',
        top: 20,
        left: '25.5%',
        width: '100%',
        height: 2,
        backgroundColor: VERY_LIGHT_BROWN,
        marginLeft: '50%',
        zIndex: 0,
    },
    stepConnectorActive: {
        backgroundColor: PRIMARY_BROWN,
    },
    // --- Step Connector for 2-step forms (Harvest) ---
    stepConnectorTwoStep: {
        position: 'absolute',
        top: 20,
        left: '63%',
        width: '90%',
        height: 2,
        backgroundColor: VERY_LIGHT_BROWN,
        zIndex: 0,
    },
    stepConnectorTwoStepActive: {
        backgroundColor: PRIMARY_BROWN,
    },
    stepLabelsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 8,
    },
    stepLabelWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    stepLabel: {
        fontSize: 11,
        fontWeight: Fonts.weights.semiBold,
        color: LIGHT_BROWN,
        textAlign: 'center',
        fontFamily: Fonts.semiBold,
        flexWrap: 'wrap',
        maxWidth: 70,
    },
    stepLabelActive: {
        color: PRIMARY_BROWN,
        fontWeight: Fonts.weights.bold,
        fontFamily: Fonts.bold,
    },
    // --- Step Navigation ---
    stepNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        paddingHorizontal: 5,
        gap: 12,
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
        color: PRIMARY_BROWN,
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
    nextButton: {
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        backgroundColor: PRIMARY_BROWN,
        marginHorizontal: 5,
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    // --- Step Navigation Container & Save Draft ---
    stepNavContainer: {
        width: '100%',
        marginTop: 20,
        paddingHorizontal: 5,
        gap: 12,
    },
    saveDraftButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: VERY_LIGHT_BROWN,
        borderWidth: 1,
        borderColor: PRIMARY_BROWN,
    },
    saveDraftButtonText: {
        color: PRIMARY_BROWN,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        marginLeft: 6,
    },
    generateButton: {
        marginTop: 5,
        marginBottom: 10,
        padding: 12,
        backgroundColor: VERY_LIGHT_BROWN,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    generateButtonText: {
        color: PRIMARY_BROWN,
        fontWeight: '600',
        fontSize: 12,
        fontFamily: Fonts.semiBold,
        textAlign: 'center',
        lineHeight: 18,
    },
    generateButtonSubtext: {
        color: PRIMARY_BROWN,
        fontWeight: '400',
        fontSize: 11,
        fontFamily: Fonts.regular,
        textAlign: 'center',
        lineHeight: 16,
    },
    viewRecordsButton: {
        padding: 10,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: DARK_BROWN,
    },
    viewRecordsButtonText: {
        color: DARK_BROWN,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
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
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 16,
        textAlign: 'center',
        color: TEXT_GRAY,
        fontFamily: Fonts.regular,
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
        color: '#fff',
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    // --- Data List (Replaces Table) ---
    recordsContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 10,
        elevation: 3,
    },
    tableHeaderSection: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: LIGHT_GRAY_BG,
    },
    tableTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 10,
    },
    backToFormText: {
        color: PRIMARY_BROWN,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
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
        backgroundColor: '#fff',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: PRIMARY_BROWN,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    dataListItemTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
    },
    dataListItemUID: {
        fontSize: 14,
        fontWeight: '500',
        color: PRIMARY_BROWN,
        fontFamily: Fonts.semiBold,
    },
    harvestIdButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        borderRadius: 4,
    },
    dataListItemSubtitle: {
        fontSize: 13,
        color: TEXT_GRAY,
        fontFamily: Fonts.regular,
        marginTop: 4,
    },
    // --- Draft Styles ---
    draftListItem: {
        backgroundColor: 'rgba(255, 193, 7, 0.05)', // Subtle yellow background for draft items
        borderLeftWidth: 4,
        borderLeftColor: '#FFC107', // Amber/yellow color for draft indicator
    },
    draftBadge: {
        backgroundColor: '#FFC107',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginLeft: 4,
    },
    draftBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
        fontFamily: Fonts.bold,
    },
    draftStepText: {
        fontSize: 12,
        color: '#FF9800',
        fontFamily: Fonts.regular,
        marginTop: 4,
        fontStyle: 'italic',
    },
    // --- Pending (Submitted but Unsynced) Styles ---
    pendingListItem: {
        backgroundColor: CoffeeColors.WHITE,
        borderLeftWidth: 4,
        borderLeftColor: LIGHT_BROWN, // Light brown for pending records (matching Harvest styling)
    },
    syncStatusInline: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    syncStatusText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        marginLeft: 4,
    },
    noRecords: {
        textAlign: 'center',
        padding: 20,
        color: TEXT_GRAY,
        fontFamily: Fonts.regular,
    },
    // --- Search Container ---
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchButton: {
        backgroundColor: PRIMARY_BROWN,
        width: 48,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -15, // Align with input field (accounts for label spacing)
        elevation: 2,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    // --- Action Button ---
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        elevation: 2,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    recordCount: {
        fontSize: 14,
        color: TEXT_GRAY,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    // --- Farmer Detail View ---
    detailViewContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 3,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: PRIMARY_BROWN,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_LIGHT,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: VERY_LIGHT_BROWN,
        borderRadius: 20,
    },
    detailHeaderTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        fontFamily: Fonts.bold,
        flex: 1,
        textAlign: 'center',
    },
    detailScrollView: {
        flex: 1,
    },
    detailContent: {
        padding: 16,
    },
    detailNameCard: {
        backgroundColor: '#fef5f0',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    detailFarmerName: {
        fontSize: 24,
        fontWeight: '700',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 8,
        textAlign: 'center',
    },
    detailFarmerId: {
        fontSize: 16,
        fontWeight: '600',
        color: PRIMARY_BROWN,
        fontFamily: Fonts.semiBold,
    },
    detailSection: {
        marginBottom: 24,
        backgroundColor: LIGHT_GRAY_BG,
        borderRadius: 10,
        padding: 16,
    },
    detailSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: PRIMARY_BROWN,
    },
    detailFieldRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_LIGHT,
    },
    detailFieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_GRAY,
        fontFamily: Fonts.semiBold,
        flex: 1,
    },
    detailFieldValue: {
        fontSize: 14,
        fontWeight: '500',
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
        flex: 2,
        textAlign: 'right',
    },
    // --- Autocomplete Dropdown ---
    autocompleteDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
        borderRadius: 6,
        marginTop: 2,
        maxHeight: 250,
        elevation: 5,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 1000,
    },
    autocompleteScroll: {
        maxHeight: 200,
    },
    autocompleteSuggestion: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: LIGHT_GRAY_BG,
    },
    autocompleteName: {
        fontSize: 16,
        fontWeight: '600',
        color: DARK_BROWN,
        fontFamily: Fonts.semiBold,
        marginBottom: 4,
    },
    autocompleteDetails: {
        fontSize: 13,
        color: TEXT_GRAY,
        fontFamily: Fonts.regular,
    },
    autocompleteClose: {
        padding: 10,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: LIGHT_GRAY_BG,
        backgroundColor: VERY_LIGHT_BROWN,
    },
    autocompleteCloseText: {
        fontSize: 14,
        fontWeight: '600',
        color: PRIMARY_BROWN,
        fontFamily: Fonts.semiBold,
    },
    // --- Farmer Name Display (below autocomplete) ---
    farmerNameDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -10,
        marginBottom: 15,
        padding: 10,
        backgroundColor: VERY_LIGHT_BROWN,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: PRIMARY_BROWN,
    },
    farmerNameText: {
        fontSize: 15,
        fontWeight: '600',
        color: DARK_BROWN,
        flex: 1,
    },
    // --- Record Actions (Edit/Delete Buttons) ---
    recordActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 12,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: LIGHT_GRAY_BG,
        elevation: 1,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    // --- Autocomplete Suggestions Dropdown ---
    suggestionsDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: VERY_LIGHT_BROWN,
        marginTop: 4,
        zIndex: 1000,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 5,
        maxHeight: 200,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: VERY_LIGHT_BROWN,
    },
    suggestionItemLast: {
        borderBottomWidth: 0,
    },
    suggestionName: {
        fontSize: 14,
        fontWeight: '600',
        color: DARK_BROWN,
        fontFamily: Fonts.semiBold,
        flex: 1,
    },
    suggestionSubtitle: {
        fontSize: 12,
        color: TEXT_GRAY,
        fontFamily: Fonts.regular,
        marginTop: 2,
    },
    suggestionArrow: {
        marginLeft: 8,
    },
});

export default AggregationScreen;
