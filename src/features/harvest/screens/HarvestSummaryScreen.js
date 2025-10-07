// src/features/harvest/screens/HarvestSummaryScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    TouchableOpacity, 
    StyleSheet, 
    Alert, 
    ActivityIndicator,
    TextInput
} from 'react-native';
import NetInfo from "@react-native-community/netinfo";
import { Picker } from "@react-native-picker/picker";
// NOTE: These Expo imports will only work in an Expo environment
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import CoffeeColors from '../../../theme/colors';
import { 
    fetchAllHarvestRecords, 
    getUnsyncedRecords, 
    syncAllRecords 
} from '../../../services/harvestRecord';

// --- Constants for Filters ---
const BLOCK_OPTIONS = ["All Blocks", "Block A-1", "Block B-2", "Block C-3"];
const GRADE_OPTIONS = ["All Grades", "Grade 1", "Grade 2", "Grade 3"];
const SYNC_STATUS_OPTIONS = ["All Statuses", "Synced", "Pending"];

export default function HarvestSummaryScreen({ route = {} }) {
    const [allRecords, setAllRecords] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState("Checking connectivity and syncing...");
    
    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBlock, setFilterBlock] = useState(BLOCK_OPTIONS[0]);
    const [filterGrade, setFilterGrade] = useState(GRADE_OPTIONS[0]);
    const [filterStatus, setFilterStatus] = useState(SYNC_STATUS_OPTIONS[0]);

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
            
            // 2. Attempting Sync
            const syncResult = await syncAllRecords();
            if (syncResult.totalCount > 0) {
                setSyncStatus(`Sync complete! ${syncResult.syncedCount} of ${syncResult.totalCount} records uploaded.`);
            } else {
                setSyncStatus("Online: No pending records to sync.");
            }
            
            // 3. Fetching Remote Data
            const remoteResponse = await fetchAllHarvestRecords();
            if (remoteResponse.success && Array.isArray(remoteResponse.remoteData.results)) {
                // Maping remote data (snake_case) to local data structure (camelCase)
                remoteRecords = remoteResponse.remoteData.results.map(r => ({
                    // Map ALL API fields to local camelCase structure
                    id: r.id, 
                    grade: r.grade, 
                    block: r.block,
                    name: r.name,
                    isSynced: true,

                    
                    weight: `${r.weight} kg`, 
                    date: r.date, 
                    cherryColor: r.cherry_color, 
                    amountPaid: Number(r.amount_paid), 
                }));
            }
        } else {
            setSyncStatus("Offline Mode: Data saved locally. Sync will occur when online.");
        }
        
        // 4. Fetching Local Data (always fetch, regardless of connectivity)
        const localResponse = await getUnsyncedRecords();
        if (localResponse.success && Array.isArray(localResponse.records)) {
            // Maping local data and format for display consistency with remote data
            localRecords = localResponse.records.map(r => ({
                ...r,
                weight: `${r.weight} kg`, 
                date: r.dateReadable || r.date.split('T')[0], 
                isSynced: false,
            }));
        }

        // 5. Combining Data: Local (Pending) + Remote (Synced)
        const localIds = new Set(localRecords.map(r => r.id));
        // Filtering out remote records that might still be in the local queue (shouldn't happen with syncAllRecords, but good safeguard)
        const uniqueRemoteRecords = remoteRecords.filter(r => !localIds.has(r.id));
        
        let finalRecords = [...localRecords, ...uniqueRemoteRecords];
        
        // Sorting by date (newest first)
        finalRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        setAllRecords(finalRecords);
        setIsLoading(false);
    }, []);

    // --- Filtering & Searching Logic ---
    useEffect(() => {
        let result = allRecords;

        // 1. Search Filter (by Name or ID)
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(record => 
                record.name?.toLowerCase().includes(lowerSearch) ||
                record.id?.toString().toLowerCase().includes(lowerSearch)
            );
        }

        // 2. Block Filter
        if (filterBlock !== BLOCK_OPTIONS[0]) {
            result = result.filter(record => record.block === filterBlock);
        }

        // 3. Grade Filter
        if (filterGrade !== GRADE_OPTIONS[0]) {
            // Both local and remote now use the 'grade' field directly
            result = result.filter(record => record.grade === filterGrade);
        }

        // 4. Sync Status Filter
        if (filterStatus === "Synced") {
            result = result.filter(record => record.isSynced === true);
        } else if (filterStatus === "Pending") {
            result = result.filter(record => record.isSynced === false);
        }

        setFilteredData(result);
    }, [allRecords, searchTerm, filterBlock, filterGrade, filterStatus]);

    // Initial load
    useEffect(() => {
        loadAndSyncData();
    }, [loadAndSyncData]);

    // Check for refresh request from form screen (if router supports passing params)
    useEffect(() => {
        console.log('Route params changed:', route.params);
        if (route.params?.shouldRefresh) {
            loadAndSyncData();
            // Relying on the parent navigator to manage the 'shouldRefresh' state.
        }
    }, [route?.params?.shouldRefresh, loadAndSyncData]);


    // --- Export Functionality
    const convertToCSV = (rows) => {
        const header = ['Id', 'Grade', 'Weight(kg)', 'Block', 'Cherry Colour', 'Date', 'Recorder Name', 'Amount Paid(UGX)', 'Sync Status'];
        const csvRows = [header.join(',')];

        rows.forEach((row) => {
            const amountPaidValue = row.amountPaid !== undefined 
                ? row.amountPaid 
                : 0; // Fallback
            
            const weightValue = row.weight.replace(' kg', ''); // Remove ' kg' suffix for clean number export

            const values = [
                row.id,
                row.grade, 
                weightValue, 
                row.block,
                row.cherryColor || 'N/A',
                row.date,
                row.name || 'N/A',
                amountPaidValue, 
                row.isSynced ? 'Synced' : 'Pending',
            ];
            // Quote values for CSV safety and join them
            csvRows.push(values.map(v => `"${v}"`).join(',')); 
        });

        return csvRows.join('\n');
    };

    const exportToExcel = async () => {
        if (filteredData.length === 0) {
            Alert.alert("Export Failed", "There is no data to export.");
            return;
        }
        try {
            const csv = convertToCSV(filteredData);
            const fileUri = FileSystem.documentDirectory + 'harvest_summary.csv';

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
            {/* Display using the cleaned camelCase fields */}
            <Text style={styles.cell}>{item.grade || 'N/A'}</Text>
            <Text style={styles.cell}>{item.weight}</Text>
            <Text style={styles.cell}>{item.block}</Text>
            <Text style={styles.cell}>{item.date}</Text>
            <View style={styles.statusCell}>
                <Ionicons 
                    name={item.isSynced ? "cloud-done" : "cloud-upload-outline"} 
                    size={16} 
                    color={item.isSynced ? CoffeeColors.GREEN : CoffeeColors.ACCENT} 
                />
                <Text style={[styles.cellText, { color: item.isSynced ? CoffeeColors.GREEN : CoffeeColors.ACCENT, marginLeft: 4 }]}>
                    {item.isSynced ? 'Synced' : 'Pending'}
                </Text>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
                <Text style={styles.loadingText}>Loading data and checking sync status...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            
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
                placeholder="Search by recorder name or record ID..."
                value={searchTerm}
                onChangeText={setSearchTerm}
            />

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <View style={styles.pickerWrap}>
                    <Picker selectedValue={filterBlock} onValueChange={setFilterBlock}>
                        {BLOCK_OPTIONS.map(b => <Picker.Item key={b} label={b} value={b} />)}
                    </Picker>
                </View>
                <View style={styles.pickerWrap}>
                    <Picker selectedValue={filterGrade} onValueChange={setFilterGrade}>
                        {GRADE_OPTIONS.map(g => <Picker.Item key={g} label={g} value={g} />)}
                    </Picker>
                </View>
                <View style={styles.pickerWrap}>
                    <Picker selectedValue={filterStatus} onValueChange={setFilterStatus}>
                        {SYNC_STATUS_OPTIONS.map(s => <Picker.Item key={s} label={s} value={s} />)}
                    </Picker>
                </View>
            </View>

            {/* Export Button */}
            <TouchableOpacity 
                style={styles.exportButton} 
                onPress={exportToExcel}
                disabled={filteredData.length === 0}
            >
                <Ionicons name="download-outline" size={18} color={CoffeeColors.WHITE} />
                <Text style={styles.exportText}>Export {filteredData.length} Records to CSV</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={[styles.row, styles.headerRow]}>
                <Text style={styles.headerCell}>Grade</Text>
                <Text style={styles.headerCell}>Weight</Text>
                <Text style={styles.headerCell}>Block</Text>
                <Text style={styles.headerCell}>Date</Text>
                <Text style={styles.headerCell}>Status</Text>
            </View>

            {/* Data Rows */}
            <FlatList
                data={filteredData}
                renderItem={renderRow}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                ListEmptyComponent={<Text style={styles.emptyText}>No harvest records found matching your filters.</Text>}
            />
        </View>
    );
}

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
    syncedRow: {
        borderLeftWidth: 5,
        borderLeftColor: CoffeeColors.GREEN,
    },
    pendingRow: {
        borderLeftWidth: 5,
        borderLeftColor: CoffeeColors.ACCENT, // Using accent color for pending
    },
    cell: {
        flex: 1,
        color: CoffeeColors.GRAY_TEXT,
        textAlign: 'center',
        fontSize: 12,
        alignSelf: 'center',
    },
    statusCell: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellText: {
        fontSize: 12,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: CoffeeColors.MEDIUM_BROWN,
        fontStyle: 'italic',
    }
});






// // src/features/harvest/screens/HarvestSummaryScreen.js

// import React, { useState, useEffect, useCallback } from 'react';
// import { 
//   View, 
//   Text, 
//   FlatList, 
//   TouchableOpacity, 
//   StyleSheet, 
//   Alert, 
//   ActivityIndicator,
//   TextInput
// } from 'react-native';
// // Note: You may need to install these packages:
// // npm install @react-native-community/netinfo @react-native-picker/picker
// import NetInfo from "@react-native-community/netinfo";
// import { Picker } from "@react-native-picker/picker";
// import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing';
// import { Ionicons } from '@expo/vector-icons';

// import CoffeeColors from '../../../theme/colors';
// import { 
//   fetchAllHarvestRecords, 
//   getUnsyncedRecords, 
//   syncAllRecords 
// } from '../../../services/harvestRecord';

// // --- Constants for Filters ---
// const BLOCK_OPTIONS = ["All Blocks", "Block A-1", "Block B-2", "Block C-3"];
// const GRADE_OPTIONS = ["All Grades", "Grade 1", "Grade 2", "Grade 3"];
// const SYNC_STATUS_OPTIONS = ["All Statuses", "Synced", "Pending"];

// export default function HarvestSummaryScreen({ route }) {
//   const [allRecords, setAllRecords] = useState([]);
//   const [filteredData, setFilteredData] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [syncStatus, setSyncStatus] = useState("Checking connectivity and syncing...");
  
//   // Filter States
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterBlock, setFilterBlock] = useState(BLOCK_OPTIONS[0]);
//   const [filterGrade, setFilterGrade] = useState(GRADE_OPTIONS[0]);
//   const [filterStatus, setFilterStatus] = useState(SYNC_STATUS_OPTIONS[0]);

//   /**
//    * Primary function to fetch, sync, and combine all data sources.
//    */
//   const loadAndSyncData = useCallback(async () => {
//     setIsLoading(true);
//     let finalRecords = [];
//     let remoteRecords = [];
//     let localRecords = [];

//     // 1. Check Internet Connectivity
//     const netState = await NetInfo.fetch();
//     const isConnected = netState.isConnected && netState.isInternetReachable;

//     if (isConnected) {
//       setSyncStatus("Online: Initiating data synchronization.");
      
//       // 2. Attempt Sync
//       const syncResult = await syncAllRecords();
//       if (syncResult.totalCount > 0) {
//         setSyncStatus(`Sync complete! ${syncResult.syncedCount} of ${syncResult.totalCount} records uploaded.`);
//       } else {
//         setSyncStatus("Online: No pending records to sync.");
//       }
      
//       // 3. Fetch Remote Data
//       const remoteResponse = await fetchAllHarvestRecords();
//       if (remoteResponse.success && Array.isArray(remoteResponse.remoteData)) {
//         // Map remote data and flag them as Synced
//         remoteRecords = remoteResponse.remoteData.map(r => ({
//           ...r,
//           id: r.id || r.cherry_color, // Use API ID or fallback
//           grade: r.crop_type || "N/A", // API field assumed mapping
//           weight: `${r.quantity_harvest} kg`,
//           date: r.date_of_harvest,
//           isSynced: true,
//           // Other UI fields that need mapping will rely on local data structure
//         }));
//       }
//     } else {
//       setSyncStatus("Offline Mode: Data saved locally. Sync will occur when online.");
//     }
    
//     // 4. Fetch Local Data (always fetch, regardless of connectivity)
//     const localResponse = await getUnsyncedRecords();
//     if (localResponse.success && Array.isArray(localResponse.records)) {
//       // Map local data and flag them as Pending
//       localRecords = localResponse.records.map(r => ({
//         ...r,
//         weight: `${r.weight} kg`,
//         date: r.dateReadable || r.date,
//         isSynced: false,
//       }));
//     }

//     // 5. Combine Data: Local (Pending) + Remote (Synced)
//     // We filter out any pending records that might have been synced successfully
//     // (though the syncAllRecords function should handle removal).
//     const localIds = new Set(localRecords.map(r => r.id));
//     const uniqueRemoteRecords = remoteRecords.filter(r => !localIds.has(r.id));
    
//     finalRecords = [...localRecords, ...uniqueRemoteRecords];
    
//     // Sort by date (newest first)
//     finalRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

//     setAllRecords(finalRecords);
//     setIsLoading(false);
//   }, []);

//   // --- Filtering & Searching Logic ---
//   useEffect(() => {
//     let result = allRecords;

//     // 1. Search Filter (by Name or ID)
//     if (searchTerm) {
//       const lowerSearch = searchTerm.toLowerCase();
//       result = result.filter(record => 
//         record.name?.toLowerCase().includes(lowerSearch) ||
//         record.id?.toLowerCase().includes(lowerSearch)
//       );
//     }

//     // 2. Block Filter
//     if (filterBlock !== BLOCK_OPTIONS[0]) {
//       result = result.filter(record => record.block === filterBlock);
//     }

//     // 3. Grade Filter
//     if (filterGrade !== GRADE_OPTIONS[0]) {
//       // Need to handle the potential mismatch in keys (grade vs crop_type)
//       result = result.filter(record => 
//         record.grade === filterGrade || 
//         record.crop_type === filterGrade // Fallback for API data structure
//       );
//     }

//     // 4. Sync Status Filter
//     if (filterStatus === "Synced") {
//       result = result.filter(record => record.isSynced === true);
//     } else if (filterStatus === "Pending") {
//       result = result.filter(record => record.isSynced === false);
//     }

//     setFilteredData(result);
//   }, [allRecords, searchTerm, filterBlock, filterGrade, filterStatus]);

//   // Initial load and forced refresh check
//   useEffect(() => {
//     loadAndSyncData();
//   }, [loadAndSyncData]);

//   // Check for refresh request from form screen
//   useEffect(() => {
//     if (route.params?.shouldRefresh) {
//       loadAndSyncData();
//       // Clear the parameter so it doesn't trigger on every focus
//       navigation.setParams({ shouldRefresh: false }); 
//     }
//   }, [route.params?.shouldRefresh, loadAndSyncData]);


//   // --- Export Functionality (Updated to use filtered data) ---
//   const convertToCSV = (rows) => {
//     const header = ['Id', 'Grade', 'Weight', 'Block', 'Cherry Colour', 'Date', 'Name', 'Amount Paid', 'Sync Status'];
//     const csvRows = [header.join(',')];

//     rows.forEach((row) => {
//       const values = [
//         row.id,
//         row.grade || row.crop_type, 
//         row.weight.replace(' kg', ''), // Remove kg for Excel number format
//         row.block,
//         row.cherryColor || 'N/A',
//         row.date,
//         row.name || 'N/A',
//         row.amountPaid || '0',
//         row.isSynced ? 'Synced' : 'Pending',
//       ];
//       csvRows.push(values.map(v => `"${v}"`).join(',')); // Quote values for CSV safety
//     });

//     return csvRows.join('\n');
//   };

//   const exportToExcel = async () => {
//     if (filteredData.length === 0) {
//         Alert.alert("Export Failed", "There is no data to export.");
//         return;
//     }
//     try {
//       const csv = convertToCSV(filteredData);
//       const fileUri = FileSystem.documentDirectory + 'harvest_summary.csv';

//       await FileSystem.writeAsStringAsync(fileUri, csv, {
//         encoding: FileSystem.EncodingType.UTF8,
//       });

//       if (!(await Sharing.isAvailableAsync())) {
//         Alert.alert('Error', 'Sharing is not available on this device');
//         return;
//       }

//       await Sharing.shareAsync(fileUri);
//     } catch (error) {
//       Alert.alert('Export Failed', error.message);
//     }
//   };

//   const renderRow = ({ item }) => (
//     <View style={[styles.row, item.isSynced ? styles.syncedRow : styles.pendingRow]}>
//       <Text style={styles.cell}>{item.grade || item.crop_type || 'N/A'}</Text>
//       <Text style={styles.cell}>{item.weight}</Text>
//       <Text style={styles.cell}>{item.block}</Text>
//       <Text style={styles.cell}>{item.date}</Text>
//       <View style={styles.statusCell}>
//         <Ionicons 
//             name={item.isSynced ? "cloud-done" : "cloud-upload-outline"} 
//             size={16} 
//             color={item.isSynced ? CoffeeColors.GREEN : CoffeeColors.ACCENT} 
//         />
//         <Text style={[styles.cellText, { color: item.isSynced ? CoffeeColors.GREEN : CoffeeColors.ACCENT, marginLeft: 4 }]}>
//             {item.isSynced ? 'Synced' : 'Pending'}
//         </Text>
//       </View>
//     </View>
//   );

//   if (isLoading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
//         <Text style={styles.loadingText}>Loading data and checking sync status...</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
      
//       {/* Sync Status Banner */}
//       <View style={styles.syncBanner}>
//         <Text style={styles.syncText}>{syncStatus}</Text>
//         <TouchableOpacity onPress={loadAndSyncData} style={{ marginLeft: 10 }}>
//             <Ionicons name="reload-circle-sharp" size={24} color={CoffeeColors.WHITE} />
//         </TouchableOpacity>
//       </View>

//       {/* Search Bar */}
//       <TextInput
//         style={styles.searchBar}
//         placeholder="Search by recorder name or record ID..."
//         value={searchTerm}
//         onChangeText={setSearchTerm}
//       />

//       {/* Filters */}
//       <View style={styles.filtersContainer}>
//         <View style={styles.pickerWrap}>
//           <Picker selectedValue={filterBlock} onValueChange={setFilterBlock}>
//             {BLOCK_OPTIONS.map(b => <Picker.Item key={b} label={b} value={b} />)}
//           </Picker>
//         </View>
//         <View style={styles.pickerWrap}>
//           <Picker selectedValue={filterGrade} onValueChange={setFilterGrade}>
//             {GRADE_OPTIONS.map(g => <Picker.Item key={g} label={g} value={g} />)}
//           </Picker>
//         </View>
//         <View style={styles.pickerWrap}>
//           <Picker selectedValue={filterStatus} onValueChange={setFilterStatus}>
//             {SYNC_STATUS_OPTIONS.map(s => <Picker.Item key={s} label={s} value={s} />)}
//           </Picker>
//         </View>
//       </View>

//       {/* Export Button */}
//       <TouchableOpacity 
//         style={styles.exportButton} 
//         onPress={exportToExcel}
//         disabled={filteredData.length === 0}
//       >
//         <Ionicons name="download-outline" size={18} color={CoffeeColors.WHITE} />
//         <Text style={styles.exportText}>Export {filteredData.length} Records to CSV</Text>
//       </TouchableOpacity>

//       {/* Header */}
//       <View style={[styles.row, styles.headerRow]}>
//         <Text style={styles.headerCell}>Grade</Text>
//         <Text style={styles.headerCell}>Weight</Text>
//         <Text style={styles.headerCell}>Block</Text>
//         <Text style={styles.headerCell}>Date</Text>
//         <Text style={styles.headerCell}>Status</Text>
//       </View>

//       {/* Data Rows */}
//       <FlatList
//         data={filteredData}
//         renderItem={renderRow}
//         keyExtractor={(item, index) => item.id || index.toString()}
//         ListEmptyComponent={<Text style={styles.emptyText}>No harvest records found matching your filters.</Text>}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: CoffeeColors.LIGHT_GRAY,
//     padding: 10,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: CoffeeColors.LIGHT_GRAY,
//   },
//   loadingText: {
//     marginTop: 10,
//     color: CoffeeColors.DARK_BROWN,
//   },
//   syncBanner: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     backgroundColor: CoffeeColors.DARK_BROWN,
//     padding: 8,
//     borderRadius: 8,
//     marginBottom: 10,
//   },
//   syncText: {
//     color: CoffeeColors.CREAM,
//     fontSize: 12,
//     flexShrink: 1,
//   },
//   searchBar: {
//     backgroundColor: CoffeeColors.WHITE,
//     padding: 10,
//     borderRadius: 8,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: CoffeeColors.LIGHT_BROWN,
//   },
//   filtersContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 10,
//   },
//   pickerWrap: {
//     flex: 1,
//     marginHorizontal: 4,
//     backgroundColor: CoffeeColors.WHITE,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: CoffeeColors.LIGHT_BROWN,
//     overflow: 'hidden',
//   },
//   exportButton: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: CoffeeColors.MEDIUM_BROWN,
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 10,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   exportText: {
//     color: CoffeeColors.WHITE,
//     fontWeight: '700',
//     marginLeft: 8,
//   },
//   row: {
//     flexDirection: 'row',
//     backgroundColor: CoffeeColors.WHITE,
//     marginBottom: 5,
//     borderRadius: 6,
//     paddingVertical: 10,
//     paddingHorizontal: 5,
//     justifyContent: 'space-between',
//   },
//   headerRow: {
//     backgroundColor: CoffeeColors.DARK_BROWN,
//     marginBottom: 8,
//     borderRadius: 6,
//   },
//   headerCell: {
//     flex: 1,
//     fontWeight: '700',
//     color: CoffeeColors.CREAM,
//     textAlign: 'center',
//     fontSize: 12,
//   },
//   syncedRow: {
//     borderLeftWidth: 5,
//     borderLeftColor: CoffeeColors.GREEN,
//   },
//   pendingRow: {
//     borderLeftWidth: 5,
//     borderLeftColor: CoffeeColors.ACCENT, // Using accent color for pending
//   },
//   cell: {
//     flex: 1,
//     color: CoffeeColors.GRAY_TEXT,
//     textAlign: 'center',
//     fontSize: 12,
//     alignSelf: 'center',
//   },
//   statusCell: {
//     flex: 1,
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   cellText: {
//     fontSize: 12,
//   },
//   emptyText: {
//     textAlign: 'center',
//     marginTop: 20,
//     color: CoffeeColors.MEDIUM_BROWN,
//     fontStyle: 'italic',
//   }
// });
