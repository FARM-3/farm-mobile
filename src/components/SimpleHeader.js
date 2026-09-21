import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CoffeeColors from '../theme/colors';
import Fonts from '../theme/fonts';

/**
 * Simple Brown Header Component
 * Used for non-dashboard screens
 * Features: brown background, white text, back button, title, sync icon with loading indicator
 */
const SimpleHeader = ({ title = 'Screen', onBackPress, unsyncedCount = 0, onSync, isSyncing = false }) => {
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  const handleSync = () => {
    if (onSync) {
      onSync();
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        activeOpacity={0.6}
      >
        <Ionicons name="chevron-back" size={28} color={CoffeeColors.WHITE} />
      </TouchableOpacity>

      <View style={styles.logoTitleContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>FM</Text>
        </View>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <TouchableOpacity
        style={styles.syncButton}
        onPress={handleSync}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        disabled={isSyncing}
      >
        {isSyncing ? (
          <ActivityIndicator size={24} color={CoffeeColors.WHITE} />
        ) : (
          <Ionicons name="cloud-upload-outline" size={24} color={CoffeeColors.WHITE} />
        )}
        {unsyncedCount > 0 && !isSyncing && (
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>{unsyncedCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: CoffeeColors.DARK_BROWN,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    padding: 4,
  },
  logoTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    color: CoffeeColors.WHITE,
    fontWeight: '700',
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.WHITE,
    textAlign: 'center',
  },
  syncButton: {
    padding: 8,
    position: 'relative',
  },
  syncBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Fonts.bold,
  },
});

export default SimpleHeader;
