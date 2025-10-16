import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import CoffeeColors from '../theme/colors';

const BottomNav = ({ activeScreen }) => {
  const navigation = useNavigation();
  const route = useRoute();

  // Use the current route name if activeScreen is not provided
  const currentScreen = activeScreen || route.name;

  return (
    <View style={styles.bottomNavBar} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.navItem, currentScreen === 'Dashboard' && styles.navItemActive]}
        onPress={() => navigation.navigate('Dashboard')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="grid-outline"
          size={24}
          color={currentScreen === 'Dashboard' ? CoffeeColors.CREAM : CoffeeColors.LIGHT_BROWN}
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
          color={currentScreen === 'Aggregation' ? CoffeeColors.CREAM : CoffeeColors.LIGHT_BROWN}
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
          color={currentScreen === 'Harvests' ? CoffeeColors.CREAM : CoffeeColors.LIGHT_BROWN}
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
          color={currentScreen === 'Processing' ? CoffeeColors.CREAM : CoffeeColors.LIGHT_BROWN}
        />
        <Text style={[styles.navText, currentScreen === 'Processing' && styles.navTextActive]}>Processing</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: CoffeeColors.LIGHT_GRAY,
    borderTopWidth: 2,
    borderTopColor: CoffeeColors.MEDIUM_BROWN,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 5,
    paddingBottom: 30,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  navItemActive: {
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
    borderRadius: 8,
  },
  navText: {
    fontSize: 10,
    color: CoffeeColors.LIGHT_BROWN,
    marginTop: 4,
  },
  navTextActive: {
    color: CoffeeColors.CREAM,
    fontWeight: 'bold',
  },
});

export default BottomNav;
