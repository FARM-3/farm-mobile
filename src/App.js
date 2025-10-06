import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
    StyleSheet, 
    View, 
    SafeAreaView,
    TouchableOpacity, 
    Text // Added Text and TouchableOpacity for placeholder views
} from 'react-native'; 

// 1. Path to Screens (Corrected case for folder)
import DashboardScreen from './features/dashboard/screens/DashboardScreen';
import AggregationScreen from './features/Aggregation/screens/AggregationScreen';
import ProcessingScreen from './features/Processing/screens/ProcessingScreen';
import LoginScreen from './features/dashboard/screens/LoginScreen';

// 2. Path to Color Palette
import CoffeeColors from './theme/colors';

export default function App() {
    // State to manage the currently active screen. Start on 'Login'.
    const [activeScreen, setActiveScreen] = useState('Login');

    // Function to change the active screen state
    const handleNavigate = (screenName) => {
        // Updated to include 'Inventory' and 'Quality' from the Dashboard
        console.log('handleNavigate requested:', screenName);
        if (['Dashboard', 'Aggregation', 'Harvests', 'Processing', 'Inventory', 'Quality', 'Login', 'ResetPin'].includes(screenName)) {
            setActiveScreen(screenName);
            console.log('activeScreen now set to:', screenName);
        }
    };

    // Function to render the correct component based on the active state
    const renderScreen = () => {
        switch (activeScreen) {
            case 'Login':
                return <LoginScreen onNavigate={handleNavigate} />;

            case 'ResetPin':
                // Simple placeholder ResetPin screen for now
                return (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CoffeeColors.LIGHT_GRAY }}>
                        <Text style={{ fontSize: 20, color: CoffeeColors.DARK_BROWN }}>Reset PIN coming soon</Text>
                        <TouchableOpacity onPress={() => handleNavigate('Login')} style={styles.navButton}>
                            <Text style={styles.navButtonText}>Back to Login</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'Dashboard':
                // Pass the navigation function to the dashboard
                return <DashboardScreen onNavigate={handleNavigate} />;
            
            case 'Aggregation':
                // Pass the navigation function to the aggregation screen (for the Exit button)
                return <AggregationScreen onNavigate={handleNavigate} />; 

            // Combined placeholder screens for features not yet built:
            case 'Harvests':
            case 'Inventory': // New route
            case 'Quality':   // New route
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

            case 'Processing':
                return <ProcessingScreen onNavigate={handleNavigate} />;

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
