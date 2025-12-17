// src/features/ProcessingScreen/screens/NaturalSundryingSummaryScreen.js
// Summary/List screen for natural sundrying records

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
import { syncAllSundryingRecords } from '../../../services/sundryingService';

const SUNDRYING_STORAGE_KEY = 'natural_sundrying_records';

// Detailed view component for a natural sundrying record
const NaturalSundryingDetailView = ({ record, onBack }) => {
    if (!record) return null;

    const formatValue = (value) => {
        if (value === null || value === undefined || value === '') return 'Not provided';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
    };

    const sections = [
        {
            title: 'Natural Sundrying Details',
            fields: [
                { label: 'Processing ID', value: record.processing_id },
                { label: 'Grade ID', value: record.grade },
                { label: 'Start Date', value: record.start_date },
                { label: 'Weight (Before)', value: `${record.weight || 0} kg` },
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
                <Text style={styles.detailHeaderTitle}>Natural Sundrying Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.detailScrollView} contentContainerStyle={styles.detailContent}>
                <View style={styles.detailNameCard}>
                    <Ionicons name="sunny" size={32} color="#FF9800" style={{ marginBottom: 8 }} />
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

export default function NaturalSundryingSummaryScreen({ navigation }) {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [viewMode, setViewMode] = useState('list');
    const [isSyncing, setIsSyncing] = useState(false);
    const [unsyncedCount, setUnsyncedCount] = useState(0);

    // CustomAlert state
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
            const storedData = await AsyncStorage.getItem(SUNDRYING_STORAGE_KEY);
            if (storedData) {
                const parsedRecords = JSON.parse(storedData);
                // Sort by created_at descending (newest first)
                parsedRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setRecords(parsedRecords);

                // Count unsynced records
                const unsynced = parsedRecords.filter(r => !r.isSynced).length;
                setUnsyncedCount(unsynced);

                console.log('[NaturalSundryingSummary] Loaded', parsedRecords.length, 'records,', unsynced, 'unsynced');
            } else {
                setRecords([]);
                setUnsyncedCount(0);
                console.log('[NaturalSundryingSummary] No records found');
            }
        } catch (error) {
            console.error('[NaturalSundryingSummary] Error loading records:', error);
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
            console.log('[NaturalSundryingSummary] Screen focused, refreshing data...');
            loadRecords();
        });
        return unsubscribe;
    }, [navigation, loadRecords]);

    const handleSync = async () => {
        if (isSyncing) return;

        if (unsyncedCount === 0) {
            setAlertConfig({
                title: 'Nothing to Sync',
                message: 'All natural sundrying records are already synced.',
                type: 'info',
                buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
            return;
        }

        setIsSyncing(true);
        try {
            const result = await syncAllSundryingRecords();

            if (result.totalCount === 0) {
                setAlertConfig({
                    title: 'Nothing to Sync',
                    message: 'All natural sundrying records are already synced.',
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
                    message: `All ${result.syncedCount} natural sundrying records have been synced.`,
                    type: 'success',
                    buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
                });
                setAlertVisible(true);
            }

            // Reload records to update sync status
            await loadRecords();
        } catch (error) {
            console.error('[NaturalSundryingSummary] Sync error:', error);
            setAlertConfig({
                title: 'Sync Failed',
                message: error.message || 'Failed to sync natural sundrying records.',
                type: 'error',
                buttons: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
        } finally {
            setIsSyncing(false);
        }
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
                    Grade: {item.grade} | Weight: {item.weight} kg
                </Text>
                <Text style={styles.recordSubtitle}>
                    Start Date: {item.start_date}
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
                        navigation.navigate('NaturalSundryingForm', { editData: item });
                    }}
                >
                    <Ionicons name="pencil" size={20} color={CoffeeColors.DARK_BROWN} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

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
                <Text style={styles.loadingText}>Loading natural sundrying records...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader
                title="Natural Sundrying Records"
                onBackPress={handleBackPress}
                unsyncedCount={unsyncedCount}
                onSync={handleSync}
                isSyncing={isSyncing}
            />

            <View style={{ flex: 1 }}>
                <View style={styles.container}>
                    {viewMode === 'list' && (
                        <>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => navigation.navigate('NaturalSundryingForm')}
                            >
                                <Ionicons name="add-circle" size={20} color={CoffeeColors.WHITE} />
                                <Text style={styles.addButtonText}>Add New Sundrying Record</Text>
                            </TouchableOpacity>

                            <FlatList
                                data={records}
                                renderItem={renderRecord}
                                keyExtractor={(item, index) => item.processing_id?.toString() || index.toString()}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Ionicons name="sunny-outline" size={64} color="#FF9800" />
                                        <Text style={styles.emptyText}>No natural sundrying records found</Text>
                                        <Text style={styles.emptySubtext}>Tap the button above to add your first record</Text>
                                    </View>
                                }
                                contentContainerStyle={{ paddingBottom: 100 }}
                            />
                        </>
                    )}

                    {viewMode === 'detail' && selectedRecord && (
                        <NaturalSundryingDetailView
                            record={selectedRecord}
                            onBack={() => {
                                setSelectedRecord(null);
                                setViewMode('list');
                            }}
                        />
                    )}
                </View>
            </View>

            <CustomAlert
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={() => setAlertVisible(false)}
            />

            <BottomNav activeScreen="Processing" />
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
        backgroundColor: CoffeeColors.ACCENT,
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
        borderLeftColor: '#FFB74D',
    },
    syncedRow: {
        backgroundColor: CoffeeColors.WHITE,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9800',
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
        backgroundColor: '#FF9800',
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
