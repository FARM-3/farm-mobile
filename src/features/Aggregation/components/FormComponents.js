import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, Switch, FlatList, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import CoffeeColors from '../../../theme/colors';
import { capitalizeFirstLetter } from '../utils/aggregationHelpers';

const PRIMARY_BROWN = CoffeeColors.PRIMARY_BROWN;
const DARK_BROWN = CoffeeColors.DARK_BROWN;
const VERY_LIGHT_BROWN = CoffeeColors.VERY_LIGHT_BROWN;
const BORDER_LIGHT = CoffeeColors.VERY_LIGHT_BROWN;
const TEXT_GRAY = CoffeeColors.GRAY_TEXT;

export const CustomInput = ({ label, value, onChangeText, keyboardType = 'default', editable = true, placeholder = '', error = '', styles }) => (
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

export const CustomPicker = ({ label, selectedValue, onValueChange, items = [], styles }) => {
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

export const CustomToggle = ({ label, value, onValueChange, styles }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingVertical: 5 }}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Switch value={!!value} onValueChange={onValueChange} trackColor={{ true: PRIMARY_BROWN }} thumbColor={value ? VERY_LIGHT_BROWN : '#fff'} />
    </View>
);

export const CustomMultiSelect = ({ label, selectedValues = [], onValueChange, items = [], styles }) => {
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

export const CustomDatePicker = ({ label, value, onChange, styles }) => {
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
export const AutocompleteInput = ({ label, value, onChangeText, onSelect, suggestions = [], keyboardType = 'default', placeholder = '', styles }) => {
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

export const StepIndicator = ({ currentStep, totalSteps, steps, styles }) => {
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
