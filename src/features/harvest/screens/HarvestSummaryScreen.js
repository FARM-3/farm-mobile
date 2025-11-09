e// src/features/harvest/screens/HarvestSummaryScreen.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    TextInput,
    ScrollView
} from 'react-native';
import NetInfo from "@react-native-community/netinfo";
// NOTE: These Expo imports will only work in an Expo environment
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import {
    fetchAllHarvestRecords,
    getUnsyncedRecords,
    syncAllRecords,
    deleteHarvestRecord
} from '../../../services/harvestRecord';
// Import shared components
import SimpleHeader from '../../../components/SimpleHeader';
import CustomPicker from '../../../components/CustomPicker';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';

// --- Constants for Filters ---
const BLOCK_OPTIONS = ["All Blocks", "Block A-1", "Block B-2", "Block C-3"];
const SYNC_STATUS_OPTIONS = ["All Statuses", "Synced", "Pending"];

// ===============================================
// === HARVEST DETAIL VIEW COMPONENT      ===
// ===============================================

/**
 * HarvestDetailView - Mobile-friendly detail screen for viewing harvest information
 * Displays all harvest data organized in logical sections with proper labels
 */
const HarvestDetailView = ({ harvest, onBack }) => {
    if (!harvest) return null;

    // Helper to format field values properly
    const formatValue = (value) => {
        if (value === null || value === undefined || value === '') return 'Not provided';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Not provided';
        return String(value);
    };

    // Field sections for organized display - showing ALL available data
    const sections = [
        {
            title: 'Harvest Details',
            fields: [
                { label: 'Harvest ID', value: harvest.id || harvest.harvest_id },
                { label: 'Farmer Name', value: harvest.name || 'N/A' },
                { label: 'Date of Delivery', value: harvest.date },
                { label: 'Weight on Delivery', value: harvest.weight },
                { label: 'Weight After Floating', value: harvest.weight_after_floating ? `${harvest.weight_after_floating} kg` : 'Not provided' },
                { label: 'Location on Delivery', value: harvest.location_on_delivery || 'Not provided' },
                { label: 'GPS Coordinates', value: harvest.gps_coordinates || 'Not captured' },
                { label: 'Block', value: harvest.block || 'N/A' },
                { label: 'Number of Bags', value: harvest.number_of_bags || 'N/A' },
            ]
        },
        {
            title: 'Coffee Quality',
            fields: [
                { label: 'Coffee Type/Grade', value: harvest.grade || harvest.coffee_type || 'N/A' },
                { label: 'Cherry Color', value: harvest.cherry_color || harvest.cherry_colour || 'N/A' },
                { label: 'Stage', value: harvest.stage || 'N/A' },
            ]
        },
        {
            title: 'Payment Information',
            fields: [
                { label: 'Price per Kg', value: harvest.price_per_kg ? `${harvest.price_per_kg} UGX` : 'N/A' },
                { label: 'Amount Paid', value: harvest.amountPaid ? `${harvest.amountPaid} UGX` : 'N/A' },
                { label: 'Paid By', value: harvest.paidBy || harvest.paid_by || harvest.who_paid || 'N/A' },
            ]
        },
        {
            title: 'Additional Information',
            fields: [
                { label: 'Recorder ID', value: harvest.recorder_id || 'N/A' },
                { label: 'Timestamp', value: harvest.timestamp ? new Date(harvest.timestamp).toLocaleString() : 'N/A' },
                { label: 'Sync Status', value: harvest.isSynced ? 'Synced' : 'Pending' },
            ]
        }
    ];

    return (
        <View style={styles.detailViewContainer}>
            {/* Header with back button */}
            <View style={styles.detailHeader}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={CoffeeColors.DARK_BROWN} />
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>Harvest Details</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Scrollable content */}
            <ScrollView style={styles.detailScrollView} contentContainerStyle={styles.detailContent}>
                {/* Harvest Name and ID Card */}
                <View style={styles.detailNameCard}>
                    <Ionicons name="leaf" size={32} color={CoffeeColors.DARK_BROWN} style={{ marginBottom: 8 }} />
                    <Text style={styles.detailFarmerName}>
                        {harvest.name || 'Unknown Farmer'}
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

export default function HarvestSummaryScreen({ route = {}, navigation }) {
    const [allRecords, setAllRecords] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState("Checking connectivity and syncing...");
    const [unsyncedCount, setUnsyncedCount] = useState(0);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBlock, setFilterBlock] = useState(BLOCK_OPTIONS[0]);
    const [filterStatus, setFilterStatus] = useState(SYNC_STATUS_OPTIONS[0]);

    // NEW: State for detail view
    const [selectedHarvest, setSelectedHarvest] = useState(null);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'detail'

    // State for custom alert modal
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', buttons: [] });

    // State for success message with auto-dismiss
    const [successMessage, setSuccessMessage] = useState('');
    const successTimeoutRef = useRef(null);

    // Ref for synchronized scrolling
    const headerScrollRef = useRef(null);
    const rowScrollRefs = useRef([]);

    /**
     * Primary function to fetch, sync, and combine all data sources.
     */
    const loadAndSyncData = useCallback(async () => {
        setIsLoading(true);
        let remoteRecords = [];
        let localRecords = [];

        // 1. Checking Internet Connectivity
        const netState = await NetInfo.fetch();
        const isConnected = netState.isConnected && netState.isInternetReachable;

        if (isConnected) {
            setSyncStatus("Online: Initiating data synchronization.");

            // 2. Attempting Sync
            const syncResult = await syncAllRecords();
            console.log('[HarvestSummary] Sync result:', syncResult);

            if (syncResult.totalCount > 0) {
                if (syncResult.syncedCount === syncResult.totalCount) {
                    // All records synced successfully
                    setSyncStatus(`✓ Success! All ${syncResult.syncedCount} records uploaded to cloud.`);
                } else if (syncResult.syncedCount > 0) {
                    // Partial success
                    const failedCount = syncResult.totalCount - syncResult.syncedCount;
                    setSyncStatus(`Partial: ${syncResult.syncedCount} uploaded, ${failedCount} failed. Check logs for details.`);
                } else {
                    // All failed
                    setSyncStatus(`Failed: Could not sync ${syncResult.totalCount} records. Check connectivity and try again.`);
                }
            } else {
                setSyncStatus("Online: No pending records to sync.");
            }
            
            // 3. Fetching Remote Data
            const remoteResponse = await fetchAllHarvestRecords();
            if (remoteResponse.success && Array.isArray(remoteResponse.remoteData.results)) {
                // Maping remote data (snake_case) to local data structure (camelCase)
                 remoteRecords = remoteResponse.remoteData.results.map(r => ({
                     // Map ALL API fields to local camelCase structure
                     id: r.id,
                     block: r.block_ID,
                     name: r.Worker_name,
                     isSynced: true,


                     weight: `${r.weight_on_delivery} kg`,
                     date: r.date_of_delivery,
                     amountPaid: Number(r.amount_paid),
                     paidBy: r.paid_by,
                 }));
            }
        } else {
            setSyncStatus("Offline Mode: Data saved locally. Sync will occur when online.");
        }
        
        // 4. Fetching Local Data (always fetch, regardless of connectivity)
        const localResponse = await getUnsyncedRecords();
        if (localResponse.success && Array.isArray(localResponse.records)) {
            // Maping local data and format for display consistency with remote data
            localRecords = localResponse.records.map(r => ({
                id: r.id,
                block: r.blockId,
                name: r.workerName,
                isSynced: false,
                weight: `${r.weight} kg`,
                date: r.dateReadable || r.date.split('T')[0],
                amountPaid: Number(r.amountPaid),
                paidBy: r.paidBy,
            }));
        }

        // 5. Combining Data: Local (Pending) + Remote (Synced)
        const localIds = new Set(localRecords.map(r => r.id));
        // Filtering out remote records that might still be in the local queue (shouldn't happen with syncAllRecords, but good safeguard)
        const uniqueRemoteRecords = remoteRecords.filter(r => !localIds.has(r.id));
        
        let finalRecords = [...localRecords, ...uniqueRemoteRecords];
        
        // Sorting by date (newest first), then by timestamp if dates are equal
        finalRecords.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            const dateDiff = dateB - dateA;

            // If dates are different, sort by date
            if (dateDiff !== 0) return dateDiff;

            // If dates are the same, sort by timestamp (newest first)
            const timeA = a.timestamp || 0;
            const timeB = b.timestamp || 0;
            return timeB - timeA;
        });

        // Count unsynced records
        const pendingRecords = finalRecords.filter(r => !r.isSynced);
        setUnsyncedCount(pendingRecords.length);

        setAllRecords(finalRecords);
        setIsLoading(false);
    }, []);

    // --- Filtering & Searching Logic ---
    useEffect(() => {
        let result = allRecords;

        // 1. Search Filter (by Name or ID)
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(record => 
                record.name?.toLowerCase().includes(lowerSearch) ||
                record.id?.toString().toLowerCase().includes(lowerSearch)
            );
        }

        // 2. Block Filter
        if (filterBlock !== BLOCK_OPTIONS[0]) {
            result = result.filter(record => record.block === filterBlock);
        }

        // 3. Sync Status Filter
        if (filterStatus === "Synced") {
            result = result.filter(record => record.isSynced === true);
        } else if (filterStatus === "Pending") {
            result = result.filter(record => record.isSynced === false);
        }

        setFilteredData(result);
    }, [allRecords, searchTerm, filterBlock, filterStatus]);

    // Initial load and refresh when screen comes into focus
    useEffect(() => {
        loadAndSyncData();
    }, [loadAndSyncData]);

    // Refresh data whenever the screen comes into focus (e.g., after form submission)
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            console.log('[HarvestSummary] Screen focused, refreshing data...');
            loadAndSyncData();
        });
        return unsubscribe;
    }, [navigation, loadAndSyncData]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
            }
        };
    }, []);

    const handleSyncPress = async () => {
        if (unsyncedCount > 0) {
            // If there are unsynced records, sync them
            await loadAndSyncData();
        } else {
            // If no unsynced records, show a message
            Alert.alert(
                "No Records to Sync",
                "All harvest records are already synced to the cloud.",
                [{ text: "OK" }]
            );
        }
    };


    // --- Export Functionality
    const convertToCSV = (rows) => {
        const header = ['Id', 'Weight(kg)', 'Block', 'Date', 'Worker Name', 'Amount Paid(UGX)', 'Paid By', 'Sync Status'];
        const csvRows = [header.join(',')];

        rows.forEach((row) => {
            const amountPaidValue = row.amountPaid !== undefined
                ? row.amountPaid
                : 0; // Fallback

            const weightValue = row.weight.replace(' kg', ''); // Remove ' kg' suffix for clean number export

            const values = [
                row.id,
                weightValue,
                row.block,
                row.date,
                row.name || 'N/A',
                amountPaidValue,
                row.paidBy || 'N/A',
                row.isSynced ? 'Synced' : 'Pending',
            ];
            // Quote values for CSV safety and join them
            csvRows.push(values.map(v => `"${v}"`).join(','));
        });

        return csvRows.join('\n');
    };

    const exportToExcel = async () => {
        if (filteredData.length === 0) {
            Alert.alert("Export Failed", "There is no data to export.");
            return;
        }
        try {
            const csv = convertToCSV(filteredData);
            const fileUri = FileSystem.documentDirectory + 'harvest_summary.csv';

            await FileSystem.writeAsStringAsync(fileUri, csv, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert('Error', 'Sharing is not available on this device');
                return;
            }

            await Sharing.shareAsync(fileUri);
        } catch (error) {
            Alert.alert('Export Failed', error.message);
        }
    };

    const handleEdit = (item) => {
        // Navigate to edit form (you'll need to create this or modify HarvestFormScreen)
        navigation.navigate('HarvestForm', { editData: item });
    };

    const showSuccessMessage = (message) => {
        setSuccessMessage(message);
        // Clear any existing timeout
        if (successTimeoutRef.current) {
            clearTimeout(successTimeoutRef.current);
        }
        // Auto-dismiss after 2.5 seconds
        successTimeoutRef.current = setTimeout(() => {
            setSuccessMessage('');
        }, 2500);
    };

    const handleDelete = (item) => {
        setAlertConfig({
            visible: true,
            title: 'Delete Harvest Record',
            message: `Are you sure you want to delete the harvest record for ${item.name}?`,
            type: 'warning',
            buttons: [
                {
                    text: 'Cancel',
                    onPress: () => setAlertConfig({ ...alertConfig, visible: false })
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setAlertConfig({ ...alertConfig, visible: false });
                        try {
                            // Call delete API
                            const result = await deleteHarvestRecord(item.id);

                            if (result.success) {
                                // Show success message first
                                showSuccessMessage('Harvest record deleted successfully');
                                // Refresh the data after a brief delay
                                setTimeout(() => {
                                    loadAndSyncData();
                                }, 1000);
                            } else {
                                setAlertConfig({
                                    visible: true,
                                    title: 'Delete Failed',
                                    message: `Failed to delete record. Status: ${result.status}. ${result.remoteData?.detail || ''}`,
                                    type: 'error',
                                    buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }]
                                });
                            }
                        } catch (error) {
                            setAlertConfig({
                                visible: true,
                                title: 'Error',
                                message: `An error occurred while deleting: ${error.message}`,
                                type: 'error',
                                buttons: [{ text: 'OK', onPress: () => setAlertConfig({ ...alertConfig, visible: false }) }]
                            });
                        }
                    }
                }
            ]
        });
    };

    const handleScroll = (event, index) => {
        const scrollX = event.nativeEvent.contentOffset.x;

        // Sync header
        if (headerScrollRef.current) {
            headerScrollRef.current.scrollTo({ x: scrollX, animated: false });
        }

        // Sync all other rows
        rowScrollRefs.current.forEach((ref, i) => {
            if (ref && i !== index) {
                ref.scrollTo({ x: scrollX, animated: false });
            }
        });
    };

    const renderRow = ({ item, index }) => (
        <TouchableOpacity
            style={[styles.dataListItem, item.isSynced ? styles.syncedRow : styles.pendingRow]}
            onPress={() => {
                setSelectedHarvest(item);
                setViewMode('detail');
            }}
        >
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={styles.dataListItemTitle}>
                        {item.name || 'N/A'}
                        <Text style={styles.dataListItemUID}> ({item.id})</Text>
                    </Text>
                    {/* Draft Badge - Shows only for incomplete draft records */}
                    {item._isDraft && (
                        <View style={styles.draftBadge}>
                            <Text style={styles.draftBadgeText}>DRAFT</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.dataListItemSubtitle}>
                    Weight: {item.weight} | Date: {item.date} | Paid: {item.amountPaid ? `${item.amountPaid} UGX` : 'N/A'}
                </Text>
                <Text style={styles.dataListItemSubtitle}>
                    Block: {item.block} | Paid By: {item.paidBy || 'N/A'}
                </Text>
                {/* Show draft step if it's a draft */}
                {item._isDraft && (
                    <Text style={styles.draftStepText}>
                        Saved at: {item._draftStepTitle || 'Unknown Step'}
                    </Text>
                )}
                {/* Pending Status - Shows for submitted but unsynced records */}
                {!item._isDraft && !item.isSynced && (
                    <View style={styles.syncStatusInline}>
                        <Ionicons name="cloud-upload-outline" size={14} color={CoffeeColors.LIGHT_BROWN} />
                        <Text style={[styles.syncStatusText, { color: CoffeeColors.LIGHT_BROWN }]}>Pending</Text>
                    </View>
                )}
            </View>

            {/* Edit, Sync Draft (if draft), Voucher (for harvests), and Delete Icon Buttons */}
            <View style={styles.recordActions}>
                {/* Sync Draft Button - Only shows for draft records */}
                {item._isDraft && (
                    <TouchableOpacity
                        style={[styles.iconButton, styles.syncButton]}
                        onPress={(e) => {
                            e.stopPropagation(); // Prevent triggering the main onPress
                            // handleSyncDraft(item); // Sync draft to database
                        }}
                    >
                        <Ionicons name="cloud-upload-outline" size={20} color="#4CAF50" />
                    </TouchableOpacity>
                )}

                {/* Voucher Button - Only shows for harvest records */}
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={(e) => {
                        e.stopPropagation(); // Prevent triggering the main onPress
                        // onVoucher(item);
                    }}
                >
                    <Ionicons name="document-text" size={20} color={CoffeeColors.DARK_BROWN} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={(e) => {
                        e.stopPropagation(); // Prevent triggering the main onPress
                        handleEdit(item, true); // Pass true to indicate edit mode vs view mode
                    }}
                >
                    <Ionicons name="pencil" size={20} color={CoffeeColors.DARK_BROWN} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={(e) => {
                        e.stopPropagation(); // Prevent triggering the main onPress
                        handleDelete(item);
                    }}
                >
                    <Ionicons name="trash" size={20} color={'#d32f2f' || '#d32f2f'} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
                <Text style={styles.loadingText}>Loading data and checking sync status...</Text>
            </View>
        );
    }

    // Handler for back press
    const handleBackPress = () => {
        if (viewMode === 'detail') {
            setViewMode('table');
            setSelectedHarvest(null);
        } else {
            navigation.goBack();
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader
                title="Rugyeyo Harvests"
                unsyncedCount={unsyncedCount}
                onSync={handleSyncPress}
                onBackPress={handleBackPress}
            />
            {/* Success Message Banner */}
            {successMessage ? (
                <View style={styles.successBanner}>
                    <Ionicons name="checkmark-circle" size={20} color={CoffeeColors.WHITE} style={{ marginRight: 8 }} />
                    <Text style={styles.successText}>{successMessage}</Text>
                </View>
            ) : null}

            {/* Main scrollable content container */}
            <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <View style={styles.container}>

                {viewMode === 'table' && (
                    <>
                        {/* Add New Harvest Button */}
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => navigation.navigate('HarvestForm')}
                        >
                            <Ionicons name="add-circle" size={20} color={CoffeeColors.WHITE} />
                            <Text style={styles.addButtonText}>Record New Harvest</Text>
                        </TouchableOpacity>

                        {/* Sync Status Banner */}
                        <View style={styles.syncBanner}>
                        <Text style={styles.syncText}>{syncStatus}</Text>
                        <TouchableOpacity onPress={loadAndSyncData} style={{ marginLeft: 10 }}>
                            <Ionicons name="reload-circle-sharp" size={24} color={CoffeeColors.WHITE} />
                        </TouchableOpacity>
                    </View>

                    {/* Export Button */}
                    <TouchableOpacity
                        style={styles.exportButton}
                        onPress={exportToExcel}
                        disabled={filteredData.length === 0}
                    >
                        <Ionicons name="download-outline" size={18} color={CoffeeColors.WHITE} />
                        <Text style={styles.exportText}>Export {filteredData.length} Records to CSV</Text>
                    </TouchableOpacity>

                    {/* Data Rows */}
                    <FlatList
                        data={filteredData}
                        renderItem={renderRow}
                        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                        ListEmptyComponent={<Text style={styles.emptyText}>No harvest records found.</Text>}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    />
                    </>
                )}

                {viewMode === 'detail' && selectedHarvest && (
                    <HarvestDetailView
                        harvest={selectedHarvest}
                        onBack={() => {
                            setSelectedHarvest(null);
                            setViewMode('table');
                        }}
                    />
                )}
                </View>
            </View>
            {/* BottomNav now part of layout, not floating */}
            <BottomNav activeScreen="Harvests" />

            {/* Custom Alert Modal */}
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CoffeeColors.LIGHT_GRAY,
        padding: 15,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: CoffeeColors.LIGHT_GRAY,
    },
    loadingText: {
        marginTop: 10,
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    addButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: CoffeeColors.DARK_BROWN,
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    addButtonText: {
        color: CoffeeColors.WHITE,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        marginLeft: 8,
        fontSize: 14,
    },
    syncBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: CoffeeColors.DARK_BROWN,
        padding: 8,
        borderRadius: 8,
        marginBottom: 10,
    },
    syncText: {
        color: CoffeeColors.CREAM,
        fontSize: 12,
        flexShrink: 1,
        fontFamily: Fonts.regular,
    },
    searchBar: {
        backgroundColor: CoffeeColors.WHITE,
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
    },
    filtersContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    pickerWrap: {
        flex: 1,
        marginHorizontal: 4,
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        overflow: 'hidden',
    },
    exportButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    exportText: {
        color: CoffeeColors.WHITE,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        marginLeft: 8,
    },
    rowScrollView: {
        marginBottom: 5,
    },
    row: {
        flexDirection: 'row',
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 6,
        paddingVertical: 10,
        paddingHorizontal: 5,
        minWidth: 900, // Ensures horizontal scrolling
    },
    headerRow: {
        backgroundColor: CoffeeColors.DARK_BROWN,
        marginBottom: 8,
        borderRadius: 6,
        paddingVertical: 8,
    },
    headerCell: {
        width: 100,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        color: CoffeeColors.CREAM,
        textAlign: 'center',
        fontSize: 12,
        paddingHorizontal: 5,
    },
    syncedRowOld: {
        borderLeftWidth: 5,
        borderLeftColor: CoffeeColors.MEDIUM_BROWN,
    },
    pendingRowOld: {
        borderLeftWidth: 5,
        borderLeftColor: CoffeeColors.LIGHT_BROWN,
    },
    cell: {
        width: 100,
        color: CoffeeColors.GRAY_TEXT,
        textAlign: 'center',
        fontSize: 12,
        alignSelf: 'center',
        paddingHorizontal: 5,
        fontFamily: Fonts.regular,
    },
    statusCell: {
        width: 100,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    actionsCell: {
        width: 100,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
    },
    editButton: {
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        borderRadius: 5,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: CoffeeColors.DARK_BROWN,
        borderRadius: 5,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellText: {
        fontSize: 12,
        fontFamily: Fonts.regular,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: CoffeeColors.MEDIUM_BROWN,
        fontStyle: 'italic',
        fontFamily: Fonts.regular,
    },
    // --- Data List (Replaces Table) ---
    dataListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_GRAY_BG,
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 8,
        marginBottom: 8,
        paddingHorizontal: 15,
        elevation: 2,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    dataListItemTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.bold,
    },
    dataListItemUID: {
        fontSize: 14,
        fontWeight: '500',
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.semiBold,
    },
    dataListItemSubtitle: {
        fontSize: 13,
        color: CoffeeColors.GRAY_TEXT,
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
    pendingRow: {
        backgroundColor: CoffeeColors.WHITE,
        borderLeftWidth: 4,
        borderLeftColor: CoffeeColors.LIGHT_BROWN, // Light brown for pending records
    },
    syncedRow: {
        backgroundColor: CoffeeColors.WHITE,
        borderLeftWidth: 4,
        borderLeftColor: CoffeeColors.MEDIUM_BROWN,
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
        backgroundColor: CoffeeColors.LIGHT_GRAY,
        elevation: 1,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    syncButton: {
        backgroundColor: '#E8F5E8',
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
        backgroundColor: CoffeeColors.DARK_BROWN,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_BROWN,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: CoffeeColors.LIGHT_BROWN,
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
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    detailFarmerName: {
        fontSize: 24,
        fontWeight: '700',
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 8,
        textAlign: 'center',
    },
    detailFarmerId: {
        fontSize: 16,
        fontWeight: '600',
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.semiBold,
    },
    detailSection: {
        marginBottom: 24,
        backgroundColor: CoffeeColors.LIGHT_GRAY_BG,
        borderRadius: 10,
        padding: 16,
    },
    detailSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: CoffeeColors.DARK_BROWN,
    },
    detailFieldRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_BROWN,
    },
    detailFieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: CoffeeColors.GRAY_TEXT,
        fontFamily: Fonts.semiBold,
        flex: 1,
    },
    detailFieldValue: {
        fontSize: 14,
        fontWeight: '500',
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.regular,
        flex: 2,
        textAlign: 'right',
    },
    // --- Success Message Banner ---
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: '#4CAF50',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#388E3C',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },
    successText: {
        fontSize: 14,
        fontWeight: '600',
        color: CoffeeColors.WHITE,
        fontFamily: Fonts.semiBold,
        flex: 1,
    },
});






// // src/features/harvest/screens/HarvestSummaryScreen.js

// import React, { useState, useEffect, useCallback } from 'react';
// import { 
//   View, 
//   Text, 
//   FlatList, 
//   TouchableOpacity, 
//   StyleSheet, 
//   Alert, 
//   ActivityIndicator,
//   TextInput
// } from 'react-native';
// // Note: You may need to install these packages:
// // npm install @react-native-community/netinfo @react-native-picker/picker
// import NetInfo from "@react-native-community/netinfo";
// import { Picker } from "@react-native-picker/picker";
// import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing';
// import { Ionicons } from '@expo/vector-icons';

// import CoffeeColors from '../../../theme/colors';
// import { 
//   fetchAllHarvestRecords, 
//   getUnsyncedRecords, 
//   syncAllRecords 
// } from '../../../services/harvestRecord';

// // --- Constants for Filters ---
// const BLOCK_OPTIONS = ["All Blocks", "Block A-1", "Block B-2", "Block C-3"];
// const GRADE_OPTIONS = ["All Grades", "Grade 1", "Grade 2", "Grade 3"];
// const SYNC_STATUS_OPTIONS = ["All Statuses", "Synced", "Pending"];

// export default function HarvestSummaryScreen({ route }) {
//   const [allRecords, setAllRecords] = useState([]);
//   const [filteredData, setFilteredData] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [syncStatus, setSyncStatus] = useState("Checking connectivity and syncing...");
  
//   // Filter States
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterBlock, setFilterBlock] = useState(BLOCK_OPTIONS[0]);
//   const [filterGrade, setFilterGrade] = useState(GRADE_OPTIONS[0]);
//   const [filterStatus, setFilterStatus] = useState(SYNC_STATUS_OPTIONS[0]);

//   /**
//    * Primary function to fetch, sync, and combine all data sources.
//    */
//   const loadAndSyncData = useCallback(async () => {
//     setIsLoading(true);
//     let finalRecords = [];
//     let remoteRecords = [];
//     let localRecords = [];

//     // 1. Check Internet Connectivity
//     const netState = await NetInfo.fetch();
//     const isConnected = netState.isConnected && netState.isInternetReachable;

//     if (isConnected) {
//       setSyncStatus("Online: Initiating data synchronization.");
      
//       // 2. Attempt Sync
//       const syncResult = await syncAllRecords();
//       if (syncResult.totalCount > 0) {
//         setSyncStatus(`Sync complete! ${syncResult.syncedCount} of ${syncResult.totalCount} records uploaded.`);
//       } else {
//         setSyncStatus("Online: No pending records to sync.");
//       }
      
//       // 3. Fetch Remote Data
//       const remoteResponse = await fetchAllHarvestRecords();
//       if (remoteResponse.success && Array.isArray(remoteResponse.remoteData)) {
//         // Map remote data and flag them as Synced
//         remoteRecords = remoteResponse.remoteData.map(r => ({
//           ...r,
//           id: r.id || r.cherry_color, // Use API ID or fallback
//           grade: r.crop_type || "N/A", // API field assumed mapping
//           weight: `${r.quantity_harvest} kg`,
//           date: r.date_of_harvest,
//           isSynced: true,
//           // Other UI fields that need mapping will rely on local data structure
//         }));
//       }
//     } else {
//       setSyncStatus("Offline Mode: Data saved locally. Sync will occur when online.");
//     }
    
//     // 4. Fetch Local Data (always fetch, regardless of connectivity)
//     const localResponse = await getUnsyncedRecords();
//     if (localResponse.success && Array.isArray(localResponse.records)) {
//       // Map local data and flag them as Pending
//       localRecords = localResponse.records.map(r => ({
//         ...r,
//         weight: `${r.weight} kg`,
//         date: r.dateReadable || r.date,
//         isSynced: false,
//       }));
//     }

//     // 5. Combine Data: Local (Pending) + Remote (Synced)
//     // We filter out any pending records that might have been synced successfully
//     // (though the syncAllRecords function should handle removal).
//     const localIds = new Set(localRecords.map(r => r.id));
//     const uniqueRemoteRecords = remoteRecords.filter(r => !localIds.has(r.id));
    
//     finalRecords = [...localRecords, ...uniqueRemoteRecords];
    
//     // Sort by date (newest first)
//     finalRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

//     setAllRecords(finalRecords);
//     setIsLoading(false);
//   }, []);

//   // --- Filtering & Searching Logic ---
//   useEffect(() => {
//     let result = allRecords;

//     // 1. Search Filter (by Name or ID)
//     if (searchTerm) {
//       const lowerSearch = searchTerm.toLowerCase();
//       result = result.filter(record => 
//         record.name?.toLowerCase().includes(lowerSearch) ||
//         record.id?.toLowerCase().includes(lowerSearch)
//       );
//     }

//     // 2. Block Filter
//     if (filterBlock !== BLOCK_OPTIONS[0]) {
//       result = result.filter(record => record.block === filterBlock);
//     }

//     // 3. Grade Filter
//     if (filterGrade !== GRADE_OPTIONS[0]) {
//       // Need to handle the potential mismatch in keys (grade vs crop_type)
//       result = result.filter(record => 
//         record.grade === filterGrade || 
//         record.crop_type === filterGrade // Fallback for API data structure
//       );
//     }

//     // 4. Sync Status Filter
//     if (filterStatus === "Synced") {
//       result = result.filter(record => record.isSynced === true);
//     } else if (filterStatus === "Pending") {
//       result = result.filter(record => record.isSynced === false);
//     }

//     setFilteredData(result);
//   }, [allRecords, searchTerm, filterBlock, filterGrade, filterStatus]);

//   // Initial load and forced refresh check
//   useEffect(() => {
//     loadAndSyncData();
//   }, [loadAndSyncData]);

//   // Check for refresh request from form screen
//   useEffect(() => {
//     if (route.params?.shouldRefresh) {
//       loadAndSyncData();
//       // Clear the parameter so it doesn't trigger on every focus
//       navigation.setParams({ shouldRefresh: false }); 
//     }
//   }, [route.params?.shouldRefresh, loadAndSyncData]);


//   // --- Export Functionality (Updated to use filtered data) ---
//   const convertToCSV = (rows) => {
//     const header = ['Id', 'Grade', 'Weight', 'Block', 'Cherry Colour', 'Date', 'Name', 'Amount Paid', 'Sync Status'];
//     const csvRows = [header.join(',')];

//     rows.forEach((row) => {
//       const values = [
//         row.id,
//         row.grade || row.crop_type, 
//         row.weight.replace(' kg', ''), // Remove kg for Excel number format
//         row.block,
//         row.cherryColor || 'N/A',
//         row.date,
//         row.name || 'N/A',
//         row.amountPaid || '0',
//         row.isSynced ? 'Synced' : 'Pending',
//       ];
//       csvRows.push(values.map(v => `"${v}"`).join(',')); // Quote values for CSV safety
//     });

//     return csvRows.join('\n');
//   };

//   const exportToExcel = async () => {
//     if (filteredData.length === 0) {
//         Alert.alert("Export Failed", "There is no data to export.");
//         return;
//     }
//     try {
//       const csv = convertToCSV(filteredData);
//       const fileUri = FileSystem.documentDirectory + 'harvest_summary.csv';

//       await FileSystem.writeAsStringAsync(fileUri, csv, {
//         encoding: FileSystem.EncodingType.UTF8,
//       });

//       if (!(await Sharing.isAvailableAsync())) {
//         Alert.alert('Error', 'Sharing is not available on this device');
//         return;
//       }

//       await Sharing.shareAsync(fileUri);
//     } catch (error) {
//       Alert.alert('Export Failed', error.message);
//     }
//   };

//   const renderRow = ({ item }) => (
//     <View style={[styles.row, item.isSynced ? styles.syncedRow : styles.pendingRow]}>
//       <Text style={styles.cell}>{item.grade || item.crop_type || 'N/A'}</Text>
//       <Text style={styles.cell}>{item.weight}</Text>
//       <Text style={styles.cell}>{item.block}</Text>
//       <Text style={styles.cell}>{item.date}</Text>
//       <View style={styles.statusCell}>
//         <Ionicons 
//             name={item.isSynced ? "cloud-done" : "cloud-upload-outline"} 
//             size={16} 
//             color={item.isSynced ? CoffeeColors.GREEN : CoffeeColors.ACCENT} 
//         />
//         <Text style={[styles.cellText, { color: item.isSynced ? CoffeeColors.GREEN : CoffeeColors.ACCENT, marginLeft: 4 }]}>
//             {item.isSynced ? 'Synced' : 'Pending'}
//         </Text>
//       </View>
//     </View>
//   );

//   if (isLoading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
//         <Text style={styles.loadingText}>Loading data and checking sync status...</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
      
//       {/* Sync Status Banner */}
//       <View style={styles.syncBanner}>
//         <Text style={styles.syncText}>{syncStatus}</Text>
//         <TouchableOpacity onPress={loadAndSyncData} style={{ marginLeft: 10 }}>
//             <Ionicons name="reload-circle-sharp" size={24} color={CoffeeColors.WHITE} />
//         </TouchableOpacity>
//       </View>

//       {/* Search Bar */}
//       <TextInput
//         style={styles.searchBar}
//         placeholder="Search by recorder name or record ID..."
//         value={searchTerm}
//         onChangeText={setSearchTerm}
//       />

//       {/* Filters */}
//       <View style={styles.filtersContainer}>
//         <View style={styles.pickerWrap}>
//           <Picker selectedValue={filterBlock} onValueChange={setFilterBlock}>
//             {BLOCK_OPTIONS.map(b => <Picker.Item key={b} label={b} value={b} />)}
//           </Picker>
//         </View>
//         <View style={styles.pickerWrap}>
//           <Picker selectedValue={filterGrade} onValueChange={setFilterGrade}>
//             {GRADE_OPTIONS.map(g => <Picker.Item key={g} label={g} value={g} />)}
//           </Picker>
//         </View>
//         <View style={styles.pickerWrap}>
//           <Picker selectedValue={filterStatus} onValueChange={setFilterStatus}>
//             {SYNC_STATUS_OPTIONS.map(s => <Picker.Item key={s} label={s} value={s} />)}
//           </Picker>
//         </View>
//       </View>

//       {/* Export Button */}
//       <TouchableOpacity 
//         style={styles.exportButton} 
//         onPress={exportToExcel}
//         disabled={filteredData.length === 0}
//       >
//         <Ionicons name="download-outline" size={18} color={CoffeeColors.WHITE} />
//         <Text style={styles.exportText}>Export {filteredData.length} Records to CSV</Text>
//       </TouchableOpacity>

//       {/* Header */}
//       <View style={[styles.row, styles.headerRow]}>
//         <Text style={styles.headerCell}>Grade</Text>
//         <Text style={styles.headerCell}>Weight</Text>
//         <Text style={styles.headerCell}>Block</Text>
//         <Text style={styles.headerCell}>Date</Text>
//         <Text style={styles.headerCell}>Status</Text>
//       </View>

//       {/* Data Rows */}
//       <FlatList
//         data={filteredData}
//         renderItem={renderRow}
//         keyExtractor={(item, index) => item.id || index.toString()}
//         ListEmptyComponent={<Text style={styles.emptyText}>No harvest records found matching your filters.</Text>}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: CoffeeColors.LIGHT_GRAY,
//     padding: 10,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: CoffeeColors.LIGHT_GRAY,
//   },
//   loadingText: {
//     marginTop: 10,
//     color: CoffeeColors.DARK_BROWN,
//   },
//   syncBanner: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     backgroundColor: CoffeeColors.DARK_BROWN,
//     padding: 8,
//     borderRadius: 8,
//     marginBottom: 10,
//   },
//   syncText: {
//     color: CoffeeColors.CREAM,
//     fontSize: 12,
//     flexShrink: 1,
//   },
//   searchBar: {
//     backgroundColor: CoffeeColors.WHITE,
//     padding: 10,
//     borderRadius: 8,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: CoffeeColors.LIGHT_BROWN,
//   },
//   filtersContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 10,
//   },
//   pickerWrap: {
//     flex: 1,
//     marginHorizontal: 4,
//     backgroundColor: CoffeeColors.WHITE,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: CoffeeColors.LIGHT_BROWN,
//     overflow: 'hidden',
//   },
//   exportButton: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: CoffeeColors.MEDIUM_BROWN,
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 10,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   exportText: {
//     color: CoffeeColors.WHITE,
//     fontWeight: '700',
//     marginLeft: 8,
//   },
//   row: {
//     flexDirection: 'row',
//     backgroundColor: CoffeeColors.WHITE,
//     marginBottom: 5,
//     borderRadius: 6,
//     paddingVertical: 10,
//     paddingHorizontal: 5,
//     justifyContent: 'space-between',
//   },
//   headerRow: {
//     backgroundColor: CoffeeColors.DARK_BROWN,
//     marginBottom: 8,
//     borderRadius: 6,
//   },
//   headerCell: {
//     flex: 1,
//     fontWeight: '700',
//     color: CoffeeColors.CREAM,
//     textAlign: 'center',
//     fontSize: 12,
//   },
//   syncedRow: {
//     borderLeftWidth: 5,
//     borderLeftColor: CoffeeColors.GREEN,
//   },
//   pendingRow: {
//     borderLeftWidth: 5,
//     borderLeftColor: CoffeeColors.ACCENT, // Using accent color for pending
//   },
//   cell: {
//     flex: 1,
//     color: CoffeeColors.GRAY_TEXT,
//     textAlign: 'center',
//     fontSize: 12,
//     alignSelf: 'center',
//   },
//   statusCell: {
//     flex: 1,
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   cellText: {
//     fontSize: 12,
//   },
//   emptyText: {
//     textAlign: 'center',
//     marginTop: 20,
//     color: CoffeeColors.MEDIUM_BROWN,
//     fontStyle: 'italic',
//   }
// });
