import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import local utilities and theme
// This assumes CoffeeColors provides constants like DARK_BROWN, CREAM, MEDIUM_BROWN, RED, etc.
import CoffeeColors from '../../../theme/colors';

const PinResetScreen = ({ navigation }) => {
  // --- STATE MODIFICATION: Added oldPin state ---
  const [oldPin, setOldPin] = useState(['', '', '', '']);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);

  // State for which input group is currently focused (0=Old, 1=New, 2=Confirm)
  const [activeInput, setActiveInput] = useState(0);

  // --- REFS MODIFICATION: Added oldPinRefs ---
  const oldPinRefs = useRef([]);
  const newPinRefs = useRef([]);
  const confirmPinRefs = useRef([]);

  // State for validation feedback
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null); // 'error' or 'success'
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to clear the PIN boxes
  const clearAllPinBoxes = () => {
    setOldPin(['', '', '', '']);
    setNewPin(['', '', '', '']);
    setConfirmPin(['', '', '', '']);
    // Focus the first input box after clearing
    oldPinRefs.current[0] && oldPinRefs.current[0].focus();
    setActiveInput(0);
  }

  // Generic handler for individual box input
  const handlePinChange = (text, index, pinState, setPinState, refs) => {
    setMessage(null);
    setMessageType(null);

    const newPinArray = [...pinState];
    // Ensure only the last character is taken and it's a digit
    const digit = text.slice(-1).replace(/[^0-9]/g, '');
    newPinArray[index] = digit;
    setPinState(newPinArray);

    // Auto-focus logic
    if (digit.length > 0) {
      if (index < 3) {
        // Move to the next box in the current set
        refs.current[index + 1] && refs.current[index + 1].focus();
      } else if (index === 3) {
        // If the last box is filled, move focus to the next group's first box
        if (pinState === oldPin) {
          newPinRefs.current[0] && newPinRefs.current[0].focus();
        } else if (pinState === newPin) {
          confirmPinRefs.current[0] && confirmPinRefs.current[0].focus();
        } else {
          // All filled, dismiss keyboard
          Keyboard.dismiss();
        }
      }
    }
  };

  // Generic handler for backspace
  const handleBackspace = (event, index, pinState, refs) => {
    if (event.nativeEvent.key === 'Backspace' && pinState[index] === '' && index > 0) {
      refs.current[index - 1].focus();
    }
  };


  // --- Core Reset Logic ---
  const handleConfirmReset = () => {
    Keyboard.dismiss();
    setMessage(null);
    setMessageType(null);
    setIsLoading(true);

    const fullOldPin = oldPin.join('');
    const fullNewPin = newPin.join('');
    const fullConfirmPin = confirmPin.join('');

    // 1. Client-Side Validation (Length check for all three)
    if (fullOldPin.length !== 4 || fullNewPin.length !== 4 || fullConfirmPin.length !== 4) {
      setMessage('Error: All three PINs must be exactly 4 digits long.');
      setMessageType('error');
      clearAllPinBoxes();
      setIsLoading(false);
      return;
    }

    // 2. Client-Side Validation (New PIN vs Confirm PIN Match check)
    if (fullNewPin !== fullConfirmPin) {
      setMessage('Error: New PIN and Confirmation PIN do not match.');
      setMessageType('error');
      // Only clear the new PINs, keep old PIN for easy re-try
      setNewPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      newPinRefs.current[0].focus(); // Focus on first new pin input
      setActiveInput(1);
      setIsLoading(false);
      return;
    }

    // 3. Client-Side Validation (Prevent reusing old PIN)
    if (fullOldPin === fullNewPin) {
        setMessage('Error: New PIN cannot be the same as the Old PIN.');
        setMessageType('error');
        setNewPin(['', '', '', '']);
        setConfirmPin(['', '', '', '']);
        newPinRefs.current[0].focus();
        setActiveInput(1);
        setIsLoading(false);
        return;
    }

    // 4. API Call (Mocked)
    // In a real app, the API would first validate the fullOldPin against the stored PIN
    // If validated, it would then update the stored PIN to fullNewPin
    setTimeout(() => {
        // Mocking a successful API call
        // In a failure scenario, you would set message/messageType to 'error'
        setMessage('Success: Your PIN has been securely reset!');
        setMessageType('success');
        clearAllPinBoxes(); // Clears all inputs after successful reset
        setIsLoading(false);

        // Redirect back to Login after success
        setTimeout(() => {
            navigation.navigate('Login');
        }, 1500);

    }, 1500);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Check if ALL three PIN fields are filled
  const isConfirmDisabled =
    oldPin.join('').length !== 4 ||
    newPin.join('').length !== 4 ||
    confirmPin.join('').length !== 4 ||
    isLoading;

  const getMessageStyle = () => {
    if (messageType === 'error') {
      return [styles.messageBox, styles.errorBox];
    }
    if (messageType === 'success') {
      return [styles.messageBox, styles.successBox];
    }
    return null;
  };

  const renderPinInputs = (pinState, setPinState, refs, currentActiveInput) => (
    <View style={styles.pinInputContainer}>
      {pinState.map((digit, index) => (
        <TextInput
          key={index}
          ref={el => refs.current[index] = el}
          style={[
            styles.pinInputBox,
            {
              // Control border and background colors based on active state
              borderColor: activeInput === currentActiveInput ? CoffeeColors.CREAM : CoffeeColors.MEDIUM_BROWN,
              backgroundColor: activeInput === currentActiveInput ? CoffeeColors.ESPRESSO_DARK : CoffeeColors.DARK_BROWN,
            }
          ]}
          value={digit}
          onChangeText={text => handlePinChange(text, index, pinState, setPinState, refs)}
          onKeyPress={event => handleBackspace(event, index, pinState, refs)}
          onFocus={() => {
            if (refs === oldPinRefs) setActiveInput(0);
            if (refs === newPinRefs) setActiveInput(1);
            if (refs === confirmPinRefs) setActiveInput(2);
          }}
          maxLength={1}
          keyboardType="number-pad"
          secureTextEntry
          caretHidden={true}
          editable={!isLoading}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={handleGoBack} style={styles.backButton} disabled={isLoading}>
        <Ionicons name="arrow-back-outline" size={24} color={CoffeeColors.CREAM} />
      </TouchableOpacity>

      <Text style={styles.headerText}>RESET PIN</Text>

      {/* Validation/Feedback Message Display */}
      {message && (
        <View style={getMessageStyle()}>
          <Text style={messageType === 'error' ? styles.errorMessageText : styles.successMessageText}>
            {message}
          </Text>
        </View>
      )}

      {/* --- ADDED: Old PIN Section --- */}
      <View style={styles.inputSection}>
        <Text style={styles.label}>Enter current 4-digit PIN</Text>
        {renderPinInputs(oldPin, setOldPin, oldPinRefs, 0)}
      </View>

      {/* --- New PIN Section --- */}
      <View style={styles.inputSection}>
        <Text style={styles.label}>Enter new 4-digit PIN</Text>
        {renderPinInputs(newPin, setNewPin, newPinRefs, 1)}
      </View>

      {/* --- Confirm PIN Section --- */}
      <View style={styles.inputSection}>
        <Text style={styles.label}>Confirm new PIN</Text>
        {renderPinInputs(confirmPin, setConfirmPin, confirmPinRefs, 2)}
      </View>

      {/* --- Confirm Button --- */}
      <TouchableOpacity
        style={[styles.confirmButton, isConfirmDisabled && styles.disabledButton]}
        onPress={handleConfirmReset}
        disabled={isConfirmDisabled}
      >
        {isLoading ? (
          <ActivityIndicator color={CoffeeColors.CREAM} />
        ) : (
          <Text style={styles.buttonText}>CONFIRM</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

// --- Stylesheet ---
// (No changes needed to styles, but I've kept them for completeness)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.DARK_BROWN,
    padding: 30,
    paddingTop: Platform.OS === 'android' ? 60 : 30,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 30 : 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: CoffeeColors.CREAM,
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 2,
  },
  label: {
    fontSize: 18,
    color: CoffeeColors.CREAM,
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 20, // Slightly reduced margin to fit all three inputs
    alignItems: 'center',
  },
  pinInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pinInputBox: {
    width: 45, // Slightly reduced width to fit on smaller screens
    height: 45, // Slightly reduced height
    borderRadius: 8,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 22, // Slightly reduced font size
    fontWeight: 'bold',
    color: CoffeeColors.CREAM,
    marginHorizontal: 5,
  },
  // --- Message Box Styles ---
  messageBox: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 400,
  },
  errorBox: {
    backgroundColor: CoffeeColors.RED_LIGHT,
    borderColor: CoffeeColors.RED,
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: CoffeeColors.GREEN_LIGHT,
    borderColor: CoffeeColors.GREEN,
    borderWidth: 1,
  },
  errorMessageText: {
    color: CoffeeColors.RED,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  successMessageText: {
    color: CoffeeColors.GREEN,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // --------------------------------------------------------
  confirmButton: {
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20, // Reduced margin
    alignItems: 'center',
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: CoffeeColors.CREAM,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default PinResetScreen;