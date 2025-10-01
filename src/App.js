import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  View, 
  SafeAreaView 
} from 'react-native'; 

import DashboardScreen from './features/dashboard/screens/DashboardScreen';
import LoginScreen from './features/dashboard/screens/LoginScreen';
import CoffeeColors from './theme/colors';

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
      <View style={styles.container}>
        {/* Render your DashboardScreen */}
        {/* <DashboardScreen /> */}
        {/* Uncomment below to test LoginScreen */}
        <LoginScreen />
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