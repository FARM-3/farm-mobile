// src/features/blocks/BlockDetailsScreen.js
// Detailed table view showing all block records with export functionality

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
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import CoffeeColors from '../../theme/colors';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import ApiService from '../../services/ApiService';

const BLOCK_SYNC_QUEUE_KEY = "blocks_sync_queue";
const FILTER_BY_OPTIONS = ["All Records", "Synced Only", "Pending Only"];

export default function BlockDetailsScreen({ route = {}, navigation }) {
    const [allRecords, setAllRecords] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState("Checking connectivity and syncing...");

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState(FILTER_BY_OPTIONS[0]);

    // --- OFFLINE SYNC UTILITIES ---

    const getUnsyncedBlocks = async () => {
        try {
            const raw = await AsyncStorage.getItem(BLOCK_SYNC_QUEUE_KEY);
            const records = raw ? JSON.parse(raw) : [];
            return { success: true, records };
        } catch (error) {
            console.error("Error retrieving unsynced blocks:", error);
            return { success: false, records: [] };
        }
    };

    const removeBlockFromQueue = async (blockId) => {
        try {
            const { records: currentQueue } = await getUnsyncedBlocks();
            const newQueue = currentQueue.filter(record => record.block_id !== blockId);
            await AsyncStorage.setItem(BLOCK_SYNC_QUEUE_KEY, JSON.stringify(newQueue));
            return { success: true, remaining: newQueue.length };
        } catch (error) {
            console.error("Error removing block from queue:", error);
            return { success: false, remaining: -1 };
        }
    };

    const syncPendingBlocks = async () => {
        const { success, records } = await getUnsyncedBlocks();
        if (!success || records.length === 0) {
            return { syncedCount: 0, totalCount: 0 };
        }

        let syncedCount = 0;
        const totalCount = records.length;

        console.log(`Attempting to sync ${totalCount} local blocks...`);

        for (const record of records) {
            try {
                await ApiService.post('harvests/blocks/', record);
                await removeBlockFromQueue(record.block_id);
                syncedCount++;
            } catch (error) {
                const errorMsg = error.response?.data?.detail || error.message;
                console.warn(`Sync failed for block ${record.block_id}:`, errorMsg);
            }
        }

        console.log(`Block synchronization complete. Synced ${syncedCount} of ${totalCount} blocks.`);
        return { syncedCount, totalCount };
    };

    const loadAndSyncData = useCallback(async () => {
        setIsLoading(true);
        let remoteRecords = [];
        let localRecords = [];

        const netState = await NetInfo.fetch();
        const isConnected = netState.isConnected && netState.isInternetReachable;

        if (isConnected) {
            setSyncStatus("Online: Initiating data synchronization.");

            const syncResult = await syncPendingBlocks();
            if (syncResult.totalCount > 0) {
                setSyncStatus(`Sync complete! ${syncResult.syncedCount} of ${syncResult.totalCount} blocks uploaded.`);
            } else {
                setSyncStatus("Online: No pending blocks to sync.");
            }

            try {
                const remoteResponse = await ApiService.get('harvests/blocks/');
                remoteRecords = (remoteResponse.data.results || []).map(r => ({
                    ...r,
                    isSynced: true
                }));
                setSyncStatus(`Online: Loaded ${remoteRecords.length} blocks from server.`);
            } catch (error) {
                const errorMsg = error.response?.data?.detail || error.message;
                console.error('API Error:', errorMsg);
                setSyncStatus("Online: Failed to fetch remote data.");
            }
        } else {
            setSyncStatus("Offline Mode: Data saved locally. Sync will occur when online.");
        }

        const localResponse = await getUnsyncedBlocks();
        if (localResponse.success && Array.isArray(localResponse.records)) {
            localRecords = localResponse.records.map(r => ({
                ...r,
                isSynced: false
            }));
        }

        const localIds = new Set(localRecords.map(r => r.block_id));
        const uniqueRemoteRecords = remoteRecords.filter(r => !localIds.has(r.block_id));

        let finalRecords = [...localRecords, ...uniqueRemoteRecords];
        finalRecords.sort((a, b) => new Date(b.created_at || b.date_planted) - new Date(a.created_at || a.date_planted));

        setAllRecords(finalRecords);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        let result = allRecords;

        // Apply search filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(record =>
                record.block_id?.toLowerCase().includes(lowerSearch) ||
                record.type_of_coffee?.toLowerCase().includes(lowerSearch) ||
                record.source_of_seedling?.toLowerCase().includes(lowerSearch)
            );
        }

        // Apply filter by sync status
        if (filterBy === "Synced Only") {
            result = result.filter(record => record.isSynced === true);
        } else if (filterBy === "Pending Only") {
            result = result.filter(record => record.isSynced === false);
        }

        setFilteredData(result);
    }, [allRecords, searchTerm, filterBy]);

    useEffect(() => {
        loadAndSyncData();
    }, [loadAndSyncData]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            console.log('[BlockDetails] Screen focused, refreshing data...');
            loadAndSyncData();
        });
        return unsubscribe;
    }, [navigation, loadAndSyncData]);

    const convertToCSV = (rows) => {
        const header = ['Block ID', 'Trees', 'Date Planted', 'Coffee Type', 'Seedling Source', 'Seedling Type', 'Age (months)', 'Fertilizer', 'Pesticides', 'Standard Practices', 'Sync Status'];
        const csvRows = [header.join(',')];

        rows.forEach((row) => {
            const values = [
                row.block_id || 'N/A',
                row.no_of_trees || 0,
                row.date_planted || 'N/A',
                row.type_of_coffee || 'N/A',
                row.source_of_seedling || 'N/A',
                row.type_of_seedling || 'N/A',
                row.age_of_seedling || 0,
                row.fertilizer_names || row.fertilizers || 'N/A',
                row.use_pesticides === 'yes' ? 'Yes' : 'No',
                row.standard_practices || 'N/A',
                row.isSynced ? 'Synced' : 'Pending',
            ];
            csvRows.push(values.map(v => `"${v}"`).join(','));
        });

        return csvRows.join('\n');
    };

    const exportToCSV = async () => {
        if (filteredData.length === 0) {
            Alert.alert("Export Failed", "There is no data to export.");
            return;
        }
        try {
            const csv = convertToCSV(filteredData);
            const fileUri = FileSystem.documentDirectory + 'block_details.csv';

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

    const renderRow = ({ item }) => (
        <View style={[styles.row, item.isSynced ? styles.syncedRow : styles.pendingRow]}>
            <Text style={[styles.cell, { width: 100 }]}>{item.block_id || 'N/A'}</Text>
            <Text style={[styles.cell, { width: 80 }]}>{item.no_of_trees || 0}</Text>
            <Text style={[styles.cell, { width: 120 }]}>{item.date_planted || 'N/A'}</Text>
            <Text style={[styles.cell, { width: 120 }]}>{item.type_of_coffee || 'N/A'}</Text>
            <Text style={[styles.cell, { width: 150 }]}>{item.source_of_seedling || 'N/A'}</Text>
            <Text style={[styles.cell, { width: 120 }]}>{item.type_of_seedling || 'N/A'}</Text>
            <Text style={[styles.cell, { width: 100 }]}>{item.age_of_seedling || 0}</Text>
            <Text style={[styles.cell, { width: 150 }]}>{item.fertilizer_names || item.fertilizers || 'N/A'}</Text>
            <Text style={[styles.cell, { width: 100 }]}>{item.use_pesticides === 'yes' ? 'Yes' : 'No'}</Text>
            <View style={[styles.cell, { width: 100, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons
                    name={item.isSynced ? "cloud-done" : "cloud-upload-outline"}
                    size={16}
                    color={item.isSynced ? CoffeeColors.MEDIUM_BROWN : CoffeeColors.ACCENT}
                />
                <Text style={{ color: item.isSynced ? CoffeeColors.MEDIUM_BROWN : CoffeeColors.ACCENT, marginLeft: 4, fontSize: 12 }}>
                    {item.isSynced ? 'Synced' : 'Pending'}
                </Text>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
                <Text style={styles.loadingText}>Loading block records...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <Header title="Block Details" navigation={navigation} />

            <View style={styles.container}>
                {/* Sync Status Banner */}
                <View style={styles.syncBanner}>
                    <Text style={styles.syncText}>{syncStatus}</Text>
                    <TouchableOpacity onPress={loadAndSyncData} style={{ marginLeft: 10 }}>
                        <Ionicons name="reload-circle-sharp" size={24} color={CoffeeColors.CREAM} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={CoffeeColors.MEDIUM_BROWN} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by block ID, coffee type..."
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

                {/* Filter & Export Bar */}
                <View style={styles.actionBar}>
                    <View style={styles.pickerWrap}>
                        <Picker selectedValue={filterBy} onValueChange={setFilterBy}>
                            {FILTER_BY_OPTIONS.map(option => (
                                <Picker.Item key={option} label={option} value={option} />
                            ))}
                        </Picker>
                    </View>
                    <TouchableOpacity
                        style={styles.exportButton}
                        onPress={exportToCSV}
                        disabled={filteredData.length === 0}
                    >
                        <Ionicons name="download-outline" size={18} color={CoffeeColors.WHITE} />
                        <Text style={styles.exportText}>Export CSV</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.recordCount}>{filteredData.length} blocks</Text>

                {/* Table Header */}
                <View style={[styles.row, styles.headerRow]}>
                    <Text style={[styles.headerCell, { width: 100 }]}>Block ID</Text>
                    <Text style={[styles.headerCell, { width: 80 }]}>Trees</Text>
                    <Text style={[styles.headerCell, { width: 120 }]}>Date</Text>
                    <Text style={[styles.headerCell, { width: 120 }]}>Type</Text>
                    <Text style={[styles.headerCell, { width: 150 }]}>Source</Text>
                    <Text style={[styles.headerCell, { width: 120 }]}>Seedling</Text>
                    <Text style={[styles.headerCell, { width: 100 }]}>Age</Text>
                    <Text style={[styles.headerCell, { width: 150 }]}>Fertilizer</Text>
                    <Text style={[styles.headerCell, { width: 100 }]}>Pesticides</Text>
                    <Text style={[styles.headerCell, { width: 100 }]}>Status</Text>
                </View>

                {/* Data Rows */}
                <FlatList
                    data={filteredData}
                    renderItem={renderRow}
                    keyExtractor={(item, index) => `${item.block_id}_${item.isSynced}_${index}`}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="file-tray-outline" size={64} color={CoffeeColors.MEDIUM_BROWN} />
                            <Text style={styles.emptyText}>No block records found</Text>
                            {searchTerm && (
                                <Text style={styles.emptySubtext}>Try adjusting your search</Text>
                            )}
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            </View>

            <BottomNav activeScreen="Blocks" />
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
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    pickerWrap: {
        flex: 1,
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        overflow: 'hidden',
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    exportText: {
        color: CoffeeColors.WHITE,
        fontWeight: '700',
        marginLeft: 8,
        fontSize: 14,
    },
    recordCount: {
        fontSize: 14,
        fontWeight: '600',
        color: CoffeeColors.MEDIUM_BROWN,
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        backgroundColor: CoffeeColors.WHITE,
        marginBottom: 5,
        borderRadius: 6,
        paddingVertical: 10,
        paddingHorizontal: 5,
        justifyContent: 'space-between',
    },
    headerRow: {
        backgroundColor: CoffeeColors.DARK_BROWN,
        marginBottom: 8,
    },
    headerCell: {
        flex: 1,
        fontWeight: '700',
        color: CoffeeColors.CREAM,
        textAlign: 'center',
        fontSize: 12,
    },
    syncedRow: {
        borderLeftWidth: 4,
        borderLeftColor: CoffeeColors.MEDIUM_BROWN,
    },
    pendingRow: {
        borderLeftWidth: 4,
        borderLeftColor: CoffeeColors.ACCENT,
    },
    cell: {
        flex: 1,
        color: CoffeeColors.GRAY_TEXT,
        textAlign: 'center',
        fontSize: 12,
        alignSelf: 'center',
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
        color: CoffeeColors.MEDIUM_BROWN,
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: CoffeeColors.GRAY_TEXT,
        fontStyle: 'italic',
    },
});
