// src/features/harvest/screens/HarvestFormScreen.js

import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
// import CoffeeColors from '../theme/colors';
import CoffeeColors from '../../../theme/colors';

const sampleData = [
  { id: '1', grade: 'Grade 1', weight: '25kg', block: 'A1', cherryColor: 'Red', date: '2025-10-02', name: 'John', amountPaid: '50,000' },
  { id: '2', grade: 'Grade 2', weight: '18kg', block: 'B3', cherryColor: 'Yellow', date: '2025-10-01', name: 'Mary', amountPaid: '36,000' },
  { id: '3', grade: 'Grade 1', weight: '30kg', block: 'C2', cherryColor: 'Red', date: '2025-09-29', name: 'Peter', amountPaid: '60,000' },
];

export default function HarvestSummaryScreen() {
  const [data] = useState(sampleData);

  // Converting JSON -> CSV
  const convertToCSV = (rows) => {
    const header = ['Id', 'Grade', 'Weight', 'Block', 'Cherry Colour', 'Date', 'Name', 'Amount Paid'];
    const csvRows = [header.join(',')];

    rows.forEach((row) => {
      const values = [
        row.id,
        row.grade,
        row.weight,
        row.block,
        row.cherryColor,
        row.date,
        row.name,
        row.amountPaid,
      ];
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  };

  const exportToExcel = async () => {
    try {
      const csv = convertToCSV(data);
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
    <View style={styles.row}>
      <Text style={styles.cell}>{item.grade}</Text>
      <Text style={styles.cell}>{item.weight}</Text>
      <Text style={styles.cell}>{item.block}</Text>
      <Text style={styles.cell}>{item.cherryColor}</Text>
      <Text style={styles.cell}>{item.date}</Text>
      <Text style={styles.cell}>{item.name}</Text>
      <Text style={styles.cell}>{item.amountPaid}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Export Button */}
      <TouchableOpacity style={styles.exportButton} onPress={exportToExcel}>
        <Text style={styles.exportText}>Export to Excel</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={[styles.row, styles.headerRow]}>
        <Text style={styles.headerCell}>Grade</Text>
        <Text style={styles.headerCell}>Weight</Text>
        <Text style={styles.headerCell}>Block</Text>
        <Text style={styles.headerCell}>Cherry</Text>
        <Text style={styles.headerCell}>Date</Text>
        <Text style={styles.headerCell}>Name</Text>
        <Text style={styles.headerCell}>Amount</Text>
      </View>

      {/* Data Rows */}
      <FlatList
        data={data}
        renderItem={renderRow}
        keyExtractor={(item) => item.id}
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
  exportButton: {
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  exportText: {
    color: CoffeeColors.WHITE,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: CoffeeColors.WHITE,
    marginBottom: 5,
    borderRadius: 6,
    padding: 5,
    justifyContent: 'space-between',
  },
  headerRow: {
    backgroundColor: CoffeeColors.DARK_BROWN,
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    color: CoffeeColors.CREAM,
    textAlign: 'center',
    fontSize: 12,
  },
  cell: {
    flex: 1,
    color: CoffeeColors.GRAY_TEXT,
    textAlign: 'center',
    fontSize: 12,
  },
});
