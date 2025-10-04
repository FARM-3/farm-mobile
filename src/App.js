import React from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
} from 'react-native';
// We are now using the official React Navigation structure

// 1. Import Navigation components
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import all your screens
import LoginScreen from './features/dashboard/screens/LoginScreen';
import DashboardScreen from './features/dashboard/screens/DashboardScreen';

import HarvestSummaryScreen from './features/harvest/screens/HarvestSummaryScreen';
import HarvestFormScreen from './features/harvest/screens/HarvestFormScreen';

// PinResetScreen is now correctly imported
import PinResetScreen from './features/dashboard/screens/PinResetScreen'; 
// NOTE: AggregationScreen is not defined in the structure below, 
// but you can add it if you like.

// Initialize the stack navigator
const Stack = createNativeStackNavigator();

// --- Main App Component ---
const App = () => {
  return (
    // 2. Wrap everything in NavigationContainer
    <NavigationContainer>
      {/* 3. Define the Stack Navigator and its screens */}
      <Stack.Navigator 
        initialRouteName="Login" // Start on the Login Screen
        screenOptions={{
          headerShown: false, // Hides the header bar for all screens
        }}
      >
        {/* Defines the Login Screen */}
        <Stack.Screen name="Login" component={LoginScreen} />
        
        {/* Defines the Dashboard Screen */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        
        {/* Defines the Pin Reset Screen, using your new component */}
        <Stack.Screen name="PinReset" component={PinResetScreen} />

        {/* Harvest Screens */}
        <Stack.Screen name="HarvestSummary" component={HarvestSummaryScreen} />
        <Stack.Screen name="HarvestForm" component={HarvestFormScreen} />

        
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  // Minimal styles needed for the main container
  container: {
    flex: 1,
    backgroundColor: '#fff', 
  },
});

export default App;







// import React from 'react';
// import { StatusBar } from 'expo-status-bar';
// import { 
//   StyleSheet, 
//   View, 
//   SafeAreaView 
// } from 'react-native'; 

// // import DashboardScreen from './features/dashboard/screens/DashboardScreen';
// //import LoginScreen from './features/dashboard/screens/LoginScreen';

// // 2. Path to Color Palette (should be correct relative to src/App.js)
// import CoffeeColors from './theme/colors';
// import HarvestSummaryScreen from './features/harvest/screens/HarvestSummaryScreen';
// // import HarvestFormScreen from './features/harvest/screens/HarvestFormScreen';

// export default function App() {
//   return (
//     // SafeAreaView handles notches and status bars
//     <SafeAreaView style={styles.safeArea}> 
//       <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
//       <View style={styles.container}>
//         {/* <DashboardScreen /> */}
//         {/* { <LoginScreen /> } */}
//         {/* <HarvestFormScreen /> */}
//         <HarvestSummaryScreen />
        
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   // The safe area ensures the background color is present behind the status bar
//   safeArea: {
//     flex: 1,
//     // Setting the status bar background color here
//     backgroundColor: CoffeeColors.DARK_BROWN, 
//   },
//   // The main container fills the rest of the safe area
//   container: {
//     flex: 1, 
//   },
// });
