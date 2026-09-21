// src/features/harvest/screens/HarvestDetailsScreen.js
// Detailed table view showing all harvest records with export functionality

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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
import CustomPicker from '../../../components/CustomPicker';
import { getStaffById, fetchAllStaff } from '../../../services/staffService';

const FILTER_BY_OPTIONS = ["All Records", "Synced Only", "Pending Only"];

export default function HarvestDetailsScreen({ route = {}, navigation }) {
    const [allRecords, setAllRecords] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState("Checking connectivity and syncing...");

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState(FILTER_BY_OPTIONS[0]);

    // Staff name cache - stores lookups for staff by ID
    const [staffNameCache, setStaffNameCache] = useState({});
    const [allStaffList, setAllStaffList] = useState([]);

    // Load all staff once at component mount
    useEffect(() => {
        const loadAllStaff = async () => {
            try {
                const result = await fetchAllStaff();
                if (result.success && result.staff && Array.isArray(result.staff)) {
                    setAllStaffList(result.staff);
                }
            } catch (error) {
                console.error('[HarvestDetailsScreen] Error loading staff:', error);
            }
        };
        loadAllStaff();
    }, []);

    // Ref for synchronized scrolling
    const headerScrollRef = useRef(null);
    const rowScrollRefs = useRef([]);

    const loadAndSyncData = useCallback(async () => {
        setIsLoading(true);
        let remoteRecords = [];
        let localRecords = [];

        const netState = await NetInfo.fetch();
        const isConnected = netState.isConnected && netState.isInternetReachable;

        if (isConnected) {
            setSyncStatus("Online: Initiating data synchronization.");

            const syncResult = await syncAllProductionRecords();
            if (syncResult.totalCount > 0) {
                setSyncStatus(`Sync complete! ${syncResult.syncedCount} of ${syncResult.totalCount} records uploaded.`);
            } else {
                setSyncStatus("Online: No pending records to sync.");
            }

            const remoteResponse = await fetchAllProductionHarvestRecords();
            if (remoteResponse.success && Array.isArray(remoteResponse.remoteData)) {
                remoteRecords = remoteResponse.remoteData.map(r => ({
                    id: r.harvest_id,
                    block: r.block_id,
                    name: r.worker_name,
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

        const localResponse = await getUnsyncedProductionRecords();
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

        const localIds = new Set(localRecords.map(r => r.id));
        const uniqueRemoteRecords = remoteRecords.filter(r => !localIds.has(r.id));

        let finalRecords = [...localRecords, ...uniqueRemoteRecords];
        finalRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        setAllRecords(finalRecords);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        let result = allRecords;

        // Apply search filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(record =>
                record.name?.toLowerCase().includes(lowerSearch) ||
                record.id?.toString().toLowerCase().includes(lowerSearch) ||
                record.block?.toLowerCase().includes(lowerSearch)
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
            console.log('[HarvestDetails] Screen focused, refreshing data...');
            loadAndSyncData();
        });
        return unsubscribe;
    }, [navigation, loadAndSyncData]);

    const convertToCSV = (rows) => {
        const header = ['Id', 'Weight(kg)', 'Block', 'Date', 'Worker Name', 'Amount Paid(UGX)', 'Paid By', 'Sync Status'];
        const csvRows = [header.join(',')];

        rows.forEach((row) => {
            const amountPaidValue = row.amountPaid !== undefined ? row.amountPaid : 0;
            const weightValue = row.weight.replace(' kg', '');

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
            const fileUri = FileSystem.documentDirectory + 'harvest_details.csv';

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
        navigation.navigate('HarvestForm', { editData: item });
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
                        try {
                            // Show loading indicator
                            Alert.alert('Deleting', 'Removing harvest record...', [], { cancelable: false });

                            // Call delete API
                            const result = await deleteProductionHarvestRecord(item.id);

                            // Close loading alert
                            Alert.alert('', '', [{ text: 'OK' }]);

                            if (result.success) {
                                // Refresh the data
                                await loadAndSyncData();
                                Alert.alert('Success', 'Harvest record deleted successfully');
                            } else {
                                Alert.alert(
                                    'Delete Failed',
                                    `Failed to delete record. Status: ${result.status}. ${result.remoteData?.detail || ''}`
                                );
                            }
                        } catch (error) {
                            Alert.alert('Error', `An error occurred while deleting: ${error.message}`);
                        }
                    }
                }
            ]
        );
    };

    const handleScroll = (event, sourceIndex) => {
        const scrollX = event.nativeEvent.contentOffset.x;

        // Sync header
        if (sourceIndex !== -1 && headerScrollRef.current) {
            headerScrollRef.current.scrollTo({ x: scrollX, animated: false });
        }

        // Sync all rows
        rowScrollRefs.current.forEach((ref, i) => {
            if (ref && i !== sourceIndex) {
                ref.scrollTo({ x: scrollX, animated: false });
            }
        });

        // If header is the source, sync all rows
        if (sourceIndex === -1) {
            rowScrollRefs.current.forEach((ref) => {
                if (ref) {
                    ref.scrollTo({ x: scrollX, animated: false });
                }
            });
        }
    };

    // Build staff name cache from pre-loaded staff list
    useEffect(() => {
        if (filteredData.length === 0 || allStaffList.length === 0) {
            return;
        }

        const newCache = { ...staffNameCache };
        const uniqueStaffIds = new Set(filteredData.map(r => r.paidBy).filter(id => id && !staffNameCache[id]));

        for (const paidById of uniqueStaffIds) {
            // Match against staff ID
            const foundStaff = allStaffList.find(s =>
                String(s.id) === String(paidById)
            );

            if (foundStaff) {
                newCache[paidById] = foundStaff.displayName || 'Unknown Staff';
            }
        }

        setStaffNameCache(newCache);
    }, [filteredData, allStaffList]);

    const renderRow = ({ item, index }) => {
        const paidByName = staffNameCache[item.paidBy] || item.paidBy || 'N/A';
        return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.rowScrollView}
            ref={(ref) => rowScrollRefs.current[index] = ref}
            onScroll={(event) => handleScroll(event, index)}
            scrollEventThrottle={16}
            bounces={false}
            bouncesZoom={false}
        >
            <View style={[styles.row, item.isSynced ? styles.syncedRow : styles.pendingRow]}>
                <Text style={styles.cell}>{item.weight}</Text>
                <Text style={styles.cell}>{item.block}</Text>
                <Text style={styles.cell}>{item.date}</Text>
                <Text style={styles.cell}>{item.name || 'N/A'}</Text>
                <Text style={styles.cell}>{item.amountPaid ? `${item.amountPaid} UGX` : 'N/A'}</Text>
                <Text style={styles.cell}>{paidByName}</Text>
                <View style={styles.statusCell}>
                    <Ionicons
                        name={item.isSynced ? "cloud-done" : "cloud-upload-outline"}
                        size={16}
                        color={item.isSynced ? CoffeeColors.MEDIUM_BROWN : CoffeeColors.ACCENT}
                    />
                    <Text style={[styles.cellText, { color: item.isSynced ? CoffeeColors.MEDIUM_BROWN : CoffeeColors.ACCENT, marginLeft: 4 }]}>
                        {item.isSynced ? 'Synced' : 'Pending'}
                    </Text>
                </View>
                <View style={styles.actionsCell}>
                    <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(item)}>
                        <Ionicons name="create-outline" size={18} color={CoffeeColors.WHITE} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={18} color={CoffeeColors.WHITE} />
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
                <Text style={styles.loadingText}>Loading harvest details...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader title="Harvest Details" />
            <View style={styles.container}>
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Harvests')}
                >
                    <Ionicons name="arrow-back" size={20} color={CoffeeColors.WHITE} />
                    <Text style={styles.backButtonText}>Back to Estate Harvests</Text>
                </TouchableOpacity>
                {/* Sync Status Banner */}
                <View style={styles.syncBanner}>
                    <Text style={styles.syncText}>{syncStatus}</Text>
                    <TouchableOpacity onPress={loadAndSyncData} style={{ marginLeft: 10 }}>
                        <Ionicons name="reload-circle-sharp" size={24} color={CoffeeColors.CREAM} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar and Filter */}
                <View style={styles.searchFilterContainer}>
                    <TextInput
                        style={styles.searchBar}
                        placeholder="Search by worker name, ID, or block..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        placeholderTextColor={CoffeeColors.GRAY_TEXT}
                    />
                    <View style={styles.filterByContainer}>
                        <CustomPicker
                            selectedValue={filterBy}
                            onValueChange={setFilterBy}
                            items={FILTER_BY_OPTIONS}
                        />
                    </View>
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

                {/* Header */}
                <View style={styles.headerContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={true}
                        ref={headerScrollRef}
                        onScroll={(event) => handleScroll(event, -1)}
                        scrollEventThrottle={16}
                        bounces={false}
                        bouncesZoom={false}
                    >
                        <View style={[styles.row, styles.headerRow]}>
                            <Text style={styles.headerCell}>Weight</Text>
                            <Text style={styles.headerCell}>Block</Text>
                            <Text style={styles.headerCell}>Date</Text>
                            <Text style={styles.headerCell}>Worker</Text>
                            <Text style={styles.headerCell}>Amount Paid</Text>
                            <Text style={styles.headerCell}>Paid By</Text>
                            <Text style={styles.headerCell}>Status</Text>
                            <Text style={styles.headerCell}>Actions</Text>
                        </View>
                    </ScrollView>
                </View>

                {/* Data Rows */}
                <FlatList
                    data={filteredData}
                    renderItem={renderRow}
                    keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                    ListEmptyComponent={<Text style={styles.emptyText}>No harvest records found matching your filters.</Text>}
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            </View>
            <BottomNav activeScreen="Harvests" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CoffeeColors.LIGHT_GRAY,
        padding: 10,
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
    searchFilterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    searchBar: {
        flex: 1,
        backgroundColor: CoffeeColors.WHITE,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        fontSize: 14,
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    filterByContainer: {
        minWidth: 140,
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        overflow: 'hidden',
        height: 42,
        justifyContent: 'center',
    },
    filterByPicker: {
        height: 42,
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.regular,
    },
    exportButton: {
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
        paddingVertical: 8,
        paddingHorizontal: 5,
        minWidth: 900,
    },
    headerContainer: {
        marginBottom: 8,
        backgroundColor: CoffeeColors.DARK_BROWN,
        borderRadius: 6,
        overflow: 'hidden',
    },
    headerRow: {
        backgroundColor: CoffeeColors.DARK_BROWN,
        borderRadius: 6,
        paddingVertical: 10,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CoffeeColors.DARK_BROWN,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        marginBottom: 10,
        alignSelf: 'flex-start',
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    backButtonText: {
        color: CoffeeColors.WHITE,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        marginLeft: 6,
        fontSize: 14,
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
    syncedRow: {
        borderLeftWidth: 5,
        borderLeftColor: CoffeeColors.MEDIUM_BROWN,
    },
    pendingRow: {
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
    }
});
