import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// Brown color palette
const PRIMARY_BROWN = '#8B4513';
const LIGHT_BROWN = '#A0522D';

const BottomNav = ({ activeScreen, active }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  // Use the provided activeScreen/active prop, or fall back to current route name
  const currentScreen = activeScreen || active || route.name;

  return (
    <View style={[styles.bottomNavContainer, { bottom: -20 + insets.bottom }]} pointerEvents="box-none">
      <View style={[styles.bottomNavBar, { paddingBottom: insets.bottom || 20 }]}>
        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'Dashboard' && styles.navItemActive]}
          onPress={() => navigation.navigate('Dashboard')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="analytics"
            size={24}
            color={currentScreen === 'Dashboard' ? PRIMARY_BROWN : LIGHT_BROWN}
          />
          <Text style={[styles.navText, currentScreen === 'Dashboard' && styles.navTextActive]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, (currentScreen === 'Aggregation' || currentScreen === 'Aggregation') && styles.navItemActive]}
          onPress={() => navigation.navigate('Aggregation')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="people-circle"
            size={24}
            color={(currentScreen === 'Aggregation') ? PRIMARY_BROWN : LIGHT_BROWN}
          />
          <Text style={[styles.navText, (currentScreen === 'Aggregation') && styles.navTextActive]}>Farmers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'Harvests' && styles.navItemActive]}
          onPress={() => navigation.navigate('Harvests')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="basket"
            size={24}
            color={currentScreen === 'Harvests' ? PRIMARY_BROWN : LIGHT_BROWN}
          />
          <Text style={[styles.navText, currentScreen === 'Harvests' && styles.navTextActive]}>Harvests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'Processing' && styles.navItemActive]}
          onPress={() => navigation.navigate('Processing')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="cog"
            size={24}
            color={currentScreen === 'Processing' ? PRIMARY_BROWN : LIGHT_BROWN}
          />
          <Text style={[styles.navText, currentScreen === 'Processing' && styles.navTextActive]}>Processing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNavContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
  },
  bottomNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  navItemActive: {
    backgroundColor: '#ffe6e6',
  },
  navText: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '600',
  },
  navTextActive: {
    color: PRIMARY_BROWN,
    fontWeight: '600',
  },
});

export default BottomNav;
