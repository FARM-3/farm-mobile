import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../theme/colors';
import AuthService from '../services/AuthService';
import SyncService from '../services/SyncService';

/**
 * Unified Header Component
 * Used across all screens for consistent design
 */
const Header = ({ title = 'Rugyeyo Farm', onNavigate, showSync = true, showLogout = true }) => {
  const [syncStatus, setSyncStatus] = React.useState({ pending: 0 });
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Load sync status on mount
  React.useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await SyncService.getSyncStatus();
      setSyncStatus({ pending: status.pendingRecords });
      setIsSyncing(status.isSyncing);
    } catch (error) {
      console.error('[Header] Error loading sync status:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await SyncService.syncAll();

      if (result.success) {
        Alert.alert('Sync Complete', result.message);
      } else {
        Alert.alert('Sync Incomplete', result.message);
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
              if (onNavigate) {
                onNavigate('Login');
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
      <Text style={styles.headerTitle}>{title}</Text>

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
    paddingTop: 50,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CoffeeColors.CREAM,
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
