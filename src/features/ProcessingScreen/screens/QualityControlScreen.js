import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CoffeeColors from '../../../theme/colors';
import Fonts from '../../../theme/fonts';
import SimpleHeader from '../../../components/SimpleHeader';
import BottomNav from '../../../components/BottomNav';

export default function QualityControlScreen({ navigation }) {
  const qualityControlSections = [
    {
      id: 1,
      name: 'Ripeness',
      icon: 'fruit-cherries',
      description: 'Monitor and record ripeness scores',
      screen: 'RipenessScreen',
      color: CoffeeColors.COFFEE_BROWN,
    },
    {
      id: 2,
      name: 'Floating',
      icon: 'water',
      description: 'Track floating test results',
      screen: 'FloatingScreen',
      color: CoffeeColors.MEDIUM_BROWN,
    },
  ];

  return (
    <View style={styles.container}>
      <SimpleHeader title="Quality Control" navigation={navigation} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <MaterialCommunityIcons
            name="clipboard-check-outline"
            size={48}
            color={CoffeeColors.COFFEE_BROWN}
          />
          <Text style={styles.headerTitle}>Quality Control</Text>
          <Text style={styles.headerSubtitle}>
            Select a quality control process to manage
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {qualityControlSections.map((section, index) => (
            <View key={section.id}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate(section.screen)}
                activeOpacity={0.7}
              >
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={[styles.iconContainer, { backgroundColor: section.color + '15' }]}>
                  <MaterialCommunityIcons
                    name={section.icon}
                    size={40}
                    color={section.color}
                  />
                </View>
                <Text style={styles.cardTitle}>{section.name}</Text>
                <Text style={styles.cardDescription}>{section.description}</Text>
                <View style={styles.arrowContainer}>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={CoffeeColors.MEDIUM_BROWN}
                  />
                </View>
              </TouchableOpacity>
              {index < qualityControlSections.length - 1 && (
                <View style={styles.connector}>
                  <MaterialCommunityIcons
                    name="arrow-down"
                    size={20}
                    color={CoffeeColors.MEDIUM_BROWN}
                  />
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomNav activeScreen="Processing" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: CoffeeColors.MEDIUM_BROWN,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: 0,
  },
  card: {
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 15,
    padding: 20,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  stepNumber: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CoffeeColors.PRIMARY_BROWN,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepNumberText: {
    color: CoffeeColors.WHITE,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },
  connector: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: CoffeeColors.MEDIUM_BROWN,
    lineHeight: 20,
  },
  arrowContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
});
