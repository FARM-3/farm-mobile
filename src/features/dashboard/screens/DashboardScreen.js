import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, LogBox } from 'react-native';
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
import { getUnsyncedRecords } from '../../../services/harvestRecord';
import { getPendingFieldOpsCount } from '../../../services/fieldOpsService';
import { getPendingBlocksCount } from '../../../services/blocksSyncService';
import { runAutoSync } from '../../../services/autoSyncService';
import BottomNav from '../../../components/BottomNav';
import LogoutConfirmModal from '../../../components/LogoutConfirmModal';
import { getCurrentWeather, isWeatherDataStale } from '../../../services/WeatherService';
import { fetchActivities } from '../../../services/ActivityService';
import {
  fetchAssignedTasks,
  getAllLocalSubmissions,
  normalizeTaskStatus,
  isTaskNotStarted,
  isTaskIncomplete,
} from '../../../services/taskService';
import { setSessionActive } from '../../../services/sessionService';

// Primary brown color and its shades
const PRIMARY_BROWN = CoffeeColors.PRIMARY_BROWN;
const DARK_BROWN = CoffeeColors.DARK_BROWN;
const VERY_LIGHT_BROWN = CoffeeColors.VERY_LIGHT_BROWN;

const HEADER_HEIGHT = 210; // Brown header — must match actual header height so scroll content clears it

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
  const [taskCounts, setTaskCounts] = useState({ total: 0, notStarted: 0, incomplete: 0, completed: 0 });

  // Weather state
  const [weather, setWeather] = useState({
    location: 'Kampala',
    temperature: 24,
    condition: 'Partly Cloudy',
    humidity: 76,
    icon: 'partly-sunny',
    loading: true,
  });


  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserName();
      loadDashboardData();
      loadSyncStatus();
      loadWeatherData();
      loadTaskCounts();
    });
    return unsubscribe;
  }, [navigation]);

  // Auto-refresh weather every 30 minutes
  useEffect(() => {
    loadWeatherData();

    const weatherRefreshInterval = setInterval(() => {
      console.log('[Dashboard] Auto-refreshing weather data...');
      loadWeatherData();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(weatherRefreshInterval);
  }, []);

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

      // Fetch recent activities using ActivityService
      let recentActivities = [];
      try {
        const activitiesResponse = await fetchActivities(10);
        if (activitiesResponse.success) {
          recentActivities = activitiesResponse.activities;
          console.log('[Dashboard] Fetched activities:', recentActivities.length);
        }
      } catch (activityError) {
        console.warn('[Dashboard] Could not fetch activities:', activityError.message);
      }

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
        activities: recentActivities,
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
      const fieldOpsPending = await getPendingFieldOpsCount();
      const blocksPending = await getPendingBlocksCount();
      setSyncStatus({ pending: records.length + fieldOpsPending + blocksPending });
    } catch (error) {
      console.error('[Dashboard] Error loading sync status:', error);
    }
  };

  const loadWeatherData = async () => {
    try {
      console.log('[Dashboard] Loading weather data...');
      setWeather(prev => ({ ...prev, loading: true }));

      const weatherData = await getCurrentWeather();

      setWeather({
        location: weatherData.location,
        country: weatherData.country,
        temperature: weatherData.temperature,
        condition: weatherData.condition,
        description: weatherData.description,
        humidity: weatherData.humidity,
        icon: weatherData.icon,
        windSpeed: weatherData.windSpeed,
        timestamp: weatherData.timestamp,
        isFallback: weatherData.isFallback,
        loading: false,
      });

      console.log('[Dashboard] Weather loaded:', `${weatherData.location} - ${weatherData.temperature}°C`);
    } catch (error) {
      console.error('[Dashboard] Error loading weather:', error);
      setWeather(prev => ({ ...prev, loading: false }));
    }
  };

  const loadTaskCounts = async () => {
    try {
      console.log('[Dashboard] Loading task counts...');
      const { success, tasks } = await fetchAssignedTasks();
      const { submissions: localSubmissions } = await getAllLocalSubmissions();

      if (success && tasks) {
        const merged = tasks.map(t => {
          const local = localSubmissions.find(s => s.assigned_task_id === t.id);
          return local ? { ...t, submission_status: local.status } : t;
        });
        const total = merged.length;
        const notStarted = merged.filter(isTaskNotStarted).length;
        const incomplete = merged.filter(isTaskIncomplete).length;
        const completed = merged.filter(t => normalizeTaskStatus(t.submission_status) === 'completed').length;

        setTaskCounts({ total, notStarted, incomplete, completed });
        console.log('[Dashboard] Task counts:', { total, notStarted, incomplete, completed });
      }
    } catch (error) {
      console.error('[Dashboard] Error loading task counts:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await runAutoSync({ silent: false });
      if (result.skipped && result.reason === 'offline') {
        Alert.alert('Offline', 'Connect to the internet to sync records.');
      } else       if (result.success) {
        const fo = result.results?.fieldOps?.synced || 0;
        Alert.alert('Sync complete', fo
          ? `All pending records uploaded (${fo} field ops synced).`
          : 'All pending records were uploaded where possible.');
      } else {
        Alert.alert('Sync Failed', result.error || 'Could not sync records.');
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
      console.log('[Dashboard] Starting logout process...');

      setSessionActive(false);

      // Clear all authentication tokens and data
      await AuthService.logout();
      console.log('[Dashboard] Tokens cleared');

      // Remove welcome screen flag
      await AsyncStorage.removeItem('hasSeenWelcome');
      console.log('[Dashboard] Welcome flag removed');

      // Reset navigation stack to Welcome screen
      // This prevents back button from accessing authenticated screens
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
      console.log('[Dashboard] Navigation reset to Welcome screen');
    } catch (error) {
      console.error('[Dashboard] Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleCancelLogout = () => {
    setLogoutModalVisible(false);
  };

  const quickActions = [
    {
      label: 'Record Harvest',
      sublabel: 'Estate Harvest',
      color: PRIMARY_BROWN,
      screen: 'HarvestForm',
    },
    {
      label: 'Bought Coffee',
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
      label: 'Blocks',
      sublabel: 'Field data',
      color: PRIMARY_BROWN,
      screen: 'BlockSummary'
    },
    {
      label: 'Field Ops',
      sublabel: 'Activities & surveillance',
      color: PRIMARY_BROWN,
      screen: 'FieldOps'
    },
    {
      label: 'Scan Lot',
      sublabel: 'QR trace history',
      color: PRIMARY_BROWN,
      screen: 'ScanLotTrace',
    },
  ];

  if (lastRecords.loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[DARK_BROWN, '#7a3f1a', '#8B4513']} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeText}>FM</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>FMIS</Text>
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
    <View style={{ flex: 1, backgroundColor: '#faf8f3' }}>
      <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        {/* Header with Bottom Curve */}
        <LinearGradient
          colors={[DARK_BROWN, '#7a3f1a', '#8B4513']}
          style={styles.header}
        >
          {/* Top Content */}
          <View style={styles.headerTopContent}>
            <View style={styles.headerGreeting}>
              <View style={styles.rugyeyoContainer}>
                <View style={styles.logoBadge}>
                  <Text style={styles.logoBadgeText}>FM</Text>
                </View>
                <Text style={styles.rugyeyoText}>FMIS</Text>
              </View>

              <Text style={styles.helloLine} numberOfLines={1}>
                Hello, {userName}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.taskButton}
                onPress={() => navigation.navigate('TaskCalendar')}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text style={styles.taskButtonLabel}>Tasks</Text>
                {taskCounts.notStarted > 0 && (
                  <View style={styles.taskBadge}>
                    <Text style={styles.taskBadgeText}>{taskCounts.notStarted}</Text>
                  </View>
                )}
              </TouchableOpacity>
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
      </View>

      {/* Weather card sits on top of brown header */}
      <View style={styles.weatherOverlay}>
        <TouchableOpacity style={styles.weatherCard} onPress={loadWeatherData} activeOpacity={0.7}>
          <View style={styles.weatherContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.weatherLocation}>
                {weather.loading ? 'Loading...' : `${weather.location}${weather.country ? ', ' + weather.country : ''}`}
              </Text>
              <Text style={styles.weatherTemp}>
                {weather.loading ? '--°C' : `${weather.temperature}°C`}
              </Text>
              <Text style={styles.weatherCondition}>
                {weather.loading ? 'Fetching weather...' : `${weather.condition} • Humidity ${weather.humidity}%`}
              </Text>
              {weather.isFallback && !weather.loading && (
                <Text style={styles.weatherFallbackNote}>Tap to refresh</Text>
              )}
            </View>
            <LinearGradient colors={['#f5e6d3', '#e8d5c4']} style={styles.weatherIcon}>
              {weather.loading ? (
                <ActivityIndicator size="small" color={PRIMARY_BROWN} />
              ) : (
                <Ionicons name={weather.icon} size={28} color={PRIMARY_BROWN} />
              )}
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollViewContent, { paddingTop: HEADER_HEIGHT + 52, paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
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
                <Text style={styles.statLabel}>Tasks</Text>
                <Text style={styles.statValue}>{taskCounts.incomplete}</Text>
                <Text style={[styles.statChange, { color: PRIMARY_BROWN }]}>
                  {taskCounts.completed} done · {taskCounts.total} total
                </Text>
              </View>
              <View style={[styles.statIcon, { backgroundColor: VERY_LIGHT_BROWN }]}>
                <Ionicons name="checkmark-done" size={22} color={DARK_BROWN} />
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
          <TouchableOpacity onPress={loadDashboardData}>
            <Text style={styles.viewAllText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentActivityCard}>
          {/* Recent Activities from Backend */}
          {lastRecords.activities && lastRecords.activities.length > 0 ? (
            lastRecords.activities.map((activity, index) => (
              <View key={activity.id || index}>
                <View style={styles.activityItem}>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {activity.object_repr || 'Activity'} - {activity.action}
                    </Text>
                    <Text style={styles.activitySubtitle}>
                      By: <Text style={{ fontWeight: '600' }}>{activity.user_name || 'Unknown User'}</Text>
                    </Text>
                    <Text style={[styles.activityTime, { color: PRIMARY_BROWN }]}>
                      {getTimeAgo(activity.timestamp)}
                    </Text>
                  </View>
                </View>
                {index < lastRecords.activities.length - 1 && (
                  <View style={styles.activityDivider} />
                )}
              </View>
            ))
          ) : (
            <View style={styles.activityItem}>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>No recent activity</Text>
                <Text style={styles.activitySubtitle}>Start by recording harvests or adding farmers</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      </View>

      {/* BottomNav now part of layout, not floating */}
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
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  header: {
    paddingTop: 44,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
    marginBottom: 8,
  },
  rugyeyoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  headerLogo: {
    width: 80,
    height: 80,
  },
  rugyeyoText: {
    fontSize: Fonts.sizes.large,
    fontWeight: Fonts.weights.bold,
    fontFamily: Fonts.bold,
    color: '#fff',
    flexShrink: 0,
  },
  headerGreeting: {
    flex: 1,
    marginRight: 12,
  },
  helloLine: {
    fontSize: Fonts.sizes.large,
    lineHeight: 26,
    color: '#fff',
    fontFamily: Fonts.semiBold,
    fontWeight: Fonts.weights.semiBold,
    marginTop: 2,
    paddingRight: 4,
  },
  taskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 4,
    flexShrink: 0,
    marginLeft: 4,
  },
  taskButtonLabel: {
    color: '#fff',
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.semiBold,
    fontFamily: Fonts.semiBold,
  },
  taskBadge: {
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
  taskBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Fonts.bold,
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
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
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
  weatherOverlay: {
    position: 'absolute',
    top: HEADER_HEIGHT - 48,
    left: 20,
    right: 20,
    zIndex: 1001,
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 120,
  },
  weatherCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
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
    fontSize: Fonts.sizes.xxlarge,
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
  weatherFallbackNote: {
    fontSize: 10,
    color: CoffeeColors.PRIMARY_BROWN,
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    marginTop: 4,
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
    marginTop: 36,
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