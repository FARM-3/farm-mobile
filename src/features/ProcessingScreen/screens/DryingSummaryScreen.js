// src/features/ProcessingScreen/screens/DryingSummaryScreen.js

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
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from '@expo/vector-icons';

import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import {
    fetchAllDryingRecords,
    getUnsyncedDryingRecords,
    syncAllDryingRecords,
    deleteDryingRecord
} from '../../../services/dryingService';

import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';

/**
 * DryingDetailView - Mobile-friendly detail screen for viewing drying information
 */
const DryingDetailView = ({ drying, onBack }) => {
    if (!drying) return null;

    const formatValue = (value) => {
        if (value === null || value === undefined || value === '') return 'Not provided';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
    };

    const sections = [
        {
            title: 'Basic Information',
            fields: [
                { label: 'Processing ID', value: drying.processing_id || drying.processingId },
                { label: 'Lot ID', value: drying.lot_id || drying.lotId },
                { label: 'Date', value: drying.date },
                { label: 'Weather Condition', value: drying.weather_condition || drying.weatherCondition },
                { label: 'Processing Type', value: drying.processing_type || drying.processingType },
                { label: 'Type of Coffee', value: drying.type_of_coffee || drying.typeOfCoffee },
            ]
        },
        {
            title: 'Measurements',
            fields: [
                { label: 'Moisture Content', value: drying.moisture_content ? `${drying.moisture_content}%` : 'N/A' },
                { label: 'Weight', value: drying.weight ? `${drying.weight} kg` : 'Not provided' },
                { label: 'Moisture Before', value: drying.moisture_before ? `${drying.moisture_before}%` : 'Not provided' },
                { label: 'Weight Before', value: drying.weight_before ? `${drying.weight_before} kg` : 'Not provided' },
                { label: 'Days', value: drying.days || 'N/A' },
            ]
        },
        {
            title: 'Calculated Metrics',
            fields: [
                { label: 'Moisture Deviation', value: drying.moisture_deviation ? `${drying.moisture_deviation}%` : '0%' },
                { label: 'Rate of Drying', value: drying.rate_of_drying ? `${drying.rate_of_drying}%` : '0%' },
                { label: 'Rate of Weight Loss', value: drying.rate_of_weightloss ? `${drying.rate_of_weightloss} kg` : '0 kg' },
                { label: 'Outturn', value: drying.outturn ? `${drying.outturn}%` : '0%' },
                { label: 'Outturn Deviation', value: drying.outturn_deviation ? `${drying.outturn_deviation}%` : '0%' },
            ]
        },
        {
            title: 'Additional Information',
            fields: [
                { label: 'Created At', value: drying.created_at ? new Date(drying.created_at).toLocaleString() : 'N/A' },
                { label: 'Sync Status', value: drying.isSynced ? 'Synced' : 'Pending' },
            ]
        }
    ];

    return (
        <View style={styles.detailViewContainer}>
            <View style={styles.detailHeader}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={CoffeeColors.DARK_BROWN} />
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>Drying Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.detailScrollView} contentContainerStyle={styles.detailContent}>
                <View style={styles.detailNameCard}>
                    <Ionicons name="water" size={32} color={CoffeeColors.DARK_BROWN} style={{ marginBottom: 8 }} />
                    <Text style={styles.detailTitle}>
                        {drying.processing_id || drying.processingId || 'Unknown Processing ID'}
                    </Text>
                    <Text style={styles.detailSubtitle}>
                        Lot: {drying.lot_id || drying.lotId || 'N/A'}
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
            </ScrollView>
        </View>
    );
};

export default function DryingSummaryScreen({ route = {}, navigation }) {
    const [allRecords, setAllRecords] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState("Checking connectivity and syncing...");
    const [unsyncedCount, setUnsyncedCount] = useState(0);

    const [selectedDrying, setSelectedDrying] = useState(null);
    const [viewMode, setViewMode] = useState('list');

    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', buttons: [] });
    const [successMessage, setSuccessMessage] = useState('');
    const successTimeoutRef = useRef(null);

    const loadAndSyncData = useCallback(async () => {
        console.log('[DryingSummary] ===== loadAndSyncData START =====');
        setIsLoading(true);
        let remoteRecords = [];
        let localRecords = [];

        const netState = await NetInfo.fetch();
        const isConnected = netState.isConnected && netState.isInternetReachable;
        console.log('[DryingSummary] isConnected:', isConnected);

        if (isConnected) {
            setSyncStatus("Online: Initiating data synchronization.");

            const syncResult = await syncAllDryingRecords();
            console.log('[DryingSummary] Sync result:', syncResult);

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
                setSyncStatus("Online: No pending records to sync.");
            }

            const remoteResponse = await fetchAllDryingRecords();
            console.log('[DryingSummary] Remote response:', JSON.stringify(remoteResponse, null, 2));

            if (remoteResponse.success) {
                const remoteData = Array.isArray(remoteResponse.remoteData)
                    ? remoteResponse.remoteData
                    : (remoteResponse.remoteData?.results || []);

                remoteRecords = remoteData.map(r => ({
                    id: r.id,
                    processing_id: r.processing_id || r.processingId,
                    lot_id: r.lot_id || r.lotId,
                    date: r.date,
                    weather_condition: r.weather_condition || r.weatherCondition,
                    moisture_content: r.moisture_content || r.moistureContent,
                    weight: r.weight,
                    moisture_before: r.moisture_before,
                    weight_before: r.weight_before,
                    processing_type: r.processing_type || r.processingType,
                    type_of_coffee: r.type_of_coffee || r.typeOfCoffee,
                    days: r.days,
                    moisture_deviation: r.moisture_deviation,
                    rate_of_drying: r.rate_of_drying,
                    rate_of_weightloss: r.rate_of_weightloss,
                    outturn: r.outturn,
                    outturn_deviation: r.outturn_deviation,
                    created_at: r.created_at,
                    isSynced: true
                }));
            }
        } else {
            setSyncStatus("Offline Mode: Data saved locally. Sync will occur when online.");
        }

        const localResponse = await getUnsyncedDryingRecords();
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

        console.log('[DryingSummary] Final combined records count:', finalRecords.length);

        setAllRecords(finalRecords);
        setFilteredData(finalRecords);
        setIsLoading(false);
        console.log('[DryingSummary] ===== loadAndSyncData END =====');
    }, []);

    useEffect(() => {
        loadAndSyncData();
    }, [loadAndSyncData]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            console.log('[DryingSummary] Screen focused, refreshing data...');
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
                "No Records to Sync",
                "All drying records are already synced to the cloud.",
                [{ text: "OK" }]
            );
        }
    };

    const handleEdit = (item) => {
        navigation.navigate('DryingForm', { editData: item });
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
            title: 'Delete Drying Record',
            message: `Are you sure you want to delete the drying record for ${item.processing_id || item.processingId}?`,
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
                            const result = await deleteDryingRecord(item.id);

                            if (result.success) {
                                showSuccessMessage('Drying record deleted successfully');
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
                setSelectedDrying(item);
                setViewMode('detail');
            }}
        >
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={styles.dataListItemTitle}>
                        {item.processing_id || item.processingId || 'N/A'}
                    </Text>
                </View>
                <Text style={styles.dataListItemSubtitle}>
                    Lot: {item.lot_id || item.lotId || 'N/A'} | Date: {item.date}
                </Text>
                <Text style={styles.dataListItemSubtitle}>
                    Moisture: {item.moisture_content}% | Weight: {item.weight ? `${item.weight} kg` : 'N/A'}
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
            setSelectedDrying(null);
        } else {
            navigation.goBack();
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader
                title="Drying Records"
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
                                onPress={() => navigation.navigate('DryingForm')}
                            >
                                <Ionicons name="add-circle" size={20} color={CoffeeColors.WHITE} />
                                <Text style={styles.addButtonText}>Add New Drying Entry</Text>
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
                                ListEmptyComponent={<Text style={styles.emptyText}>No drying records found.</Text>}
                                contentContainerStyle={{ paddingBottom: 100 }}
                            />
                        </>
                    )}

                    {viewMode === 'detail' && selectedDrying && (
                        <DryingDetailView
                            drying={selectedDrying}
                            onBack={() => {
                                setSelectedDrying(null);
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
