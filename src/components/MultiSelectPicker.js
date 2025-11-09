import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../theme/colors';
import Fonts from '../theme/fonts';

const PRIMARY_BROWN = CoffeeColors.PRIMARY_BROWN;
const DARK_BROWN = CoffeeColors.DARK_BROWN;
const BORDER_LIGHT = CoffeeColors.VERY_LIGHT_BROWN;
const VERY_LIGHT_BROWN = CoffeeColors.VERY_LIGHT_BROWN;

/**
 * Capitalize first letter of a string
 */
const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return String(str).charAt(0).toUpperCase() + String(str).slice(1).toLowerCase();
};

/**
 * MultiSelectPicker Component
 * A dropdown-style picker with modal selection UI that allows multiple selections
 * Maintains the visual style of CustomPicker but with checkbox support
 *
 * @param {string} label - Label text for the picker
 * @param {array} selectedValues - Array of currently selected values
 * @param {function} onValueChange - Callback when values change (receives updated array)
 * @param {array} items - Array of items (can be strings or objects with {label, value})
 */
const MultiSelectPicker = ({ label, selectedValues = [], onValueChange, items = [] }) => {
    const [modalVisible, setModalVisible] = useState(false);

    const getSelectedLabel = () => {
        if (!selectedValues || selectedValues.length === 0) return '-- Select --';
        if (selectedValues.length === 1) {
            const selected = items.find(it => (it.value ?? it) === selectedValues[0]);
            return capitalizeFirstLetter(selected?.label ?? selectedValues[0] ?? '-- Select --');
        }
        return `${selectedValues.length} selected`;
    };

    const handleSelectItem = (value) => {
        const isSelected = selectedValues.includes(value);
        let newValues;

        if (isSelected) {
            // Remove item
            newValues = selectedValues.filter(v => v !== value);
        } else {
            // Add item
            newValues = [...selectedValues, value];
        }

        onValueChange(newValues);
    };

    const isItemSelected = (value) => {
        return selectedValues.includes(value);
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
            </View>

            {/* Custom Modal Picker with Checkboxes */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable style={styles.pickerModalContainer} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalPickerContent}>
                        <View style={styles.modalPickerHeader}>
                            <Text style={styles.modalPickerTitle}>{label || 'Select Options'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={DARK_BROWN} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={items}
                            keyExtractor={(_, index) => String(index)}
                            renderItem={({ item }) => {
                                const value = item.value ?? item.id ?? item;
                                const displayLabel = capitalizeFirstLetter(item.label ?? item.name ?? String(item));
                                const selected = isItemSelected(value);

                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.modalPickerItem,
                                            selected && styles.modalPickerItemSelected
                                        ]}
                                        onPress={() => handleSelectItem(value)}
                                    >
                                        <View style={styles.itemContent}>
                                            <View
                                                style={[
                                                    styles.checkbox,
                                                    selected && styles.checkboxChecked
                                                ]}
                                            >
                                                {selected && (
                                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                                )}
                                            </View>
                                            <Text style={[
                                                styles.modalPickerItemText,
                                                selected && styles.modalPickerItemTextSelected
                                            ]}>
                                                {displayLabel}
                                            </Text>
                                        </View>
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

const styles = StyleSheet.create({
    inputLabel: {
        fontSize: 14,
        color: DARK_BROWN,
        marginBottom: 5,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
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
        fontWeight: '700',
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
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: BORDER_LIGHT,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    checkboxChecked: {
        backgroundColor: PRIMARY_BROWN,
        borderColor: PRIMARY_BROWN,
    },
    modalPickerItemText: {
        fontSize: 14,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
        flex: 1,
    },
    modalPickerItemTextSelected: {
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: PRIMARY_BROWN,
    },
});

export default MultiSelectPicker;
