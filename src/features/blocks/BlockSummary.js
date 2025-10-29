// BlockSummary.js
// Summary screen showing block records as cards (similar to Production Harvests)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, FlatList
} from 'react-native';
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import CoffeeColors from '../../theme/colors';
import Fonts from '../../theme/fonts';
import SimpleHeader from '../../components/SimpleHeader';
import BottomNav from '../../components/BottomNav';
import ApiService from '../../services/ApiService';

const BLOCK_SYNC_QUEUE_KEY = "blocks_sync_queue";

const BlockSummary = ({ route = {}, navigation }) => {
  const [allRecords, setAllRecords] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Checking connectivity and syncing...");
  const [searchTerm, setSearchTerm] = useState('');

  // --- OFFLINE SYNC UTILITIES ---

  const getUnsyncedBlocks = async () => {
    try {
      const raw = await AsyncStorage.getItem(BLOCK_SYNC_QUEUE_KEY);
      const records = raw ? JSON.parse(raw) : [];
      return { success: true, records };
    } catch (error) {
      console.error("Error retrieving unsynced blocks:", error);
      return { success: false, records: [] };
    }
  };

  /**
   * Load data from both local and remote sources (without auto-sync)
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    let remoteRecords = [];
    let localRecords = [];

    // Check internet connectivity
    const netState = await NetInfo.fetch();
    const isConnected = netState.isConnected && netState.isInternetReachable;

    if (isConnected) {
      setSyncStatus("Online: Tap the sync icon to upload pending blocks.");

      // Fetch remote data (no auto-sync)
      try {
        const remoteResponse = await ApiService.get('harvests/blocks/');
        if (remoteResponse.data && Array.isArray(remoteResponse.data.results)) {
          remoteRecords = remoteResponse.data.results.map(r => ({
            id: r.block_id,
            block_id: r.block_id,
            trees: r.no_of_trees || 0,
            type: r.type_of_coffee || 'N/A',
            date: r.date_planted,
            source: r.source_of_seedling || 'N/A',
            fertilizer: r.fertilizer_names || r.fertilizers || 'N/A',
            isSynced: true,
          }));
        }
      } catch (error) {
        console.error('API Error:', error.message);
      }
    } else {
      setSyncStatus("Offline Mode: Data saved locally. Connect to internet to sync.");
    }

    // Fetch local data (always fetch, regardless of connectivity)
    const localResponse = await getUnsyncedBlocks();
    if (localResponse.success && Array.isArray(localResponse.records)) {
      localRecords = localResponse.records.map(r => ({
        id: r.block_id,
        block_id: r.block_id,
        trees: r.no_of_trees || 0,
        type: r.type_of_coffee || 'N/A',
        date: r.date_planted,
        source: r.source_of_seedling || 'N/A',
        fertilizer: r.fertilizer_names || r.fertilizers || 'N/A',
        isSynced: false,
      }));
    }

    // Combine data: Local (Pending) + Remote (Synced)
    const localIds = new Set(localRecords.map(r => r.block_id));
    const uniqueRemoteRecords = remoteRecords.filter(r => !localIds.has(r.block_id));

    let finalRecords = [...localRecords, ...uniqueRemoteRecords];

    // Sort by date (newest first), with additional sorting criteria
    finalRecords.sort((a, b) => {
        // Try to sort by date first
        if (a.date && b.date) {
            return new Date(b.date) - new Date(a.date);
        }
        // Try to sort by timestamp if available
        if (a.timestamp && b.timestamp) {
            return b.timestamp - a.timestamp;
        }
        // Try to sort by created_at or updated_at
        if (a.created_at && b.created_at) {
            return new Date(b.created_at) - new Date(a.created_at);
        }
        if (a.updated_at && b.updated_at) {
            return new Date(b.updated_at) - new Date(a.updated_at);
        }
        // Fallback: sort by ID (assuming higher ID = newer)
        if (a.id && b.id) {
            return String(b.id).localeCompare(String(a.id));
        }
        return 0;
    });

    setAllRecords(finalRecords);
    setIsLoading(false);
  }, []);

  // Search filtering
  useEffect(() => {
    let result = allRecords;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(record =>
        record.block_id?.toLowerCase().includes(lowerSearch) ||
        record.type?.toLowerCase().includes(lowerSearch) ||
        record.source?.toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredData(result);
  }, [allRecords, searchTerm]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[BlockSummary] Screen focused, refreshing data...');
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  // Check for refresh request from form screen
  useEffect(() => {
    if (route.params?.shouldRefresh) {
      loadData();
    }
  }, [route?.params?.shouldRefresh, loadData]);

  const handleEdit = (item) => {
    Alert.alert(
      'Edit Block',
      'Edit functionality will be implemented soon.',
      [{ text: 'OK' }]
    );
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Block Record',
      `Are you sure you want to delete block ${item.block_id}?`,
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

  const handleViewDetails = (item) => {
    navigation.navigate('BlockDetails', { blockData: item });
  };

  const renderBlockCard = ({ item }) => {
    const displayId = item.block_id || 'N/A';
    const displayType = item.type || 'Unknown Type';

    return (
      <TouchableOpacity
        style={styles.dataListItem}
        onPress={() => handleViewDetails(item)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.dataListItemTitle}>
            {displayId}
            <Text style={styles.dataListItemUID}> ({displayType})</Text>
          </Text>
          <Text style={styles.dataListItemSubtitle}>
            Trees: {item.trees} | Date: {item.date}
          </Text>
          <Text style={styles.dataListItemSubtitle}>
            Source: {item.source}
          </Text>
          <Text style={styles.dataListItemSubtitle}>
            Fertilizer: {item.fertilizer}
          </Text>
          <View style={styles.syncStatusInline}>
            <Ionicons
              name={item.isSynced ? "cloud-done" : "cloud-upload-outline"}
              size={14}
              color={item.isSynced ? CoffeeColors.MEDIUM_BROWN : CoffeeColors.LIGHT_BROWN}
            />
            <Text style={[styles.syncStatusText, { color: item.isSynced ? CoffeeColors.MEDIUM_BROWN : CoffeeColors.LIGHT_BROWN }]}>
              {item.isSynced ? 'Synced' : 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.recordActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEdit(item);
            }}
          >
            <Ionicons name="pencil" size={20} color={CoffeeColors.MEDIUM_BROWN} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(item);
            }}
          >
            <Ionicons name="trash" size={20} color={CoffeeColors.DARK_BROWN} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
        <Text style={styles.loadingText}>Loading block records...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
      <SimpleHeader title="Block Summary" />

      <View style={styles.container}>
        {/* Sync Status Banner */}
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>{syncStatus}</Text>
          <TouchableOpacity onPress={loadData} style={{ marginLeft: 10 }}>
            <Ionicons name="reload-circle-sharp" size={24} color={CoffeeColors.CREAM} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={CoffeeColors.MEDIUM_BROWN} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by block ID, type, or source..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor={CoffeeColors.GRAY_TEXT}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color={CoffeeColors.MEDIUM_BROWN} />
            </TouchableOpacity>
          )}
        </View>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('BlockRegistration')}
          >
            <Ionicons name="add-circle-outline" size={20} color={CoffeeColors.CREAM} />
            <Text style={styles.addButtonText}>Register New Block</Text>
          </TouchableOpacity>
          <Text style={styles.recordCount}>{filteredData.length} blocks</Text>
        </View>

        {/* Block Records List */}
        <FlatList
          data={filteredData}
          renderItem={renderBlockCard}
          keyExtractor={(item, index) => `${item.block_id}_${item.isSynced}_${index}`}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={64} color={CoffeeColors.MEDIUM_BROWN} />
              <Text style={styles.emptyText}>No block records found</Text>
              {searchTerm && (
                <Text style={styles.emptySubtext}>Try adjusting your search</Text>
              )}
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>

      <BottomNav activeScreen="Blocks" />
    </View>
  );
};

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
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CoffeeColors.DARK_BROWN,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  syncText: {
    color: CoffeeColors.CREAM,
    fontSize: 13,
    flexShrink: 1,
    fontFamily: Fonts.regular,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CoffeeColors.WHITE,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: CoffeeColors.LIGHT_BROWN,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: CoffeeColors.DARK_BROWN,
    fontFamily: Fonts.regular,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CoffeeColors.DARK_BROWN,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  addButtonText: {
    color: CoffeeColors.CREAM,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    marginLeft: 8,
    fontSize: 14,
  },
  recordCount: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  dataListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CoffeeColors.WHITE,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: CoffeeColors.MEDIUM_BROWN,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dataListItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 4,
  },
  dataListItemUID: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  dataListItemSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: CoffeeColors.GRAY_TEXT,
    marginTop: 2,
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
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: CoffeeColors.GRAY_TEXT,
    fontStyle: 'italic',
  },
});

export default BlockSummary;
