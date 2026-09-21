import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import BrandLogo from '../../../components/BrandLogo';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const handleGetStarted = async () => {
    try {
      // Mark that the user has seen the welcome screen
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      // Navigate to login screen
      navigation.replace('Login');
    } catch (error) {
      console.error('[WelcomeScreen] Error saving welcome flag:', error);
      // Navigate anyway
      navigation.replace('Login');
    }
  };

  return (
    <ImageBackground
      source={require('../../../assets/welcome_coffee 2.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Overlay for better text readability */}
      <View style={styles.overlay} />

      {/* Content Container */}
      <View style={styles.contentContainer}>
        {/* Logo Container */}
        <View style={styles.logoContainer}>
          <BrandLogo size="lg" showSubtitle />
        </View>

        {/* App Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Farm Management</Text>
          <Text style={styles.title}>Information System</Text>
          <Text style={styles.subtitle}>
            Manage your coffee farm efficiently
          </Text>
        </View>

        {/* Get Started Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color={CoffeeColors.WHITE} style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 60,
    paddingHorizontal: 24,
    zIndex: 1,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxHeight: height * 0.4,
  },
  logo: {
    width: 280,
    height: 280,
    resizeMode: 'contain',
  },
  titleContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: Fonts.weights.bold,
    fontFamily: Fonts.bold,
    color: CoffeeColors.WHITE,
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: Fonts.weights.semiBold,
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.CREAM,
    textAlign: 'center',
    marginTop: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: 20,
  },
  button: {
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonText: {
    color: CoffeeColors.WHITE,
    fontSize: 18,
    fontWeight: Fonts.weights.semiBold,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
