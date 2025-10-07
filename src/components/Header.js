import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../theme/colors';

const Header = ({ title = "Rugyeyo Farm", onNavigate }) => {
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('user');
              console.log('Cleared AsyncStorage auth keys');
            } catch (e) {
              console.warn('AsyncStorage not available or clear failed', e.message || e);
            }
            onNavigate('Login');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="notifications-outline" size={24} color={CoffeeColors.CREAM} style={{ marginRight: 12 }} />
        <TouchableOpacity
          onPress={handleLogout}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="log-out-outline" size={22} color={CoffeeColors.CREAM} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: CoffeeColors.DARK_BROWN,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CoffeeColors.CREAM,
  },
});

export default Header;
