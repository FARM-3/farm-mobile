import React from 'react';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

// --- 1. React Navigation Imports ---
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// --- 2. Screen and Theme Imports ---
// NOTE: LoginScreen is the component being imported
import PinLoginScreen from './features/dashboard/screens/LoginScreen'; 

// Using default import to cover the most common way themes are exported
import CoffeeColors from './theme/colors'; 
// 2. Path to Color Palette (should be correct relative to src/App.js)
import CoffeeColors from './theme/colors';

// Create the Stack Navigator instance
const Stack = createNativeStackNavigator();

// Define the colors required for the StatusBar
// Assuming CoffeeColors is the default export and DARK_BROWN is a key on it.
const STATUS_BAR_COLOR = CoffeeColors.DARK_BROWN || '#4A2B1D';

// Define the main navigation component
const AppNavigator = () => {
    return (
        <Stack.Navigator 
            // Sets the LoginScreen as the first screen to display
            initialRouteName="Login" 
            // Hides the top navigation bar 
            screenOptions={{ headerShown: false }} 
        >
            {/* Map the imported component to the route name */}
            <Stack.Screen name="Login" component={PinLoginScreen} />
        </Stack.Navigator>
    );
};

export default function App() {
    return (
        <View style={styles.container}>
            {/* The entire application must be wrapped in NavigationContainer */}
            <NavigationContainer>
                <AppNavigator />
            </NavigationContainer>
            
            {/* The StatusBar is defined outside the navigation container */}
            <StatusBar style="light" backgroundColor={STATUS_BAR_COLOR} />
        </View>
    );
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
    container: {
        flex: 1, 
    },
});

