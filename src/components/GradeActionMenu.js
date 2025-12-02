import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../theme/colors';
import Fonts from '../theme/fonts';

const GradeActionMenu = ({ visible, onClose, gradeId, gradeData, navigation }) => {
  const handleAction = (action) => {
    console.log(`[GradeActionMenu] Action selected: ${action} for grade: ${gradeId}`);
    onClose(); // Close the menu first

    // Navigate to the appropriate processing form screen with grade ID pre-filled
    switch (action) {
      case 'fermenting':
        navigation.navigate('FermentingForm', {
          gradeId: gradeId,
          autoFillGrade: true
        });
        break;
      case 'washing':
        navigation.navigate('WashingForm', {
          gradeId: gradeId,
          autoFillGrade: true
        });
        break;
      case 'sundrying':
        navigation.navigate('NaturalSundryingForm', {
          gradeId: gradeId,
          autoFillGrade: true
        });
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
            <Ionicons name="water" size={24} color="#2196F3" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Process Grade</Text>
              <Text style={styles.headerSubtitle}>Grade ID: {gradeId}</Text>
            </View>
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color={CoffeeColors.COFFEE_BROWN} />
            <Text style={styles.infoBannerText}>
              Select a processing type. The grade ID will be automatically filled in the form.
            </Text>
          </View>

          {/* Menu Options */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.option}
              onPress={() => handleAction('fermenting')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: CoffeeColors.MEDIUM_BROWN + '15' }]}>
                <Ionicons name="water" size={24} color={CoffeeColors.MEDIUM_BROWN} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Fermenting</Text>
                <Text style={styles.optionDescription}>Record fermenting process</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={CoffeeColors.MEDIUM_BROWN} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.option}
              onPress={() => handleAction('washing')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: CoffeeColors.ACCENT + '15' }]}>
                <Ionicons name="water-outline" size={24} color={CoffeeColors.ACCENT} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Washing</Text>
                <Text style={styles.optionDescription}>Record washing process</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={CoffeeColors.MEDIUM_BROWN} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.option}
              onPress={() => handleAction('sundrying')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FF9800' + '15' }]}>
                <Ionicons name="sunny" size={24} color="#FF9800" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Natural Sundrying</Text>
                <Text style={styles.optionDescription}>Record sundrying process</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={CoffeeColors.MEDIUM_BROWN} />
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: CoffeeColors.DARK_BROWN,
    lineHeight: 18,
  },
  optionsContainer: {
    paddingVertical: 16,
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

export default GradeActionMenu;
