import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../../../theme/colors';

// --- Color Definitions (Ensuring they are set for this file) ---
// NOTE: These should ideally be in 'theme/colors.js' only, 
// but defining them here prevents errors if they are missing in the imported file.
CoffeeColors.GOLD = '#c39e00';
CoffeeColors.ACCENT = '#ff6347';
CoffeeColors.LIGHT_BROWN = '#a0522d';
CoffeeColors.MEDIUM_BROWN = '#8d6e63';
CoffeeColors.DARK_BROWN = '#4e342e';
CoffeeColors.CREAM = '#fbe9e7';
CoffeeColors.WHITE = '#ffffff';
CoffeeColors.LIGHT_GRAY = '#f5f5f5';
CoffeeColors.GRAY_TEXT = '#757575';
// Assuming 'DARK_BROWN_BROWN' was intended to be a variation of dark brown for nav text
CoffeeColors.DARK_BROWN_BROWN = '#3e2723'; 

const DashboardScreen = ({ onNavigate }) => {
    // Card component now accepts an onPress handler
    const Card = ({ iconName, title, description, time, recorder, color, onPress }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
            <View style={styles.cardHeader}>
                {/* All icons now use Ionicons */}
                <Ionicons name={iconName} size={24} color={color} />
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <Text style={styles.cardDescription}>{description}</Text>
            <Text style={styles.cardInfo}>{time} • Recorded by {recorder}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Rugyeyo Farm</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Notification icon uses the bright CREAM accent */}
                    <Ionicons name="notifications-outline" size={24} color={CoffeeColors.CREAM} style={{ marginRight: 12 }} />
                    {/* Logout button */}
                    <TouchableOpacity
                        onPress={() => {
                            // Using standard Alert for simplicity
                            Alert.alert(
                                'Logout',
                                'Are you sure you want to log out?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Yes', style: 'destructive', onPress: () => {
                                        // Navigate back to Login
                                        onNavigate('Login'); 
                                    } }
                                ]
                            );
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="log-out-outline" size={22} color={CoffeeColors.CREAM} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.scrollViewContent, { paddingBottom: 110 }]}>
                {/* CARD 1: Aggregation */}
                <Card
                    iconName="people-outline"
                    title="Aggregation"
                    description="Record farmer details and harvest weights."
                    time="10:30 AM"
                    recorder="Sarah"
                    color={CoffeeColors.GOLD}
                    onPress={() => onNavigate('Aggregation')} 
                />
                {/* CARD 2: Harvest */}
                <Card
                    iconName="leaf-outline"
                    title="Harvest"
                    description="View and manage recent harvest records."
                    time="09:00 AM"
                    recorder="David"
                    color={CoffeeColors.LIGHT_BROWN}
                    onPress={() => onNavigate('Harvests')} 
                />
                {/* CARD 3: Processing */}
                <Card
                    iconName="cube-outline"
                    title="Processing"
                    description="Track processing stages: washing, drying, hulling."
                    time="02:00 PM"
                    recorder="Emily"
                    color={CoffeeColors.MEDIUM_BROWN}
                    onPress={() => onNavigate('Processing')} 
                />
                {/* CARD 4: Inventory */}
                <Card
                    iconName="archive-outline" 
                    title="Inventory"
                    description="Manage parchment and green bean stock locations."
                    time="04:00 PM"
                    recorder="John"
                    color={CoffeeColors.DARK_BROWN} 
                    onPress={() => onNavigate('Inventory')}
                />
                {/* CARD 5: Quality */}
                <Card
                    iconName="sparkles-outline" 
                    title="Quality Control (QC)"
                    description="Log cup scores, moisture, and defect analysis."
                    time="08:00 AM"
                    recorder="Aisha"
                    color={CoffeeColors.ACCENT}
                    onPress={() => onNavigate('Quality')}
                />
                {/* Empty card placeholder to maintain grid layout */}
                <View style={styles.card} />
            </ScrollView>

            {/* Bottom Navigation Bar */}
            <View style={styles.bottomNavBar}>
                
                {/* Nav 1: Aggregations */}
                <TouchableOpacity 
                    style={styles.navItem}
                    onPress={() => onNavigate('Aggregation')} 
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="people-outline" size={24} color={CoffeeColors.LIGHT_BROWN} />
                    <Text style={styles.navText}>Aggregations</Text>
                </TouchableOpacity>
                
                {/* Nav 2: Harvests */}
                <TouchableOpacity 
                    style={styles.navItem} 
                    onPress={() => onNavigate('Harvests')} 
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="leaf-outline" size={24} color={CoffeeColors.LIGHT_BROWN} />
                    <Text style={styles.navText}>Harvests</Text>
                </TouchableOpacity>
                
                {/* Nav 3: Processing */}
                <TouchableOpacity 
                    style={styles.navItem} 
                    onPress={() => onNavigate('Processing')} 
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="cube-outline" size={24} color={CoffeeColors.LIGHT_BROWN} /> 
                    <Text style={styles.navText}>Processing</Text>
                </TouchableOpacity>

                {/* Nav 4: Dashboard (Home - Active Tab) */}
                <TouchableOpacity 
                    style={[styles.navItem, styles.navItemActive]} 
                    onPress={() => onNavigate('Dashboard')} 
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="grid-outline" size={24} color={CoffeeColors.CREAM} /> 
                    <Text style={[styles.navText, styles.navTextActive]}>Dashboard</Text>
                </TouchableOpacity>

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CoffeeColors.LIGHT_GRAY, 
    },
    header: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: CoffeeColors.DARK_BROWN,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        shadowColor: '#321a07ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: CoffeeColors.CREAM,
    },
    scrollViewContent: {
        padding: 15,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        backgroundColor: CoffeeColors.WHITE,
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        width: '48%',
        elevation: 5,
        shadowColor: CoffeeColors.DARK_BROWN, 
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, 
        shadowRadius: 5,
        minHeight: 180,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
        color: CoffeeColors.DARK_BROWN,
    },
    cardDescription: {
        fontSize: 14,
        color: CoffeeColors.GRAY_TEXT,
        marginBottom: 5,
    },
    cardInfo: {
        fontSize: 12,
        color: CoffeeColors.GRAY_TEXT,
    },
    
    // --- Navigation Styles ---
    bottomNavBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: CoffeeColors.LIGHT_GRAY,
        borderTopWidth: 1,
        borderTopColor: CoffeeColors.MEDIUM_BROWN, 
        paddingVertical: 10,
        paddingHorizontal: 5,
        paddingBottom: 30, // Extra padding for safe area
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
        elevation: 16,
    },
    navItem: {
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    navItemActive: {
        backgroundColor: CoffeeColors.MEDIUM_BROWN, 
        borderRadius: 8,
    },
    navText: {
        fontSize: 10,
        color: CoffeeColors.DARK_BROWN_BROWN,
        marginTop: 4,
    },
    navTextActive: {
        color: CoffeeColors.CREAM,
        fontWeight: 'bold',
    },
});

export default DashboardScreen;
