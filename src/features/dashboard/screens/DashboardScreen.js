import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import CoffeeColors from '../../../theme/colors';
import Header from '../../../components/Header';
import BottomNav from '../../../components/BottomNav';

const DashboardScreen = ({ navigation }) => {
  // Card component
  const Card = ({ iconName, title, description, time, recorder, color, onPress }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Ionicons name={iconName} size={24} color={color} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
      <Text style={styles.cardInfo}>{time} • Recorded by {recorder}</Text>
    </TouchableOpacity>
  );

  // Placeholder navigation handler for screens not yet added to navigator
  const handleComingSoon = (featureName) => {
    Alert.alert(
      `${featureName} Coming Soon`,
      `The ${featureName} feature is currently under development.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header title="Rugyeyo Farm" navigation={navigation} />

      <ScrollView contentContainerStyle={[styles.scrollViewContent, { paddingBottom: 110 }]}>
        <Card
          iconName="people-outline"
          title="Aggregation"
          description="Record farmer details and harvest weights."
          time="10:30 AM"
          recorder="Sarah"
          color={CoffeeColors.GOLD}
          onPress={() => navigation.navigate('Aggregation')}
        />
        <Card
          iconName="leaf-outline"
          title="Harvest"
          description="View and manage recent harvest records."
          time="09:00 AM"
          recorder="David"
          color={CoffeeColors.LIGHT_BROWN}
          onPress={() => navigation.navigate('Harvests')}
        />
        <Card
          iconName="grid-outline"
          title="Blocks"
          description="Manage coffee farm blocks and field data."
          time="11:00 AM"
          recorder="James"
          color={CoffeeColors.MEDIUM_BROWN}
          onPress={() => navigation.navigate('BlockSummary')}
        />
        <Card
          iconName="cube-outline"
          title="Processing"
          description="Track processing stages: washing, drying, hulling."
          time="02:00 PM"
          recorder="Emily"
          color={CoffeeColors.DARK_BROWN}
          onPress={() => navigation.navigate('Processing')}
        />
        <Card
          iconName="archive-outline"
          title="Inventory"
          description="Manage parchment and green bean stock locations."
          time="04:00 PM"
          recorder="John"
          color={CoffeeColors.GOLD}
          onPress={() => handleComingSoon('Inventory')}
        />
        <Card
          iconName="sparkles-outline"
          title="Quality Control (QC)"
          description="Log cup scores, moisture, and defect analysis."
          time="08:00 AM"
          recorder="Aisha"
          color={CoffeeColors.ACCENT}
          onPress={() => handleComingSoon('Quality Control')}
        />
        {/* Empty card placeholder to maintain grid layout */}
        <View style={styles.card} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNav activeScreen="Dashboard" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
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
});

export default DashboardScreen;
