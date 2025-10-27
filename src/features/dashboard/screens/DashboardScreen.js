import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, LogBox, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Suppress all console logs and warnings from appearing on the UI
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews',
  '[ApiService]',
  'Network Error',
]);
LogBox.ignoreAllLogs(true);

import Fonts from '../../../theme/fonts';
import CoffeeColors from '../../../theme/colors';
import { fetchFarmers, fetchHarvests } from '../../../services/aggregationService';
import { fetchAllHarvestRecords } from '../../../services/harvestRecord';
import AuthService from '../../../services/AuthService';
import SyncService from '../../../services/SyncService';
import { syncAllRecords, getUnsyncedRecords } from '../../../services/harvestRecord';
import BottomNav from '../../../components/BottomNav';
import LogoutConfirmModal from '../../../components/LogoutConfirmModal';

// Primary brown color and its shades
const PRIMARY_BROWN = CoffeeColors.PRIMARY_BROWN;
const DARK_BROWN = CoffeeColors.DARK_BROWN;
const VERY_LIGHT_BROWN = CoffeeColors.VERY_LIGHT_BROWN;

const HEADER_HEIGHT = 330; // Header + Weather card height
const SCROLL_THRESHOLD = 50; // Minimum scroll distance to trigger hide/show

const DashboardScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('User');
  const [lastRecords, setLastRecords] = useState({
    aggregationFarmer: null,
    aggregationHarvest: null,
    harvest: null,
    block: null,
    loading: true,
  });

  const [stats, setStats] = useState({
    farmers: 0,
    harvests: 0,
    blocks: 0,
    processing: 0,
  });

  const [syncStatus, setSyncStatus] = useState({ pending: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Animation values for header collapse
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserName();
      loadDashboardData();
      loadSyncStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserName = async () => {
    try {
      const response = await AuthService.getCurrentUser();
      const user = response.user || response;
      if (user && user.name) {
        setUserName(user.name);
      } else if (user && user.first_name) {
        setUserName(user.first_name);
      } else if (user && user.username) {
        setUserName(user.username);
      }
      console.log('[Dashboard] User loaded:', user?.name || user?.first_name || 'User');
    } catch (error) {
      console.error('[Dashboard] Error loading user name:', error);
      setUserName('User');
    }
  };

  const loadDashboardData = async () => {
    try {
      const farmersResponse = await fetchFarmers();
      const farmers = farmersResponse.success ? farmersResponse.farmers : [];
      const harvestsResponse = await fetchHarvests();
      const harvests = harvestsResponse.success ? harvestsResponse.harvests : [];
      const productionResponse = await fetchAllHarvestRecords();
      const blocksData = await AsyncStorage.getItem('blocks_sync_queue');
      const blocks = blocksData ? JSON.parse(blocksData) : [];

      setStats({
        farmers: farmers.length,
        harvests: harvests.length,
        blocks: blocks.length,
        processing: 12,
      });

      setLastRecords({
        aggregationFarmer: farmers[0] || null,
        aggregationHarvest: harvests[0] || null,
        harvest: productionResponse.remoteData?.results?.[0] || null,
        block: blocks[0] || null,
        loading: false,
      });
    } catch (error) {
      console.error('[Dashboard] Error loading data:', error);
      setLastRecords(prev => ({ ...prev, loading: false }));
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const loadSyncStatus = async () => {
    try {
      const { records } = await getUnsyncedRecords();
      setSyncStatus({ pending: records.length });
    } catch (error) {
      console.error('[Dashboard] Error loading sync status:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncAllRecords();

      if (result.totalCount === 0) {
        Alert.alert('Nothing to Sync', 'All harvest records are already synced.');
      } else if (result.syncedCount > 0 && result.syncedCount < result.totalCount) {
        Alert.alert(
          'Partial Sync',
          `Synced ${result.syncedCount} of ${result.totalCount} records. Some records failed to sync.`
        );
      } else if (result.syncedCount === 0 && result.totalCount > 0) {
        Alert.alert(
          'Sync Failed',
          'Could not sync records. Please check your internet connection and try again.'
        );
      }
      await loadSyncStatus();
    } catch (error) {
      Alert.alert('Sync Failed', error.message || 'Failed to sync data');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const handleConfirmLogout = async () => {
    setLogoutModalVisible(false);
    try {
      await AuthService.logout();
      await AsyncStorage.removeItem('hasSeenWelcome');
      navigation.navigate('Welcome');
    } catch (error) {
      console.error('[Dashboard] Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const handleCancelLogout = () => {
    setLogoutModalVisible(false);
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const diff = currentScrollY - lastScrollY.current;

        // Only trigger animation if scroll distance exceeds threshold
        if (Math.abs(diff) > SCROLL_THRESHOLD) {
          if (diff > 0 && currentScrollY > HEADER_HEIGHT) {
            // Scrolling down - hide header
            Animated.timing(headerTranslateY, {
              toValue: -HEADER_HEIGHT,
              duration: 250,
              useNativeDriver: true,
            }).start();
          } else if (diff < 0) {
            // Scrolling up - show header
            Animated.timing(headerTranslateY, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }).start();
          }
          lastScrollY.current = currentScrollY;
        }
      },
    }
  );

  const quickActions = [
    {
      label: 'Record Harvest',
      sublabel: 'Own production',
      color: PRIMARY_BROWN,
      screen: 'HarvestForm',
    },
    {
      label: 'Buy Coffee',
      sublabel: 'From farmers',
      color: PRIMARY_BROWN,
      screen: 'Aggregation',
      params: { initialTab: 'harvests' }
    },
    {
      label: 'Add Farmer',
      sublabel: 'New supplier',
      color: PRIMARY_BROWN,
      screen: 'Aggregation',
      params: { initialTab: 'farmers' }
    },
    {
      label: 'Add Block',
      sublabel: 'Field data',
      color: PRIMARY_BROWN,
      screen: 'BlockRegistration'
    }
  ];

  if (lastRecords.loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[DARK_BROWN, '#7a3f1a', '#8B4513']} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarIcon}>
                <Ionicons name="leaf" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Rugyeyo Farm</Text>
                <Text style={styles.headerSubtitle}>Hello, {userName}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_BROWN} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated Header Container */}
      <Animated.View
        style={[
          styles.headerContainer,
          {
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        {/* Header with Bottom Curve */}
        <LinearGradient
          colors={[DARK_BROWN, '#7a3f1a', '#8B4513']}
          style={styles.header}
        >
          {/* Top Content */}
          <View style={styles.headerTopContent}>
            <View style={styles.headerGreeting}>
              {/* Rugyeyo Farm with Logo */}
              <View style={styles.rugyeyoContainer}>
                <Image
                  source={require('../../../assets/rugyeyo_logo.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
                <Text style={styles.rugyeyoText}>Rugyeyo Farm</Text>
              </View>

              {/* Welcome back User */}
              <Text style={styles.headerMainText}>
                <Text style={styles.headerBold}>Hello, </Text>
                <Text style={styles.headerLight}>{userName}</Text>
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleSync}
                disabled={isSyncing}
              >
                <Ionicons
                  name={isSyncing ? "sync" : "cloud-upload-outline"}
                  size={20}
                  color="#fff"
                />
                {syncStatus.pending > 0 && (
                  <View style={styles.syncBadge}>
                    <Text style={styles.syncBadgeText}>{syncStatus.pending}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Subtitle */}
          <Text style={styles.headerSubtitle}>Track your farm operations and performance</Text>
        </LinearGradient>

        {/* Weather Widget */}
        <View style={styles.weatherCardContainer}>
          <View style={styles.weatherCard}>
            <View style={styles.weatherContent}>
              <View>
                <Text style={styles.weatherLocation}>Kampala, Central Region</Text>
                <Text style={styles.weatherTemp}>24°C</Text>
                <Text style={styles.weatherCondition}>Partly Cloudy • Humidity 76%</Text>
              </View>
              <LinearGradient colors={['#f5e6d3', '#e8d5c4']} style={styles.weatherIcon}>
                <Ionicons name="partly-sunny" size={28} color={PRIMARY_BROWN} />
              </LinearGradient>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={[styles.scrollViewContent, { paddingTop: HEADER_HEIGHT + 60 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Total Farmers</Text>
                <Text style={styles.statValue}>{stats.farmers}</Text>
                <Text style={styles.statChange}>+12 this month</Text>
              </View>
              <View style={[styles.statIcon, { backgroundColor: VERY_LIGHT_BROWN }]}>
                <Ionicons name="people" size={22} color={DARK_BROWN} />
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Harvests</Text>
                <Text style={styles.statValue}>{stats.harvests}</Text>
                <Text style={[styles.statChange, { color: PRIMARY_BROWN }]}>Last: 45m ago</Text>
              </View>
              <View style={[styles.statIcon, { backgroundColor: VERY_LIGHT_BROWN }]}>
                <Ionicons name="cube" size={22} color={DARK_BROWN} />
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Active Blocks</Text>
                <Text style={styles.statValue}>{stats.blocks}</Text>
                <Text style={[styles.statChange, { color: PRIMARY_BROWN }]}>8.5 hectares</Text>
              </View>
              <View style={[styles.statIcon, { backgroundColor: VERY_LIGHT_BROWN }]}>
                <Ionicons name="grid" size={22} color={DARK_BROWN} />
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>Processing</Text>
                <Text style={styles.statValue}>{stats.processing}</Text>
                <Text style={[styles.statChange, { color: PRIMARY_BROWN }]}>3 batches today</Text>
              </View>
              <View style={[styles.statIcon, { backgroundColor: VERY_LIGHT_BROWN }]}>
                <Ionicons name="cafe" size={22} color={DARK_BROWN} />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickActionButton}
              onPress={() => {
                if (action.params) {
                  navigation.navigate(action.screen, action.params);
                } else {
                  navigation.navigate(action.screen);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.quickActionLabel}>{action.label}</Text>
              <Text style={styles.quickActionSublabel}>{action.sublabel}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentActivityCard}>
          <View style={styles.activityItem}>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New harvest recorded</Text>
              <Text style={styles.activitySubtitle}>150 kg coffee beans from Block A</Text>
              <Text style={[styles.activityTime, { color: PRIMARY_BROWN }]}>45 minutes ago</Text>
            </View>
          </View>

          <View style={styles.activityDivider} />

          <View style={styles.activityItem}>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Farmer registration</Text>
              <Text style={styles.activitySubtitle}>John Mugisha added to network</Text>
              <Text style={[styles.activityTime, { color: PRIMARY_BROWN }]}>2 hours ago</Text>
            </View>
          </View>

          <View style={styles.activityDivider} />

          <View style={styles.activityItem}>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Processing completed</Text>
              <Text style={styles.activitySubtitle}>Batch #247 - Drying stage finished</Text>
              <Text style={[styles.activityTime, { color: PRIMARY_BROWN }]}>5 hours ago</Text>
            </View>
          </View>

          <View style={styles.activityDivider} />

          <View style={styles.activityItem}>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Quality check completed</Text>
              <Text style={styles.activitySubtitle}>Grade A certification • by Sarah</Text>
              <Text style={[styles.activityTime, { color: PRIMARY_BROWN }]}>7 hours ago</Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      <BottomNav activeScreen="Dashboard" />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        visible={logoutModalVisible}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8f3',
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf8f3',
  },
  loadingText: {
    marginTop: 12,
    fontSize: Fonts.sizes.regular,
    color: PRIMARY_BROWN,
    fontWeight: Fonts.weights.semiBold,
    fontFamily: Fonts.semiBold,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 80,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: PRIMARY_BROWN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'visible',
  },
  headerTopContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  rugyeyoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 1,
  },
  headerLogo: {
    width: 100,
    height: 100,
  },
  rugyeyoText: {
    fontSize: Fonts.sizes.massive,
    fontWeight: Fonts.weights.bold,
    fontFamily: Fonts.bold,
    color: '#fff',
    maxWidth: '70%',
  },
  headerGreeting: {
    flex: 1,
    marginRight: 12,
  },
  headerMainText: {
    fontSize: Fonts.sizes.huge,
    lineHeight: 36,
    color: '#fff',
    fontFamily: Fonts.regular,
  },
  headerBold: {
    fontWeight: Fonts.weights.bold,
    fontSize: Fonts.sizes.huge,
    fontFamily: Fonts.bold,
  },
  headerLight: {
    fontWeight: Fonts.weights.regular,
    fontSize: Fonts.sizes.huge,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: Fonts.regular,
  },
  headerSubtitle: {
    fontSize: Fonts.sizes.small,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 0,
    fontWeight: Fonts.weights.regular,
    fontFamily: Fonts.regular,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  syncBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  syncBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  weatherCardContainer: {
    paddingHorizontal: 20,
    marginTop: -60,
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 120,
  },
  weatherCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: PRIMARY_BROWN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  weatherContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherLocation: {
    fontSize: Fonts.sizes.small,
    color: CoffeeColors.GRAY_TEXT,
    marginBottom: 4,
    fontFamily: Fonts.regular,
  },
  weatherTemp: {
    fontSize: Fonts.sizes.massive,
    fontWeight: Fonts.weights.bold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 4,
    fontFamily: Fonts.bold,
  },
  weatherCondition: {
    fontSize: Fonts.sizes.small,
    color: CoffeeColors.GRAY_TEXT,
    fontFamily: Fonts.regular,
  },
  weatherIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0,
    borderColor: CoffeeColors.VERY_LIGHT_BROWN,
    shadowColor: DARK_BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statTextContainer: {
    flex: 1,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  statLabel: {
    fontSize: Fonts.sizes.tiny,
    color: CoffeeColors.GRAY_TEXT,
    marginBottom: 4,
    fontFamily: Fonts.regular,
  },
  statValue: {
    fontSize: Fonts.sizes.xxlarge,
    fontWeight: Fonts.weights.bold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 2,
    fontFamily: Fonts.bold,
  },
  statChange: {
    fontSize: Fonts.sizes.tiny,
    color: PRIMARY_BROWN,
    marginTop: 2,
    fontFamily: Fonts.regular,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.xlarge,
    fontWeight: Fonts.weights.semiBold,
    color: CoffeeColors.DARK_BROWN,
    fontFamily: Fonts.semiBold,
  },
  viewAllText: {
    fontSize: Fonts.sizes.small,
    color: PRIMARY_BROWN,
    fontWeight: Fonts.weights.semiBold,
    fontFamily: Fonts.semiBold,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: PRIMARY_BROWN,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY_BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
    minHeight: 85,
  },
  quickActionLabel: {
    fontSize: Fonts.sizes.regular,
    fontWeight: Fonts.weights.bold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: Fonts.bold,
  },
  quickActionSublabel: {
    fontSize: Fonts.sizes.small,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    fontFamily: Fonts.regular,
  },
  recentActivityCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: DARK_BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0,
    borderColor: CoffeeColors.VERY_LIGHT_BROWN,
    overflow: 'hidden',
  },
  activityItem: {
    paddingVertical: 4,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: Fonts.sizes.regular,
    fontWeight: Fonts.weights.semiBold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 2,
    fontFamily: Fonts.semiBold,
  },
  activitySubtitle: {
    fontSize: Fonts.sizes.small,
    color: CoffeeColors.GRAY_TEXT,
    marginBottom: 4,
    fontFamily: Fonts.regular,
  },
  activityTime: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.medium,
    fontFamily: Fonts.regular,
  },
  activityDivider: {
    height: 1,
    backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
    marginVertical: 12,
  },
});

export default DashboardScreen;