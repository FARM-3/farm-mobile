import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  View, 
  SafeAreaView 
} from 'react-native'; 

// 1. Path to DashboardScreen (should be correct relative to src/App.js)
import DashboardScreen from './features/dashboard/screens/DashboardScreen';

// 2. Path to Color Palette (should be correct relative to src/App.js)
import CoffeeColors from './theme/colors';

export default function App() {
  return (
    // SafeAreaView handles notches and status bars
    <SafeAreaView style={styles.safeArea}> 
      <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
      <View style={styles.container}>
        {/* Render your DashboardScreen */}
        <DashboardScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // The safe area ensures the background color is present behind the status bar
  safeArea: {
    flex: 1,
    // Set the status bar background color here
    backgroundColor: CoffeeColors.DARK_BROWN, 
  },
  // The main container fills the rest of the safe area
  container: {
    flex: 1, 
  },
});
