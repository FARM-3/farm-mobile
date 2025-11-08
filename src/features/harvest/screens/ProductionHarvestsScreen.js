// src/features/harvest/screens/ProductionHarvestsScreen.js
// Summary screen showing harvest records as cards (similar to Aggregation Farmer records)

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import {
    fetchAllHarvestRecords,
    getUnsyncedRecords,
    syncAllRecords
} from '../../../services/harvestRecord';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';

const SYNC_QUEUE_KEY = "harvests_sync_queue";

export default function ProductionHarvestsScreen({ navigation }) {
    const [allRecords, setAllRecords] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState("Checking connectivity and syncing...");
    const [searchTerm, setSearchTerm] = useState('');

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
            const remoteResponse = await fetchAllHarvestRecords();
            if (remoteResponse.success && Array.isArray(remoteResponse.remoteData.results)) {
                remoteRecords = remoteResponse.remoteData.results.map(r => ({
                    id: r.harvest_id || r.id,
                    block: r.block_id || r.block_ID,
                    name: r.worker_name || r.Worker_name,
                    isSynced: true,
                    weight: `${r.weight_on_delivery} kg`,
                    date: r.date_of_delivery,
                    amountPaid: Number(r.amount_paid),
                    paidBy: r.paid_by,
                }));
            }
        } else {
            setSyncStatus("Offline Mode: Data saved locally. Connect to internet to sync.");
        }

        // Fetch local data (always fetch, regardless of connectivity)
        const localResponse = await getUnsyncedRecords();
        if (localResponse.success && Array.isArray(localResponse.records)) {
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
        Alert.alert(
            'Edit Harvest',
            'Edit functionality will be implemented soon.',
            [{ text: 'OK' }]
        );
    };

    const handleDelete = (item) => {
        Alert.alert(
            'Delete Harvest Record',
            `Are you sure you want to delete the harvest record for ${item.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        Alert.alert('Delete', 'Delete functionality will be implemented with API integration');
                    }
                }
            ]
        );
    };

    const clearInvalidLocalRecords = async () => {
        Alert.alert(
            'Clear Invalid Records',
            'This will remove all unsynced local records with old data format. Only use if you have sync errors. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]));
                            Alert.alert('Success', 'Cleared all local unsynced records. You can now submit new records.');
                            await loadData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to clear records: ' + error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleViewDetails = (item) => {
        navigation.navigate('HarvestDetails', { harvestData: item });
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
            const unsyncedResult = await getUnsyncedRecords();
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
            const result = await syncAllRecords();

            console.log('[ProductionHarvests] Sync result:', {
                syncedCount: result.syncedCount,
                totalCount: result.totalCount,
                failedCount: result.failedRecords?.length || 0,
                failedRecords: result.failedRecords
            });

            if (result.syncedCount > 0) {
                setSyncStatus(`✓ Synced ${result.syncedCount} record${result.syncedCount !== 1 ? 's' : ''}`);
                console.log('[ProductionHarvests] Sync successful, waiting 500ms before reload');
                // Wait a brief moment for backend to process the records before reloading
                await new Promise(resolve => setTimeout(resolve, 500));
            } else if (result.failedRecords && result.failedRecords.length > 0) {
                const errorMsg = result.failedRecords.map(f => `${f.id}: ${f.error || f.reason}`).join('; ');
                setSyncStatus(`Sync failed: ${errorMsg}`);
                console.error('[ProductionHarvests] Sync failed with errors:', result.failedRecords);
            } else {
                setSyncStatus("Sync failed - check your connection and try again");
                console.warn('[ProductionHarvests] Sync returned 0 synced records and no error details');
            }

            // Reload data to reflect sync status
            console.log('[ProductionHarvests] Reloading data after sync');
            await loadData();
            console.log('[ProductionHarvests] Data reloaded successfully');

        } catch (error) {
            console.error('[ProductionHarvests] Sync error:', error);
            setSyncStatus("Sync error - please check your connection");
        } finally {
            setIsSyncing(false);
            console.log('[ProductionHarvests] Sync process completed, isSyncing set to false');
        }
    };

    // Calculate unsynced count
    const unsyncedCount = allRecords.filter(r => !r.isSynced).length;

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
            />

            <View style={{ flex: 1 }}>
            <View style={styles.container}>
                {/* Sync Status Banner */}
                <View style={styles.syncBanner}>
                    <Text style={styles.syncText}>{syncStatus}</Text>
                    <TouchableOpacity onPress={loadData} style={{ marginLeft: 10 }}>
                        <Ionicons name="reload-circle-sharp" size={24} color={CoffeeColors.CREAM} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by worker name, ID, or block..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        placeholderTextColor={CoffeeColors.GRAY_TEXT}
                    />
                    {searchTerm.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchTerm('')}>
                            <Ionicons name="close-circle" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                        </TouchableOpacity>
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
            </View>

            <BottomNav activeScreen="Harvests" />
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CoffeeColors.WHITE,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 12,
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
        borderLeftColor: CoffeeColors.MEDIUM_BROWN,
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
});
