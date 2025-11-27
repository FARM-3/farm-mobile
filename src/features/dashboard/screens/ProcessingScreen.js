import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';
import AuthService from '../../../services/AuthService';

export default function ProcessingScreen({ navigation }) {
  const [userName, setUserName] = useState('User');

  // Fetch logged-in user on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await AuthService.getStoredUser();
        if (user) {
          // Use name, first_name, username, or default to 'User'
          const displayName = user.name || user.first_name || user.username || 'User';
          setUserName(displayName);
        }
      } catch (error) {
        console.error('[ProcessingScreen] Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  // Helper function to format current time
  const getCurrentTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Handle midnight (0 hours)
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const currentTime = getCurrentTime();

  const processes = [
    {
      id: 1,
      name: 'Quality Control',
      icon: 'clipboard-check-outline',
      lastRecorded: `Last Recorded by ${userName}`,
      time: currentTime,
      screen: 'QualityControl',
      color: '#4CAF50', // Green
    },
    {
      id: 2,
      name: 'Processing Type',
      icon: 'cog-outline',
      lastRecorded: `Last Recorded by ${userName}`,
      time: currentTime,
      screen: 'ProcessingType',
      color: '#2196F3', // Blue
    },
    {
      id: 3,
      name: 'Drying',
      icon: 'weather-sunny',
      lastRecorded: `Last Recorded by ${userName}`,
      time: currentTime,
      screen: 'Drying',
      color: '#FF9800', // Orange (same as natural sundrying)
    },
    {
      id: 4,
      name: 'Bagging',
      icon: 'package-variant-closed',
      lastRecorded: `Last Recorded by ${userName}`,
      time: currentTime,
      screen: 'Bagging',
      color: '#9C27B0', // Purple
    },
    {
      id: 5,
      name: 'Hulling',
      icon: 'grain',
      lastRecorded: `Last Recorded by ${userName}`,
      time: currentTime,
      screen: 'Hulling',
      color: '#795548', // Brown
    },
  ];

  const handleCardPress = (process) => {
    console.log('[ProcessingScreen] Card pressed:', process.name, 'Screen:', process.screen);

    // Navigate to available screens, show "Coming Soon" for others
    if (process.screen === 'QualityControl' || process.screen === 'ProcessingType' || process.screen === 'Drying' || process.screen === 'Bagging') {
      try {
        let routeName;
        if (process.screen === 'Drying') {
          routeName = 'DryingSummary';
        } else if (process.screen === 'Bagging') {
          routeName = 'BaggingSummary';
        } else {
          routeName = process.screen;
        }
        console.log('[ProcessingScreen] Navigating to', routeName, 'screen...');
        navigation.navigate(routeName);
      } catch (error) {
        console.error('[ProcessingScreen] Navigation error:', error);
        Alert.alert('Error', `Failed to navigate to ${process.name} screen`);
      }
    } else {
      Alert.alert(
        `${process.name} Coming Soon`,
        `The ${process.name} feature is currently under development.`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Simple White Header */}
      <SimpleHeader title="Processing" />

      <View style={{ flex: 1 }}>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Processing Cards */}
        <View style={styles.cardsContainer}>
          {processes.map((process, index) => (
            <View key={process.id}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => handleCardPress(process)}
                activeOpacity={0.7}
              >
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={[styles.iconContainer, { backgroundColor: CoffeeColors.MEDIUM_BROWN + '20' }]}>
                  <MaterialCommunityIcons
                    name={process.icon}
                    size={40}
                    color={CoffeeColors.MEDIUM_BROWN}
                  />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{process.name}</Text>
                  <Text style={styles.cardSubtitle}>{process.lastRecorded}</Text>
                  <Text style={styles.cardTime}>{process.time}</Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={CoffeeColors.MEDIUM_BROWN}
                />
              </TouchableOpacity>
              {index < processes.length - 1 && (
                <View style={styles.connector}>
                  <MaterialCommunityIcons
                    name="arrow-down"
                    size={20}
                    color={CoffeeColors.MEDIUM_BROWN}
                  />
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      </View>

      {/* Unified Bottom Navigation */}
      <BottomNav activeScreen="Processing" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  cardsContainer: {
    gap: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 5,
    borderLeftColor: CoffeeColors.MEDIUM_BROWN,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CoffeeColors.PRIMARY_BROWN,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: CoffeeColors.WHITE,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },
  connector: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: CoffeeColors.GRAY_TEXT,
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  cardTime: {
    fontSize: 12,
    color: CoffeeColors.MEDIUM_BROWN,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
  },
});