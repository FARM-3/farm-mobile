import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CoffeeColors from '../theme/colors';
import Fonts from '../theme/fonts';

const HarvestActionMenu = ({ visible, onClose, harvestId, harvestData, navigation }) => {
  const handleAction = (action) => {
    console.log(`[HarvestActionMenu] Action selected: ${action} for harvest: ${harvestId}`);
    onClose(); // Close the menu first

    // Navigate to the appropriate screen with harvest ID pre-filled
    switch (action) {
      case 'ripeness':
        navigation.navigate('RipenessScreen', {
          harvestId: harvestId,
          autoOpenForm: true
        });
        break;
      case 'floating':
        navigation.navigate('FloatingScreen', {
          harvestId: harvestId,
          autoOpenForm: true
        });
        break;
      case 'sundrying':
        // TODO: Navigate to Natural Sun Drying screen when created
        console.log('[HarvestActionMenu] Natural Sun Drying screen not yet implemented');
        alert('Natural Sun Drying feature coming soon!');
        break;
      case 'fermenting':
        // TODO: Navigate to Fermenting screen when created
        console.log('[HarvestActionMenu] Fermenting screen not yet implemented');
        alert('Fermenting feature coming soon!');
        break;
      default:
        break;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.menuContainer}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="coffee" size={24} color={CoffeeColors.COFFEE_BROWN} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Process Harvest</Text>
              <Text style={styles.headerSubtitle}>ID: {harvestId}</Text>
            </View>
          </View>

          {/* Menu Options */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.option}
              onPress={() => handleAction('ripeness')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: CoffeeColors.COFFEE_BROWN + '15' }]}>
                <MaterialCommunityIcons name="fruit-cherries" size={24} color={CoffeeColors.COFFEE_BROWN} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Record Ripeness Score</Text>
                <Text style={styles.optionDescription}>Test cherry ripeness quality</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={CoffeeColors.MEDIUM_BROWN} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.option}
              onPress={() => handleAction('floating')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#2196F3' + '15' }]}>
                <MaterialCommunityIcons name="water" size={24} color="#2196F3" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Floating Test</Text>
                <Text style={styles.optionDescription}>Separate grades A & B</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={CoffeeColors.MEDIUM_BROWN} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.option}
              onPress={() => handleAction('sundrying')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FF9800' + '15' }]}>
                <MaterialCommunityIcons name="white-balance-sunny" size={24} color="#FF9800" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Natural Sun Drying</Text>
                <Text style={styles.optionDescription}>Record drying process</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={CoffeeColors.MEDIUM_BROWN} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.option}
              onPress={() => handleAction('fermenting')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#9C27B0' + '15' }]}>
                <MaterialCommunityIcons name="flask" size={24} color="#9C27B0" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Fermenting</Text>
                <Text style={styles.optionDescription}>Record fermentation process</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={CoffeeColors.MEDIUM_BROWN} />
            </TouchableOpacity>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: CoffeeColors.LIGHT_GRAY,
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  optionsContainer: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: CoffeeColors.MEDIUM_BROWN,
  },
  divider: {
    height: 1,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
    marginHorizontal: 20,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: CoffeeColors.LIGHT_GRAY,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.MEDIUM_BROWN,
  },
});

export default HarvestActionMenu;
