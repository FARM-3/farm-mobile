import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  View, 
  SafeAreaView,
  TouchableOpacity, 
  Text // Added Text and TouchableOpacity for placeholder views
} from 'react-native'; 

// 1. Path to DashboardScreen (Corrected case for folder)
 import DashboardScreen from './features/dashboard/screens/DashboardScreen'; 
import AggregationScreen from './features/Aggregation/screens/AggregationScreen';import LoginScreen from './features/dashboard/screens/LoginScreen';
import PinResetScreen from './features/dashboard/screens/PinResetScreen';

// 2. Path to Color Palette
import CoffeeColors from './theme/colors';

export default function App() {
  // State to manage the currently active screen. Start on 'Dashboard'.
  const [activeScreen, setActiveScreen] = useState('Dashboard');

  // Function to change the active screen state
  const handleNavigate = (screenName) => {
    // Only navigate to known screens for safety
    if (['Dashboard', 'Aggregation', 'Harvests', 'Processing'].includes(screenName)) {
        setActiveScreen(screenName);
    }
  };

  // Function to render the correct component based on the active state
  const renderScreen = () => {
    switch (activeScreen) {
      case 'Dashboard':
        // Pass the navigation function to the dashboard
        return <DashboardScreen onNavigate={handleNavigate} />;
      
      case 'Aggregation':
        // Pass the navigation function to the aggregation screen (for the Exit button)
        return <AggregationScreen onNavigate={handleNavigate} />; 

      // Fallback/Placeholder screens for the other footer items
      case 'Harvests':
      case 'Processing':
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CoffeeColors.DARK_BROWN }}>
                <Text style={{ fontSize: 24, color: CoffeeColors.CREAM, marginBottom: 20 }}>
                    {activeScreen} Feature Coming Soon!
                </Text>
                <TouchableOpacity onPress={() => handleNavigate('Dashboard')} style={styles.navButton}>
                    <Text style={styles.navButtonText}>Go to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );

      default:
        return <DashboardScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
      <View style={styles.container}>
        {/* Render the currently active screen */}
        {renderScreen()}
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
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    backgroundColor: CoffeeColors.GOLD,
    borderRadius: 8,
  },
  navButtonText: {
    color: CoffeeColors.WHITE,
    fontWeight: 'bold',
    fontSize: 16,
  }
});