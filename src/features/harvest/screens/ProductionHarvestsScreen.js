// src/features/harvest/screens/ProductionHarvestsScreen.js
// Summary screen showing harvest records as cards (similar to Aggregation Farmer records)

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    TextInput,
    ScrollView,
} from 'react-native';
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import {
    fetchAllProductionHarvestRecords,
    getUnsyncedProductionRecords,
    syncAllProductionRecords,
    deleteProductionHarvestRecord
} from '../../../services/productionHarvestService';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';

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

    // Field sections for organized display
    const sections = [
        {
            title: 'Harvest Details',
            fields: [
                { label: 'Harvest ID', value: harvest.id || harvest.harvest_id },
                { label: 'Worker Name', value: harvest.worker_name || 'Unknown Worker' },
                { label: 'Block ID', value: harvest.block || harvest.block_id },
                { label: 'Date of Delivery', value: harvest.date },
                { label: 'Weight on Delivery', value: harvest.weight ? `${harvest.weight} kg` : 'Not provided' },
            ]
        },
        {
            title: 'Payment Information',
            fields: [
                { label: 'Amount Paid', value: harvest.amountPaid ? `UGX ${Number(harvest.amountPaid).toLocaleString()}` : 'Not provided' },
                { label: 'Paid By', value: harvest.paid_by || 'Not specified' },
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
                {/* Harvest ID Card */}
                <View style={styles.detailNameCard}>
                    <Text style={styles.detailFarmerName}>
                        {harvest.worker_name || 'Unknown Worker'}
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

const SYNC_QUEUE_KEY = "production_harvests_sync_queue";

export default function ProductionHarvestsScreen({ navigation }) {
    const [allRecords, setAllRecords] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState("Checking connectivity and syncing...");
    const [searchTerm, setSearchTerm] = useState('');
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // State for detail view
    const [selectedHarvest, setSelectedHarvest] = useState(null);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'detail'

    // State for custom alert
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        buttons: []
    });

    /**
     * Load data from both local and remote sources (without auto-sync)
     */
    const loadData = useCallback(async () => {
        setIsLoading(true);
        let remoteRecords = [];
        let localRecords = [];

        // Check internet connectivity
        const netState = await NetInfo.fetch();
        const isConnected = netState.isConnected && netState.isInternetReachable;

        if (isConnected) {
            setSyncStatus("Online: Tap the sync icon to upload pending records.");

            // Fetch remote data (no auto-sync)
            const remoteResponse = await fetchAllProductionHarvestRecords();
            console.log('[ProductionHarvests] Remote response:', JSON.stringify(remoteResponse, null, 2));

            if (remoteResponse.success) {
                // Handle paginated response: API returns { count, next, previous, results: [...] }
                const remoteData = Array.isArray(remoteResponse.remoteData)
                    ? remoteResponse.remoteData
                    : (remoteResponse.remoteData?.results || []);

                console.log('[ProductionHarvests] Extracted remoteData count:', remoteData.length);

                remoteRecords = remoteData.map(r => ({
                    id: r.harvest_id,
                    harvest_id: r.harvest_id,
                    block: r.block_id,
                    block_id: r.block_id,
                    name: r.worker_name || 'Unknown',
                    worker_name: r.worker_name || 'Unknown',
                    isSynced: true,
                    weight: `${r.weight_on_delivery || 0}`,
                    date: r.date_of_delivery,
                    amountPaid: Number(r.amount_paid || 0),
                    amount_paid: Number(r.amount_paid || 0),
                    paidBy: r.paid_by || '',
                    paid_by: r.paid_by || '',
                }));
            }
        } else {
            setSyncStatus("Offline Mode: Data saved locally. Connect to internet to sync.");
        }

        // Fetch local data (always fetch, regardless of connectivity)
        const localResponse = await getUnsyncedProductionRecords();
        if (localResponse.success && Array.isArray(localResponse.records)) {
            localRecords = localResponse.records.map(r => ({
                id: r.id,
                block: r.blockId || r.block_id || r.block,
                name: r.workerName || r.worker_name || r.name || 'Unknown',
                worker_name: r.workerName || r.worker_name || r.name || 'Unknown',
                isSynced: false,
                weight: `${r.weight || 0} kg`,
                date: r.dateReadable || (r.date ? r.date.split('T')[0] : ''),
                amountPaid: Number(r.amountPaid || r.amount_paid || 0),
                paidBy: r.paidBy || r.paid_by || r.who_paid || '',
                paid_by: r.paidBy || r.paid_by || r.who_paid || '',
            }));
        }

        // Combine data: Local (Pending) + Remote (Synced)
        const localIds = new Set(localRecords.map(r => r.id));
        const uniqueRemoteRecords = remoteRecords.filter(r => !localIds.has(r.id));

        let finalRecords = [...localRecords, ...uniqueRemoteRecords];

        // Sort by date (newest first), with additional sorting criteria
        finalRecords.sort((a, b) => {
            // Try to sort by date first
            if (a.date && b.date) {
                return new Date(b.date) - new Date(a.date);
            }
            // Try to sort by timestamp if available
            if (a.timestamp && b.timestamp) {
                return b.timestamp - a.timestamp;
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

        setAllRecords(finalRecords);
        setIsLoading(false);
    }, []);

    // Generate search suggestions when search term changes
    useEffect(() => {
        if (searchTerm && searchTerm.length >= 2) {
            const lowerSearch = searchTerm.toLowerCase();

            // Get unique suggestions from worker names, IDs, and blocks
            const suggestions = [];
            const seenSuggestions = new Set();

            allRecords.forEach(record => {
                // Worker name suggestions
                if (record.name && record.name.toLowerCase().includes(lowerSearch)) {
                    const suggestion = {
                        type: 'name',
                        value: record.name,
                        label: record.name,
                        icon: 'person'
                    };
                    const key = `name-${record.name}`;
                    if (!seenSuggestions.has(key)) {
                        suggestions.push(suggestion);
                        seenSuggestions.add(key);
                    }
                }

                // Harvest ID suggestions
                if (record.id && record.id.toString().toLowerCase().includes(lowerSearch)) {
                    const suggestion = {
                        type: 'id',
                        value: record.id,
                        label: `ID: ${record.id}`,
                        icon: 'barcode'
                    };
                    const key = `id-${record.id}`;
                    if (!seenSuggestions.has(key)) {
                        suggestions.push(suggestion);
                        seenSuggestions.add(key);
                    }
                }

                // Block suggestions
                if (record.block && record.block.toLowerCase().includes(lowerSearch)) {
                    const suggestion = {
                        type: 'block',
                        value: record.block,
                        label: `Block: ${record.block}`,
                        icon: 'grid'
                    };
                    const key = `block-${record.block}`;
                    if (!seenSuggestions.has(key)) {
                        suggestions.push(suggestion);
                        seenSuggestions.add(key);
                    }
                }
            });

            setSearchSuggestions(suggestions.slice(0, 5)); // Limit to 5 suggestions
            setShowSuggestions(suggestions.length > 0);
        } else {
            setSearchSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchTerm, allRecords]);

    // Search filtering
    useEffect(() => {
        let result = allRecords;

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(record =>
                record.name?.toLowerCase().includes(lowerSearch) ||
                record.id?.toString().toLowerCase().includes(lowerSearch) ||
                record.block?.toLowerCase().includes(lowerSearch)
            );
        }

        setFilteredData(result);
    }, [allRecords, searchTerm]);

    // Initial load
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Refresh when screen comes into focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            console.log('[ProductionHarvests] Screen focused, refreshing data...');
            loadData();
        });
        return unsubscribe;
    }, [navigation, loadData]);

    const handleEdit = (item) => {
        // Navigate to harvest form screen with item data
        navigation.navigate('HarvestForm', { 
            harvest: item,
            mode: 'edit'
        });
    };

    const handleDelete = (item) => {
        setAlertConfig({
            visible: true,
            title: 'Delete Harvest Record',
            message: `Are you sure you want to delete the harvest record for ${item.name}?\n\nThis action cannot be undone.`,
            type: 'warning',
            buttons: [
                {
                    text: 'Cancel',
                    onPress: () => setAlertConfig({ ...alertConfig, visible: false }),
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    onPress: async () => {
                        setAlertConfig({ ...alertConfig, visible: false });
                        await performDelete(item);
                    },
                    style: 'destructive'
                }
            ]
        });
    };

    const performDelete = async (item) => {
        try {
            if (item.isSynced) {
                // Record is synced, delete from server
                const result = await deleteProductionHarvestRecord(item.id);
                if (result.success) {
                    setAlertConfig({
                        visible: true,
                        title: 'Success',
                        message: 'Harvest record deleted successfully',
                        type: 'success',
                        buttons: [{
                            text: 'OK',
                            onPress: () => {
                                setAlertConfig({ ...alertConfig, visible: false });
                                loadData();
                            }
                        }]
                    });
                } else {
                    throw new Error('Failed to delete from server');
                }
            } else {
                // Record is local only, remove from AsyncStorage
                const { records } = await getUnsyncedProductionRecords();
                const updatedRecords = records.filter(r => r.id !== item.id);
                await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedRecords));

                setAlertConfig({
                    visible: true,
                    title: 'Success',
                    message: 'Local harvest record deleted successfully',
                    type: 'success',
                    buttons: [{
                        text: 'OK',
                        onPress: () => {
                            setAlertConfig({ ...alertConfig, visible: false });
                            loadData();
                        }
                    }]
                });
            }
        } catch (error) {
            console.error('[ProductionHarvests] Delete error:', error);
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: `Failed to delete harvest record: ${error.message}`,
                type: 'error',
                buttons: [{
                    text: 'OK',
                    onPress: () => setAlertConfig({ ...alertConfig, visible: false })
                }]
            });
        }
    };

    const clearInvalidLocalRecords = async () => {
        setAlertConfig({
            visible: true,
            title: 'Clear Invalid Records',
            message: 'This will remove all unsynced local records with old data format. Only use if you have sync errors. Continue?',
            type: 'warning',
            buttons: [
                {
                    text: 'Cancel',
                    onPress: () => setAlertConfig({ ...alertConfig, visible: false }),
                    style: 'cancel'
                },
                {
                    text: 'Clear',
                    onPress: async () => {
                        setAlertConfig({ ...alertConfig, visible: false });
                        try {
                            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]));
                            setAlertConfig({
                                visible: true,
                                title: 'Success',
                                message: 'Cleared all local unsynced records. You can now submit new records.',
                                type: 'success',
                                buttons: [{
                                    text: 'OK',
                                    onPress: () => {
                                        setAlertConfig({ ...alertConfig, visible: false });
                                        loadData();
                                    }
                                }]
                            });
                        } catch (error) {
                            setAlertConfig({
                                visible: true,
                                title: 'Error',
                                message: 'Failed to clear records: ' + error.message,
                                type: 'error',
                                buttons: [{
                                    text: 'OK',
                                    onPress: () => setAlertConfig({ ...alertConfig, visible: false })
                                }]
                            });
                        }
                    },
                    style: 'destructive'
                }
            ]
        });
    };

    const handleViewDetails = (item) => {
        setSelectedHarvest(item);
        setViewMode('detail');
    };

    const handleSyncPress = async () => {
        console.log('[ProductionHarvests] Sync button pressed, isSyncing:', isSyncing);

        if (isSyncing) {
            console.warn('[ProductionHarvests] Sync already in progress, ignoring duplicate request');
            return; // Prevent multiple concurrent syncs
        }

        setIsSyncing(true);
        setSyncStatus("Syncing harvest records...");

        try {
            // Fetch current unsynced count
            console.log('[ProductionHarvests] Fetching unsynced records...');
            const unsyncedResult = await getUnsyncedProductionRecords();
            const unsyncedRecords = unsyncedResult.records || [];

            console.log('[ProductionHarvests] Unsynced records found:', unsyncedRecords.length);
            console.log('[ProductionHarvests] Records data:', JSON.stringify(unsyncedRecords, null, 2));

            if (unsyncedRecords.length === 0) {
                console.log('[ProductionHarvests] No unsynced records, marking as synced');
                setSyncStatus("All records are synced ✓");
                setIsSyncing(false);
                return;
            }

            // Sync all records
            console.log('[ProductionHarvests] Starting sync of', unsyncedRecords.length, 'records');
            const result = await syncAllProductionRecords();

            console.log('[ProductionHarvests] Sync result:', {
                syncedCount: result.syncedCount,
                totalCount: result.totalCount,
                failedCount: result.failedRecords?.length || 0,
                failedRecords: result.failedRecords
            });

            if (result.syncedCount === result.totalCount && result.totalCount > 0) {
                // All records synced successfully
                setSyncStatus(`✓ Synced ${result.syncedCount} record${result.syncedCount !== 1 ? 's' : ''}`);
                console.log('[ProductionHarvests] Sync successful, waiting 500ms before reload');
                // Wait a brief moment for backend to process the records before reloading
                await new Promise(resolve => setTimeout(resolve, 500));
            } else if (result.syncedCount > 0 && result.failedRecords && result.failedRecords.length > 0) {
                // Partial success
                const failedCount = result.totalCount - result.syncedCount;
                const errorMsg = result.failedRecords.map(f => `${f.id}: ${f.error || f.reason}`).join('; ');
                setSyncStatus(`Partial: ${result.syncedCount}/${result.totalCount} synced. Failed: ${errorMsg}`);
                console.warn('[ProductionHarvests] Partial sync result:', result.failedRecords);
            } else if (result.syncedCount === 0 && result.failedRecords && result.failedRecords.length > 0) {
                // All failed
                const errorMsg = result.failedRecords.map(f => `${f.id}: ${f.error || f.reason}`).join('; ');
                setSyncStatus(`Sync failed: ${errorMsg}`);
                console.error('[ProductionHarvests] Sync failed with errors:', result.failedRecords);
            } else {
                setSyncStatus("Sync failed - check your connection and try again");
                console.warn('[ProductionHarvests] Sync returned unexpected result:', result);
            }

            // Reload data to reflect sync status
            console.log('[ProductionHarvests] Reloading data after sync');
            await loadData();
            console.log('[ProductionHarvests] Data reloaded successfully');

        } catch (error) {
            console.error('[ProductionHarvests] Sync error:', error);
            setSyncStatus(`Sync error: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSyncing(false);
            console.log('[ProductionHarvests] Sync process completed, isSyncing set to false');
        }
    };

    // Calculate unsynced count
    const unsyncedCount = allRecords.filter(r => !r.isSynced).length;

    // Handler for back press
    const handleBackPress = () => {
        if (viewMode === 'detail') {
            setViewMode('table');
            setSelectedHarvest(null);
        } else {
            navigation.goBack();
        }
    };

    const renderHarvestCard = ({ item }) => {
        const displayId = item.id || 'N/A';
        const displayName = item.name || 'Unknown Worker';

        return (
            <TouchableOpacity
                style={styles.dataListItem}
                onPress={() => handleViewDetails(item)}
            >
                <View style={{ flex: 1 }}>
                    <Text style={styles.dataListItemTitle}>
                        {displayName}
                        <Text style={styles.dataListItemUID}> ({displayId})</Text>
                    </Text>
                    <Text style={styles.dataListItemSubtitle}>
                        Block: {item.block} | Date: {item.date} | {item.weight}
                    </Text>
                    <Text style={styles.dataListItemSubtitle}>
                        Amount: {item.amountPaid ? `${item.amountPaid} UGX` : 'N/A'} | Paid By: {item.paidBy || 'N/A'}
                    </Text>
                    <View style={styles.syncStatusInline}>
                        <Ionicons
                            name={item.isSynced ? "cloud-done" : "cloud-upload-outline"}
                            size={14}
                            color={item.isSynced ? CoffeeColors.MEDIUM_BROWN : CoffeeColors.LIGHT_BROWN}
                        />
                        <Text style={[styles.syncStatusText, { color: item.isSynced ? CoffeeColors.MEDIUM_BROWN : CoffeeColors.LIGHT_BROWN }]}>
                            {item.isSynced ? 'Synced' : 'Pending'}
                        </Text>
                    </View>
                </View>

                <View style={styles.recordActions}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            navigation.navigate('PaymentVoucher', { harvestData: item });
                        }}
                    >
                        <Ionicons name="document-text" size={20} color={CoffeeColors.PRIMARY_BROWN} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                        }}
                    >
                        <Ionicons name="pencil" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                        }}
                    >
                        <Ionicons name="trash" size={20} color={CoffeeColors.DARK_BROWN} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
                <Text style={styles.loadingText}>Loading harvest records...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader
                title="Rugyeyo Harvests"
                unsyncedCount={unsyncedCount}
                onSync={handleSyncPress}
                isSyncing={isSyncing}
                onBackPress={handleBackPress}
            />

            <View style={{ flex: 1, position: 'relative' }}>
                {viewMode === 'table' && (
            <View style={styles.container}>
                {/* Sync Status Banner */}
                <View style={styles.syncBanner}>
                    <Text style={styles.syncText}>{syncStatus}</Text>
                    <TouchableOpacity onPress={loadData} style={{ marginLeft: 10 }}>
                        <Ionicons name="reload-circle-sharp" size={24} color={CoffeeColors.CREAM} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar with Autocomplete */}
                <View style={styles.searchWrapper}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by worker name, ID, or block..."
                            value={searchTerm}
                            onChangeText={(text) => {
                                setSearchTerm(text);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                            placeholderTextColor={CoffeeColors.GRAY_TEXT}
                        />
                        {searchTerm.length > 0 && (
                            <TouchableOpacity onPress={() => {
                                setSearchTerm('');
                                setShowSuggestions(false);
                            }}>
                                <Ionicons name="close-circle" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Autocomplete Suggestions Dropdown */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            {searchSuggestions.map((suggestion, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.suggestionItem}
                                    onPress={() => {
                                        setSearchTerm(suggestion.value);
                                        setShowSuggestions(false);
                                    }}
                                >
                                    <Ionicons name={suggestion.icon} size={16} color={CoffeeColors.MEDIUM_BROWN} />
                                    <Text style={styles.suggestionText}>{suggestion.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Action Bar */}
                <View style={styles.actionBar}>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => navigation.navigate('HarvestForm')}
                    >
                        <Ionicons name="add-circle-outline" size={20} color={CoffeeColors.CREAM} />
                        <Text style={styles.addButtonText}>Record New Harvest</Text>
                    </TouchableOpacity>
                    <Text style={styles.recordCount}>{filteredData.length} records</Text>
                </View>

                {/* Debug: Clear Invalid Records Button (show only if there are pending records) */}
                {syncStatus.includes('Pending') && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={clearInvalidLocalRecords}
                    >
                        <Ionicons name="trash-outline" size={16} color={CoffeeColors.WHITE} />
                        <Text style={styles.clearButtonText}>Clear Invalid Local Records</Text>
                    </TouchableOpacity>
                )}

                {/* Harvest Records List */}
                <FlatList
                    data={filteredData}
                    renderItem={renderHarvestCard}
                    keyExtractor={(item, index) => `${item.id}_${item.isSynced}_${index}`}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="file-tray-outline" size={64} color={CoffeeColors.MEDIUM_BROWN} />
                            <Text style={styles.emptyText}>No harvest records found</Text>
                            {searchTerm && (
                                <Text style={styles.emptySubtext}>Try adjusting your search</Text>
                            )}
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            </View>
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
        fontSize: 16,
        fontFamily: Fonts.regular,
    },
    syncBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: CoffeeColors.DARK_BROWN,
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    syncText: {
        color: CoffeeColors.CREAM,
        fontSize: 13,
        flexShrink: 1,
        fontFamily: Fonts.regular,
    },
    searchWrapper: {
        position: 'relative',
        zIndex: 1000,
        marginBottom: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CoffeeColors.WHITE,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        marginTop: 4,
        maxHeight: 200,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1001,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_GRAY,
    },
    suggestionText: {
        marginLeft: 10,
        fontSize: 15,
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    addButtonText: {
        color: CoffeeColors.CREAM,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        marginLeft: 8,
        fontSize: 14,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 6,
        marginBottom: 12,
    },
    clearButtonText: {
        color: CoffeeColors.CREAM,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        marginLeft: 6,
        fontSize: 13,
    },
    recordCount: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.MEDIUM_BROWN,
    },
    dataListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: CoffeeColors.WHITE,
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: CoffeeColors.PRIMARY_BROWN,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    dataListItemTitle: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 4,
    },
    dataListItemUID: {
        fontSize: 14,
        fontWeight: '500',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.MEDIUM_BROWN,
    },
    dataListItemSubtitle: {
        fontSize: 13,
        fontFamily: Fonts.regular,
        color: CoffeeColors.GRAY_TEXT,
        marginTop: 2,
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
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.MEDIUM_BROWN,
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: CoffeeColors.GRAY_TEXT,
        fontStyle: 'italic',
    },
    // --- Harvest Detail View ---
    detailViewContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        zIndex: 2000,
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
        backgroundColor: CoffeeColors.LIGHT_GRAY,
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
});
