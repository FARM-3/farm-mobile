import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../theme/colors';
import Fonts from '../theme/fonts';

const PRIMARY_BROWN = CoffeeColors.PRIMARY_BROWN;
const DARK_BROWN = CoffeeColors.DARK_BROWN;
const LIGHT_GRAY_BG = CoffeeColors.LIGHT_GRAY;
const BORDER_LIGHT = CoffeeColors.VERY_LIGHT_BROWN;
const VERY_LIGHT_BROWN = CoffeeColors.VERY_LIGHT_BROWN;

/**
 * Capitalize first letter of a string, but preserve all-caps codes (like harvest IDs)
 */
const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    const strValue = String(str);

    // Check if the string contains uppercase letters with numbers (like harvest IDs: RK1611AA01)
    // If so, preserve it as-is
    if (/[A-Z0-9]{3,}/.test(strValue)) {
        return strValue;
    }

    return strValue.charAt(0).toUpperCase() + strValue.slice(1).toLowerCase();
};

/**
 * CustomPicker Component
 * A consistent picker component with modal selection UI used across the application
 *
 * @param {string} label - Label text for the picker
 * @param {any} selectedValue - Currently selected value
 * @param {function} onValueChange - Callback when value changes
 * @param {array} items - Array of items (can be strings or objects with {label, value})
 */
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
                        const displayLabel = capitalizeFirstLetter(it.label ?? it.name ?? String(it));
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
                            <Text style={styles.modalPickerTitle}>{label || 'Select Option'}</Text>
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
    picker: {
        height: 0,
        width: 0,
        opacity: 0,
        position: 'absolute',
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

export default CustomPicker;
