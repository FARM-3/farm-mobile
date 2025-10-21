import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CoffeeColors from '../../../theme/colors';

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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={CoffeeColors.LIGHT_GRAY} />

      {/* Logo Container */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* App Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Rugyeyo Farm</Text>
        <Text style={styles.title}>Management App</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxHeight: height * 0.5,
  },
  logo: {
    width: width * 0.7,
    height: width * 0.7,
    maxWidth: 350,
    maxHeight: 350,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: CoffeeColors.DARK_BROWN,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: CoffeeColors.MEDIUM_BROWN,
    textAlign: 'center',
    marginTop: 12,
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
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonText: {
    color: CoffeeColors.WHITE,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
