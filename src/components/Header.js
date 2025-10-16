import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import CoffeeColors from '../theme/colors';
import AuthService from '../services/AuthService';
import SyncService from '../services/SyncService';
import { syncAllRecords, getUnsyncedRecords } from '../services/harvestRecord';

/**
 * Unified Header Component
 * Used across all screens for consistent design
 */
const Header = ({ title = 'Rugyeyo Farm', navigation: propNavigation, onNavigate, showSync = true, showLogout = true }) => {
  // Use either passed navigation prop or hook
  const hookNavigation = useNavigation();
  const route = useRoute();
  const navigation = propNavigation || hookNavigation;
  const [syncStatus, setSyncStatus] = React.useState({ pending: 0 });
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Check if we're on a harvest-related screen
  const isHarvestScreen = route?.name === 'Harvests' || route?.name === 'HarvestDetails' || route?.name === 'HarvestForm';

  // Load sync status on mount and when route changes
  React.useEffect(() => {
    loadSyncStatus();
  }, [route?.name]);

  const loadSyncStatus = async () => {
    try {
      if (isHarvestScreen) {
        // For harvest screens, check harvest-specific sync queue
        const { records } = await getUnsyncedRecords();
        setSyncStatus({ pending: records.length });
      } else {
        // For other screens, use general SyncService
        const status = await SyncService.getSyncStatus();
        setSyncStatus({ pending: status.pendingRecords });
        setIsSyncing(status.isSyncing);
      }
    } catch (error) {
      console.error('[Header] Error loading sync status:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      let result;

      if (isHarvestScreen) {
        // Sync harvest records (silent sync, no success message)
        result = await syncAllRecords();

        // Only show alerts for failures or partial syncs
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
        // No message on complete success
      } else {
        // Use general sync service for other screens
        result = await SyncService.syncAll();

        if (result.success) {
          Alert.alert('Sync Complete', result.message);
        } else {
          Alert.alert('Sync Incomplete', result.message);
        }
      }

      await loadSyncStatus();
    } catch (error) {
      Alert.alert('Sync Failed', error.message || 'Failed to sync data');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
              // Use onNavigate if provided (legacy support), otherwise use navigation
              if (onNavigate) {
                onNavigate('Login');
              } else if (navigation) {
                navigation.navigate('Login');
              }
            } catch (error) {
              console.error('[Header] Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image
          source={require('../assets/rugyeyo_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <View style={styles.headerRight}>
        {showSync && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleSync}
            disabled={isSyncing}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isSyncing ? "sync" : "cloud-upload-outline"}
              size={24}
              color={CoffeeColors.CREAM}
            />
            {syncStatus.pending > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{syncStatus.pending}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {showLogout && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleLogout}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="log-out-outline" size={24} color={CoffeeColors.CREAM} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: CoffeeColors.DARK_BROWN,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: CoffeeColors.CREAM,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: CoffeeColors.ACCENT,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: CoffeeColors.WHITE,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default Header;
