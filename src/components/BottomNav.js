import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../theme/colors';

const BottomNav = ({ activeScreen = 'Dashboard', onNavigate }) => {
  return (
    <View style={styles.bottomNavBar} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.navItem, activeScreen === 'Aggregation' && styles.navItemActive]}
        onPress={() => onNavigate('Aggregation')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="people-outline"
          size={24}
          color={activeScreen === 'Aggregation' ? CoffeeColors.CREAM : CoffeeColors.LIGHT_BROWN}
        />
        <Text style={[styles.navText, activeScreen === 'Aggregation' && styles.navTextActive]}>Aggregations</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, activeScreen === 'Harvests' && styles.navItemActive]}
        onPress={() => onNavigate('Harvests')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="leaf-outline"
          size={24}
          color={activeScreen === 'Harvests' ? CoffeeColors.CREAM : CoffeeColors.LIGHT_BROWN}
        />
        <Text style={[styles.navText, activeScreen === 'Harvests' && styles.navTextActive]}>Harvests</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, activeScreen === 'Processing' && styles.navItemActive]}
        onPress={() => onNavigate('Processing')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="cube-outline"
          size={24}
          color={activeScreen === 'Processing' ? CoffeeColors.CREAM : CoffeeColors.LIGHT_BROWN}
        />
        <Text style={[styles.navText, activeScreen === 'Processing' && styles.navTextActive]}>Processing</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, activeScreen === 'Dashboard' && styles.navItemActive]}
        onPress={() => onNavigate('Dashboard')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="grid-outline"
          size={24}
          color={activeScreen === 'Dashboard' ? CoffeeColors.CREAM : CoffeeColors.LIGHT_BROWN}
        />
        <Text style={[styles.navText, activeScreen === 'Dashboard' && styles.navTextActive]}>Dashboard</Text>
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
    borderTopWidth: 1,
    borderTopColor: CoffeeColors.MEDIUM_BROWN,
    paddingVertical: 10,
    paddingHorizontal: 5,
    paddingBottom: 30,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 16,
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
