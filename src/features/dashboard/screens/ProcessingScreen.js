import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import CoffeeColors from '../../../theme/colors';
import Header from '../../../components/Header';
import BottomNav from '../../../components/BottomNav';

export default function ProcessingScreen({ onNavigate }) {
  const processes = [
    {
      id: 1,
      name: 'Fermenting',
      icon: '☕',
      lastRecorded: 'Last Recorded by Sarah',
      time: '10:30 AM',
      screen: 'Fermenting',
    },
    {
      id: 2,
      name: 'Washing',
      icon: '💧',
      lastRecorded: 'Last Recorded by Sarah',
      time: '09:00 AM',
      screen: 'Washing',
    },
    {
      id: 3,
      name: 'Sundrying',
      icon: '☀️',
      lastRecorded: 'Last Recorded by Emily',
      time: '02:00 PM',
      screen: 'Sundrying',
    },
    {
      id: 4,
      name: 'Bagging',
      icon: '🎒',
      lastRecorded: 'Last Recorded by Michael',
      time: '04:30 PM',
      screen: 'Bagging',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Unified Header */}
      <Header title="Processing" onNavigate={onNavigate} />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Processing Cards Grid */}
        <View style={styles.grid}>
          {processes.map((process) => (
            <TouchableOpacity
              key={process.id}
              style={styles.card}
              onPress={() => onNavigate(process.screen)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardIcon}>{process.icon}</Text>
              <Text style={styles.cardTitle}>{process.name}</Text>
              <Text style={styles.cardSubtitle}>{process.lastRecorded}</Text>
              <Text style={styles.cardTime}>{process.time}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Unified Bottom Navigation */}
      <BottomNav activeScreen="Processing" onNavigate={onNavigate} />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 11,
    color: CoffeeColors.GRAY_TEXT,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardTime: {
    fontSize: 11,
    color: CoffeeColors.GRAY_TEXT,
    fontWeight: '600',
  },
});
