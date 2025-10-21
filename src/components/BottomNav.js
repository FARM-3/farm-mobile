import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import CoffeeColors from '../theme/colors';

const BottomNav = ({ activeScreen }) => {
  const navigation = useNavigation();
  const route = useRoute();

  // Use the current route name if activeScreen is not provided
  const currentScreen = activeScreen || route.name;

  return (
    <View style={styles.bottomNavContainer} pointerEvents="box-none">
      <BlurView intensity={80} tint="dark" style={styles.bottomNavBar}>
        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'Dashboard' && styles.navItemActive]}
          onPress={() => navigation.navigate('Dashboard')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="grid-outline"
            size={24}
            color={currentScreen === 'Dashboard' ? CoffeeColors.GOLD : CoffeeColors.CREAM}
          />
          <Text style={[styles.navText, currentScreen === 'Dashboard' && styles.navTextActive]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'Aggregation' && styles.navItemActive]}
          onPress={() => navigation.navigate('Aggregation')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="people-outline"
            size={24}
            color={currentScreen === 'Aggregation' ? CoffeeColors.GOLD : CoffeeColors.CREAM}
          />
          <Text style={[styles.navText, currentScreen === 'Aggregation' && styles.navTextActive]}>Aggregations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'Harvests' && styles.navItemActive]}
          onPress={() => navigation.navigate('Harvests')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="leaf-outline"
            size={24}
            color={currentScreen === 'Harvests' ? CoffeeColors.GOLD : CoffeeColors.CREAM}
          />
          <Text style={[styles.navText, currentScreen === 'Harvests' && styles.navTextActive]}>Harvests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'Processing' && styles.navItemActive]}
          onPress={() => navigation.navigate('Processing')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="cube-outline"
            size={24}
            color={currentScreen === 'Processing' ? CoffeeColors.GOLD : CoffeeColors.CREAM}
          />
          <Text style={[styles.navText, currentScreen === 'Processing' && styles.navTextActive]}>Processing</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNavContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  bottomNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 52, 46, 0.85)', // DARK_BROWN with transparency
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)', // Subtle gold border
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 5,
    paddingBottom: 32,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)', // Subtle gold glow for active
  },
  navText: {
    fontSize: 10,
    color: CoffeeColors.CREAM,
    marginTop: 4,
    opacity: 0.8,
  },
  navTextActive: {
    color: CoffeeColors.GOLD,
    fontWeight: 'bold',
    opacity: 1,
  },
});

export default BottomNav;
