// src/features/ProcessingScreen/screens/ViewBatchesScreen.js
// Screen for viewing all created batches and their constituents

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import { getAllBatches } from '../../../services/batchService';

export default function ViewBatchesScreen({ navigation }) {
    const [batches, setBatches] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedBatch, setExpandedBatch] = useState(null);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);

    // Load batches when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadBatches();
        }, [])
    );

    const loadBatches = async () => {
        setIsLoading(true);
        try {
            const allBatches = await getAllBatches();
            // Sort by most recent first
            const sortedBatches = allBatches.sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            );
            setBatches(sortedBatches);
        } catch (error) {
            console.error('[ViewBatchesScreen] Error loading batches:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadBatches();
        setRefreshing(false);
    };

    const toggleExpand = (batchId) => {
        setExpandedBatch(expandedBatch === batchId ? null : batchId);
    };

    const handleProcessBatch = (batch) => {
        setSelectedBatch(batch);
        setShowProcessModal(true);
    };

    const handleProcessTypeSelect = (processType) => {
        setShowProcessModal(false);

        // Navigate to the respective form screen with batch pre-filled
        const screenMap = {
            fermenting: 'FermentingForm',
            washing: 'WashingForm',
            sundrying: 'NaturalSundryingForm',
        };

        const screen = screenMap[processType];
        if (screen && selectedBatch) {
            navigation.navigate(screen, {
                batchId: selectedBatch.batch_id,
                gradeIds: selectedBatch.grade_ids,
                autoFillBatch: true,
            });
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const mon = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${mon}-${year}`;
    };

    const renderBatchCard = (batch) => {
        const isExpanded = expandedBatch === batch.batch_id;

        return (
            <View key={batch.batch_id} style={styles.batchCard}>
                {/* Batch Header */}
                <TouchableOpacity
                    style={styles.batchHeader}
                    onPress={() => toggleExpand(batch.batch_id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.batchHeaderLeft}>
                        <Ionicons name="layers" size={24} color={CoffeeColors.PRIMARY_BROWN} />
                        <View style={styles.batchHeaderText}>
                            <Text style={styles.batchId}>{batch.batch_id}</Text>
                            <Text style={styles.batchSubText}>
                                {batch.grade_ids.length} grade(s) | Created by {batch.created_by}
                            </Text>
                        </View>
                    </View>
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={24}
                        color={CoffeeColors.MEDIUM_BROWN}
                    />
                </TouchableOpacity>

                {/* Expanded Details */}
                {isExpanded && (
                    <View style={styles.batchDetails}>
                        <View style={styles.detailRow}>
                            <Ionicons name="calendar-outline" size={16} color={CoffeeColors.MEDIUM_BROWN} />
                            <Text style={styles.detailLabel}>Created:</Text>
                            <Text style={styles.detailValue}>{formatDate(batch.created_at)}</Text>
                        </View>

                        {batch.notes && (
                            <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                                <Ionicons name="document-text-outline" size={16} color={CoffeeColors.MEDIUM_BROWN} />
                                <Text style={styles.detailLabel}>Notes:</Text>
                                <Text style={[styles.detailValue, { flex: 1 }]}>{batch.notes}</Text>
                            </View>
                        )}

                        <View style={styles.gradeIdsSection}>
                            <View style={styles.gradeIdsHeader}>
                                <Ionicons name="cube-outline" size={16} color={CoffeeColors.MEDIUM_BROWN} />
                                <Text style={styles.gradeIdsLabel}>Grade IDs:</Text>
                            </View>
                            <View style={styles.gradeIdsContainer}>
                                {batch.grade_ids.map((gradeId, index) => (
                                    <View key={index} style={styles.gradeIdChip}>
                                        <Text style={styles.gradeIdText}>{gradeId}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={styles.syncStatus}>
                            <Ionicons
                                name={batch.is_synced ? 'checkmark-circle' : 'cloud-upload-outline'}
                                size={16}
                                color={batch.is_synced ? CoffeeColors.SUCCESS : CoffeeColors.MEDIUM_BROWN}
                            />
                            <Text style={[
                                styles.syncText,
                                { color: batch.is_synced ? CoffeeColors.SUCCESS : CoffeeColors.MEDIUM_BROWN }
                            ]}>
                                {batch.is_synced ? 'Synced' : 'Not synced'}
                            </Text>
                        </View>

                        {/* Process Batch Button */}
                        <TouchableOpacity
                            style={styles.processBatchButton}
                            onPress={() => handleProcessBatch(batch)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
                            <Text style={styles.processBatchButtonText}>Process This Batch</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader title="View Batches" />
            <ScrollView
                contentContainerStyle={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={CoffeeColors.PRIMARY_BROWN}
                        colors={[CoffeeColors.PRIMARY_BROWN]}
                    />
                }
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Created Batches</Text>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => navigation.navigate('CreateBatch')}
                    >
                        <Ionicons name="add-circle" size={20} color="#fff" />
                        <Text style={styles.createButtonText}>Create New</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={CoffeeColors.PRIMARY_BROWN} />
                        <Text style={styles.loadingText}>Loading batches...</Text>
                    </View>
                ) : batches.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="file-tray-outline" size={64} color={CoffeeColors.MEDIUM_BROWN} />
                        <Text style={styles.emptyText}>No batches created yet</Text>
                        <Text style={styles.emptySubText}>
                            Create a batch to group multiple grade IDs together
                        </Text>
                        <TouchableOpacity
                            style={styles.createFirstButton}
                            onPress={() => navigation.navigate('CreateBatch')}
                        >
                            <Text style={styles.createFirstButtonText}>Create First Batch</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <Text style={styles.countText}>Total: {batches.length} batch(es)</Text>
                        {batches.map(renderBatchCard)}
                    </>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
            <BottomNav activeScreen="Processing" />

            {/* Process Type Selection Modal */}
            <Modal
                visible={showProcessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowProcessModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowProcessModal(false)}
                >
                    <View style={styles.processModalContent}>
                        <View style={styles.processModalHeader}>
                            <Text style={styles.processModalTitle}>Select Processing Type</Text>
                            <TouchableOpacity onPress={() => setShowProcessModal(false)}>
                                <Ionicons name="close" size={24} color={CoffeeColors.DARK_BROWN} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.processModalSubtitle}>
                            Choose where to process batch: {selectedBatch?.batch_id}
                        </Text>

                        <View style={styles.processOptionsContainer}>
                            <TouchableOpacity
                                style={styles.processOption}
                                onPress={() => handleProcessTypeSelect('fermenting')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.processOptionIcon, { backgroundColor: '#E8F5E9' }]}>
                                    <Ionicons name="water-outline" size={32} color="#4CAF50" />
                                </View>
                                <View style={styles.processOptionTextContainer}>
                                    <Text style={styles.processOptionText}>Fermenting</Text>
                                    <Text style={styles.processOptionDesc}>Start fermenting process</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.processOption}
                                onPress={() => handleProcessTypeSelect('washing')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.processOptionIcon, { backgroundColor: '#E3F2FD' }]}>
                                    <Ionicons name="water" size={32} color="#2196F3" />
                                </View>
                                <View style={styles.processOptionTextContainer}>
                                    <Text style={styles.processOptionText}>Washing</Text>
                                    <Text style={styles.processOptionDesc}>Start washing process</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.processOption}
                                onPress={() => handleProcessTypeSelect('sundrying')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.processOptionIcon, { backgroundColor: '#FFF3E0' }]}>
                                    <Ionicons name="sunny-outline" size={32} color="#FF9800" />
                                </View>
                                <View style={styles.processOptionTextContainer}>
                                    <Text style={styles.processOptionText}>Natural Sundrying</Text>
                                    <Text style={styles.processOptionDesc}>Start sundrying process</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 32,
        backgroundColor: CoffeeColors.LIGHT_GRAY,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: Fonts.bold,
        color: CoffeeColors.DARK_BROWN,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CoffeeColors.PRIMARY_BROWN,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    countText: {
        fontSize: 14,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
        marginBottom: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.DARK_BROWN,
        textAlign: 'center',
    },
    emptySubText: {
        marginTop: 8,
        fontSize: 14,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
        textAlign: 'center',
        maxWidth: '80%',
    },
    createFirstButton: {
        marginTop: 24,
        backgroundColor: CoffeeColors.PRIMARY_BROWN,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    createFirstButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    batchCard: {
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    batchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    batchHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    batchHeaderText: {
        flex: 1,
    },
    batchId: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        color: CoffeeColors.DARK_BROWN,
    },
    batchSubText: {
        fontSize: 12,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
        marginTop: 4,
    },
    batchDetails: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: CoffeeColors.LIGHT_GRAY,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.DARK_BROWN,
    },
    detailValue: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: CoffeeColors.MEDIUM_BROWN,
    },
    gradeIdsSection: {
        marginTop: 16,
    },
    gradeIdsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    gradeIdsLabel: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.DARK_BROWN,
    },
    gradeIdsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    gradeIdChip: {
        backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
    },
    gradeIdText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.PRIMARY_BROWN,
    },
    syncStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 6,
    },
    syncText: {
        fontSize: 12,
        fontFamily: Fonts.regular,
    },
    processBatchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: CoffeeColors.PRIMARY_BROWN,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    processBatchButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    processModalContent: {
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 15,
        width: '90%',
        maxHeight: '70%',
        shadowColor: CoffeeColors.DARK_BROWN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        padding: 20,
    },
    processModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    processModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        color: CoffeeColors.DARK_BROWN,
    },
    processModalSubtitle: {
        fontSize: 14,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
        marginBottom: 20,
    },
    processOptionsContainer: {
        gap: 12,
    },
    processOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: CoffeeColors.LIGHT_GRAY,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
    },
    processOptionIcon: {
        width: 56,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    processOptionTextContainer: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
    },
    processOptionText: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 4,
    },
    processOptionDesc: {
        fontSize: 13,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
        marginTop: 2,
    },
});
