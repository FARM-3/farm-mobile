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
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import CoffeeColors from '../../../theme/colors';
import {
    fetchAllHarvestRecords,
    getUnsyncedRecords,
    syncAllRecords
} from '../../../services/harvestRecord';
import Header from '../../../components/Header';
import BottomNav from '../../../components/BottomNav';

const BLOCK_OPTIONS = ["All Blocks", "Block A-1", "Block B-2", "Block C-3"];
const SYNC_STATUS_OPTIONS = ["All Statuses", "Synced", "Pending"];

export default function HarvestDetailsScreen({ route = {}, navigation }) {
    const [allRecords, setAllRecords] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState("Checking connectivity and syncing...");

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBlock, setFilterBlock] = useState(BLOCK_OPTIONS[0]);
    const [filterStatus, setFilterStatus] = useState(SYNC_STATUS_OPTIONS[0]);

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

            const syncResult = await syncAllRecords();
            if (syncResult.totalCount > 0) {
                setSyncStatus(`Sync complete! ${syncResult.syncedCount} of ${syncResult.totalCount} records uploaded.`);
            } else {
                setSyncStatus("Online: No pending records to sync.");
            }

            const remoteResponse = await fetchAllHarvestRecords();
            if (remoteResponse.success && Array.isArray(remoteResponse.remoteData.results)) {
                remoteRecords = remoteResponse.remoteData.results.map(r => ({
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

        const localIds = new Set(localRecords.map(r => r.id));
        const uniqueRemoteRecords = remoteRecords.filter(r => !localIds.has(r.id));

        let finalRecords = [...localRecords, ...uniqueRemoteRecords];
        finalRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        setAllRecords(finalRecords);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        let result = allRecords;

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(record =>
                record.name?.toLowerCase().includes(lowerSearch) ||
                record.id?.toString().toLowerCase().includes(lowerSearch)
            );
        }

        if (filterBlock !== BLOCK_OPTIONS[0]) {
            result = result.filter(record => record.block === filterBlock);
        }

        if (filterStatus === "Synced") {
            result = result.filter(record => record.isSynced === true);
        } else if (filterStatus === "Pending") {
            result = result.filter(record => record.isSynced === false);
        }

        setFilteredData(result);
    }, [allRecords, searchTerm, filterBlock, filterStatus]);

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
                        Alert.alert('Delete', 'Delete functionality will be implemented with API integration');
                    }
                }
            ]
        );
    };

    const handleScroll = (event, index) => {
        const scrollX = event.nativeEvent.contentOffset.x;

        if (headerScrollRef.current) {
            headerScrollRef.current.scrollTo({ x: scrollX, animated: false });
        }

        rowScrollRefs.current.forEach((ref, i) => {
            if (ref && i !== index) {
                ref.scrollTo({ x: scrollX, animated: false });
            }
        });
    };

    const renderRow = ({ item, index }) => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.rowScrollView}
            ref={(ref) => rowScrollRefs.current[index] = ref}
            onScroll={(event) => handleScroll(event, index)}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToAlignment="start"
        >
            <View style={[styles.row, item.isSynced ? styles.syncedRow : styles.pendingRow]}>
                <Text style={styles.cell}>{item.weight}</Text>
                <Text style={styles.cell}>{item.block}</Text>
                <Text style={styles.cell}>{item.date}</Text>
                <Text style={styles.cell}>{item.name || 'N/A'}</Text>
                <Text style={styles.cell}>{item.amountPaid ? `${item.amountPaid} UGX` : 'N/A'}</Text>
                <Text style={styles.cell}>{item.paidBy || 'N/A'}</Text>
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
            <Header title="Harvest Details" navigation={navigation} />
            <View style={styles.container}>
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Harvests')}
                >
                    <Ionicons name="arrow-back" size={20} color={CoffeeColors.CREAM} />
                    <Text style={styles.backButtonText}>Back to Production Harvests</Text>
                </TouchableOpacity>
                {/* Sync Status Banner */}
                <View style={styles.syncBanner}>
                    <Text style={styles.syncText}>{syncStatus}</Text>
                    <TouchableOpacity onPress={loadAndSyncData} style={{ marginLeft: 10 }}>
                        <Ionicons name="reload-circle-sharp" size={24} color={CoffeeColors.CREAM} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search by worker name or record ID..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                />

                {/* Filters */}
                <View style={styles.filtersContainer}>
                    <View style={styles.pickerWrap}>
                        <Picker selectedValue={filterBlock} onValueChange={setFilterBlock}>
                            {BLOCK_OPTIONS.map(b => <Picker.Item key={b} label={b} value={b} />)}
                        </Picker>
                    </View>
                    <View style={styles.pickerWrap}>
                        <Picker selectedValue={filterStatus} onValueChange={setFilterStatus}>
                            {SYNC_STATUS_OPTIONS.map(s => <Picker.Item key={s} label={s} value={s} />)}
                        </Picker>
                    </View>
                </View>

                {/* Export Button */}
                <TouchableOpacity
                    style={styles.exportButton}
                    onPress={exportToExcel}
                    disabled={filteredData.length === 0}
                >
                    <Ionicons name="download-outline" size={18} color={CoffeeColors.CREAM} />
                    <Text style={styles.exportText}>Export {filteredData.length} Records to CSV</Text>
                </TouchableOpacity>

                {/* Header */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    ref={headerScrollRef}
                    onScroll={(event) => handleScroll(event, -1)}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    snapToAlignment="start"
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    exportText: {
        color: CoffeeColors.CREAM,
        fontWeight: '700',
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
    headerRow: {
        backgroundColor: CoffeeColors.DARK_BROWN,
        marginBottom: 8,
        borderRadius: 6,
        paddingVertical: 8,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CoffeeColors.MEDIUM_BROWN,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        marginBottom: 10,
        alignSelf: 'flex-start',
    },
    backButtonText: {
        color: CoffeeColors.CREAM,
        fontWeight: '600',
        marginLeft: 6,
        fontSize: 14,
    },
    headerCell: {
        width: 100,
        fontWeight: '700',
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
        borderLeftColor: CoffeeColors.ACCENT,
    },
    cell: {
        width: 100,
        color: CoffeeColors.GRAY_TEXT,
        textAlign: 'center',
        fontSize: 12,
        alignSelf: 'center',
        paddingHorizontal: 5,
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
        backgroundColor: CoffeeColors.ACCENT,
        borderRadius: 5,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellText: {
        fontSize: 12,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: CoffeeColors.MEDIUM_BROWN,
        fontStyle: 'italic',
    }
});
