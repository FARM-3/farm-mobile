// // import React, { useState, useEffect } from 'react';
// // import { StatusBar } from 'expo-status-bar';
// // import {
// //     StyleSheet,
// //     View,
// //     SafeAreaView,
// //     TouchableOpacity,
// //     Text,
// //     ActivityIndicator // Added for loading state
// // } from 'react-native';

// // // 1. Path to Screens (Corrected case for folder)
// // import DashboardScreen from './features/dashboard/screens/DashboardScreen';
// // import AggregationScreen from './features/Aggregation/screens/AggregationScreen';
// // import ProcessingScreen from './features/dashboard/screens/ProcessingScreen';
// // import LoginScreen from './features/dashboard/screens/LoginScreen';

// // // --- HARVEST SCREENS ---
// // import HarvestSummaryScreen from './features/harvest/screens/HarvestSummaryScreen';
// // // Adding the Form Screen import, assuming its location
// // import HarvestFormScreen from './features/harvest/screens/HarvestFormScreen';

// // // 2. Path to Color Palette
// // import CoffeeColors from './theme/colors';

// // // 3. Services
// // import DatabaseService from './services/DatabaseService';
// // import AuthService from './services/AuthService';

// // export default function App() {
// //     // State to manage the currently active screen. Start on 'Login'.
// //     const [activeScreen, setActiveScreen] = useState('Login');
// //     const [isCheckingAuth, setIsCheckingAuth] = useState(true);

// //     // Initialize database and check auth on app start
// //     useEffect(() => {
// //         const initializeApp = async () => {
// //             try {
// //                 // Initialize database
// //                 await DatabaseService.init();
// //                 console.log('[App] Database initialized successfully');

// //                 // Check if user is already logged in
// //                 const isAuthenticated = await AuthService.isAuthenticated();

// //                 if (isAuthenticated) {
// //                     console.log('[App] User is authenticated, navigating to Dashboard');
// //                     setActiveScreen('Dashboard');
// //                 } else {
// //                     console.log('[App] User not authenticated, staying on Login');
// //                     setActiveScreen('Login');
// //                 }
// //             } catch (error) {
// //                 console.error('[App] Initialization error:', error);
// //                 setActiveScreen('Login');
// //             } finally {
// //                 setIsCheckingAuth(false);
// //             }
// //         };

// //         initializeApp();
// //     }, []);

// //     // Function to change the active screen state
// //     const handleNavigate = (screenName) => {
// //         // Updated to include 'HarvestForm'
// //         console.log('handleNavigate requested:', screenName);
// //         if (['Dashboard', 'Aggregation', 'Harvests', 'Processing', 'Inventory', 'Quality', 'Login', 'ResetPin', 'HarvestForm'].includes(screenName)) {
// //             setActiveScreen(screenName);
// //             console.log('activeScreen now set to:', screenName);
// //         }
// //     };

// //     // Function to render the correct component based on the active state
// //     const renderScreen = () => {
// //         switch (activeScreen) {
// //             case 'Login':
// //                 return <LoginScreen onNavigate={handleNavigate} />;

// //             case 'ResetPin':
// //                 // Simple placeholder ResetPin screen for now
// //                 return (
// //                     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CoffeeColors.LIGHT_GRAY }}>
// //                         <Text style={{ fontSize: 20, color: CoffeeColors.DARK_BROWN }}>Reset PIN coming soon</Text>
// //                         <TouchableOpacity onPress={() => handleNavigate('Login')} style={styles.navButton}>
// //                             <Text style={styles.navButtonText}>Back to Login</Text>
// //                         </TouchableOpacity>
// //                     </View>
// //                 );

// //             case 'Dashboard':
// //                 // Pass the navigation function to the dashboard
// //                 return <DashboardScreen onNavigate={handleNavigate} />;
            
// //             case 'Aggregation':
// //                 // Pass the navigation function to the aggregation screen (for the Exit button)
// //                 return <AggregationScreen onNavigate={handleNavigate} />; 

// //             // --- HARVEST FORM INTEGRATION ---
// //             case 'Harvests':
// //                 // Renders the Harvest Form Screen
// //                 return <HarvestSummaryScreen onNavigate={handleNavigate} />;

// //             // --- HARVEST FORM INTEGRATION ---
// //             case 'HarvestForm':
// //                 return <HarvestFormScreen onNavigate={handleNavigate} />;


// //             case 'Processing':
// //                 return <ProcessingScreen onNavigate={handleNavigate} />;

// //             // Combined placeholder screens for features not yet built:
// //             case 'Inventory': // New route
// //             case 'Quality':   // New route
// //                 return (
// //                     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CoffeeColors.DARK_BROWN }}>
// //                         <Text style={{ fontSize: 24, color: CoffeeColors.CREAM, marginBottom: 20 }}>
// //                             {activeScreen} Feature Coming Soon!
// //                         </Text>
// //                         <TouchableOpacity onPress={() => handleNavigate('Dashboard')} style={styles.navButton}>
// //                             <Text style={styles.navButtonText}>Go to Dashboard</Text>
// //                         </TouchableOpacity>
// //                     </View>
// //                 );

// //             default:
// //                 return <DashboardScreen onNavigate={handleNavigate} />;
// //         }
// //     };

// //     // Show loading screen while checking auth
// //     if (isCheckingAuth) {
// //         return (
// //             <SafeAreaView style={styles.safeArea}>
// //                 <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
// //                 <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
// //                     <ActivityIndicator size="large" color={CoffeeColors.GOLD} />
// //                     <Text style={{ color: CoffeeColors.WHITE, marginTop: 16, fontSize: 16 }}>
// //                         Loading...
// //                     </Text>
// //                 </View>
// //             </SafeAreaView>
// //         );
// //     }

// //     return (
// //         <SafeAreaView style={styles.safeArea}>
// //             <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
// //             <View style={styles.container}>
// //                 {/* Render the currently active screen */}
// //                 {renderScreen()}
// //             </View>
// //         </SafeAreaView>
// //     );
// // }

// // const styles = StyleSheet.create({
// //     safeArea: {
// //         flex: 1,
// //         backgroundColor: CoffeeColors.DARK_BROWN, 
// //     },
// //     container: {
// //         flex: 1, 
// //     },
// //     navButton: {
// //         paddingVertical: 12,
// //         paddingHorizontal: 25,
// //         backgroundColor: CoffeeColors.GOLD,
// //         borderRadius: 8,
// //     },
// //     navButtonText: {
// //         color: CoffeeColors.WHITE,
// //         fontWeight: 'bold',
// //         fontSize: 16,
// //     }
// // });







// // import React from 'react';
// // import {
// //   StyleSheet,
// //   SafeAreaView,
// //   View,
// // } from 'react-native';
// // // We are now using the official React Navigation structure

// // // 1. Import Navigation components
// // import { NavigationContainer } from '@react-navigation/native';
// // import { createNativeStackNavigator } from '@react-navigation/native-stack';

// // // Import all your screens
// // import LoginScreen from './features/dashboard/screens/LoginScreen';
// // import DashboardScreen from './features/dashboard/screens/DashboardScreen';

// // import HarvestSummaryScreen from './features/harvest/screens/HarvestSummaryScreen';
// // import HarvestFormScreen from './features/harvest/screens/HarvestFormScreen';

// // // PinResetScreen is now correctly imported
// // import PinResetScreen from './features/dashboard/screens/PinResetScreen'; 
// // // NOTE: AggregationScreen is not defined in the structure below, 
// // // but you can add it if you like.

// // // Initialize the stack navigator
// // const Stack = createNativeStackNavigator();

// // // --- Main App Component ---
// // const App = () => {
// //   return (
// //     // 2. Wrap everything in NavigationContainer
// //     <NavigationContainer>
// //       {/* 3. Define the Stack Navigator and its screens */}
// //       <Stack.Navigator 
// //         initialRouteName="Login" // Start on the Login Screen
// //         screenOptions={{
// //           headerShown: false, // Hides the header bar for all screens
// //         }}
// //       >
// //         {/* Defines the Login Screen */}
// //         <Stack.Screen name="Login" component={LoginScreen} />
        
// //         {/* Defines the Dashboard Screen */}
// //         <Stack.Screen name="Dashboard" component={DashboardScreen} />
        
// //         {/* Defines the Pin Reset Screen, using your new component */}
// //         <Stack.Screen name="PinReset" component={PinResetScreen} />

// //         {/* Harvest Screens */}
// //         <Stack.Screen name="HarvestSummary" component={HarvestSummaryScreen} />
// //         <Stack.Screen name="HarvestForm" component={HarvestFormScreen} />

        
        
// //       </Stack.Navigator>
// //     </NavigationContainer>
// //   );
// // };

// // // --- Stylesheet ---
// // const styles = StyleSheet.create({
// //   // Minimal styles needed for the main container
// //   container: {
// //     flex: 1,
// //     backgroundColor: '#fff', 
// //   },
// // });

// // export default App;







// import React from 'react';
// import { StatusBar } from 'expo-status-bar';
// import { 
//   StyleSheet, 
//   View, 
//   SafeAreaView, 
//   ViewBase
// } from 'react-native'; 

// // import DashboardScreen from './features/dashboard/screens/DashboardScreen';
// //import LoginScreen from './features/dashboard/screens/LoginScreen';

// // 2. Path to Color Palette (should be correct relative to src/App.js)
// import CoffeeColors from './theme/colors';
// // import HarvestSummaryScreen from './features/harvest/screens/HarvestSummaryScreen';
// // import HarvestFormScreen from './features/harvest/screens/HarvestFormScreen';
// // import BlockDetailsForm from './features/blocks/BlockDetailsForm';
// import ViewBlockDetails from './features/blocks/BlockSummary';


// export default function App() {
//   return (
//     // SafeAreaView handles notches and status bars
//     <SafeAreaView style={styles.safeArea}> 
//       <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
//       <View style={styles.container}>
//         {/* <DashboardScreen /> */}
//         {/* { <LoginScreen /> } */}
//         {/* <HarvestFormScreen /> */}
//         {/* <HarvestSummaryScreen /> */}
//         <ViewBlockDetails />
//         {/* <BlockDetailsForm /> */}
        
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





//TESTING 
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView } from 'react-native';

// 1. Import Navigation components
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 2. Import your screens and theme
import CoffeeColors from './theme/colors'; 

// FIX: Importing the correct file name: BlockDetailsForm
import BlockDetailsForm from './features/blocks/BlockDetailsForm'; 
// Assuming BlockSummary is correct, but ensuring it's the right component name
import BlockSummary from './features/blocks/BlockSummary'; 
import DashboardScreen from './features/dashboard/screens/DashboardScreen'; 
// import HarvestFormScreen from './features/harvest/screens/HarvestFormScreen'; 
// import HarvestSummaryScreen from './features/harvest/screens/HarvestSummaryScreen'; // <-- ADDED IMPORT

// Initialize the stack navigator
const Stack = createNativeStackNavigator();

const App = () => {
    return (
        // 3. Wrap everything in NavigationContainer
        <NavigationContainer>
            <SafeAreaView style={styles.safeArea}> 
                <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
                {/* 4. Define the Stack Navigator and its screens */}
                <Stack.Navigator
                    // Set the starting screen to the Block Summary
                    initialRouteName="BlockSummary"
                    screenOptions={{
                        headerStyle: { backgroundColor: CoffeeColors.DARK_BROWN },
                        headerTintColor: CoffeeColors.WHITE,
                        headerTitleStyle: { fontWeight: 'bold' },
                    }}
                >
                    {/* Define the Block Details Form screen */}
                    <Stack.Screen
                        name="BlockDetailsForm"
                        component={BlockDetailsForm}
                        options={{ title: 'Add Block Details' }}
                    />
                    
                    {/* Define the Block Summary screen (where navigation.addListener is used) */}
                    <Stack.Screen
                        name="BlockSummary"
                        component={BlockSummary}
                        options={{ title: 'Block Data Summary' }}
                    />

                    {/* Define the Block Registration screen */}
                    <Stack.Screen
                        name="BlockRegistration"
                        component={BlockDetailsForm}
                        options={{ title: 'Block Registration' }}
                    />

                    {/* Define the Harvest Form screen */}
                    {/* <Stack.Screen
                        name="HarvestForm"
                        component={HarvestFormScreen}
                        options={{ title: 'New Harvest Entry' }}
                    /> */}

                    {/* NEW: Define the Harvest Summary screen */}
                    {/* <Stack.Screen
                        name="HarvestSummary"
                        component={HarvestSummaryScreen}
                        options={{ title: 'Harvest History' }}
                    /> */}

                    {/* Example of other screens, if needed */}
                    {/* <Stack.Screen name="Dashboard" component={DashboardScreen} /> */}
                    
                </Stack.Navigator>
            </SafeAreaView>
        </NavigationContainer>
    );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: CoffeeColors.DARK_BROWN,
    },
});

export default App;

