import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CoffeeColors from '../../../theme/colors';
import Header from '../../../components/Header';
import BottomNav from '../../../components/BottomNav';
import { fetchFarmers, fetchHarvests } from '../../../services/aggregationService';
import { fetchAllHarvestRecords } from '../../../services/harvestRecord';

const DashboardScreen = ({ navigation }) => {
  const [lastRecords, setLastRecords] = useState({
    aggregationFarmer: null,
    aggregationHarvest: null,
    harvest: null,
    block: null,
    loading: true
  });

  // Load last records from each module
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadLastRecords();
    });
    return unsubscribe;
  }, [navigation]);

  const loadLastRecords = async () => {
    try {
      // Fetch last Aggregation Farmer record
      const farmersResponse = await fetchFarmers();
      const lastFarmer = farmersResponse.success && farmersResponse.farmers.length > 0
        ? farmersResponse.farmers[0]
        : null;

      // Fetch last Aggregation Harvest record
      const harvestsResponse = await fetchHarvests();
      const lastAggHarvest = harvestsResponse.success && harvestsResponse.harvests.length > 0
        ? harvestsResponse.harvests[0]
        : null;

      // Fetch last Production Harvest record
      const productionResponse = await fetchAllHarvestRecords();
      const lastProduction = productionResponse.success && productionResponse.remoteData?.results?.length > 0
        ? productionResponse.remoteData.results[0]
        : null;

      // Fetch last Block record from AsyncStorage
      const blocksData = await AsyncStorage.getItem('blocks_sync_queue');
      const blocks = blocksData ? JSON.parse(blocksData) : [];
      const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;

      setLastRecords({
        aggregationFarmer: lastFarmer,
        aggregationHarvest: lastAggHarvest,
        harvest: lastProduction,
        block: lastBlock,
        loading: false
      });
    } catch (error) {
      console.error('[Dashboard] Error loading last records:', error);
      setLastRecords(prev => ({ ...prev, loading: false }));
    }
  };

  // Format last record info
  const formatLastRecord = (record, type) => {
    if (!record) return { time: 'No records yet', recorder: 'Start by adding one' };

    try {
      switch (type) {
        case 'farmer':
          return {
            time: new Date(record.created_at || record.date).toLocaleDateString(),
            recorder: `${record.farmer_name || 'Unknown'} • ${record.village || 'N/A'}`
          };
        case 'aggHarvest':
          return {
            time: new Date(record.created_at || record.date).toLocaleDateString(),
            recorder: `${record.farmer_name || 'Unknown'} • ${record.weight || 'N/A'} kg`
          };
        case 'harvest':
          return {
            time: new Date(record.date_of_delivery || record.created_at).toLocaleDateString(),
            recorder: `${record.worker_name || 'Unknown'} • ${record.weight_on_delivery || 'N/A'} kg`
          };
        case 'block':
          return {
            time: new Date(record.date_planted || record.created_at).toLocaleDateString(),
            recorder: `Block ${record.block_id || 'N/A'} • ${record.no_of_trees || '0'} trees`
          };
        default:
          return { time: 'No data', recorder: 'N/A' };
      }
    } catch (error) {
      return { time: 'Invalid date', recorder: 'Error loading data' };
    }
  };

  // Card component
  const Card = ({ iconName, title, description, time, recorder, color, onPress }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Ionicons name={iconName} size={24} color={color} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
      <Text style={styles.cardInfo}>{time}</Text>
      <Text style={styles.cardRecorder}>{recorder}</Text>
    </TouchableOpacity>
  );

  // Placeholder navigation handler for screens not yet added to navigator
  const handleComingSoon = (featureName) => {
    Alert.alert(
      `${featureName} Coming Soon`,
      `The ${featureName} feature is currently under development.`,
      [{ text: 'OK' }]
    );
  };

  if (lastRecords.loading) {
    return (
      <View style={styles.container}>
        <Header title="Rugyeyo Farm" navigation={navigation} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={CoffeeColors.DARK_BROWN} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
        <BottomNav activeScreen="Dashboard" />
      </View>
    );
  }

  const aggHarvestInfo = formatLastRecord(lastRecords.aggregationHarvest, 'aggHarvest');
  const harvestInfo = formatLastRecord(lastRecords.harvest, 'harvest');
  const blockInfo = formatLastRecord(lastRecords.block, 'block');

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header title="Rugyeyo Farm" navigation={navigation} />

      <ScrollView contentContainerStyle={[styles.scrollViewContent, { paddingBottom: 110 }]}>
        <Card
          iconName="people-outline"
          title="Aggregation"
          description="Record farmer details and harvest weights."
          time={aggHarvestInfo.time}
          recorder={aggHarvestInfo.recorder}
          color={CoffeeColors.ACCENT}
          onPress={() => navigation.navigate('Aggregation')}
        />
        <Card
          iconName="leaf-outline"
          title="Harvest"
          description="View and manage recent harvest records."
          time={harvestInfo.time}
          recorder={harvestInfo.recorder}
          color={CoffeeColors.ACCENT}
          onPress={() => navigation.navigate('Harvests')}
        />
        <Card
          iconName="grid-outline"
          title="Blocks"
          description="Manage coffee farm blocks and field data."
          time={blockInfo.time}
          recorder={blockInfo.recorder}
          color={CoffeeColors.ACCENT}
          onPress={() => navigation.navigate('BlockSummary')}
        />
        <Card
          iconName="cube-outline"
          title="Processing"
          description="Track processing stages: washing, drying, hulling."
          time="02:00 PM"
          recorder="Emily"
          color={CoffeeColors.ACCENT}
          onPress={() => navigation.navigate('Processing')}
        />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNav activeScreen="Dashboard" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: CoffeeColors.DARK_BROWN,
  },
  scrollViewContent: {
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    width: '48%',
    elevation: 5,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    minHeight: 180,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: CoffeeColors.DARK_BROWN,
  },
  cardDescription: {
    fontSize: 14,
    color: CoffeeColors.GRAY_TEXT,
    marginBottom: 8,
  },
  cardInfo: {
    fontSize: 12,
    color: CoffeeColors.MEDIUM_BROWN,
    fontWeight: '600',
    marginBottom: 3,
  },
  cardRecorder: {
    fontSize: 11,
    color: CoffeeColors.GRAY_TEXT,
  },
});

export default DashboardScreen;
