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
    },
    {
      id: 2,
      name: 'Processing Type',
      icon: 'cog-outline',
      lastRecorded: `Last Recorded by ${userName}`,
      time: currentTime,
      screen: 'ProcessingType',
    },
    {
      id: 3,
      name: 'Drying',
      icon: 'weather-sunny',
      lastRecorded: `Last Recorded by ${userName}`,
      time: currentTime,
      screen: 'Drying',
    },
    {
      id: 4,
      name: 'Bagging',
      icon: 'package-variant-closed',
      lastRecorded: `Last Recorded by ${userName}`,
      time: currentTime,
      screen: 'Bagging',
    },
  ];

  const handleCardPress = (process) => {
    console.log('[ProcessingScreen] Card pressed:', process.name, 'Screen:', process.screen);

    // Navigate to available screens, show "Coming Soon" for others
    if (process.screen === 'QualityControl' || process.screen === 'ProcessingType') {
      try {
        console.log('[ProcessingScreen] Navigating to', process.screen, 'screen...');
        navigation.navigate(process.screen);
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
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Processing Cards Grid */}
        <View style={styles.grid}>
          {processes.map((process) => (
            <TouchableOpacity
              key={process.id}
              style={styles.card}
              onPress={() => handleCardPress(process)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={process.icon}
                size={48}
                color={CoffeeColors.MEDIUM_BROWN}
                style={styles.cardIcon}
              />
              <Text style={styles.cardTitle}>{process.name}</Text>
              <Text style={styles.cardSubtitle}>{process.lastRecorded}</Text>
              <Text style={styles.cardTime}>{process.time}</Text>
            </TouchableOpacity>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 11,
    color: CoffeeColors.MEDIUM_BROWN,
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardTime: {
    fontSize: 11,
    color: CoffeeColors.MEDIUM_BROWN,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
  },
});