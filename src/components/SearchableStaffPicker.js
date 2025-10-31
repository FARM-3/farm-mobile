/**
 * SearchableStaffPicker Component
 * A searchable dropdown that fetches staff members from the database
 * Shows full name, searchable, and displays ID below the field
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    FlatList,
    ActivityIndicator,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../theme/colors';
import Fonts from '../theme/fonts';
import { fetchAllStaff, searchStaff } from '../services/staffService';

const PRIMARY_BROWN = CoffeeColors.PRIMARY_BROWN;
const DARK_BROWN = CoffeeColors.DARK_BROWN;
const LIGHT_GRAY_BG = CoffeeColors.LIGHT_GRAY;
const BORDER_LIGHT = CoffeeColors.VERY_LIGHT_BROWN;
const VERY_LIGHT_BROWN = CoffeeColors.VERY_LIGHT_BROWN;
const MEDIUM_BROWN = CoffeeColors.MEDIUM_BROWN;

/**
 * SearchableStaffPicker Component
 *
 * @param {string} label - Label text for the picker
 * @param {any} selectedStaffId - Currently selected staff ID
 * @param {function} onStaffSelect - Callback when staff is selected, receives { id, displayName }
 * @param {object} selectedStaff - Currently selected staff object (for display purposes)
 */
const SearchableStaffPicker = ({
    label = 'Select Staff',
    selectedStaffId,
    onStaffSelect,
    selectedStaff = null,
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [filteredStaff, setFilteredStaff] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Load staff data when component mounts
     */
    useEffect(() => {
        loadStaffData();
    }, []);

    /**
     * Filter staff based on search term
     */
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredStaff(staffList);
        } else {
            const filtered = searchStaff(staffList, searchTerm);
            setFilteredStaff(filtered);
        }
    }, [searchTerm, staffList]);

    /**
     * Fetch staff from API or cache
     */
    const loadStaffData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('[SearchableStaffPicker] Loading staff data...');
            const result = await fetchAllStaff(true); // Use cache

            if (result.success && result.staff.length > 0) {
                setStaffList(result.staff);
                setFilteredStaff(result.staff);
                console.log(`[SearchableStaffPicker] Loaded ${result.staff.length} staff members`);
            } else {
                setError('No staff members found');
                console.warn('[SearchableStaffPicker] No staff data received');
            }
        } catch (err) {
            setError('Failed to load staff members');
            console.error('[SearchableStaffPicker] Error loading staff:', err);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handle staff selection
     */
    const handleSelectStaff = (staff) => {
        console.log('[SearchableStaffPicker] Selected staff:', staff.displayName);
        onStaffSelect({
            id: staff.id,
            displayName: staff.displayName,
            firstName: staff.firstName,
            lastName: staff.lastName,
        });
        setModalVisible(false);
        setSearchTerm(''); // Reset search on close
    };

    /**
     * Get display text for the selected value
     */
    const getSelectedLabel = () => {
        if (selectedStaff) {
            return selectedStaff.displayName || '-- Select Staff --';
        }
        if (selectedStaffId) {
            // Try to find staff from list if we have the ID but not the object
            const staff = staffList.find(s => String(s.id) === String(selectedStaffId));
            if (staff) {
                return staff.displayName;
            }
        }
        return '-- Select Staff Member --';
    };

    /**
     * Get display ID for below the field
     */
    const getSelectedId = () => {
        if (selectedStaff) {
            return selectedStaff.id;
        }
        return selectedStaffId || null;
    };

    /**
     * Render individual staff item in list
     */
    const renderStaffItem = ({ item }) => {
        const isSelected = String(item.id) === String(selectedStaffId);

        return (
            <TouchableOpacity
                style={[
                    styles.staffItem,
                    isSelected && styles.staffItemSelected,
                ]}
                onPress={() => handleSelectStaff(item)}
            >
                <View style={styles.staffItemContent}>
                    <Text
                        style={[
                            styles.staffItemName,
                            isSelected && styles.staffItemNameSelected,
                        ]}
                    >
                        {item.displayName}
                    </Text>
                    {item.email && (
                        <Text
                            style={[
                                styles.staffItemEmail,
                                isSelected && styles.staffItemEmailSelected,
                            ]}
                        >
                            {item.email}
                        </Text>
                    )}
                </View>
                {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={PRIMARY_BROWN} />
                )}
            </TouchableOpacity>
        );
    };

    /**
     * Render empty state
     */
    const renderEmptyState = () => {
        if (isLoading) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_BROWN} />
                    <Text style={styles.emptyText}>Loading staff members...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={DARK_BROWN} />
                    <Text style={styles.emptyText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={loadStaffData}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (filteredStaff.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={48} color={DARK_BROWN} />
                    <Text style={styles.emptyText}>
                        {searchTerm ? 'No staff members found' : 'No staff members available'}
                    </Text>
                </View>
            );
        }

        return null;
    };

    return (
        <View style={styles.container}>
            {/* Label */}
            {label && (
                <Text style={styles.label}>{label}</Text>
            )}

            {/* Button to open modal */}
            <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setModalVisible(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>
                        {getSelectedLabel()}
                    </Text>
                    <Ionicons
                        name="chevron-down"
                        size={20}
                        color={DARK_BROWN}
                    />
                </View>
            </TouchableOpacity>

            {/* Display selected ID below the field */}
            {getSelectedId() && (
                <View style={styles.idDisplay}>
                    <Text style={styles.idLabel}>Staff ID:</Text>
                    <Text style={styles.idValue}>{getSelectedId()}</Text>
                </View>
            )}

            {/* Modal with search and list */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setModalVisible(false);
                    setSearchTerm('');
                }}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => {
                        setModalVisible(false);
                        setSearchTerm('');
                    }}
                >
                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label}</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setModalVisible(false);
                                    setSearchTerm('');
                                }}
                            >
                                <Ionicons
                                    name="close"
                                    size={24}
                                    color={DARK_BROWN}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Search Input */}
                        <View style={styles.searchContainer}>
                            <Ionicons
                                name="search-outline"
                                size={20}
                                color={MEDIUM_BROWN}
                                style={styles.searchIcon}
                            />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name, email, or ID..."
                                placeholderTextColor={MEDIUM_BROWN}
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {searchTerm ? (
                                <TouchableOpacity
                                    onPress={() => setSearchTerm('')}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons
                                        name="close-circle"
                                        size={20}
                                        color={MEDIUM_BROWN}
                                    />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {/* Results count */}
                        {!isLoading && staffList.length > 0 && (
                            <Text style={styles.resultCount}>
                                {filteredStaff.length > 0
                                    ? `${filteredStaff.length} staff member${filteredStaff.length !== 1 ? 's' : ''}`
                                    : 'No results'}
                            </Text>
                        )}

                        {/* Staff List */}
                        <FlatList
                            data={filteredStaff}
                            renderItem={renderStaffItem}
                            keyExtractor={(item) => String(item.id)}
                            ListEmptyComponent={renderEmptyState()}
                            scrollEnabled={true}
                            keyboardShouldPersistTaps="handled"
                            style={styles.staffList}
                        />
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        color: DARK_BROWN,
        marginBottom: 5,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    pickerButton: {
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
        borderRadius: 6,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 12,
        justifyContent: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 14,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
        flex: 1,
    },
    idDisplay: {
        marginTop: 8,
        paddingHorizontal: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    idLabel: {
        fontSize: 12,
        color: MEDIUM_BROWN,
        fontFamily: Fonts.regular,
        marginRight: 8,
    },
    idValue: {
        fontSize: 12,
        color: PRIMARY_BROWN,
        fontFamily: Fonts.semiBold,
        backgroundColor: '#fef5f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        maxHeight: '80%',
        width: '90%',
        maxWidth: 500,
        elevation: 8,
        shadowColor: DARK_BROWN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_LIGHT,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        marginVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: LIGHT_GRAY_BG,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 14,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    resultCount: {
        fontSize: 12,
        color: MEDIUM_BROWN,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontFamily: Fonts.regular,
    },
    staffList: {
        maxHeight: 400,
    },
    staffItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: VERY_LIGHT_BROWN,
    },
    staffItemSelected: {
        backgroundColor: '#fef5f0',
    },
    staffItemContent: {
        flex: 1,
    },
    staffItemName: {
        fontSize: 14,
        color: DARK_BROWN,
        fontFamily: Fonts.regular,
        marginBottom: 2,
    },
    staffItemNameSelected: {
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: PRIMARY_BROWN,
    },
    staffItemEmail: {
        fontSize: 12,
        color: MEDIUM_BROWN,
        fontFamily: Fonts.regular,
    },
    staffItemEmailSelected: {
        color: PRIMARY_BROWN,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        color: MEDIUM_BROWN,
        textAlign: 'center',
        marginTop: 12,
        fontFamily: Fonts.regular,
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: PRIMARY_BROWN,
        borderRadius: 6,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: Fonts.semiBold,
        fontWeight: '600',
    },
});

export default SearchableStaffPicker;
