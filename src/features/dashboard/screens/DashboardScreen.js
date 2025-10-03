import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 

// Import your defined colors (fixed relative path)
import CoffeeColors from '../../../theme/colors'; 

// DashboardScreen now accepts an onNavigate prop from the parent App component
const DashboardScreen = ({ onNavigate }) => {
  React.useEffect(() => {
    console.log('DashboardScreen mounted');
    return () => console.log('DashboardScreen unmounted');
  }, []);

  console.log('Rendering DashboardScreen');

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
<<<<<<< HEAD
      {/* Header Placeholder */}
      <View style={[styles.header, { borderWidth: 3, borderColor: '#FFD700' }]}>
        <Text style={styles.headerTitle}>Rugyeyo Farm</Text>
        {/* Notification icon uses the bright CREAM accent */}
=======
      {/* Header Placeholder (New addition for better UI) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FMIS Dashboard</Text>
>>>>>>> c4e5b6ae990f9b7eee50f6f3f52f17bcd86dd4c3
        <Ionicons name="notifications-outline" size={24} color={CoffeeColors.CREAM} />
      </View>

  <ScrollView contentContainerStyle={[styles.scrollViewContent, { flex: 1, paddingBottom: 110 }]}>
        {/* CARD 1: Aggregation (Taps navigate to AggregationScreen) */}
        <Card
          iconName="people-outline"
          title="Aggregation"
          description="Record farmer details and harvest weights."
          time="10:30 AM"
          recorder="Sarah"
          color={CoffeeColors.GOLD} // Rich brown accent
          onPress={() => onNavigate('Aggregation')} // Navigation added
        />
        {/* CARD 2: Harvest (Taps navigate to placeholder screen) */}
        <Card
          iconName="leaf-outline"
          title="Harvest"
          description="View and manage recent harvest records."
          time="09:00 AM"
          recorder="David"
          color={CoffeeColors.LIGHT_BROWN} // Muted mid-tone
          onPress={() => onNavigate('Harvests')} // Navigation added
        />
        {/* CARD 3: Processing (Taps navigate to placeholder screen) */}
        <Card
          iconName="home-outline"
          title="Processing"
          description="Track processing stages: washing, drying, hulling."
          time="02:00 PM"
          recorder="Emily"
          color={CoffeeColors.MEDIUM_BROWN} // Dark accent
          onPress={() => onNavigate('Processing')} // Navigation added
        />
        {/* Empty card placeholder */}
        <View style={styles.card} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
  <View style={styles.bottomNavBar} pointerEvents="box-none">
        
        {/* Nav 1: Aggregations (Active Tab) */}
        <TouchableOpacity 
          style={[styles.navItem, styles.navItemActive]} // Marked as active for dashboard
          onPress={() => onNavigate('Aggregation')} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {/* Icon and Text colors use CREAM for active state */}
          <Ionicons name="people-outline" size={24} color={CoffeeColors.CREAM} />
          <Text style={[styles.navText, styles.navTextActive]}>Aggregations</Text>
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
          <Ionicons name="flask-outline" size={24} color={CoffeeColors.LIGHT_BROWN} /> 
          <Text style={styles.navText}>Processing</Text>
        </TouchableOpacity>

        {/* Nav 4: Dashboard (Home) */}
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => onNavigate('Dashboard')} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="grid-outline" size={24} color={CoffeeColors.LIGHT_BROWN} /> 
          <Text style={styles.navText}>Dashboard</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // TEMP DEBUG: bright green so render is obvious
    backgroundColor: '#ffe1d8', 
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    // TEMP DEBUG: magenta header for visual confirmation
    backgroundColor: '#921f00', // Header background: Debug Magenta
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CoffeeColors.WHITE, // Header text: Bright accent
  },
  scrollViewContent: {
    padding: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    width: '48%',
    elevation: 3,
    shadowColor: '#e9876f', // Soft shadow for light theme
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, // Slightly stronger shadow for dark theme contrast
    shadowRadius: 4,
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
    color: '#921f00', // Card title: Darkest text
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
    backgroundColor: '#ffe1d8', // Nav background: Darkest
    borderTopWidth: 1,
    borderTopColor: CoffeeColors.MEDIUM_BROWN, 
    paddingVertical: 10,
    paddingHorizontal: 5,
    // Ensure the bottom nav overlays content and can receive touches
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
  },
  navItemActive: {
    // Background highlight for the active item
    backgroundColor: '#f5b09bff', 
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  navText: {
    fontSize: 10,
    color: '#921f00', // Default nav text: Muted mid-tone
    marginTop: 4,
  },
  navTextActive: {
    color: CoffeeColors.CREAM, // Active nav text: Bright accent
    fontWeight: 'bold',
  },
});

export default DashboardScreen;
