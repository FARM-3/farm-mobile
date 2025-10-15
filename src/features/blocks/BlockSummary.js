// BlockSummary.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, TextInput, FlatList
} from 'react-native';
import NetInfo from "@react-native-community/netinfo";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import CoffeeColors from '../../theme/colors';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';

const BLOCK_SYNC_QUEUE_KEY = "blocks_sync_queue";

const BlockSummary = ({ route = {}, navigation }) => {
  const [allRecords, setAllRecords] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Checking connectivity and syncing...");

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBlock, setFilterBlock] = useState("All Blocks");

  // --- OFFLINE SYNC UTILITIES ---

  /**
   * Retrieves all unsynced block records from local storage queue.
   */
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
   * Removes a block from the local queue after a successful sync.
   * @param {string} blockId - The unique block ID of the record to remove.
   */
  const removeBlockFromQueue = async (blockId) => {
    try {
      const { records: currentQueue } = await getUnsyncedBlocks();

      // Filter out the block matching the blockId
      const newQueue = currentQueue.filter(record => record.block_id !== blockId);

      await AsyncStorage.setItem(BLOCK_SYNC_QUEUE_KEY, JSON.stringify(newQueue));
      return { success: true, remaining: newQueue.length };

    } catch (error) {
      console.error("Error removing block from queue:", error);
      return { success: false, remaining: -1 };
    }
  };

  /**
   * Tries to sync all locally saved blocks to the remote API.
   */
  const syncPendingBlocks = async () => {
    const { success, records } = await getUnsyncedBlocks();
    if (!success || records.length === 0) {
      return { syncedCount: 0, totalCount: 0 };
    }

    let syncedCount = 0;
    const totalCount = records.length;

    console.log(`Attempting to sync ${totalCount} local blocks...`);

    for (const record of records) {
      try {
        const response = await fetch('https://api-3181.onrender.com/api/blocks/blocks/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(record)
        });

        if (response.ok) {
          await removeBlockFromQueue(record.block_id);
          syncedCount++;
        } else {
          console.warn(`Sync failed for block ${record.block_id}: Status ${response.status}`);
        }
      } catch (error) {
        console.warn(`Sync failed for block ${record.block_id}:`, error.message);
      }
    }

    console.log(`Block synchronization complete. Synced ${syncedCount} of ${totalCount} blocks.`);
    return { syncedCount, totalCount };
  };

  /**
   * Primary function to fetch, sync, and combine all data sources.
   */
  const loadAndSyncData = useCallback(async () => {
    setIsLoading(true);
    let remoteRecords = [];
    let localRecords = [];

    // 1. Checking Internet Connectivity
    const netState = await NetInfo.fetch();
    const isConnected = netState.isConnected && netState.isInternetReachable;

    if (isConnected) {
      setSyncStatus("Online: Initiating data synchronization.");

      // 2. Attempting Sync - sync any pending local blocks first
      await syncPendingBlocks();

      // 3. Fetching Remote Data
      try {
        const remoteResponse = await fetch('https://api-3181.onrender.com/api/blocks/blocks/', {
          headers: {
            'Content-Type': 'application/json',
            // Add authorization if needed
          }
        });
        if (remoteResponse.ok) {
          const data = await remoteResponse.json();
          // API returns paginated response with results array
          remoteRecords = data.results || [];
          setSyncStatus(`Online: Loaded ${remoteRecords.length} blocks from server.`);
        } else {
          const errorText = await remoteResponse.text();
          console.error('API Error:', errorText);
          setSyncStatus("Online: Failed to fetch remote data.");
        }
      } catch (error) {
        console.error('Network error:', error);
        setSyncStatus("Online: Network error fetching data.");
      }
    } else {
      setSyncStatus("Offline Mode: Data saved locally. Sync will occur when online.");
    }

    // 4. Fetching Local Data (always fetch, regardless of connectivity)
    const localResponse = await getUnsyncedBlocks();
    if (localResponse.success && Array.isArray(localResponse.records)) {
      // Map local data and format for display consistency
      localRecords = localResponse.records.map(r => ({
        ...r,
        isSynced: false,
        // Ensure consistent field names for display
        block_id: r.block_id || r.id,
        no_of_trees: r.no_of_trees || r.numTrees,
        date_planted: r.date_planted || r.datePlanted,
        type_of_coffee: r.type_of_coffee || r.typeCoffee,
        source_of_seedling: r.source_of_seedling || r.sourceSeedling,
        type_of_seedling: r.type_of_seedling || r.typeOfSeedling,
        age_of_seedling: r.age_of_seedling || r.ageTrees,
        fertilizers: r.fertilizers || r.fertilizerType,
        fertilizer_names: r.fertilizer_names || r.fertilizerList,
        use_pesticides: r.use_pesticides || r.usePesticides,
        pesticides_list: r.pesticides_list || r.pesticidesList,
        standard_practices: r.standard_practices || r.standardPractices,
      }));
    }

    // 5. Combine Data: Local (Pending) + Remote (Synced)
    // Filter out remote records that might still be in the local queue
    const localIds = new Set(localRecords.map(r => r.block_id));
    const uniqueRemoteRecords = remoteRecords.filter(r => !localIds.has(r.block_id));

    let finalRecords = [...localRecords, ...uniqueRemoteRecords];

    // Sorting by date (newest first)
    finalRecords.sort((a, b) => new Date(b.created_at || b.date_planted) - new Date(a.created_at || a.date_planted));

    setAllRecords(finalRecords);
    setIsLoading(false);
  }, []);

  // --- Filtering & Searching Logic ---
  useEffect(() => {
    let result = allRecords;

    // 1. Search Filter (by Block ID or Type)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(record =>
        record.block_id?.toLowerCase().includes(lowerSearch) ||
        record.type_of_coffee?.toLowerCase().includes(lowerSearch)
      );
    }

    // 2. Block Filter (placeholder for now)
    if (filterBlock !== "All Blocks") {
      // Implement block filtering if needed
    }

    setFilteredData(result);
  }, [allRecords, searchTerm, filterBlock]);

  // Initial load
  useEffect(() => {
    loadAndSyncData();
  }, [loadAndSyncData]);

  // Check for refresh request from form screen
  useEffect(() => {
    if (route.params?.shouldRefresh) {
      loadAndSyncData();
    }
  }, [route?.params?.shouldRefresh, loadAndSyncData]);

  // Refresh data whenever the screen comes into focus (e.g., after form submission)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[BlockSummary] Screen focused, refreshing data...');
      loadAndSyncData();
    });
    return unsubscribe;
  }, [navigation, loadAndSyncData]);

  const handleAddNewBlock = () => {
    navigation.navigate('BlockRegistration');
  };

  // --- Export Functionality
  const convertToCSV = (rows) => {
    const header = ['Block ID', 'Trees', 'Date Planted', 'Coffee Type', 'Seedling Source', 'Fertilizer', 'Pesticides', 'Standard Practices', 'Sync Status'];
    const csvRows = [header.join(',')];

    rows.forEach((row) => {
      const values = [
        row.block_id,
        row.no_of_trees,
        row.date_planted,
        row.type_of_coffee,
        row.source_of_seedling,
        row.fertilizer_names || row.fertilizer_list,
        row.use_pesticides === 'yes' ? 'Yes' : 'No',
        row.standard_practices,
        row.isSynced ? 'Synced' : 'Pending',
      ];
      csvRows.push(values.map(v => `"${v}"`).join(','));
    });

    return csvRows.join('\n');
  };

  const exportToCSV = async () => {
    if (filteredData.length === 0) {
      Alert.alert("Export Failed", "There is no data to export.");
      return;
    }
    try {
      const csv = convertToCSV(filteredData);
      const fileUri = FileSystem.documentDirectory + 'block_summary.csv';

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

  const renderRow = ({ item }) => (
    <View style={[styles.row, item.isSynced ? styles.syncedRow : styles.pendingRow]}>
      <Text style={[styles.cell, { width: 100 }]}>{item.block_id || 'N/A'}</Text>
      <Text style={[styles.cell, { width: 80 }]}>{item.no_of_trees}</Text>
      <Text style={[styles.cell, { width: 120 }]}>{item.date_planted}</Text>
      <Text style={[styles.cell, { width: 120 }]}>{item.type_of_coffee}</Text>
      <Text style={[styles.cell, { width: 150 }]}>{item.source_of_seedling}</Text>
      <Text style={[styles.cell, { width: 150 }]}>{item.fertilizer_names || item.fertilizer_list}</Text>
      <Text style={[styles.cell, { width: 100 }]}>{item.use_pesticides === 'yes' ? 'Yes' : 'No'}</Text>
      <View style={[styles.cell, { width: 100, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons
          name={item.isSynced ? "cloud-done" : "cloud-upload-outline"}
          size={16}
          color={item.isSynced ? CoffeeColors.GREEN : CoffeeColors.ACCENT}
        />
        <Text style={{ color: item.isSynced ? CoffeeColors.GREEN : CoffeeColors.ACCENT, marginLeft: 4, fontSize: 12 }}>
          {item.isSynced ? 'Synced' : 'Pending'}
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
        <Text style={styles.loadingText}>Loading block data...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: CoffeeColors.LIGHT_GRAY }}>
      <Header title="Block Summary" onNavigate={(screen) => navigation.navigate(screen)} />
      <View style={styles.container}>

        {/* Add New Block Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddNewBlock}
        >
          <Ionicons name="add-circle" size={20} color={CoffeeColors.WHITE} />
          <Text style={styles.addButtonText}>Register New Block</Text>
        </TouchableOpacity>

        {/* Sync Status Banner */}
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>{syncStatus}</Text>
          <TouchableOpacity onPress={loadAndSyncData} style={{ marginLeft: 10 }}>
            <Ionicons name="reload-circle-sharp" size={24} color={CoffeeColors.WHITE} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TextInput
          style={styles.searchBar}
          placeholder="Search by block ID or coffee type..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={filterBlock} onValueChange={setFilterBlock}>
              <Picker.Item label="All Blocks" value="All Blocks" />
            </Picker>
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={exportToCSV}
          disabled={filteredData.length === 0}
        >
          <Ionicons name="download-outline" size={18} color={CoffeeColors.WHITE} />
          <Text style={styles.exportText}>Export {filteredData.length} Records to CSV</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.headerCell, { width: 100 }]}>Block ID</Text>
          <Text style={[styles.headerCell, { width: 80 }]}>Trees</Text>
          <Text style={[styles.headerCell, { width: 120 }]}>Date Planted</Text>
          <Text style={[styles.headerCell, { width: 120 }]}>Coffee Type</Text>
          <Text style={[styles.headerCell, { width: 150 }]}>Seedling Source</Text>
          <Text style={[styles.headerCell, { width: 150 }]}>Fertilizer</Text>
          <Text style={[styles.headerCell, { width: 100 }]}>Pesticides</Text>
          <Text style={[styles.headerCell, { width: 100 }]}>Status</Text>
        </View>

        {/* Data Rows */}
        <FlatList
          data={filteredData}
          renderItem={renderRow}
          keyExtractor={(item, index) => item.block_id?.toString() || index.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No block records found matching your filters.</Text>}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>
      <BottomNav activeScreen="Blocks" onNavigate={(screen) => navigation.navigate(screen)} />
    </View>
  );
};

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
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CoffeeColors.ACCENT,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: CoffeeColors.WHITE,
    fontWeight: '700',
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
    color: CoffeeColors.WHITE,
    fontWeight: '700',
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: CoffeeColors.WHITE,
    marginBottom: 5,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 5,
    justifyContent: 'space-between',
  },
  headerRow: {
    backgroundColor: CoffeeColors.DARK_BROWN,
    marginBottom: 8,
    borderRadius: 6,
  },
  headerCell: {
    flex: 1,
    fontWeight: '700',
    color: CoffeeColors.CREAM,
    textAlign: 'center',
    fontSize: 12,
  },
  dataRow: {
    borderLeftWidth: 5,
    borderLeftColor: CoffeeColors.GREEN,
  },
  cell: {
    flex: 1,
    color: CoffeeColors.GRAY_TEXT,
    textAlign: 'center',
    fontSize: 12,
    alignSelf: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: CoffeeColors.MEDIUM_BROWN,
    fontStyle: 'italic',
  }
});

export default BlockSummary;














// import React, { useEffect, useState } from 'react';
// import { 
//   View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert 
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useNavigation, useFocusEffect } from '@react-navigation/native';
// import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing';
// import CoffeeColors from '../../theme/colors';

// // Updated API URL - this should fetch all blocks
// const API_URL = 'https://api-3181.onrender.com/api/blocks/';

// // Fields to display in table (including new fertilizer fields)
// const DISPLAY_FIELDS = [
//   "block_id",
//   "no_of_trees",
//   "date_planted",
//   "type_of_coffee",
//   "source_of_seedling",
//   "type_of_seedling",
//   "age_of_seedling",
//   "use_pesticides",
//   "pesticides_list",
//   "standard_practices"
// ];

// const BlockSummary = () => {
//   const navigation = useNavigation();
//   const [blocks, setBlocks] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const fetchBlocks = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       console.log('Fetching blocks from:', API_URL);
//       const res = await fetch(API_URL);
      
//       if (res.ok) {
//         const data = await res.json();
//         console.log('Fetched data:', data);
        
//         // Handle different response formats
//         let blocksList = [];
//         if (Array.isArray(data)) {
//           blocksList = data;
//         } else if (data.results && Array.isArray(data.results)) {
//           blocksList = data.results;
//         } else if (data.blocks && Array.isArray(data.blocks)) {
//           blocksList = data.blocks;
//         }
        
//         setBlocks(blocksList);
//       } else {
//         const errorText = await res.text();
//         console.error('API Error:', errorText);
//         setError('Failed to fetch blocks from server');
//       }
//     } catch (err) {
//       console.error('Fetch error:', err);
//       setError('Network error. Please check your connection.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Refresh data when screen comes into focus
//   useFocusEffect(
//     React.useCallback(() => {
//       fetchBlocks();
//     }, [])
//   );

//   // === CSV EXPORT ===
//   const exportToCSV = async () => {
//     if (!blocks || blocks.length === 0) {
//       Alert.alert('No data', 'There is no data to export.');
//       return;
//     }

//     try {
//       const csvRows = [
//         DISPLAY_FIELDS.join(','), // header row
//         ...blocks.map(block =>
//           DISPLAY_FIELDS.map(field => {
//             const value = block[field] !== undefined && block[field] !== null ? block[field] : '';
//             // Escape quotes and wrap in quotes
//             return `"${String(value).replace(/"/g, '""')}"`;
//           }).join(',')
//         )
//       ];
//       const csvString = csvRows.join('\n');

//       const fileUri = FileSystem.documentDirectory + 'BlockSummary.csv';
//       await FileSystem.writeAsStringAsync(fileUri, csvString, { 
//         encoding: FileSystem.EncodingType.UTF8 
//       });
//       await Sharing.shareAsync(fileUri);
//       Alert.alert('Success', 'CSV exported successfully!');
//     } catch (err) {
//       console.error('Export error:', err);
//       Alert.alert('Error', 'Failed to export CSV');
//     }
//   };

//   const handleAddBlock = () => {
//     try {
//       // Try to navigate to BlockRegistration
//       if (navigation.canGoBack() || navigation.getState()) {
//         navigation.navigate('BlockRegistration');
//       } else {
//         Alert.alert('Navigation Error', 'Unable to navigate to Block Registration. Please check your navigation setup.');
//       }
//     } catch (err) {
//       console.error('Navigation error:', err);
//       Alert.alert('Navigation Error', 'Unable to navigate to Block Registration');
//     }
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.loaderContainer}>
//         <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
//         <Text style={styles.loadingText}>Loading blocks...</Text>
//       </SafeAreaView>
//     );
//   }

//   if (error) {
//     return (
//       <SafeAreaView style={styles.loaderContainer}>
//         <Text style={styles.errorText}>{error}</Text>
//         <TouchableOpacity style={styles.retryButton} onPress={fetchBlocks}>
//           <Text style={styles.retryButtonText}>Retry</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.addButton} onPress={handleAddBlock}>
//           <Text style={styles.addButtonText}>Add Block</Text>
//         </TouchableOpacity>
//       </SafeAreaView>
//     );
//   }

//   if (blocks.length === 0) {
//     return (
//       <SafeAreaView style={styles.loaderContainer}>
//         <Text style={styles.emptyText}>No blocks found. Please add a block first.</Text>
//         <TouchableOpacity style={styles.addButton} onPress={handleAddBlock}>
//           <Text style={styles.addButtonText}>Add Block</Text>
//         </TouchableOpacity>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Block Summary</Text>
//         <Text style={styles.subtitle}>{blocks.length} block(s) registered</Text>
//       </View>

//       <View style={styles.headerButtons}>
//         <TouchableOpacity style={styles.button} onPress={handleAddBlock}>
//           <Text style={styles.buttonText}>+ Add Block</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={[styles.button, styles.exportButton]} onPress={exportToCSV}>
//           <Text style={styles.buttonText}>Export CSV</Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView horizontal style={styles.tableContainer}>
//         <View>
//           {/* Table Header */}
//           <View style={[styles.row, styles.headerRow]}>
//             {DISPLAY_FIELDS.map((key) => (
//               <Text key={key} style={[styles.cell, styles.headerCell]}>
//                 {key.replace(/_/g, ' ').toUpperCase()}
//               </Text>
//             ))}
//           </View>

//           {/* Table Data */}
//           <ScrollView style={{ maxHeight: 500 }}>
//             {blocks.map((block, idx) => (
//               <View key={block.block_id || idx} style={styles.row}>
//                 {DISPLAY_FIELDS.map((key) => {
//                   const value = block[key] !== undefined && block[key] !== null 
//                     ? String(block[key]) 
//                     : '-';
//                   return (
//                     <Text key={key} style={styles.cell}>{value}</Text>
//                   );
//                 })}
//               </View>
//             ))}
//           </ScrollView>
//         </View>
//       </ScrollView>

//       {/* Refresh Button */}
//       <TouchableOpacity style={styles.refreshButton} onPress={fetchBlocks}>
//         <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
//       </TouchableOpacity>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: { 
//     flex: 1, 
//     padding: 16, 
//     backgroundColor: CoffeeColors.LIGHT_GRAY 
//   },
//   loaderContainer: { 
//     flex: 1, 
//     justifyContent: 'center', 
//     alignItems: 'center',
//     backgroundColor: CoffeeColors.LIGHT_GRAY,
//     padding: 20,
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     color: CoffeeColors.DARK_BROWN,
//   },
//   errorText: {
//     fontSize: 16,
//     color: 'red',
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   emptyText: {
//     fontSize: 16,
//     color: CoffeeColors.DARK_BROWN,
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   header: {
//     marginBottom: 16,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: CoffeeColors.DARK_BROWN,
//   },
//   subtitle: {
//     fontSize: 14,
//     color: CoffeeColors.GRAY_TEXT,
//     marginTop: 4,
//   },
//   headerButtons: { 
//     flexDirection: 'row', 
//     justifyContent: 'space-between', 
//     marginBottom: 16,
//     gap: 10,
//   },
//   button: {
//     flex: 1,
//     backgroundColor: CoffeeColors.MEDIUM_BROWN,
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   addButton: {
//     backgroundColor: CoffeeColors.MEDIUM_BROWN,
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//     borderRadius: 8,
//     marginTop: 10,
//   },
//   addButtonText: {
//     color: CoffeeColors.WHITE,
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   exportButton: {
//     backgroundColor: CoffeeColors.DARK_BROWN,
//   },
//   retryButton: {
//     backgroundColor: CoffeeColors.DARK_BROWN,
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//     borderRadius: 8,
//     marginBottom: 10,
//   },
//   retryButtonText: {
//     color: CoffeeColors.WHITE,
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   buttonText: {
//     color: CoffeeColors.WHITE,
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   tableContainer: {
//     marginTop: 10,
//   },
//   row: { 
//     flexDirection: 'row', 
//     borderBottomWidth: 1, 
//     borderColor: CoffeeColors.GRAY_TEXT 
//   },
//   headerRow: { 
//     backgroundColor: CoffeeColors.MEDIUM_BROWN 
//   },
//   cell: { 
//     padding: 10, 
//     minWidth: 120, 
//     borderRightWidth: 1, 
//     borderColor: CoffeeColors.GRAY_TEXT, 
//     color: CoffeeColors.DARK_BROWN,
//     fontSize: 12,
//   },
//   headerCell: { 
//     fontWeight: 'bold', 
//     color: CoffeeColors.WHITE,
//     fontSize: 11,
//   },
//   refreshButton: {
//     backgroundColor: CoffeeColors.SUCCESS_GREEN,
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginTop: 16,
//   },
//   refreshButtonText: {
//     color: CoffeeColors.WHITE,
//     fontSize: 14,
//     fontWeight: '600',
//   },
// });

// export default BlockSummary;




//BEFORE 8
// import React, { useEffect, useState } from 'react';
// import { 
//   View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert 
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useNavigation, useFocusEffect } from '@react-navigation/native';
// import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing';
// import CoffeeColors from '../../theme/colors';

// // Updated API URL - this should fetch all blocks
// const API_URL = 'https://api-3181.onrender.com/api/blocks/';

// // Fields to display in table (including new fertilizer fields)
// const DISPLAY_FIELDS = [
//   "block_id",
//   "no_of_trees",
//   "date_planted",
//   "type_of_coffee",
//   "source_of_seedling",
//   "type_of_seedling",
//   "age_of_seedling",
//   "use_pesticides",
//   "pesticides_list",
//   "standard_practices"
// ];

// const BlockSummary = () => {
//   const navigation = useNavigation();
//   const [blocks, setBlocks] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const fetchBlocks = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       console.log('Fetching blocks from:', API_URL);
//       const res = await fetch(API_URL);
      
//       if (res.ok) {
//         const data = await res.json();
//         console.log('Fetched data:', data);
        
//         // Handle different response formats
//         let blocksList = [];
//         if (Array.isArray(data)) {
//           blocksList = data;
//         } else if (data.results && Array.isArray(data.results)) {
//           blocksList = data.results;
//         } else if (data.blocks && Array.isArray(data.blocks)) {
//           blocksList = data.blocks;
//         }
        
//         setBlocks(blocksList);
//       } else {
//         const errorText = await res.text();
//         console.error('API Error:', errorText);
//         setError('Failed to fetch blocks from server');
//       }
//     } catch (err) {
//       console.error('Fetch error:', err);
//       setError('Network error. Please check your connection.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Refresh data when screen comes into focus
//   useFocusEffect(
//     React.useCallback(() => {
//       fetchBlocks();
//     }, [])
//   );

//   // === CSV EXPORT ===
//   const exportToCSV = async () => {
//     if (!blocks || blocks.length === 0) {
//       Alert.alert('No data', 'There is no data to export.');
//       return;
//     }

//     try {
//       const csvRows = [
//         DISPLAY_FIELDS.join(','), // header row
//         ...blocks.map(block =>
//           DISPLAY_FIELDS.map(field => {
//             const value = block[field] !== undefined && block[field] !== null ? block[field] : '';
//             // Escape quotes and wrap in quotes
//             return `"${String(value).replace(/"/g, '""')}"`;
//           }).join(',')
//         )
//       ];
//       const csvString = csvRows.join('\n');

//       const fileUri = FileSystem.documentDirectory + 'BlockSummary.csv';
//       await FileSystem.writeAsStringAsync(fileUri, csvString, { 
//         encoding: FileSystem.EncodingType.UTF8 
//       });
//       await Sharing.shareAsync(fileUri);
//       Alert.alert('Success', 'CSV exported successfully!');
//     } catch (err) {
//       console.error('Export error:', err);
//       Alert.alert('Error', 'Failed to export CSV');
//     }
//   };

//   const handleAddBlock = () => {
//     try {
//       // Try to navigate to BlockRegistration
//       if (navigation.canGoBack() || navigation.getState()) {
//         navigation.navigate('BlockRegistration');
//       } else {
//         Alert.alert('Navigation Error', 'Unable to navigate to Block Registration. Please check your navigation setup.');
//       }
//     } catch (err) {
//       console.error('Navigation error:', err);
//       Alert.alert('Navigation Error', 'Unable to navigate to Block Registration');
//     }
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.loaderContainer}>
//         <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
//         <Text style={styles.loadingText}>Loading blocks...</Text>
//       </SafeAreaView>
//     );
//   }

//   if (error) {
//     return (
//       <SafeAreaView style={styles.loaderContainer}>
//         <Text style={styles.errorText}>{error}</Text>
//         <TouchableOpacity style={styles.retryButton} onPress={fetchBlocks}>
//           <Text style={styles.retryButtonText}>Retry</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={styles.addButton} onPress={handleAddBlock}>
//           <Text style={styles.addButtonText}>Add Block</Text>
//         </TouchableOpacity>
//       </SafeAreaView>
//     );
//   }

//   if (blocks.length === 0) {
//     return (
//       <SafeAreaView style={styles.loaderContainer}>
//         <Text style={styles.emptyText}>No blocks found. Please add a block first.</Text>
//         <TouchableOpacity style={styles.addButton} onPress={handleAddBlock}>
//           <Text style={styles.addButtonText}>Add Block</Text>
//         </TouchableOpacity>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Block Summary</Text>
//         <Text style={styles.subtitle}>{blocks.length} block(s) registered</Text>
//       </View>

//       <View style={styles.headerButtons}>
//         <TouchableOpacity style={styles.button} onPress={handleAddBlock}>
//           <Text style={styles.buttonText}>+ Add Block</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={[styles.button, styles.exportButton]} onPress={exportToCSV}>
//           <Text style={styles.buttonText}>Export CSV</Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView horizontal style={styles.tableContainer}>
//         <View>
//           {/* Table Header */}
//           <View style={[styles.row, styles.headerRow]}>
//             {DISPLAY_FIELDS.map((key) => (
//               <Text key={key} style={[styles.cell, styles.headerCell]}>
//                 {key.replace(/_/g, ' ').toUpperCase()}
//               </Text>
//             ))}
//           </View>

//           {/* Table Data */}
//           <ScrollView style={{ maxHeight: 500 }}>
//             {blocks.map((block, idx) => (
//               <View key={block.block_id || idx} style={styles.row}>
//                 {DISPLAY_FIELDS.map((key) => {
//                   const value = block[key] !== undefined && block[key] !== null 
//                     ? String(block[key]) 
//                     : '-';
//                   return (
//                     <Text key={key} style={styles.cell}>{value}</Text>
//                   );
//                 })}
//               </View>
//             ))}
//           </ScrollView>
//         </View>
//       </ScrollView>

//       {/* Refresh Button */}
//       <TouchableOpacity style={styles.refreshButton} onPress={fetchBlocks}>
//         <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
//       </TouchableOpacity>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: { 
//     flex: 1, 
//     padding: 16, 
//     backgroundColor: CoffeeColors.LIGHT_GRAY 
//   },
//   loaderContainer: { 
//     flex: 1, 
//     justifyContent: 'center', 
//     alignItems: 'center',
//     backgroundColor: CoffeeColors.LIGHT_GRAY,
//     padding: 20,
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     color: CoffeeColors.DARK_BROWN,
//   },
//   errorText: {
//     fontSize: 16,
//     color: 'red',
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   emptyText: {
//     fontSize: 16,
//     color: CoffeeColors.DARK_BROWN,
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   header: {
//     marginBottom: 16,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: CoffeeColors.DARK_BROWN,
//   },
//   subtitle: {
//     fontSize: 14,
//     color: CoffeeColors.GRAY_TEXT,
//     marginTop: 4,
//   },
//   headerButtons: { 
//     flexDirection: 'row', 
//     justifyContent: 'space-between', 
//     marginBottom: 16,
//     gap: 10,
//   },
//   button: {
//     flex: 1,
//     backgroundColor: CoffeeColors.MEDIUM_BROWN,
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   addButton: {
//     backgroundColor: CoffeeColors.MEDIUM_BROWN,
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//     borderRadius: 8,
//     marginTop: 10,
//   },
//   addButtonText: {
//     color: CoffeeColors.WHITE,
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   exportButton: {
//     backgroundColor: CoffeeColors.DARK_BROWN,
//   },
//   retryButton: {
//     backgroundColor: CoffeeColors.DARK_BROWN,
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//     borderRadius: 8,
//     marginBottom: 10,
//   },
//   retryButtonText: {
//     color: CoffeeColors.WHITE,
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   buttonText: {
//     color: CoffeeColors.WHITE,
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   tableContainer: {
//     marginTop: 10,
//   },
//   row: { 
//     flexDirection: 'row', 
//     borderBottomWidth: 1, 
//     borderColor: CoffeeColors.GRAY_TEXT 
//   },
//   headerRow: { 
//     backgroundColor: CoffeeColors.MEDIUM_BROWN 
//   },
//   cell: { 
//     padding: 10, 
//     minWidth: 120, 
//     borderRightWidth: 1, 
//     borderColor: CoffeeColors.GRAY_TEXT, 
//     color: CoffeeColors.DARK_BROWN,
//     fontSize: 12,
//   },
//   headerCell: { 
//     fontWeight: 'bold', 
//     color: CoffeeColors.WHITE,
//     fontSize: 11,
//   },
//   refreshButton: {
//     backgroundColor: CoffeeColors.SUCCESS_GREEN,
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginTop: 16,
//   },
//   refreshButtonText: {
//     color: CoffeeColors.WHITE,
//     fontSize: 14,
//     fontWeight: '600',
//   },
// });

// export default BlockSummary;




// import React, { useEffect, useState } from 'react';
// import { 
//   View, Text, ScrollView, StyleSheet, Button, ActivityIndicator, Alert, TouchableOpacity 
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing';
// import CoffeeColors from '../../theme/colors';

// // Updated API URL for fetching all blocks
// const API_URL = 'https://api-3181.onrender.com/api/blocks/';

// // Fields to display in table (including new fertilizer fields)
// const DISPLAY_FIELDS = [
//   "block_id",
//   "no_of_trees",
//   "date_planted",
//   "type_of_coffee",
//   "source_of_seedling",
//   "type_of_seedling",
//   "age_of_seedling",
//   "fertilizer_type",
//   "fertilizer_list",
//   "use_pesticides",
//   "pesticides_list",
//   "standard_practices"
// ];

// const BlockSummary = ({ navigation }) => {
//   const [blocks, setBlocks] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const fetchBlocks = async () => {
//     setLoading(true);
//     try {
//       // Fetch all blocks from the API
//       const res = await fetch(API_URL);
      
//       if (res.ok) {
//         const data = await res.json();
//         // Handle both array response and paginated response
//         const blocksList = Array.isArray(data) ? data : (data.results || []);
//         setBlocks(blocksList);
//       } else {
//         Alert.alert('Error', 'Failed to fetch blocks');
//       }
//     } catch (err) {
//       console.error(err);
//       Alert.alert('Error', 'Network error. Please check your connection.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     // Fetch blocks on mount
//     fetchBlocks();

//     // Add listener to refresh when screen comes into focus
//     const unsubscribe = navigation?.addListener('focus', () => {
//       fetchBlocks();
//     });

//     return unsubscribe;
//   }, [navigation]);

//   // === CSV EXPORT ===
//   const exportToCSV = async () => {
//     if (!blocks || blocks.length === 0) {
//       Alert.alert('No data', 'There is no data to export.');
//       return;
//     }

//     const csvRows = [
//       DISPLAY_FIELDS.join(','), // header row
//       ...blocks.map(block =>
//         DISPLAY_FIELDS.map(field => {
//           const value = block[field] !== undefined && block[field] !== null ? block[field] : '';
//           return `"${value}"`;
//         }).join(',')
//       )
//     ];
//     const csvString = csvRows.join('\n');

//     const fileUri = FileSystem.documentDirectory + 'BlockSummary.csv';
//     try {
//       await FileSystem.writeAsStringAsync(fileUri, csvString, { 
//         encoding: FileSystem.EncodingType.UTF8 
//       });
//       await Sharing.shareAsync(fileUri);
//       Alert.alert('Success', 'CSV file exported successfully!');
//     } catch (err) {
//       console.error(err);
//       Alert.alert('Error', 'Failed to export CSV file');
//     }
//   };

//   const handleAddBlock = () => {
//     if (navigation) {
//       navigation.navigate('BlockRegistration');
//     } else {
//       Alert.alert('Navigation Error', 'Unable to navigate to Block Registration');
//     }
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.loaderContainer}>
//         <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
//         <Text style={styles.loadingText}>Loading blocks...</Text>
//       </SafeAreaView>
//     );
//   }

//   if (blocks.length === 0) {
//     return (
//       <SafeAreaView style={styles.loaderContainer}>
//         <Text style={styles.emptyText}>No blocks found. Please add a block first.</Text>
//         <TouchableOpacity style={styles.addButton} onPress={handleAddBlock}>
//           <Text style={styles.addButtonText}>Add Block</Text>
//         </TouchableOpacity>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Block Summary</Text>
//         <Text style={styles.subtitle}>{blocks.length} block(s) registered</Text>
//       </View>

//       <View style={styles.headerButtons}>
//         <TouchableOpacity style={styles.button} onPress={handleAddBlock}>
//           <Text style={styles.buttonText}>+ Add Block</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={[styles.button, styles.exportButton]} onPress={exportToCSV}>
//           <Text style={styles.buttonText}>Export to CSV</Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView horizontal style={styles.tableContainer}>
//         <View>
//           {/* Table Header */}
//           <View style={[styles.row, styles.headerRow]}>
//             {DISPLAY_FIELDS.map((key) => (
//               <Text key={key} style={[styles.cell, styles.headerCell]}>
//                 {key.replace(/_/g, ' ').toUpperCase()}
//               </Text>
//             ))}
//           </View>

//           {/* Table Data */}
//           <ScrollView style={{ maxHeight: 500 }}>
//             {blocks.map((block, idx) => (
//               <View key={block.block_id || idx} style={styles.row}>
//                 {DISPLAY_FIELDS.map((key) => {
//                   const value = block[key] !== undefined && block[key] !== null 
//                     ? String(block[key]) 
//                     : '-';
//                   return (
//                     <Text key={key} style={styles.cell}>{value}</Text>
//                   );
//                 })}
//               </View>
//             ))}
//           </ScrollView>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: { 
//     flex: 1, 
//     padding: 16, 
//     backgroundColor: CoffeeColors.LIGHT_GRAY 
//   },
//   loaderContainer: { 
//     flex: 1, 
//     justifyContent: 'center', 
//     alignItems: 'center',
//     backgroundColor: CoffeeColors.LIGHT_GRAY,
//     padding: 20,
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     color: CoffeeColors.DARK_BROWN,
//   },
//   emptyText: {
//     fontSize: 16,
//     color: CoffeeColors.DARK_BROWN,
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   header: {
//     marginBottom: 16,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: CoffeeColors.DARK_BROWN,
//   },
//   subtitle: {
//     fontSize: 14,
//     color: CoffeeColors.GRAY_TEXT,
//     marginTop: 4,
//   },
//   headerButtons: { 
//     flexDirection: 'row', 
//     justifyContent: 'space-between', 
//     marginBottom: 16,
//     gap: 10,
//   },
//   button: {
//     flex: 1,
//     backgroundColor: CoffeeColors.MEDIUM_BROWN,
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   addButton: {
//     backgroundColor: CoffeeColors.MEDIUM_BROWN,
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//     borderRadius: 8,
//   },
//   addButtonText: {
//     color: CoffeeColors.WHITE,
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   exportButton: {
//     backgroundColor: CoffeeColors.DARK_BROWN,
//   },
//   buttonText: {
//     color: CoffeeColors.WHITE,
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   tableContainer: {
//     marginTop: 10,
//   },
//   row: { 
//     flexDirection: 'row', 
//     borderBottomWidth: 1, 
//     borderColor: CoffeeColors.GRAY_TEXT 
//   },
//   headerRow: { 
//     backgroundColor: CoffeeColors.MEDIUM_BROWN 
//   },
//   cell: { 
//     padding: 10, 
//     minWidth: 120, 
//     borderRightWidth: 1, 
//     borderColor: CoffeeColors.GRAY_TEXT, 
//     color: CoffeeColors.DARK_BROWN,
//     fontSize: 12,
//   },
//   headerCell: { 
//     fontWeight: 'bold', 
//     color: CoffeeColors.WHITE,
//     fontSize: 11,
//   },
// });

// export default BlockSummary;












// import React, { useEffect, useState } from 'react';
// import { 
//   View, Text, ScrollView, StyleSheet, Button, ActivityIndicator, Alert 
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useNavigation } from '@react-navigation/native';
// import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing';
// import CoffeeColors from '../../theme/colors';

// const API_URL = 'https://api-3181.onrender.com/api/harvests/blocks/'; // append block_id when fetching

// // Fields to display in table
// const DISPLAY_FIELDS = [
//   "block_id",
//   "no_of_trees",
//   "date_planted",
//   "type_of_coffee",
//   "source_of_seedling",
//   "type_of_seedling",
//   "age_of_seedling",
//   "use_pesticides",
//   "pesticides_list",
//   "standard_practices"
// ];

// const BlockSummary = () => {
//   const navigation = useNavigation();
//   const [blocks, setBlocks] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const fetchBlockIds = async () => {
//     // Replace with your real API endpoint that returns all block IDs
//     return ['A01', 'B02']; 
//   };

//   const fetchBlocks = async () => {
//     setLoading(true);
//     try {
//       const blockIds = await fetchBlockIds();
//       const fetchedBlocks = [];

//       for (const blockId of blockIds) {
//         const res = await fetch(`${API_URL}${blockId}/`);
//         if (res.ok) {
//           const data = await res.json();
//           fetchedBlocks.push(data);
//         }
//       }

//       setBlocks(fetchedBlocks);
//     } catch (err) {
//       console.error(err);
//       Alert.alert('Error', 'Failed to fetch blocks');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchBlocks();
//   }, []);

//   // === CSV EXPORT ===
//   const exportToCSV = async () => {
//     if (!blocks || blocks.length === 0) {
//       Alert.alert('No data', 'There is no data to export.');
//       return;
//     }

//     const csvRows = [
//       DISPLAY_FIELDS.join(','), // header row
//       ...blocks.map(block =>
//         DISPLAY_FIELDS.map(field => `"${block[field]}"`).join(',')
//       )
//     ];
//     const csvString = csvRows.join('\n');

//     const fileUri = FileSystem.documentDirectory + 'BlockSummary.csv';
//     try {
//       await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
//       await Sharing.shareAsync(fileUri);
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.loaderContainer}>
//         <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
//       </SafeAreaView>
//     );
//   }

//   if (blocks.length === 0) {
//     return (
//       <SafeAreaView style={styles.loaderContainer}>
//         <Text style={{ color: CoffeeColors.DARK_BROWN }}>No blocks found. Please add a block first.</Text>
//         <Button title="Add Block" onPress={() => navigation.navigate('BlockRegistration')} />
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.headerButtons}>
//         <Button title="Add Block" onPress={() => navigation.navigate('BlockRegistration')} />
//         <Button title="Export to Excel" onPress={exportToCSV} />
//       </View>

//       <ScrollView horizontal style={{ marginTop: 10 }}>
//         <View>
//           {/* Table Header */}
//           <View style={[styles.row, styles.headerRow]}>
//             {DISPLAY_FIELDS.map((key) => (
//               <Text key={key} style={[styles.cell, styles.headerCell]}>{key}</Text>
//             ))}
//           </View>

//           {/* Table Data */}
//           <ScrollView style={{ maxHeight: 500 }}>
//             {blocks.map((block, idx) => (
//               <View key={idx} style={styles.row}>
//                 {DISPLAY_FIELDS.map((key) => (
//                   <Text key={key} style={styles.cell}>{block[key]}</Text>
//                 ))}
//               </View>
//             ))}
//           </ScrollView>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 16, backgroundColor: CoffeeColors.LIGHT_GRAY },
//   loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   headerButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
//   row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: CoffeeColors.GRAY_TEXT },
//   headerRow: { backgroundColor: CoffeeColors.MEDIUM_BROWN },
//   cell: { padding: 10, minWidth: 120, borderRightWidth: 1, borderColor: CoffeeColors.GRAY_TEXT, color: CoffeeColors.DARK_BROWN },
//   headerCell: { fontWeight: 'bold', color: CoffeeColors.WHITE },
// });

// export default BlockSummary;
