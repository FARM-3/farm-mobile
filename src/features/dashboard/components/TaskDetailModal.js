// src/features/dashboard/components/TaskDetailModal.js
// Modal for task workflow: accept/reject → start → complete with photos

import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    StyleSheet,
    Image,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import { saveSubmissionLocally, syncTaskSubmissions } from '../../../services/taskService';

export default function TaskDetailModal({ visible, task, onClose, onUpdate }) {
    const [photos, setPhotos] = useState([]);
    const [completionComment, setCompletionComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [currentStatus, setCurrentStatus] = useState(null);

    // Update current status when task changes
    React.useEffect(() => {
        if (task) {
            const isAssignedTask = task.assigned_to && task.assigned_to.length > 0;
            setCurrentStatus(task.submission_status || (isAssignedTask ? 'assigned' : 'pending'));
        }
    }, [task]);

    if (!task) return null;

    // Check if this is an assigned task (from web app)
    const isAssignedTask = task.assigned_to && task.assigned_to.length > 0;

    const handleAccept = async () => {
        setLoading(true);
        try {
            const submission = {
                assigned_task_id: task.id,
                title: task.title,
                description: task.description,
                activity: Array.isArray(task.activity) ? task.activity.join(', ') : task.activity,
                priority: task.priority,
                block_id: task.block?.toString() || '',
                status: 'accepted',
                accepted_at: new Date().toISOString(),
            };

            await saveSubmissionLocally(submission);
            console.log('[TaskDetail] Task accepted locally');

            // Sync immediately to update web app
            const syncResult = await syncTaskSubmissions();
            console.log('[TaskDetail] Sync result:', syncResult);

            // Update status to show "Start Task" button
            setCurrentStatus('accepted');

            // Update task list but keep modal open
            onUpdate();
            // Don't close - user should see "Start Task" button next
        } catch (error) {
            console.error('[TaskDetail] Error accepting task:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        setLoading(true);
        try {
            const submission = {
                assigned_task_id: task.id,
                title: task.title,
                description: task.description,
                activity: Array.isArray(task.activity) ? task.activity.join(', ') : task.activity,
                priority: task.priority,
                block_id: task.block?.toString() || '',
                status: 'rejected',
                rejected_at: new Date().toISOString(),
            };

            await saveSubmissionLocally(submission);
            console.log('[TaskDetail] Task rejected locally');

            // Sync immediately to update web app
            const syncResult = await syncTaskSubmissions();
            console.log('[TaskDetail] Sync result:', syncResult);

            onUpdate();
            onClose();
        } catch (error) {
            console.error('[TaskDetail] Error rejecting task:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async () => {
        setLoading(true);
        try {
            const now = new Date().toISOString();
            setStartTime(now);

            const submission = {
                assigned_task_id: isAssignedTask ? task.id : null,
                title: task.title,
                description: task.description,
                activity: Array.isArray(task.activity) ? task.activity.join(', ') : task.activity,
                priority: task.priority,
                block_id: task.block?.toString() || '',
                status: 'in_progress',
                started_at: now,
            };

            await saveSubmissionLocally(submission);
            console.log('[TaskDetail] Task started locally');

            // Sync immediately to update web app
            const syncResult = await syncTaskSubmissions();
            console.log('[TaskDetail] Sync result:', syncResult);

            // Update status to show photo capture UI
            setCurrentStatus('in_progress');

            onUpdate();
        } catch (error) {
            console.error('[TaskDetail] Error starting task:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTakePhoto = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

            if (!permissionResult.granted) {
                alert('Camera permission is required to take photos');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // Disable crop screen for faster capture
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                setPhotos([...photos, result.assets[0].uri]);
                console.log('[TaskDetail] Photo added:', result.assets[0].uri);
            }
        } catch (error) {
            console.error('[TaskDetail] Error taking photo:', error);
        }
    };

    const handlePickPhoto = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                alert('Gallery permission is required to select photos');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.7,
            });

            if (!result.canceled && result.assets) {
                const newPhotos = result.assets.map(asset => asset.uri);
                setPhotos([...photos, ...newPhotos]);
                console.log('[TaskDetail] Photos added:', newPhotos.length);
            }
        } catch (error) {
            console.error('[TaskDetail] Error picking photos:', error);
        }
    };

    const handleRemovePhoto = (index) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const handleComplete = async () => {
        if (photos.length === 0) {
            alert('Please add at least one photo as proof of completion');
            return;
        }

        setLoading(true);
        try {
            const now = new Date().toISOString();
            const start = startTime || task.started_at || now;
            const durationMinutes = Math.floor((new Date(now) - new Date(start)) / 60000);

            const submission = {
                assigned_task_id: isAssignedTask ? task.id : null,
                title: task.title,
                description: task.description,
                activity: Array.isArray(task.activity) ? task.activity.join(', ') : task.activity,
                priority: task.priority,
                block_id: task.block?.toString() || '',
                status: 'completed',
                started_at: start,
                completed_at: now,
                duration_minutes: durationMinutes.toString(),
                photos: photos,
                completion_comment: completionComment,
            };

            await saveSubmissionLocally(submission);
            console.log('[TaskDetail] Task completed locally with', photos.length, 'photos');

            // Sync immediately to update web app (including photo upload)
            const syncResult = await syncTaskSubmissions();
            console.log('[TaskDetail] Sync result:', syncResult);

            onUpdate();
            onClose();
        } catch (error) {
            console.error('[TaskDetail] Error completing task:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Task Details</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={CoffeeColors.DARK_BROWN} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView}>
                        {/* Task Info */}
                        <View style={styles.taskInfo}>
                            <Text style={styles.taskTitle}>{task.title}</Text>
                            {task.description && (
                                <Text style={styles.taskDescription}>{task.description}</Text>
                            )}
                            <View style={styles.taskMeta}>
                                <View style={styles.metaRow}>
                                    <Ionicons name="calendar-outline" size={16} color={CoffeeColors.MEDIUM_BROWN} />
                                    <Text style={styles.metaText}>{task.date}</Text>
                                </View>
                                {task.time && (
                                    <View style={styles.metaRow}>
                                        <Ionicons name="time-outline" size={16} color={CoffeeColors.MEDIUM_BROWN} />
                                        <Text style={styles.metaText}>{task.time}</Text>
                                    </View>
                                )}
                                <View style={styles.metaRow}>
                                    <Ionicons name="flag-outline" size={16} color={CoffeeColors.MEDIUM_BROWN} />
                                    <Text style={styles.metaText}>{task.priority}</Text>
                                </View>
                            </View>

                            {/* Status Badge */}
                            {currentStatus && (
                                <View style={[styles.statusBadge, styles[`status_${currentStatus}`]]}>
                                    <Text style={styles.statusText}>{currentStatus.toUpperCase()}</Text>
                                </View>
                            )}
                        </View>

                        {/* Action Buttons Based on Status */}
                        {currentStatus === 'assigned' && (
                            <View style={styles.actionSection}>
                                <Text style={styles.sectionTitle}>Accept this task?</Text>
                                <View style={styles.buttonRow}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.rejectButton]}
                                        onPress={handleReject}
                                        disabled={loading}
                                    >
                                        <Ionicons name="close-circle" size={20} color="#fff" />
                                        <Text style={styles.buttonText}>Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, styles.acceptButton]}
                                        onPress={handleAccept}
                                        disabled={loading}
                                    >
                                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                        <Text style={styles.buttonText}>Accept</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {currentStatus === 'accepted' && (
                            <View style={styles.actionSection}>
                                <TouchableOpacity
                                    style={[styles.button, styles.startButton]}
                                    onPress={handleStart}
                                    disabled={loading}
                                >
                                    <Ionicons name="play-circle" size={20} color="#fff" />
                                    <Text style={styles.buttonText}>Start Task</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {currentStatus === 'in_progress' && (
                            <View style={styles.actionSection}>
                                <Text style={styles.sectionTitle}>Photo Evidence</Text>

                                {/* Photo Grid */}
                                <View style={styles.photoGrid}>
                                    {photos.map((uri, index) => (
                                        <View key={index} style={styles.photoItem}>
                                            <Image source={{ uri }} style={styles.photoImage} />
                                            <TouchableOpacity
                                                style={styles.photoRemove}
                                                onPress={() => handleRemovePhoto(index)}
                                            >
                                                <Ionicons name="close-circle" size={24} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>

                                {/* Photo Buttons */}
                                <View style={styles.buttonRow}>
                                    <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                                        <Ionicons name="camera" size={20} color={CoffeeColors.DARK_BROWN} />
                                        <Text style={styles.photoButtonText}>Camera</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto}>
                                        <Ionicons name="images" size={20} color={CoffeeColors.DARK_BROWN} />
                                        <Text style={styles.photoButtonText}>Gallery</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Comment Input */}
                                <Text style={styles.sectionTitle}>Comment (Optional)</Text>
                                <TextInput
                                    style={styles.commentInput}
                                    placeholder="Add any notes or comments..."
                                    value={completionComment}
                                    onChangeText={setCompletionComment}
                                    multiline
                                    numberOfLines={4}
                                    placeholderTextColor={CoffeeColors.GRAY_TEXT}
                                />

                                {/* Complete Button */}
                                <TouchableOpacity
                                    style={[styles.button, styles.completeButton, photos.length === 0 && styles.buttonDisabled]}
                                    onPress={handleComplete}
                                    disabled={loading || photos.length === 0}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-done" size={20} color="#fff" />
                                            <Text style={styles.buttonText}>Complete Task</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {currentStatus === 'completed' && (
                            <View style={styles.actionSection}>
                                <Text style={styles.completedMessage}>✓ Task completed successfully!</Text>
                            </View>
                        )}

                        {currentStatus === 'rejected' && (
                            <View style={styles.actionSection}>
                                <Text style={styles.rejectedMessage}>Task was rejected</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: CoffeeColors.LIGHT_GRAY,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        color: CoffeeColors.DARK_BROWN,
    },
    scrollView: {
        padding: 20,
    },
    taskInfo: {
        marginBottom: 24,
    },
    taskTitle: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 8,
    },
    taskDescription: {
        fontSize: 14,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
        marginBottom: 16,
        lineHeight: 20,
    },
    taskMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 14,
        color: CoffeeColors.MEDIUM_BROWN,
        fontFamily: Fonts.regular,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    status_assigned: {
        backgroundColor: '#FFB74D',
    },
    status_accepted: {
        backgroundColor: '#4CAF50',
    },
    status_in_progress: {
        backgroundColor: '#2196F3',
    },
    status_completed: {
        backgroundColor: '#4CAF50',
    },
    status_rejected: {
        backgroundColor: '#F44336',
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        fontFamily: Fonts.bold,
    },
    actionSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: CoffeeColors.DARK_BROWN,
        marginBottom: 12,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 8,
        elevation: 2,
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#F44336',
    },
    startButton: {
        backgroundColor: '#2196F3',
    },
    completeButton: {
        backgroundColor: '#4CAF50',
        marginTop: 16,
    },
    buttonDisabled: {
        backgroundColor: CoffeeColors.GRAY_TEXT,
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 12,
    },
    photoItem: {
        width: 100,
        height: 100,
        borderRadius: 8,
        overflow: 'hidden',
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    photoRemove: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
    },
    photoButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: CoffeeColors.DARK_BROWN,
        backgroundColor: '#fff',
    },
    photoButtonText: {
        color: CoffeeColors.DARK_BROWN,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
    },
    commentInput: {
        backgroundColor: CoffeeColors.LIGHT_GRAY,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        fontFamily: Fonts.regular,
        textAlignVertical: 'top',
        minHeight: 100,
        marginBottom: 16,
    },
    completedMessage: {
        fontSize: 18,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: '#4CAF50',
        textAlign: 'center',
        paddingVertical: 20,
    },
    rejectedMessage: {
        fontSize: 18,
        fontWeight: '600',
        fontFamily: Fonts.semiBold,
        color: '#F44336',
        textAlign: 'center',
        paddingVertical: 20,
    },
});
