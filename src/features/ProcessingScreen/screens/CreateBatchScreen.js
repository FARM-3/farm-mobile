// src/features/ProcessingScreen/screens/CreateBatchScreen.js
// Screen for creating batches by grouping multiple grade IDs

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import CustomAlert from '../../../components/CustomAlert';
import { getAvailableGradeIds } from '../../../services/qualityControl';
import { createBatch, isGradeInBatch } from '../../../services/batchService';
import AuthService from '../../../services/AuthService';

export default function CreateBatchScreen({ navigation }) {
    const [availableGrades, setAvailableGrades] = useState([]);
    const [selectedGrades, setSelectedGrades] = useState([]);
    const [isLoadingGrades, setIsLoadingGrades] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [notes, setNotes] = useState('');
    const [userName, setUserName] = useState('User');

    // Custom Alert state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        type: 'info',
        buttons: [],
    });

    // Fetch user info
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await AuthService.getStoredUser();
                if (user) {
                    const displayName = user.name || user.first_name || user.username || 'User';
                    setUserName(displayName);
                }
            } catch (error) {
                console.error('[CreateBatchScreen] Error fetching user:', error);
            }
        };
        fetchUser();
    }, []);

    // Fetch available grade IDs on component mount
    useEffect(() => {
        const fetchAvailableGrades = async () => {
            setIsLoadingGrades(true);
            try {
                const grades = await getAvailableGradeIds();

                // Filter out grades that are already in a batch
                const filteredGrades = [];
                for (const grade of grades) {
                    const inBatch = await isGradeInBatch(grade.grade_id);
                    if (!inBatch) {
                        filteredGrades.push(grade);
                    }
                }

                setAvailableGrades(filteredGrades);
                console.log('[CreateBatchScreen] Loaded available grades:', filteredGrades.length);
            } catch (error) {
                console.error('[CreateBatchScreen] Error loading available grades:', error);
                showAlert('Error', 'Failed to load available grade IDs', 'error');
            } finally {
                setIsLoadingGrades(false);
            }
        };

        fetchAvailableGrades();
    }, []);

    const showAlert = (title, message, type = 'info', buttons = null) => {
        setAlertConfig({
            title,
            message,
            type,
            buttons: buttons || [{ text: 'OK', onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
    };

    const toggleGradeSelection = (gradeId) => {
        if (selectedGrades.includes(gradeId)) {
            setSelectedGrades(selectedGrades.filter(id => id !== gradeId));
        } else {
            setSelectedGrades([...selectedGrades, gradeId]);
        }
    };

    const handleCreateBatch = async () => {
        if (isSaving) return;

        // Validation
        if (selectedGrades.length === 0) {
            showAlert('Validation Error', 'Please select at least one grade ID', 'warning');
            return;
        }

        setIsSaving(true);

        try {
            const batchData = {
                gradeIds: selectedGrades,
                createdBy: userName,
                notes: notes.trim(),
            };

            const batch = await createBatch(batchData);

            showAlert(
                'Success',
                `Batch ${batch.batch_id} created successfully with ${selectedGrades.length} grade(s).`,
                'success',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setAlertVisible(false);
                            navigation.goBack();
                        }
                    }
                ]
            );

            // Reset form
            setSelectedGrades([]);
            setNotes('');
        } catch (error) {
            console.error('[CreateBatchScreen] Save failed:', error);
            showAlert('Error', 'Failed to create batch. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const selectAll = () => {
        if (selectedGrades.length === availableGrades.length) {
            setSelectedGrades([]);
        } else {
            setSelectedGrades(availableGrades.map(g => g.grade_id));
        }
    };

    /**
     * Select recommended batch - Grade A with ripeness > 50%
     * Best practice: Auto-selects high-quality grades for optimal processing
     */
    const selectRecommendedBatch = () => {
        const recommended = availableGrades.filter(grade => {
            // Check if grade is 'A' or 'Grade A' (case-insensitive)
            const isGradeA = grade.grade &&
                            (grade.grade.toUpperCase() === 'A' ||
                             grade.grade.toUpperCase() === 'GRADE A');

            // Check if ripeness score is above 50%
            const hasHighRipeness = grade.ripeness_score != null &&
                                   grade.ripeness_score > 50;

            return isGradeA && hasHighRipeness;
        });

        if (recommended.length === 0) {
            showAlert(
                'No Recommendations',
                'No grades meet the recommended criteria (Grade A with ripeness > 50%). Try adjusting your selection manually.',
                'info'
            );
            return;
        }

        setSelectedGrades(recommended.map(g => g.grade_id));

        showAlert(
            'Recommended Batch Selected',
            `${recommended.length} grade(s) selected based on quality criteria:\n• Grade A\n• Ripeness > 50%`,
            'success'
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
            <SimpleHeader title="Create a Batch" />

            {/* Scrollable Content Area */}
            <ScrollView style={styles.scrollableContent} contentContainerStyle={styles.scrollContentContainer}>
                <View style={styles.headerSection}>
                    <Ionicons name="layers" size={48} color="#FF6B35" />
                    <Text style={styles.mainTitle}>Create a New Batch</Text>
                    <Text style={styles.subtitle}>
                        Select multiple grade IDs to group them into a single batch for processing
                    </Text>
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle" size={24} color="#FF6B35" />
                    <Text style={styles.infoText}>
                        Batches allow you to process multiple grades together in fermenting, washing, or sundrying operations.
                    </Text>
                </View>

                {/* Selected Count and Actions */}
                <View style={styles.selectionHeader}>
                    <Text style={styles.selectionText}>
                        Selected: {selectedGrades.length} grade{selectedGrades.length !== 1 ? 's' : ''}
                    </Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity onPress={selectRecommendedBatch} style={styles.recommendedButton}>
                            <Ionicons name="star" size={16} color="#fff" style={{ marginRight: 4 }} />
                            <Text style={styles.recommendedButtonText}>Recommended</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={selectAll} style={styles.selectAllButton}>
                            <Text style={styles.selectAllText}>
                                {selectedGrades.length === availableGrades.length ? 'Deselect All' : 'Select All'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Grade Selection List */}
                <Text style={styles.label}>Available Grades *</Text>
                {isLoadingGrades ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#FF6B35" />
                        <Text style={styles.loadingText}>Loading available grades...</Text>
                    </View>
                ) : availableGrades.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="alert-circle-outline" size={48} color={CoffeeColors.GRAY_TEXT} />
                        <Text style={styles.emptyText}>
                            No available grade IDs. Please complete floating tests first or check if grades are already in batches.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.gradesList}>
                        {availableGrades.map((grade) => (
                            <TouchableOpacity
                                key={grade.grade_id}
                                style={[
                                    styles.gradeItem,
                                    selectedGrades.includes(grade.grade_id) && styles.gradeItemSelected
                                ]}
                                onPress={() => toggleGradeSelection(grade.grade_id)}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[
                                        styles.gradeIdText,
                                        selectedGrades.includes(grade.grade_id) && styles.gradeIdTextSelected
                                    ]}>
                                        {grade.grade_id}
                                    </Text>
                                    <Text style={styles.gradeDetailText}>
                                        Grade: {grade.grade} | Weight: {grade.weight}kg
                                    </Text>
                                    <Text style={styles.gradeDetailText}>
                                        Harvest: {grade.harvest}
                                    </Text>
                                    {grade.ripeness_score != null && (
                                        <Text style={[styles.gradeDetailText, styles.ripenessScore]}>
                                            Ripeness Score: {grade.ripeness_score}%
                                        </Text>
                                    )}
                                </View>
                                {selectedGrades.includes(grade.grade_id) ? (
                                    <Ionicons name="checkmark-circle" size={28} color="#FF6B35" />
                                ) : (
                                    <Ionicons name="ellipse-outline" size={28} color={CoffeeColors.GRAY_TEXT} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Fixed Bottom Section - Notes and Create Button */}
            <View style={styles.fixedBottomSection}>
                <View style={styles.bottomSectionContent}>
                    <Text style={styles.label}>Notes (Optional)</Text>
                    <TextInput
                        style={styles.notesInput}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Add any notes about this batch..."
                        placeholderTextColor={CoffeeColors.GRAY_TEXT}
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                    />

                    {/* Create Batch Button */}
                    <TouchableOpacity
                        style={[styles.createButton, selectedGrades.length === 0 && styles.createButtonDisabled]}
                        onPress={handleCreateBatch}
                        disabled={isSaving || selectedGrades.length === 0}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="add-circle-outline" size={24} color="#fff" />
                                <Text style={styles.createButtonText}>Create Batch</Text>
                            </>
                        )}
                    </TouchableOpacity>
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
    scrollableContent: {
        flex: 1,
    },
    scrollContentContainer: {
        padding: 16,
        paddingBottom: 16,
    },
    fixedBottomSection: {
        backgroundColor: CoffeeColors.WHITE,
        borderTopWidth: 1,
        borderTopColor: CoffeeColors.VERY_LIGHT_BROWN,
        paddingBottom: 5, // Space for BottomNav (reduced from 80)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    bottomSectionContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 24,
        paddingVertical: 20,
    },
    mainTitle: {
        fontSize: 26,
        fontWeight: '800',
        fontFamily: Fonts.bold,
        color: '#FF6B35',
        marginTop: 12,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9F5',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B35',
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: CoffeeColors.DARK_BROWN,
        fontFamily: Fonts.regular,
        lineHeight: 18,
    },
    selectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8,
    },
    selectionText: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.DARK_BROWN,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    recommendedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#FF6B35',
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    recommendedButtonText: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: '#fff',
    },
    selectAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
    },
    selectAllText: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: '#FF6B35',
    },
    label: {
        marginTop: 0,
        marginBottom: 8,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.DARK_BROWN,
        fontSize: 14,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 14,
        color: CoffeeColors.GRAY_TEXT,
        fontFamily: Fonts.regular,
        textAlign: 'center',
    },
    gradesList: {
        gap: 12,
    },
    gradeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        backgroundColor: CoffeeColors.WHITE,
        borderWidth: 2,
        borderColor: CoffeeColors.LIGHT_GRAY,
    },
    gradeItemSelected: {
        backgroundColor: '#FFF9F5',
        borderColor: '#FF6B35',
    },
    gradeIdText: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 4,
    },
    gradeIdTextSelected: {
        color: '#FF6B35',
        fontWeight: '700',
        fontFamily: Fonts.bold,
    },
    gradeDetailText: {
        fontSize: 12,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
        marginTop: 2,
    },
    ripenessScore: {
        fontWeight: '600',
        color: '#4CAF50',
        fontFamily: Fonts.semiBold,
    },
    notesInput: {
        backgroundColor: '#F9F9F9',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: CoffeeColors.LIGHT_BROWN,
        fontSize: 13,
        fontFamily: Fonts.regular,
        color: CoffeeColors.DARK_BROWN,
        minHeight: 50,
        maxHeight: 70,
        marginBottom: 12,
    },
    createButton: {
        backgroundColor: '#FF6B35',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
    createButtonDisabled: {
        backgroundColor: CoffeeColors.GRAY_TEXT,
        opacity: 0.6,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: '800',
        fontFamily: Fonts.bold,
        fontSize: 17,
    },
});
