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
import BrandLogo from './components/BrandLogo';

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
import TaskCalendarScreen from './features/dashboard/screens/TaskCalendarScreen';
import ProcessingScreen from './features/dashboard/screens/ProcessingScreen';

// Processing screens
import QualityControlScreen from './features/ProcessingScreen/screens/QualityControlScreen';
import RipenessScreen from './features/ProcessingScreen/screens/RipenessScreen';
import FloatingScreen from './features/ProcessingScreen/screens/FloatingScreen';

// Field operations
import FieldOpsScreen from './features/fieldops/screens/FieldOpsScreen';
import BlockActivityFormScreen from './features/fieldops/screens/BlockActivityFormScreen';
import SurveillanceFormScreen from './features/fieldops/screens/SurveillanceFormScreen';

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
import FarmerDetailScreen from './features/Aggregation/screens/FarmerDetailScreen';
import FarmerHarvestDetailScreen from './features/Aggregation/screens/FarmerHarvestDetailScreen';

// Processing screens
import ProcessingTypeScreen from './features/ProcessingScreen/screens/ProcessingTypeScreen';
import CreateBatchScreen from './features/ProcessingScreen/screens/CreateBatchScreen';
import ViewBatchesScreen from './features/ProcessingScreen/screens/ViewBatchesScreen';
import FermentingSummaryScreen from './features/ProcessingScreen/screens/FermentingSummaryScreen';
import FermentingFormScreen from './features/ProcessingScreen/screens/FermentingFormScreen';
import WashingSummaryScreen from './features/ProcessingScreen/screens/WashingSummaryScreen';
import WashingFormScreen from './features/ProcessingScreen/screens/WashingFormScreen';
import NaturalSundryingSummaryScreen from './features/ProcessingScreen/screens/NaturalSundryingSummaryScreen';
import NaturalSundryingFormScreen from './features/ProcessingScreen/screens/NaturalSundryingFormScreen';
import DryingSummaryScreen from './features/ProcessingScreen/screens/DryingSummaryScreen';
import DryingFormScreen from './features/ProcessingScreen/screens/DryingFormScreen';
import BaggingSummaryScreen from './features/ProcessingScreen/screens/BaggingSummaryScreen';
import BaggingFormScreen from './features/ProcessingScreen/screens/BaggingFormScreen';
import HullingSummaryScreen from './features/ProcessingScreen/screens/HullingSummaryScreen';
import HullingFormScreen from './features/ProcessingScreen/screens/HullingFormScreen';
import { startAutoSyncListener } from './services/autoSyncService';

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

    useEffect(() => {
        const stop = startAutoSyncListener();
        return () => { if (typeof stop === 'function') stop(); };
    }, []);

    // Show loading screen while checking auth or loading fonts
    if (isCheckingAuth || !fontsLoaded) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar style="light" backgroundColor={CoffeeColors.DARK_BROWN} />
                <View style={[styles.loadingContainer]}>
                    <BrandLogo size="lg" showSubtitle />
                    <ActivityIndicator size="large" color={CoffeeColors.GOLD} style={{ marginTop: 24 }} />
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
                        options={{ title: 'FARM FMIS Dashboard' }}
                    />

                    {/* Task Calendar screen */}
                    <Stack.Screen
                        name="TaskCalendar"
                        component={TaskCalendarScreen}
                        options={{ headerShown: false }}
                    />

                    {/* Aggregation screens */}
                    <Stack.Screen
                        name="Aggregation"
                        component={AggregationScreen}
                        options={{ title: 'Aggregation' }}
                    />
                    <Stack.Screen
                        name="FarmerDetailScreen"
                        component={FarmerDetailScreen}
                        options={{ title: 'Farmer Details' }}
                    />
                    <Stack.Screen
                        name="FarmerHarvestDetailScreen"
                        component={FarmerHarvestDetailScreen}
                        options={{ title: 'Harvest Details' }}
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

                    {/* Quality Control screens */}
                    <Stack.Screen
                        name="QualityControl"
                        component={QualityControlScreen}
                        options={{ title: 'Quality Control' }}
                    />

                    <Stack.Screen
                        name="RipenessScreen"
                        component={RipenessScreen}
                        options={{ title: 'Ripeness Scores' }}
                    />

                    <Stack.Screen
                        name="FloatingScreen"
                        component={FloatingScreen}
                        options={{ title: 'Floating Records' }}
                    />

                    {/* Processing Type screens */}
                    <Stack.Screen
                        name="ProcessingType"
                        component={ProcessingTypeScreen}
                        options={{ title: 'Processing Types' }}
                    />

                    {/* Batch screens */}
                    <Stack.Screen
                        name="CreateBatch"
                        component={CreateBatchScreen}
                        options={{ title: 'Create a Batch' }}
                    />

                    <Stack.Screen
                        name="ViewBatches"
                        component={ViewBatchesScreen}
                        options={{ title: 'View Batches' }}
                    />

                    {/* Fermenting screens */}
                    <Stack.Screen
                        name="FermentingSummary"
                        component={FermentingSummaryScreen}
                        options={{ title: 'Fermenting Records' }}
                    />

                    <Stack.Screen
                        name="FermentingForm"
                        component={FermentingFormScreen}
                        options={{ title: 'Fermenting Form' }}
                    />

                    {/* Washing screens */}
                    <Stack.Screen
                        name="WashingSummary"
                        component={WashingSummaryScreen}
                        options={{ title: 'Washing Records' }}
                    />

                    <Stack.Screen
                        name="WashingForm"
                        component={WashingFormScreen}
                        options={{ title: 'Washing Form' }}
                    />

                    {/* Natural Sundrying screens */}
                    <Stack.Screen
                        name="NaturalSundryingSummary"
                        component={NaturalSundryingSummaryScreen}
                        options={{ title: 'Natural Sundrying Records' }}
                    />

                    <Stack.Screen
                        name="NaturalSundryingForm"
                        component={NaturalSundryingFormScreen}
                        options={{ title: 'Natural Sundrying Form' }}
                    />

                    {/* Drying screens */}
                    <Stack.Screen
                        name="DryingSummary"
                        component={DryingSummaryScreen}
                        options={{ title: 'Drying Records' }}
                    />

                    <Stack.Screen
                        name="DryingForm"
                        component={DryingFormScreen}
                        options={{ title: 'Drying Form' }}
                    />

                    {/* Bagging screens */}
                    <Stack.Screen
                        name="BaggingSummary"
                        component={BaggingSummaryScreen}
                        options={{ title: 'Bagging Records' }}
                    />

                    <Stack.Screen
                        name="BaggingForm"
                        component={BaggingFormScreen}
                        options={{ title: 'Bagging Form' }}
                    />

                    <Stack.Screen
                        name="HullingSummary"
                        component={HullingSummaryScreen}
                        options={{ title: 'Hulling Records' }}
                    />

                    <Stack.Screen
                        name="HullingForm"
                        component={HullingFormScreen}
                        options={{ title: 'Hulling Form' }}
                    />

                    {/* Field operations */}
                    <Stack.Screen name="FieldOps" component={FieldOpsScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="BlockActivityForm" component={BlockActivityFormScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="SurveillanceForm" component={SurveillanceFormScreen} options={{ headerShown: false }} />

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

