import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView, View, ActivityIndicator } from 'react-native';

// 1. Import Navigation components
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 2. Import your screens and theme
import CoffeeColors from './theme/colors';

// 3. Import services
import AuthService from './services/AuthService';
import DatabaseService from './services/DatabaseService';

// Dashboard screens
import LoginScreen from './features/dashboard/screens/LoginScreen';
import DashboardScreen from './features/dashboard/screens/DashboardScreen';
import ProcessingScreen from './features/dashboard/screens/ProcessingScreen';

// Block screens
import BlockDetailsForm from './features/blocks/BlockDetailsForm';
import BlockSummary from './features/blocks/BlockSummary';

// Harvest screens
import HarvestFormScreen from './features/harvest/screens/HarvestFormScreen';
import ProductionHarvestsScreen from './features/harvest/screens/ProductionHarvestsScreen';
import HarvestDetailsScreen from './features/harvest/screens/HarvestDetailsScreen';

// Aggregation screens
import AggregationScreen from './features/Aggregation/screens/AggregationScreen';

// Initialize the stack navigator
const Stack = createNativeStackNavigator();

const App = () => {
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Login');

    // Initialize database and check auth on app start
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Initialize database
                await DatabaseService.init();
                console.log('[App] Database initialized successfully');

                // Check if user is already logged in
                const isAuthenticated = await AuthService.isAuthenticated();

                if (isAuthenticated) {
                    console.log('[App] User is authenticated, setting Dashboard as initial route');
                    setInitialRoute('Dashboard');
                } else {
                    console.log('[App] User not authenticated, setting Login as initial route');
                    setInitialRoute('Login');
                }
            } catch (error) {
                console.error('[App] Initialization error:', error);
                setInitialRoute('Login');
            } finally {
                setIsCheckingAuth(false);
            }
        };

        initializeApp();
    }, []);

    // Show loading screen while checking auth
    if (isCheckingAuth) {
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
                    {/* Login screen */}
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ title: 'Login' }}
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
                        options={{ title: 'Block Data Summary' }}
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

