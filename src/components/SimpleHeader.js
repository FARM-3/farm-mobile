import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CoffeeColors from '../theme/colors';
import Fonts from '../theme/fonts';

/**
 * Simple White Header Component
 * Used for non-dashboard screens
 * Features: white background, back button, title only
 */
const SimpleHeader = ({ title = 'Screen', onBackPress }) => {
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
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

      <View style={styles.spacer} />
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
    borderBottomWidth: 1,
    borderBottomColor: CoffeeColors.VERY_LIGHT_BROWN,
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
    width: 32,
    height: 32,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
    textAlign: 'center',
  },
  spacer: {
    width: 40,
  },
});

export default SimpleHeader;
