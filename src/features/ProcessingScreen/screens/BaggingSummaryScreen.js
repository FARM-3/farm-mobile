// src/features/ProcessingScreen/screens/BaggingSummaryScreen.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import {
    fetchAllBaggingRecords,
    getUnsyncedBaggingRecords,
    syncAllBaggingRecords,
    deleteBaggingRecord
} from '../../../services/baggingService';

import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';

/**
 * BaggingDetailView - Mobile-friendly detail screen for viewing bagging information
 */
const BaggingDetailView = ({ bagging, onBack, navigation }) => {
    if (!bagging) return null;

    const formatValue = (value) => {
        if (value === null || value === undefined || value === '') return 'Not provided';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
    };

    const sections = [
        {
            title: 'Basic Information',
            fields: [
                { label: 'Lot ID', value: bagging.lot_id },
                { label: 'Date', value: bagging.date },
            ]
        },
        {
            title: 'Measurements',
            fields: [
                { label: 'Weight', value: bagging.weight ? `${bagging.weight} kg` : 'Not provided' },
                { label: 'Moisture Content', value: bagging.moisture_content ? `${bagging.moisture_content}%` : 'N/A' },
                { label: 'Number of Bags', value: bagging.no_of_bags || 'N/A' },
            ]
        },
        {
            title: 'Calculated Metrics',
            fields: [
                { label: 'Average Weight per Bag', value: bagging.no_of_bags && bagging.weight ? `${(bagging.weight / bagging.no_of_bags).toFixed(2)} kg` : 'N/A' },
                { label: 'Outturn', value: bagging.outturn ? `${bagging.outturn}%` : 'N/A' },
                { label: 'Expected Outturn', value: bagging.expected_outturn ? `${bagging.expected_outturn}%` : 'N/A' },
            ]
        },
        {
            title: 'Additional Information',
            fields: [
                { label: 'Lot trace code', value: bagging.qr_code || (bagging.lot_id ? `LOT:${bagging.lot_id}` : 'Auto-generated on sync') },
                { label: 'Sync Status', value: bagging.isSynced ? 'Synced' : 'Pending' },
            ]
        }
    ];

    return (
        <View style={styles.detailViewContainer}>
            <View style={styles.detailHeader}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={CoffeeColors.DARK_BROWN} />
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>Bagging Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.detailScrollView} contentContainerStyle={styles.detailContent}>
                <View style={styles.detailNameCard}>
                    <Ionicons name="package-variant-closed" size={32} color={CoffeeColors.DARK_BROWN} style={{ marginBottom: 8 }} />
                    <Text style={styles.detailTitle}>
                        {bagging.lot_id || 'Unknown Lot'}
                    </Text>
                    <Text style={styles.detailSubtitle}>
                        {bagging.date}
                    </Text>
                </View>

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

                <TouchableOpacity
                    style={styles.traceBtn}
                    onPress={() => {
                        const code = bagging.qr_code || (bagging.lot_id ? `LOT:${bagging.lot_id}` : '');
                        if (!code) return;
                        navigation.navigate('ScanLotTrace', { prefillCode: code });
                    }}
                >
                    <Ionicons name="git-network-outline" size={20} color="#fff" />
                    <Text style={styles.traceBtnText}>View full lot history in FMIS</Text>
                </TouchableOpacity>
                <Text style={styles.traceHint}>
                  External camera apps only show the code text. Use this button (or Processing → Scan Lot) for the full trace.
                </Text>
            </ScrollView>
        </View>
    );
};

export default function BaggingSummaryScreen({ route = {}, navigation }) {
    const [allRecords, setAllRecords] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState('Checking connectivity and syncing...');
    const [unsyncedCount, setUnsyncedCount] = useState(0);

    const [selectedBagging, setSelectedBagging] = useState(null);
    const [viewMode, setViewMode] = useState('list');

    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', buttons: [] });
    const [successMessage, setSuccessMessage] = useState('');
    const successTimeoutRef = useRef(null);

    const loadAndSyncData = useCallback(async () => {
        console.log('[BaggingSummary] ===== loadAndSyncData START =====');
        setIsLoading(true);
        let remoteRecords = [];
        let localRecords = [];

        const netState = await NetInfo.fetch();
        const isConnected = netState.isConnected && netState.isInternetReachable;
        console.log('[BaggingSummary] isConnected:', isConnected);

        if (isConnected) {
            setSyncStatus('Online: Initiating data synchronization.');

            const syncResult = await syncAllBaggingRecords();
            console.log('[BaggingSummary] Sync result:', syncResult);

            if (syncResult.totalCount > 0) {
                if (syncResult.syncedCount === syncResult.totalCount) {
                    setSyncStatus(`Success! All ${syncResult.syncedCount} records uploaded to cloud.`);
                } else if (syncResult.syncedCount > 0) {
                    const failedCount = syncResult.totalCount - syncResult.syncedCount;
                    setSyncStatus(`Partial: ${syncResult.syncedCount} uploaded, ${failedCount} failed.`);
                } else {
                    setSyncStatus(`Failed: Could not sync ${syncResult.totalCount} records.`);
                }
            } else {
                setSyncStatus('Online: No pending records to sync.');
            }

            const remoteResponse = await fetchAllBaggingRecords();
            console.log('[BaggingSummary] Remote response:', JSON.stringify(remoteResponse, null, 2));

            if (remoteResponse.success) {
                const remoteData = Array.isArray(remoteResponse.remoteData)
                    ? remoteResponse.remoteData
                    : (remoteResponse.remoteData?.results || []);

                remoteRecords = remoteData.map(r => ({
                    id: r.id,
                    lot_id: r.lot_id,
                    weight: r.weight,
                    moisture_content: r.moisture_content,
                    no_of_bags: r.no_of_bags,
                    date: r.date,
                    outturn: r.outturn,
                    expected_outturn: r.expected_outturn,
                    qr_code: r.qr_code,
                    created_at: r.created_at,
                    isSynced: true
                }));
            }
        } else {
            setSyncStatus('Offline Mode: Data saved locally. Sync will occur when online.');
        }

        const localResponse = await getUnsyncedBaggingRecords();
        if (localResponse.success && Array.isArray(localResponse.records)) {
            localRecords = localResponse.records.map(r => ({
                ...r,
                isSynced: false
            }));
        }

        const localIds = new Set(localRecords.map(r => r.id));
        const uniqueRemoteRecords = remoteRecords.filter(r => !localIds.has(r.id));

        let finalRecords = [...localRecords, ...uniqueRemoteRecords];

        finalRecords.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        });

        const pendingRecords = finalRecords.filter(r => !r.isSynced);
        setUnsyncedCount(pendingRecords.length);

        console.log('[BaggingSummary] Final combined records count:', finalRecords.length);

        setAllRecords(finalRecords);
        setFilteredData(finalRecords);
        setIsLoading(false);
        console.log('[BaggingSummary] ===== loadAndSyncData END =====');
    }, []);

    useEffect(() => {
        loadAndSyncData();
    }, [loadAndSyncData]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            console.log('[BaggingSummary] Screen focused, refreshing data...');
            loadAndSyncData();
        });
        return unsubscribe;
    }, [navigation, loadAndSyncData]);

    useEffect(() => {
        return () => {
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
            }
        };
    }, []);

    const handleSyncPress = async () => {
        if (unsyncedCount > 0) {
            await loadAndSyncData();
        } else {
            Alert.alert(
                'No Records to Sync',
                'All bagging records are already synced to the cloud.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleEdit = (item) => {
        navigation.navigate('BaggingForm', { editData: item });
    };

    const showSuccessMessage = (message) => {
        setSuccessMessage(message);
        if (successTimeoutRef.current) {
            clearTimeout(successTimeoutRef.current);
        }
        successTimeoutRef.current = setTimeout(() => {
            setSuccessMessage('');
        }, 2500);
    };

    const handleDelete = (item) => {
        setAlertConfig({
            visible: true,
            title: 'Delete Bagging Record',
            message: `Are you sure you want to delete the bagging record for lot ${item.lot_id}?`,
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
                            const result = await deleteBaggingRecord(item.id);

                            if (result.success) {
                                showSuccessMessage('Bagging record deleted successfully');
                                setTimeout(() => {
                                    loadAndSyncData();
                                }, 1000);
                            } else {
                                setAlertConfig({
                                    visible: true,
                                    title: 'Delete Failed',
                                    message: `Failed to delete record. Status: ${result.status}.`,
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

    const renderRow = ({ item, index }) => (
        <TouchableOpacity
            style={[styles.dataListItem, item.isSynced ? styles.syncedRow : styles.pendingRow]}
            onPress={() => {
                setSelectedBagging(item);
                setViewMode('detail');
            }}
        >
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={styles.dataListItemTitle}>
                        {item.lot_id || 'N/A'}
                    </Text>
                </View>
                <Text style={styles.dataListItemSubtitle}>
                    Date: {item.date}
                </Text>
                <Text style={styles.dataListItemSubtitle}>
                    Weight: {item.weight ? `${item.weight} kg` : 'N/A'} | Bags: {item.no_of_bags || 'N/A'}
                </Text>
                {!item.isSynced && (
                    <View style={styles.syncStatusInline}>
                        <Ionicons name="cloud-upload-outline" size={14} color={CoffeeColors.LIGHT_BROWN} />
                        <Text style={[styles.syncStatusText, { color: CoffeeColors.LIGHT_BROWN }]}>Pending</Text>
                    </View>
                )}
            </View>

            <View style={styles.recordActions}>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                    }}
                >
                    <Ionicons name="pencil" size={20} color={CoffeeColors.DARK_BROWN} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(item);
                    }}
                >
                    <Ionicons name="trash" size={20} color={'#d32f2f'} />
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

    const handleBackPress = () => {
        if (viewMode === 'detail') {
            setViewMode('list');
            setSelectedBagging(null);
        } else {
            navigation.goBack();
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader
                title="Bagging Records"
                unsyncedCount={unsyncedCount}
                onSync={handleSyncPress}
                onBackPress={handleBackPress}
            />
            {successMessage ? (
                <View style={styles.successBanner}>
                    <Ionicons name="checkmark-circle" size={20} color={CoffeeColors.WHITE} style={{ marginRight: 8 }} />
                    <Text style={styles.successText}>{successMessage}</Text>
                </View>
            ) : null}

            <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <View style={styles.container}>
                    {viewMode === 'list' && (
                        <>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => navigation.navigate('BaggingForm')}
                            >
                                <Ionicons name="add-circle" size={20} color={CoffeeColors.WHITE} />
                                <Text style={styles.addButtonText}>Add New Bagging Entry</Text>
                            </TouchableOpacity>

                            <View style={styles.syncBanner}>
                                <Text style={styles.syncText}>{syncStatus}</Text>
                                <TouchableOpacity onPress={loadAndSyncData} style={{ marginLeft: 10 }}>
                                    <Ionicons name="reload-circle-sharp" size={24} color={CoffeeColors.WHITE} />
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={filteredData}
                                renderItem={renderRow}
                                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                                ListEmptyComponent={<Text style={styles.emptyText}>No bagging records found.</Text>}
                                contentContainerStyle={{ paddingBottom: 100 }}
                            />
                        </>
                    )}

                    {viewMode === 'detail' && selectedBagging && (
                        <BaggingDetailView
                            bagging={selectedBagging}
                            navigation={navigation}
                            onBack={() => {
                                setSelectedBagging(null);
                                setViewMode('list');
                            }}
                        />
                    )}
                </View>
            </View>
            <BottomNav activeScreen="Processing" />

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
    dataListItemSubtitle: {
        fontSize: 13,
        color: CoffeeColors.GRAY_TEXT,
        fontFamily: Fonts.regular,
        marginTop: 4,
    },
    pendingRow: {
        backgroundColor: CoffeeColors.WHITE,
        borderLeftWidth: 4,
        borderLeftColor: CoffeeColors.LIGHT_BROWN,
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
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: CoffeeColors.MEDIUM_BROWN,
        fontStyle: 'italic',
        fontFamily: Fonts.regular,
    },
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
    detailTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 8,
        textAlign: 'center',
    },
    detailSubtitle: {
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
    traceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: CoffeeColors.DARK_BROWN,
        padding: 14,
        borderRadius: 12,
        marginTop: 16,
    },
    traceBtnText: { color: '#fff', fontWeight: '700', fontFamily: Fonts.semiBold },
    traceHint: { fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center', fontFamily: Fonts.regular },
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
