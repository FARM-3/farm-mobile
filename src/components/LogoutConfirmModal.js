import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CoffeeColors from '../theme/colors';
import Fonts from '../theme/fonts';

/**
 * Custom Logout Confirmation Modal
 * Uses app design system with brown theme
 */
const LogoutConfirmModal = ({ visible, onConfirm, onCancel }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="log-out-outline" size={48} color={CoffeeColors.DARK_BROWN} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Logout</Text>

          {/* Message */}
          <Text style={styles.message}>
            Are you sure you want to log out?
          </Text>

          {/* Button Container */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>Logout</Text>
            </TouchableOpacity>
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
    width: '80%',
    maxWidth: 360,
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
    backgroundColor: CoffeeColors.VERY_LIGHT_BROWN,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: Fonts.sizes.large,
    fontWeight: Fonts.weights.bold,
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: Fonts.sizes.regular,
    fontWeight: Fonts.weights.regular,
    fontFamily: Fonts.regular,
    color: CoffeeColors.GRAY_TEXT,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: CoffeeColors.LIGHT_GRAY,
    borderWidth: 1,
    borderColor: CoffeeColors.VERY_LIGHT_BROWN,
  },
  cancelButtonText: {
    fontSize: Fonts.sizes.regular,
    fontWeight: Fonts.weights.semiBold,
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
  },
  confirmButton: {
    backgroundColor: CoffeeColors.PRIMARY_BROWN,
  },
  confirmButtonText: {
    fontSize: Fonts.sizes.regular,
    fontWeight: Fonts.weights.semiBold,
    fontFamily: Fonts.semiBold,
    color: '#fff',
  },
});

export default LogoutConfirmModal;
