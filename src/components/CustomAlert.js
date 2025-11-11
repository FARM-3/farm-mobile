import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../theme/colors';
import Fonts from '../theme/fonts';

/**
 * Custom Alert Modal Component
 * Replaces React Native's Alert.alert() with a styled modal
 *
 * @param {boolean} visible - Controls modal visibility
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {string} type - Alert type: 'success', 'error', 'warning', 'info'
 * @param {Array} buttons - Array of button objects with text and onPress properties
 */
const CustomAlert = ({ visible, title, message, type = 'info', buttons = [] }) => {
  // Icon configuration based on alert type
  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          name: 'checkmark-circle',
          color: CoffeeColors.SUCCESS_GREEN || '#4CAF50',
          bgColor: '#E8F5E9',
        };
      case 'error':
        return {
          name: 'close-circle',
          color: CoffeeColors.ERROR_RED || '#F44336',
          bgColor: '#FFEBEE',
        };
      case 'warning':
        return {
          name: 'warning',
          color: CoffeeColors.WARNING_YELLOW || '#FF9800',
          bgColor: '#FFF3E0',
        };
      case 'info':
      default:
        return {
          name: 'information-circle',
          color: CoffeeColors.MEDIUM_BROWN,
          bgColor: CoffeeColors.VERY_LIGHT_BROWN,
        };
    }
  };

  const iconConfig = getIconConfig();

  // Default button if none provided
  const displayButtons = buttons && buttons.length > 0 ? buttons : [
    { text: 'OK', onPress: () => {} }
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        // Call the first button's onPress if modal is dismissed
        if (displayButtons.length > 0 && displayButtons[0].onPress) {
          displayButtons[0].onPress();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconConfig.bgColor }]}>
            <Ionicons name={iconConfig.name} size={48} color={iconConfig.color} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons Container */}
          <View style={styles.buttonContainer}>
            {displayButtons.map((button, index) => {
              const isDestructive = button.style === 'destructive' ||
                                   button.text === 'Delete' ||
                                   button.text === 'Remove';
              const isCancel = button.style === 'cancel' ||
                              button.text === 'Cancel' ||
                              button.text === 'No';
              const isPrimary = !isDestructive && !isCancel;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isDestructive && styles.destructiveButton,
                    isCancel && styles.cancelButton,
                    isPrimary && styles.primaryButton,
                  ]}
                  onPress={button.onPress}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isDestructive && styles.destructiveButtonText,
                      isCancel && styles.cancelButtonText,
                      isPrimary && styles.primaryButtonText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 24,
    padding: 32,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: Fonts.sizes.large || 20,
    fontWeight: Fonts.weights.bold || '700',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: Fonts.sizes.regular || 16,
    fontWeight: Fonts.weights.regular || '400',
    fontFamily: Fonts.regular,
    color: CoffeeColors.GRAY_TEXT,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
  },
  cancelButton: {
    backgroundColor: CoffeeColors.LIGHT_GRAY,
    borderWidth: 1,
    borderColor: CoffeeColors.VERY_LIGHT_BROWN,
  },
  destructiveButton: {
    backgroundColor: CoffeeColors.ERROR_RED || '#F44336',
  },
  buttonText: {
    fontSize: Fonts.sizes.regular || 16,
    fontWeight: Fonts.weights.semiBold || '600',
    fontFamily: Fonts.semiBold,
  },
  primaryButtonText: {
    color: CoffeeColors.WHITE,
  },
  cancelButtonText: {
    color: CoffeeColors.DARK_BROWN,
  },
  destructiveButtonText: {
    color: CoffeeColors.WHITE,
  },
});

export default CustomAlert;
