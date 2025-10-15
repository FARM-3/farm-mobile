// BlockSummary.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity
} from 'react-native';

const CoffeeColors = { primary: '#4CAF50', secondary: '#333' };

const BlockSummary = ({ navigation }) => {
  const [blocks, setBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBlocks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api-3181.onrender.com/api/blocks/');
      if (response.ok) {
        const data = await response.json();
        // Assuming the API returns an array of block objects
        setBlocks(data);
      } else {
        Alert.alert('Error', 'Failed to fetch block data from the server.');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Network error. Could not connect to the API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch data on component mount
    fetchBlocks();

    // Re-fetch data every time the screen is focused (e.g., after navigating back from the form)
    const unsubscribe = navigation.addListener('focus', () => {
        fetchBlocks();
    });

    return unsubscribe; // Cleanup function
  }, [navigation]);

  const handleAddNewBlock = () => {
    // Navigate to the Block Registration screen (assuming its route name is 'BlockRegistration')
    navigation.navigate('BlockRegistration'); 
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={CoffeeColors.primary} />
        <Text style={styles.loadingText}>Fetching block data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Block Summary</Text>
      
      {/* Navigation Link to Add Block */}
      <TouchableOpacity onPress={handleAddNewBlock} style={styles.navLink}>
        <Text style={styles.navLinkText}>Add New Block ➕</Text>
      </TouchableOpacity>

      {blocks.length === 0 ? (
        <Text style={styles.noData}>No blocks registered yet.</Text>
      ) : (
        <ScrollView horizontal>
          <View>
            {/* Table Header */}
            <View style={styles.row}>
              <Text style={[styles.headerCell, { width: 100 }]}>Block ID</Text>
              <Text style={[styles.headerCell, { width: 80 }]}>Trees</Text>
              <Text style={[styles.headerCell, { width: 120 }]}>Date Planted</Text>
              <Text style={[styles.headerCell, { width: 120 }]}>Coffee Type</Text>
              <Text style={[styles.headerCell, { width: 150 }]}>Seedling Source</Text>
              <Text style={[styles.headerCell, { width: 150 }]}>Fertilizer</Text>
              <Text style={[styles.headerCell, { width: 100 }]}>Pesticides</Text>
            </View>

            {/* Table Rows */}
            {blocks.map((block, index) => (
              <View key={index} style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                <Text style={[styles.dataCell, { width: 100 }]}>{block.block_id || 'N/A'}</Text>
                <Text style={[styles.dataCell, { width: 80 }]}>{block.no_of_trees}</Text>
                <Text style={[styles.dataCell, { width: 120 }]}>{block.date_planted}</Text>
                <Text style={[styles.dataCell, { width: 120 }]}>{block.type_of_coffee}</Text>
                <Text style={[styles.dataCell, { width: 150 }]}>{block.source_of_seedling}</Text>
                <Text style={[styles.dataCell, { width: 150 }]}>{block.fertilizer_list}</Text>
                <Text style={[styles.dataCell, { width: 100 }]}>{block.use_pesticides === 'yes' ? 'Yes' : 'No'}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: CoffeeColors.secondary,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    color: CoffeeColors.secondary,
  },
  navLink: {
    paddingBottom: 10,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignSelf: 'flex-start',
  },
  navLinkText: {
    color: CoffeeColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  noData: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    color: '#999',
  },
  // Table Styles
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerCell: {
    padding: 10,
    fontWeight: 'bold',
    backgroundColor: CoffeeColors.primary,
    color: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
  dataCell: {
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#eee',
    fontSize: 14,
    color: CoffeeColors.secondary,
    textAlign: 'center',
    // flexWrap: 'wrap', // Doesn't work well in fixed-width cells for RN
  },
  evenRow: {
    backgroundColor: '#f9f9f9',
  },
  oddRow: {
    backgroundColor: '#fff',
  },
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
