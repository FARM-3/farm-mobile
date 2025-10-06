// import React, { useState } from 'react';
// import { StatusBar } from 'expo-status-bar';
// import { 
//     StyleSheet, 
//     View, 
//     SafeAreaView,
//     TouchableOpacity, 
//     Text // Added Text and TouchableOpacity for placeholder views
// } from 'react-native'; 

// // 1. Path to DashboardScreen (Corrected case for folder)
// import DashboardScreen from './features/dashboard/screens/DashboardScreen';
// import AggregationScreen from './features/Aggregation/screens/AggregationScreen';
// import ProcessingScreen from './features/Processing/screens/ProcessingScreen';

// // 2. Path to Color Palette
// import CoffeeColors from './theme/colors';

// export default function App() {
//     // State to manage the currently active screen. Start on 'Dashboard'.
//     const [activeScreen, setActiveScreen] = useState('Dashboard');

//     // Function to change the active screen state
//     const handleNavigate = (screenName) => {
//         // Updated to include 'Inventory' and 'Quality' from the Dashboard
//         console.log('handleNavigate requested:', screenName);
//         if (['Dashboard', 'Aggregation', 'Harvests', 'Processing', 'Inventory', 'Quality'].includes(screenName)) {
//             setActiveScreen(screenName);
//             console.log('activeScreen now set to:', screenName);
//         }
//     };

//     // Function to render the correct component based on the active state
//     const renderScreen = () => {
//         switch (activeScreen) {
//             case 'Dashboard':
//                 // Pass the navigation function to the dashboard
//                 return <DashboardScreen onNavigate={handleNavigate} />;
            
//             case 'Aggregation':
//                 // Pass the navigation function to the aggregation screen (for the Exit button)
//                 return <AggregationScreen onNavigate={handleNavigate} />; 

//             // Combined placeholder screens for features not yet built:
//             case 'Harvests':
//             case 'Inventory': // New route
//             case 'Quality':   // New route
//                 return (
//                     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CoffeeColors.DARK_BROWN }}>
//                         <Text style={{ fontSize: 24, color: CoffeeColors.CREAM, marginBottom: 20 }}>
//                             {activeScreen} Feature Coming Soon!
//                         </Text>
//                         <TouchableOpacity onPress={() => handleNavigate('Dashboard')} style={styles.navButton}>
//                             <Text style={styles.navButtonText}>Go to Dashboard</Text>
//                         </TouchableOpacity>
//                     </View>
//                 );

//             case 'Processing':
//                 return <ProcessingScreen onNavigate={handleNavigate} />;

//             default:
//                 return <DashboardScreen onNavigate={handleNavigate} />;
//         }
//     };

//     return (
//         <SafeAreaView style={styles.safeArea}>
//             <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
//             <View style={styles.container}>
//                 {/* Render the currently active screen */}
//                 {renderScreen()}
//             </View>
//         </SafeAreaView>
//     );
// }

// const styles = StyleSheet.create({
//     safeArea: {
//         flex: 1,
//         backgroundColor: CoffeeColors.DARK_BROWN, 
//     },
//     container: {
//         flex: 1, 
//     },
//     navButton: {
//         paddingVertical: 12,
//         paddingHorizontal: 25,
//         backgroundColor: CoffeeColors.GOLD,
//         borderRadius: 8,
//     },
//     navButtonText: {
//         color: CoffeeColors.WHITE,
//         fontWeight: 'bold',
//         fontSize: 16,
//     }
// });






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
