import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CoffeeColors from '../theme/colors';
import Fonts from '../theme/fonts';

/**
 * Simple White Header Component
 * Used for non-dashboard screens
 * Features: white background, back button, title, sync icon
 */
const SimpleHeader = ({ title = 'Screen', onBackPress, unsyncedCount = 0, onSync }) => {
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
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={28} color={CoffeeColors.DARK_BROWN} />
      </TouchableOpacity>

      <View style={styles.logoTitleContainer}>
        <Image
          source={require('../assets/rugyeyo_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <TouchableOpacity
        style={styles.syncButton}
        onPress={handleSync}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="cloud-upload-outline" size={24} color={CoffeeColors.DARK_BROWN} />
        {unsyncedCount > 0 && (
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
    backgroundColor: CoffeeColors.WHITE,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0,
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
  logo: {
    width: 72,
    height: 72,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
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
