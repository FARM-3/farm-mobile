import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  View, 
  SafeAreaView 
} from 'react-native'; 

// 1. Path to DashboardScreen (should be correct relative to src/App.js)
 import DashboardScreen from './features/dashboard/screens/DashboardScreen';
import LoginScreen from './features/dashboard/screens/LoginScreen';
import PinResetScreen from './features/dashboard/screens/PinResetScreen';

// 2. Path to Color Palette (should be correct relative to src/App.js)
import CoffeeColors from './theme/colors';

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
      <View style={styles.container}>
         <DashboardScreen/> 
        <LoginScreen />
        <PinResetScreen />
        



      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CoffeeColors.DARK_BROWN, 
  },
  container: {
    flex: 1, 
  },
});