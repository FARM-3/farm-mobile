import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
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
  const [userName, setUserName] = useState('');

  // Load user name from AsyncStorage
  useEffect(() => {
    const loadUserName = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          // Try different possible name fields from the backend
          const name = user.first_name || user.name || user.username || 'User';
          setUserName(name);
        }
      } catch (error) {
        console.error('[Dashboard] Error loading user name:', error);
      }
    };
    loadUserName();
  }, []);

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

  // Glassmorphic Card component
  const Card = ({ iconName, title, description, time, recorder, color, onPress }) => (
    <TouchableOpacity style={styles.cardContainer} activeOpacity={0.7} onPress={onPress}>
      <BlurView intensity={80} tint="light" style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={28} color={CoffeeColors.DARK_BROWN} />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <Text style={styles.cardDescription}>{description}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardInfo}>{time}</Text>
          <Text style={styles.cardRecorder}>{recorder}</Text>
        </View>
      </BlurView>
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      {/* Very Faded Coffee Background */}
      <ImageBackground
        source={require('../../../assets/roasted-coffee-beans.jpg')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <View style={styles.whiteOverlay} />

        {/* Header */}
        <Header title="Rugyeyo Farm" navigation={navigation} />

        {/* Personalized Greeting */}
        {userName && (
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>Hi, {userName}!</Text>
            <Text style={styles.greetingSubtext}>{getGreeting()}</Text>
          </View>
        )}

        {/* Quick Action Buttons */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionButtonContainer}
            onPress={() => {
              navigation.navigate('Aggregation', {
                screen: 'Aggregation',
                params: { activeTab: 'farmers', viewMode: 'form' }
              });
            }}
            activeOpacity={0.7}
          >
            <BlurView intensity={45} tint="light" style={styles.quickActionButton}>
              <View style={[styles.quickActionIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                <Ionicons name="person-add-outline" size={22} color="#4CAF50" />
              </View>
              <Text style={styles.quickActionText}>Register{'\n'}Farmer</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButtonContainer}
            onPress={() => {
              navigation.navigate('Aggregation', {
                screen: 'Aggregation',
                params: { activeTab: 'harvests', viewMode: 'form' }
              });
            }}
            activeOpacity={0.7}
          >
            <BlurView intensity={45} tint="light" style={styles.quickActionButton}>
              <View style={[styles.quickActionIconContainer, { backgroundColor: 'rgba(255, 152, 0, 0.15)' }]}>
                <Ionicons name="cash-outline" size={22} color="#FF9800" />
              </View>
              <Text style={styles.quickActionText}>Buy{'\n'}Coffee</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButtonContainer}
            onPress={() => navigation.navigate('HarvestForm')}
            activeOpacity={0.7}
          >
            <BlurView intensity={45} tint="light" style={styles.quickActionButton}>
              <View style={[styles.quickActionIconContainer, { backgroundColor: 'rgba(78, 52, 46, 0.15)' }]}>
                <Ionicons name="basket-outline" size={22} color={CoffeeColors.DARK_BROWN} />
              </View>
              <Text style={styles.quickActionText}>Production{'\n'}Harvest</Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
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
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.WHITE,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImageStyle: {
    opacity: 100, // Very faded - almost white
    resizeMode: 'cover',
  },
  whiteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Strong white overlay for almost white appearance
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CoffeeColors.WHITE,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: CoffeeColors.DARK_BROWN,
  },
  greetingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 16,
    backgroundColor: CoffeeColors.WHITE,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.1)',
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  greetingText: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    fontWeight: 'bold',
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 4,
  },
  greetingSubtext: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 10,
  },
  quickActionButtonContainer: {
    flex: 1,
  },
  quickActionButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  quickActionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    fontWeight: '600',
    color: CoffeeColors.DARK_BROWN,
    textAlign: 'center',
    lineHeight: 14,
  },
  scrollViewContent: {
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48%',
    marginBottom: 15,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
    minHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    fontWeight: 'bold',
    color: CoffeeColors.DARK_BROWN,
    textAlign: 'center',
  },
  cardDescription: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: CoffeeColors.GRAY_TEXT,
    marginBottom: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 69, 19, 0.1)',
  },
  cardInfo: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: CoffeeColors.MEDIUM_BROWN,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardRecorder: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: CoffeeColors.GRAY_TEXT,
  },
});

export default DashboardScreen;
