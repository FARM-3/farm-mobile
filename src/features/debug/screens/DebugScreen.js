// File: src/features/debug/screens/DebugScreen.js - Debug screen to view sync logs
// This screen is useful for viewing persistent sync logs without relying on terminal output

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import {
    getSyncLogs,
    getRecentErrors,
    clearSyncLogs,
    printSyncLogs,
} from '../../../services/SyncLogService';

const DebugScreen = () => {
    const [logs, setLogs] = useState([]);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all' or 'errors'

    const loadLogs = async () => {
        setLoading(true);
        try {
            const allLogs = await getSyncLogs();
            const errorLogs = await getRecentErrors(20);
            setLogs(allLogs);
            setErrors(errorLogs);
        } catch (error) {
            console.error('[DebugScreen] Error loading logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const handleClearLogs = async () => {
        await clearSyncLogs();
        loadLogs();
    };

    const handlePrintLogs = async () => {
        await printSyncLogs();
        alert('Logs printed to console - check Expo logs!');
    };

    const displayLogs = filter === 'errors' ? errors : logs;

    const renderLogItem = ({ item, index }) => (
        <View style={styles.logItem}>
            <View style={styles.logHeader}>
                <Text style={styles.logTimestamp}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                <Text style={[
                    styles.logStatus,
                    { color: item.status === 'SUCCESS' ? '#22c55e' : item.status === 'ERROR' ? '#ef4444' : '#f59e0b' }
                ]}>
                    {item.status}
                </Text>
            </View>
            <Text style={styles.logModule}>{item.module} • {item.operation}</Text>
            <Text style={styles.logMessage}>{item.message}</Text>
            {item.details?.harvest_id && (
                <Text style={styles.logDetail}>ID: {item.details.harvest_id}</Text>
            )}
            {item.details?.response_status && (
                <Text style={styles.logDetail}>HTTP: {item.details.response_status}</Text>
            )}
            {item.details?.error_message && (
                <Text style={styles.logError}>Error: {item.details.error_message.substring(0, 100)}</Text>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Sync Debug Logs</Text>
                <Text style={styles.subtitle}>Total: {logs.length} logs</Text>
            </View>

            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={styles.filterBtnText}>All ({logs.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterBtn, filter === 'errors' && styles.filterBtnActive]}
                    onPress={() => setFilter('errors')}
                >
                    <Text style={styles.filterBtnText}>Errors ({errors.length})</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.actionContainer}>
                <TouchableOpacity style={styles.actionBtn} onPress={handlePrintLogs}>
                    <Text style={styles.actionBtnText}>Print to Console</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnDanger]}
                    onPress={handleClearLogs}
                >
                    <Text style={styles.actionBtnText}>Clear All</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
            ) : displayLogs.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No logs yet</Text>
                </View>
            ) : (
                <FlatList
                    data={displayLogs}
                    renderItem={renderLogItem}
                    keyExtractor={(item, index) => `${item.timestamp}-${index}`}
                    style={styles.logsList}
                    onEndReachedThreshold={0.1}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        backgroundColor: '#1f2937',
        padding: 16,
        paddingTop: 20,
        marginBottom: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#9ca3af',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        marginBottom: 8,
        gap: 8,
    },
    filterBtn: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
    },
    filterBtnActive: {
        backgroundColor: '#3b82f6',
    },
    filterBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    filterBtnActive: {
        backgroundColor: '#3b82f6',
    },
    // Fix the filter text color for active state
    actionContainer: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        marginBottom: 12,
        gap: 8,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
    },
    actionBtnDanger: {
        backgroundColor: '#ef4444',
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    loader: {
        marginTop: 40,
    },
    logsList: {
        flex: 1,
        paddingHorizontal: 12,
    },
    logItem: {
        backgroundColor: '#fff',
        marginBottom: 8,
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    logTimestamp: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },
    logStatus: {
        fontSize: 12,
        fontWeight: 'bold',
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: '#f3f4f6',
    },
    logModule: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    logMessage: {
        fontSize: 13,
        color: '#1f2937',
        fontWeight: '500',
        marginBottom: 4,
    },
    logDetail: {
        fontSize: 11,
        color: '#4b5563',
        marginTop: 2,
    },
    logError: {
        fontSize: 11,
        color: '#ef4444',
        marginTop: 4,
        fontStyle: 'italic',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
    },
});

export default DebugScreen;
