// src/features/ProcessingScreen/screens/FermentingSummaryScreen.js
// Summary/List screen for fermenting records

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';
import { syncAllFermentingRecords } from '../../../services/fermentingService';

const FERMENTING_STORAGE_KEY = 'fermenting_records';

// Detailed view component for a fermenting record
const FermentingDetailView = ({ record, onBack }) => {
    if (!record) return null;

    const formatValue = (value) => {
        if (value === null || value === undefined || value === '') return 'Not provided';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
    };

    const sections = [
        {
            title: 'Fermenting Details',
            fields: [
                { label: 'Processing ID', value: record.processing_id },
                { label: 'Grade ID', value: record.grade },
                { label: 'Start Date', value: record.start_date },
                { label: 'End Date', value: record.end_date },
                { label: 'Days', value: `${record.days || 0} days` },
                { label: 'Weight (After)', value: `${record.weight || 0} kg` },
            ]
        },
        {
            title: 'Additional Information',
            fields: [
                { label: 'Created At', value: record.created_at ? new Date(record.created_at).toLocaleString() : 'N/A' },
                { label: 'Sync Status', value: record.isSynced ? 'Synced' : 'Pending' },
            ]
        }
    ];

    return (
        <View style={styles.detailViewContainer}>
            <View style={styles.detailHeader}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={CoffeeColors.DARK_BROWN} />
                </TouchableOpacity>
                <Text style={styles.detailHeaderTitle}>Fermenting Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.detailScrollView} contentContainerStyle={styles.detailContent}>
                <View style={styles.detailNameCard}>
                    <Ionicons name="water" size={32} color={CoffeeColors.DARK_BROWN} style={{ marginBottom: 8 }} />
                    <Text style={styles.detailRecordName}>
                        {record.processing_id || 'Unknown'}
                    </Text>
                    <Text style={styles.detailRecordId}>
                        Grade: {record.grade || 'N/A'}
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

export default function FermentingSummaryScreen({ navigation }) {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [viewMode, setViewMode] = useState('list');
    const [isSyncing, setIsSyncing] = useState(false);
    const [unsyncedCount, setUnsyncedCount] = useState(0);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        type: 'info',
        buttons: [],
    });

    const loadRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            // Load records from AsyncStorage
            const storedData = await AsyncStorage.getItem(FERMENTING_STORAGE_KEY);
            if (storedData) {
                const parsedRecords = JSON.parse(storedData);
                // Sort by created_at descending (newest first)
                parsedRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setRecords(parsedRecords);

                // Count unsynced records
                const unsynced = parsedRecords.filter(r => !r.isSynced).length;
                setUnsyncedCount(unsynced);

                console.log('[FermentingSummary] Loaded', parsedRecords.length, 'records,', unsynced, 'unsynced');
            } else {
                setRecords([]);
                setUnsyncedCount(0);
                console.log('[FermentingSummary] No records found');
            }
        } catch (error) {
            console.error('[FermentingSummary] Error loading records:', error);
            setRecords([]);
            setUnsyncedCount(0);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRecords();
    }, [loadRecords]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            console.log('[FermentingSummary] Screen focused, refreshing data...');
            loadRecords();
        });
        return unsubscribe;
    }, [navigation, loadRecords]);

    const handleDelete = async (record) => {
        setAlertConfig({
            title: 'Delete Record',
            message: `Are you sure you want to delete ${record.processing_id}?`,
            type: 'warning',
            buttons: [
                {
                    text: 'Cancel',
                    onPress: () => setAlertVisible(false),
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    onPress: async () => {
                        setAlertVisible(false);
                        try {
                            const storedData = await AsyncStorage.getItem(FERMENTING_STORAGE_KEY);
                            if (storedData) {
                                const parsedRecords = JSON.parse(storedData);
                                const filteredRecords = parsedRecords.filter(
                                    r => r.processing_id !== record.processing_id
                                );
                                await AsyncStorage.setItem(
                                    FERMENTING_STORAGE_KEY,
                                    JSON.stringify(filteredRecords)
                                );
                                console.log('[FermentingSummary] Deleted record:', record.processing_id);
                                await loadRecords();

                                // Show success message
                                setAlertConfig({
                                    title: 'Success',
                                    message: 'Record deleted successfully.',
                                    type: 'success',
                                    buttons: [
                                        {
                                            text: 'OK',
                                            onPress: () => setAlertVisible(false)
                                        }
                                    ]
                                });
                                setAlertVisible(true);
                            }
                        } catch (error) {
                            console.error('[FermentingSummary] Delete error:', error);
                            setAlertConfig({
                                title: 'Error',
                                message: 'Failed to delete record.',
                                type: 'error',
                                buttons: [
                                    {
                                        text: 'OK',
                                        onPress: () => setAlertVisible(false)
                                    }
                                ]
                            });
                            setAlertVisible(true);
                        }
                    },
                    style: 'destructive'
                }
            ]
        });
        setAlertVisible(true);
    };

    const renderRecord = ({ item }) => (
        <TouchableOpacity
            style={[styles.recordItem, item.isSynced ? styles.syncedRow : styles.pendingRow]}
            onPress={() => {
                setSelectedRecord(item);
                setViewMode('detail');
            }}
        >
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={styles.recordTitle}>
                        {item.processing_id || 'N/A'}
                    </Text>
                </View>
                <Text style={styles.recordSubtitle}>
                    Grade: {item.grade} | Weight: {item.weight} kg | Days: {item.days}
                </Text>
                <Text style={styles.recordSubtitle}>
                    {item.start_date} to {item.end_date}
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
                        navigation.navigate('FermentingForm', { editData: item });
                    }}
                >
                    <Ionicons name="pencil" size={20} color={CoffeeColors.DARK_BROWN} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.iconButton, styles.deleteButton]}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(item);
                    }}
                >
                    <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const handleSync = async () => {
        if (isSyncing) return;

        if (unsyncedCount === 0) {
            setAlertConfig({
                title: 'Nothing to Sync',
                message: 'All fermenting records are already synced.',
                type: 'info',
                buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
            return;
        }

        setIsSyncing(true);
        try {
            const result = await syncAllFermentingRecords();

            if (result.totalCount === 0) {
                setAlertConfig({
                    title: 'Nothing to Sync',
                    message: 'All fermenting records are already synced.',
                    type: 'info',
                    buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
                });
                setAlertVisible(true);
            } else if (result.syncedCount > 0 && result.syncedCount < result.totalCount) {
                setAlertConfig({
                    title: 'Partial Sync',
                    message: `Synced ${result.syncedCount} of ${result.totalCount} records. Some records failed to sync.`,
                    type: 'warning',
                    buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
                });
                setAlertVisible(true);
            } else if (result.syncedCount === 0 && result.totalCount > 0) {
                setAlertConfig({
                    title: 'Sync Failed',
                    message: 'Could not sync records. Please check your internet connection and try again.',
                    type: 'error',
                    buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
                });
                setAlertVisible(true);
            } else if (result.syncedCount === result.totalCount) {
                setAlertConfig({
                    title: 'Sync Successful',
                    message: `All ${result.syncedCount} fermenting records have been synced.`,
                    type: 'success',
                    buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
                });
                setAlertVisible(true);
            }

            // Reload records to update sync status
            await loadRecords();
        } catch (error) {
            console.error('[FermentingSummary] Sync error:', error);
            setAlertConfig({
                title: 'Sync Failed',
                message: error.message || 'Failed to sync fermenting records.',
                type: 'error',
                buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleBackPress = () => {
        if (viewMode === 'detail') {
            setViewMode('list');
            setSelectedRecord(null);
        } else {
            navigation.goBack();
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
                <Text style={styles.loadingText}>Loading fermenting records...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader
                title="Fermenting Records"
                onBackPress={handleBackPress}
                onSync={handleSync}
                isSyncing={isSyncing}
                unsyncedCount={unsyncedCount}
            />

            <View style={{ flex: 1 }}>
                <View style={styles.container}>
                    {viewMode === 'list' && (
                        <>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => navigation.navigate('FermentingForm')}
                            >
                                <Ionicons name="add-circle" size={20} color={CoffeeColors.WHITE} />
                                <Text style={styles.addButtonText}>Add New Fermenting Record</Text>
                            </TouchableOpacity>

                            <FlatList
                                data={records}
                                renderItem={renderRecord}
                                keyExtractor={(item, index) => item.processing_id?.toString() || index.toString()}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Ionicons name="water-outline" size={64} color={CoffeeColors.LIGHT_BROWN} />
                                        <Text style={styles.emptyText}>No fermenting records found</Text>
                                        <Text style={styles.emptySubtext}>Tap the button above to add your first record</Text>
                                    </View>
                                }
                                contentContainerStyle={{ paddingBottom: 100 }}
                            />
                        </>
                    )}

                    {viewMode === 'detail' && selectedRecord && (
                        <FermentingDetailView
                            record={selectedRecord}
                            onBack={() => {
                                setSelectedRecord(null);
                                setViewMode('list');
                            }}
                        />
                    )}
                </View>
            </View>
            <BottomNav activeScreen="Processing" />

            {/* Custom Alert Modal */}
            <CustomAlert
                visible={alertVisible}
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
    recordItem: {
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
    recordTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.bold,
    },
    recordSubtitle: {
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
    deleteButton: {
        backgroundColor: '#ffe6e6',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 16,
        color: CoffeeColors.MEDIUM_BROWN,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    emptySubtext: {
        textAlign: 'center',
        marginTop: 8,
        color: CoffeeColors.GRAY_TEXT,
        fontSize: 14,
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
    detailRecordName: {
        fontSize: 24,
        fontWeight: '700',
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.bold,
        marginBottom: 8,
        textAlign: 'center',
    },
    detailRecordId: {
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
});
