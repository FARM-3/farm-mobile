import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

// --- Color Palette ---
const Colors = {
  coffeeDark: '#4A2B20',       // Main Background
  coffeeMedium: '#8B5C3B',     // Button Background
  cream: '#F5E6CC',            // Text and Light Accents
  espressoDark: '#2C1A14',     // Dark Text/Elements
};

const PinResetScreen = () => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Placeholder function for handling the Confirm button press
  const handleConfirmReset = () => {
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      Alert.alert('Error', 'PINs must be exactly 4 digits long.');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Error', 'New PIN and Confirmation PIN do not match.');
      // Clear the inputs for a fresh attempt
      setNewPin('');
      setConfirmPin('');
      return;
    }

    // Success logic
    Alert.alert('Success', 'Your PIN has been successfully reset!');
    // In a real app, you would send the newPin to your backend here
  };

  // Helper to render the masked PIN entry dots (for a secure UI look)
  const renderPinDots = (pin, isFocused) => {
    const dots = Array(4).fill(0).map((_, index) => (
      <View
        key={index}
        style={[
          styles.pinDot,
          {
            backgroundColor: index < pin.length ? Colors.cream : 'transparent',
            borderColor: isFocused ? Colors.cream : Colors.coffeeMedium,
          },
        ]}
      />
    ));
    return <View style={styles.pinDotContainer}>{dots}</View>;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>RESET PIN</Text>

      {/* --- New PIN Section --- */}
      <View style={styles.inputSection}>
        <Text style={styles.label}>Enter new 4-digit PIN</Text>
        {renderPinDots(newPin, true)}
        {/* Actual hidden TextInput to capture input */}
        <TextInput
          style={styles.hiddenInput}
          value={newPin}
          onChangeText={(text) => setNewPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
          keyboardType="numeric"
          maxLength={4}
          autoFocus={true} // Auto-focus on the first input
          secureTextEntry={true} // Mask the actual input
        />
      </View>

      {/* --- Confirm PIN Section --- */}
      <View style={styles.inputSection}>
        <Text style={styles.label}>Confirm new PIN</Text>
        {renderPinDots(confirmPin, false)}
        {/* Actual hidden TextInput to capture input */}
        <TextInput
          style={styles.hiddenInput}
          value={confirmPin}
          onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry={true} // Mask the actual input
        />
      </View>

      {/* --- Confirm Button --- */}
      <TouchableOpacity
        style={styles.confirmButton}
        onPress={handleConfirmReset}
        disabled={newPin.length !== 4 || confirmPin.length !== 4}
      >
        <Text style={styles.buttonText}>CONFIRM</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.coffeeDark, // Dark coffee background
    padding: 30,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.cream,
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 2,
  },
  label: {
    fontSize: 18,
    color: Colors.cream,
    marginBottom: 10,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  pinDotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: Colors.cream, // Cream border for all dots
  },
  // We use a hidden TextInput to capture input but display the dots instead
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0, // Make the actual input invisible
    color: 'transparent', // Make the text transparent just in case
  },
  confirmButton: {
    backgroundColor: Colors.coffeeMedium, // Medium coffee button color
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 40,
    alignItems: 'center',
    // Minimal shadow for depth
    shadowColor: Colors.espressoDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonText: {
    color: Colors.cream,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default PinResetScreen;