/**
 * SearchableWorkerPicker Component
 * A searchable dropdown that fetches staff members from the database
 * Also allows users to add a worker manually if not in system
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
    Alert,
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
const ACCENT = CoffeeColors.ACCENT;

/**
 * SearchableWorkerPicker Component
 *
 * @param {string} label - Label text for the picker
 * @param {any} selectedWorkerId - Currently selected worker ID or name
 * @param {function} onWorkerSelect - Callback when worker is selected, receives { id, displayName, isManual }
 * @param {object} selectedWorker - Currently selected worker object (for display purposes)
 */
const SearchableWorkerPicker = ({
    label = 'Select Worker',
    selectedWorkerId,
    onWorkerSelect,
    selectedWorker = null,
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [filteredStaff, setFilteredStaff] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAddWorkerForm, setShowAddWorkerForm] = useState(false);
    const [manualWorkerName, setManualWorkerName] = useState('');
    const [manualWorkerPhone, setManualWorkerPhone] = useState('');

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
        if (!searchTerm || searchTerm.trim() === '') {
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
            console.log('[SearchableWorkerPicker] Loading staff data...');
            const result = await fetchAllStaff(true); // Use cache

            console.log('[SearchableWorkerPicker] API Response:', {
                success: result.success,
                staffCount: result.staff?.length,
                hasError: !!result.error,
                error: result.error,
                fromCache: result.fromCache
            });

            if (result.success && result.staff.length > 0) {
                setStaffList(result.staff);
                setFilteredStaff(result.staff);
                console.log(`[SearchableWorkerPicker] Loaded ${result.staff.length} staff members`);
            } else {
                setError(result.error || 'No staff members found');
                console.warn('[SearchableWorkerPicker] No staff data received:', result);
            }
        } catch (err) {
            setError('Failed to load staff members');
            console.error('[SearchableWorkerPicker] Error loading staff:', err);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Validate phone number format (basic validation)
     */
    const isValidPhone = (phone) => {
        if (!phone.trim()) return true; // Phone is optional
        // Accept phone numbers with digits, spaces, dashes, plus, and parentheses
        const phoneRegex = /^[+]?[0-9\s\-()]{6,}$/;
        return phoneRegex.test(phone);
    };

    /**
     * Handle adding manual worker
     */
    const handleAddManualWorker = () => {
        if (!manualWorkerName.trim()) {
            Alert.alert('Validation Error', 'Please enter the worker name');
            return;
        }

        if (!isValidPhone(manualWorkerPhone)) {
            Alert.alert('Validation Error', 'Please enter a valid phone number (or leave empty)');
            return;
        }

        const newWorker = {
            id: `manual_${Date.now()}`, // Generate unique ID for manual workers
            displayName: manualWorkerName.trim(),
            firstName: manualWorkerName.trim(),
            lastName: '',
            phone: manualWorkerPhone.trim() || null,
            isManual: true,
        };

        console.log('[SearchableWorkerPicker] Added manual worker:', newWorker);

        // Call the callback with the manual worker
        onWorkerSelect(newWorker);

        // Reset form and close modal
        setManualWorkerName('');
        setManualWorkerPhone('');
        setShowAddWorkerForm(false);
        setModalVisible(false);
        setSearchTerm('');
    };

    /**
     * Handle staff selection from list
     */
    const handleSelectStaff = (staff) => {
        console.log('[SearchableWorkerPicker] Selected staff:', staff.displayName);
        onWorkerSelect({
            id: staff.id,
            displayName: staff.displayName,
            firstName: staff.firstName,
            lastName: staff.lastName,
            email: staff.email,
            isManual: false,
        });
        setModalVisible(false);
        setSearchTerm('');
        setShowAddWorkerForm(false);
    };

    /**
     * Get display text for the selected value
     */
    const getSelectedLabel = () => {
        if (selectedWorker) {
            return selectedWorker.displayName || '-- Select Worker --';
        }
        if (selectedWorkerId) {
            // Try to find worker from list if we have the ID but not the object
            const worker = staffList.find(s => String(s.id) === String(selectedWorkerId));
            if (worker) {
                return worker.displayName;
            }
            // If not found in staff list, it might be a manual worker
            return selectedWorkerId;
        }
        return '-- Select Worker --';
    };

    /**
     * Get display ID for below the field
     */
    const getSelectedId = () => {
        if (selectedWorker) {
            return selectedWorker.id;
        }
        return selectedWorkerId || null;
    };

    /**
     * Render individual staff item in list
     */
    const renderStaffItem = ({ item }) => {
        const isSelected = String(item.id) === String(selectedWorkerId);

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
     * Render manual worker form
     */
    const renderManualWorkerForm = () => {
        return (
            <View style={styles.manualWorkerForm}>
                <View style={styles.formHeader}>
                    <Text style={styles.formTitle}>Add New Worker</Text>
                    <TouchableOpacity
                        onPress={() => {
                            setShowAddWorkerForm(false);
                            setManualWorkerName('');
                            setManualWorkerPhone('');
                        }}
                    >
                        <Ionicons name="close" size={24} color={DARK_BROWN} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.formLabel}>Worker Name *</Text>
                <TextInput
                    style={styles.formInput}
                    placeholder="Enter worker name"
                    placeholderTextColor={MEDIUM_BROWN}
                    value={manualWorkerName}
                    onChangeText={setManualWorkerName}
                    autoCapitalize="words"
                />

                <Text style={styles.formLabel}>Phone Number (Optional)</Text>
                <TextInput
                    style={styles.formInput}
                    placeholder="Enter worker phone number"
                    placeholderTextColor={MEDIUM_BROWN}
                    value={manualWorkerPhone}
                    onChangeText={setManualWorkerPhone}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                />

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddManualWorker}
                >
                    <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.addButtonText}>Add Worker</Text>
                </TouchableOpacity>
            </View>
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
                onPress={() => {
                    console.log('[SearchableWorkerPicker] Opening modal, staff list size:', staffList.length);
                    setModalVisible(true);
                }}
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
                    <Text style={styles.idLabel}>Worker ID:</Text>
                    <Text style={styles.idValue}>{getSelectedId()}</Text>
                    {selectedWorker?.isManual && (
                        <View style={styles.manualBadge}>
                            <Text style={styles.manualBadgeText}>Manual</Text>
                        </View>
                    )}
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
                    setShowAddWorkerForm(false);
                }}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => {
                        setModalVisible(false);
                        setSearchTerm('');
                        setShowAddWorkerForm(false);
                    }}
                >
                    <View style={styles.modalContent}>
                        {!showAddWorkerForm ? (
                            <>
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

                                {/* Add Worker Button */}
                                <TouchableOpacity
                                    style={styles.addWorkerButtonContainer}
                                    onPress={() => setShowAddWorkerForm(true)}
                                >
                                    <Ionicons name="add-circle-outline" size={20} color={ACCENT} style={{ marginRight: 8 }} />
                                    <Text style={styles.addWorkerButtonText}>Add Worker Not in System</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            renderManualWorkerForm()
                        )}
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
        fontSize: 16,
        color: DARK_BROWN,
        marginBottom: 8,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    pickerButton: {
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
        borderRadius: 10,
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingVertical: 12,
        justifyContent: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
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
    manualBadge: {
        marginLeft: 8,
        backgroundColor: ACCENT,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    manualBadgeText: {
        fontSize: 11,
        color: '#fff',
        fontFamily: Fonts.semiBold,
        fontWeight: '600',
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
        maxHeight: '85%',
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
        fontSize: 18,
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
        borderRadius: 8,
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
        maxHeight: 300,
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
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: Fonts.semiBold,
        fontWeight: '600',
    },
    addWorkerButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginHorizontal: 12,
        marginBottom: 12,
        backgroundColor: '#fef5f0',
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: ACCENT,
    },
    addWorkerButtonText: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: ACCENT,
    },
    // Manual Worker Form Styles
    manualWorkerForm: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    formHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: BORDER_LIGHT,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: DARK_BROWN,
        fontFamily: Fonts.bold,
    },
    formLabel: {
        fontSize: 14,
        color: DARK_BROWN,
        marginBottom: 8,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    formInput: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: BORDER_LIGHT,
        fontSize: 14,
        color: DARK_BROWN,
        marginBottom: 16,
        fontFamily: Fonts.regular,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: PRIMARY_BROWN,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
});

export default SearchableWorkerPicker;
