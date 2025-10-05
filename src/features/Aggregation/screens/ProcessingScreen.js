/**
 * src/features/Processing/screens/ProcessingScreen.js
 * Placeholder component to satisfy the import requirement in App.js.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import CoffeeColors from '../../../theme/colors';

const ProcessingScreen = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Processing Management</Text>
      <Text style={styles.subtitle}>
        This screen is currently under development.
      </Text>
      <TouchableOpacity onPress={() => onNavigate('Dashboard')} style={styles.navButton}>
        <Text style={styles.navButtonText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: CoffeeColors.GRAY_TEXT,
    textAlign: 'center',
    marginBottom: 30,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
    borderRadius: 8,
  },
  navButtonText: {
    color: CoffeeColors.WHITE,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProcessingScreen;
