import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView, View, ActivityIndicator, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';

// Suppress all console logs and warnings from appearing on the UI globally
// Logs will still appear in the terminal for debugging
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews',
  '[ApiService]',
  'Network Error',
]);
// Hide all yellow box warnings on screen
LogBox.ignoreAllLogs(true);

// 1. Import Navigation components
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 2. Import your screens and theme
import CoffeeColors from './theme/colors';

// 3. Import services
import AuthService from './services/AuthService';
import DatabaseService from './services/DatabaseService';

// TEMPORARY: Helper function to reset the app and see Welcome screen
// Call this from console: global.resetApp()
global.resetApp = async () => {
    try {
        await AsyncStorage.clear();
        console.log('[resetApp] All data cleared! Please reload the app to see the Welcome screen.');
        console.log('[resetApp] Press "r" in the terminal or shake device and reload.');
    } catch (error) {
        console.error('[resetApp] Error:', error);
    }
};

// Dashboard screens
import WelcomeScreen from './features/dashboard/screens/WelcomeScreen';
import LoginScreen from './features/dashboard/screens/LoginScreen';
import SecurityQuestionsScreen from './features/dashboard/screens/SecurityQuestionsScreen';
import DashboardScreen from './features/dashboard/screens/DashboardScreen';
import ProcessingScreen from './features/dashboard/screens/ProcessingScreen';

// Block screens
import BlockDetailsForm from './features/blocks/BlockDetailsForm';
import BlockSummary from './features/blocks/BlockSummary';
import BlockDetailsScreen from './features/blocks/BlockDetailsScreen';

// Harvest screens
import HarvestFormScreen from './features/harvest/screens/HarvestFormScreen';
import ProductionHarvestsScreen from './features/harvest/screens/ProductionHarvestsScreen';
import HarvestDetailsScreen from './features/harvest/screens/HarvestDetailsScreen';
import PaymentVoucherScreen from './features/harvest/screens/PaymentVoucherScreen';

// Aggregation screens
import AggregationScreen from './features/Aggregation/screens/AggregationScreen';

// Initialize the stack navigator
const Stack = createNativeStackNavigator();

const App = () => {
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Welcome');
    const [fontsLoaded, setFontsLoaded] = useState(false);

    // Load custom fonts
    useEffect(() => {
        const loadFonts = async () => {
            try {
                console.log('[App] Loading fonts...');
                await Font.loadAsync({
                    'Eina-Regular': require('./assets/fonts/Eina03-Regular.ttf'),
                    'Eina-SemiBold': require('./assets/fonts/Eina03-Bold.ttf'), // Using Bold as SemiBold
                    'Eina-Bold': require('./assets/fonts/Eina03-Bold.ttf'),
                    'Eina-Light': require('./assets/fonts/Eina03-Light.ttf'),
                });
                console.log('[App] Fonts loaded successfully');
                setFontsLoaded(true);
            } catch (error) {
                console.error('[App] Error loading fonts:', error);
                console.error('[App] Error details:', error.message);
                // Continue without custom fonts (will use system fonts)
                setFontsLoaded(true);
            }
        };

        loadFonts();
    }, []);

    // Initialize database and check auth on app start
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Initialize database
                await DatabaseService.init();
                console.log('[App] Database initialized successfully');

                // Check if user has seen welcome screen
                const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');

                // Check if user is already logged in
                const isAuthenticated = await AuthService.isAuthenticated();

                if (isAuthenticated) {
                    console.log('[App] User is authenticated, setting Dashboard as initial route');
                    setInitialRoute('Dashboard');
                } else if (hasSeenWelcome === 'true') {
                    console.log('[App] User has seen welcome, setting Login as initial route');
                    setInitialRoute('Login');
                } else {
                    console.log('[App] First time user, setting Welcome as initial route');
                    setInitialRoute('Welcome');
                }
            } catch (error) {
                console.error('[App] Initialization error:', error);
                setInitialRoute('Welcome');
            } finally {
                setIsCheckingAuth(false);
            }
        };

        initializeApp();
    }, []);

    // Show loading screen while checking auth or loading fonts
    if (isCheckingAuth || !fontsLoaded) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
                <View style={[styles.loadingContainer]}>
                    <ActivityIndicator size="large" color={CoffeeColors.GOLD} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        // 3. Wrap everything in NavigationContainer
        <NavigationContainer>
            <SafeAreaView style={styles.safeArea}>
                <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
                {/* 4. Define the Stack Navigator and its screens */}
                <Stack.Navigator
                    // Set the starting screen based on authentication status
                    initialRouteName={initialRoute}
                    screenOptions={{
                        headerShown: false, // Hide React Navigation header since we use custom Header component
                    }}
                >
                    {/* Welcome screen */}
                    <Stack.Screen
                        name="Welcome"
                        component={WelcomeScreen}
                        options={{ title: 'Welcome' }}
                    />

                    {/* Login screen */}
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ title: 'Login' }}
                    />

                    {/* Security Questions screen - shown on first-time login */}
                    <Stack.Screen
                        name="SecurityQuestions"
                        component={SecurityQuestionsScreen}
                        options={{
                            title: 'Security Questions',
                            animationEnabled: true,
                        }}
                    />

                    {/* Dashboard screen */}
                    <Stack.Screen
                        name="Dashboard"
                        component={DashboardScreen}
                        options={{ title: 'Rugyeyo Farm Dashboard' }}
                    />

                    {/* Aggregation screen */}
                    <Stack.Screen
                        name="Aggregation"
                        component={AggregationScreen}
                        options={{ title: 'Aggregation' }}
                    />

                    {/* Harvest screens */}
                    <Stack.Screen
                        name="Harvests"
                        component={ProductionHarvestsScreen}
                        options={{ title: 'Production Harvests' }}
                    />

                    <Stack.Screen
                        name="HarvestDetails"
                        component={HarvestDetailsScreen}
                        options={{ title: 'Harvest Details' }}
                    />

                    <Stack.Screen
                        name="HarvestForm"
                        component={HarvestFormScreen}
                        options={{ title: 'New Harvest Entry' }}
                    />

                    <Stack.Screen
                        name="PaymentVoucher"
                        component={PaymentVoucherScreen}
                        options={{ title: 'Payment Voucher' }}
                    />

                    {/* Processing screen */}
                    <Stack.Screen
                        name="Processing"
                        component={ProcessingScreen}
                        options={{ title: 'Processing' }}
                    />

                    {/* Block screens */}
                    <Stack.Screen
                        name="BlockSummary"
                        component={BlockSummary}
                        options={{ title: 'Block Summary' }}
                    />

                    <Stack.Screen
                        name="BlockDetails"
                        component={BlockDetailsScreen}
                        options={{ title: 'Block Details' }}
                    />

                    <Stack.Screen
                        name="BlockDetailsForm"
                        component={BlockDetailsForm}
                        options={{ title: 'Add Block Details' }}
                    />

                    <Stack.Screen
                        name="BlockRegistration"
                        component={BlockDetailsForm}
                        options={{ title: 'Block Registration' }}
                    />
                    
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default App;

