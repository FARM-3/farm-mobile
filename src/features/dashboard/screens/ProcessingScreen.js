import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import CoffeeColors from '../../../theme/colors';

export default function DashboardScreen({ onNavigate }) {
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

  const bottomMenu = [
    { name: 'Fermenting', icon: '👥', screen: 'Fermenting' },
    { name: 'Washing', icon: '🌾', screen: 'Washing' },
    { name: 'Sundrying', icon: '🏭', screen: 'Sundrying' },
    { name: 'Bagging', icon: '⚙️', screen: 'Bagging' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity style={styles.profileButton}>
          <View style={styles.profileCircle}>
            <Text style={styles.profileText}>A</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Processing Header */}
      <View style={styles.processingHeader}>
        <Text style={styles.processingIcon}>✶</Text>
        <Text style={styles.processingTitle}>Processing</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Pick a process label */}
        <Text style={styles.pickProcessText}>Pick a process</Text>

        {/* Process Cards Grid */}
        <View style={styles.grid}>
          {processes.map((process) => (
            <TouchableOpacity
              key={process.id}
              style={styles.card}
              onPress={() => onNavigate(process.screen)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>{process.name}</Text>
              <Text style={styles.cardIcon}>{process.icon}</Text>
              <Text style={styles.cardSubtitle}>{process.lastRecorded}</Text>
              <Text style={styles.cardTime}>{process.time}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {bottomMenu.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.bottomNavItem}
            onPress={() => onNavigate(item.screen)}
            activeOpacity={0.7}
          >
            <Text style={styles.bottomNavIcon}>{item.icon}</Text>
            <Text style={styles.bottomNavText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#6B4423',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2416',
  },
  profileButton: {
    padding: 4,
  },
  profileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B9DC3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  processingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  processingIcon: {
    fontSize: 24,
    color: '#6B4423',
    marginRight: 8,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B4513',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  pickProcessText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2416',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2416',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#6B5D52',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardTime: {
    fontSize: 11,
    color: '#6B5D52',
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomNavIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  bottomNavText: {
    fontSize: 11,
    color: '#8B4513',
    fontWeight: '600',
  },
});
