import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert, // Keeping Alert for now, but will replace with custom UI later
  Platform,
  Keyboard,
  ActivityIndicator, // Added for loading state
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Import local utilities and theme
import CoffeeColors from '../../../theme/colors';
// Import the centralized API client for Django calls
import apiClient from '../../../services/apiClient'; 

// --- PIN Login Screen Component ---
const LoginScreen = () => {
  // State for PIN input
  const [pin, setPin] = useState(['', '', '', '']); 
  const pinInputRefs = useRef([]);

  // NEW STATE for validation feedback
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null); // 'error' or 'success'
  const [isLoading, setIsLoading] = useState(false);

  // Function to handle PIN input changes
  const handlePinChange = (text, index) => {
    setMessage(null); // Clear messages on input change
    setMessageType(null);

    const newPin = [...pin];
    // Ensure only the last character is taken and it's a digit (though keyboardType helps)
    const digit = text.slice(-1).replace(/[^0-9]/g, ''); 
    newPin[index] = digit;
    setPin(newPin); 

    // Auto-focus logic
    if (digit.length > 0 && index < 3) {
      pinInputRefs.current[index + 1] && pinInputRefs.current[index + 1].focus();
    }
  };

  // Function to handle backspace on empty field
  const handleBackspace = (event, index) => {
    if (event.nativeEvent.key === 'Backspace' && pin[index] === '' && index > 0) {
      pinInputRefs.current[index - 1].focus();
    }
  };

  // *** UPDATED LOGIN FUNCTION WITH VALIDATION AND API CALL ***
  const handleLogin = async () => {
    Keyboard.dismiss();
    setMessage(null);
    setMessageType(null);
    const fullPin = pin.join('');

    // 1. Client-Side Validation
    if (fullPin.length === 0) {
      setMessage('Invalid input: Please enter your 4-digit PIN.');
      setMessageType('error');
      return;
    }
    if (fullPin.length !== 4 || !/^\d{4}$/.test(fullPin)) {
      setMessage('Invalid input: PIN must be exactly 4 numbers.');
      setMessageType('error');
      return;
    }

    // 2. Server-Side Authentication
    setIsLoading(true);
    try {
      // Assuming Django has a 'login/' endpoint expecting the 'pin' in the body
      const response = await apiClient.post('login/', { pin: fullPin });
      
      // Successfully received response
      if (response.status === 200 && response.data.token) {
        // Successful Login (Simulated: Django returns token)
        setMessage('Login successful!');
        setMessageType('success');
        // TODO: Save token using SecureStore and navigate to Dashboard
      } else {
        // Logic for successful status but invalid credentials (e.g., specific Django message)
        setMessage(response.data.message || 'Invalid PIN or credentials.');
        setMessageType('error');
      }

    } catch (error) {
      // Handle server errors (e.g., 401 Unauthorized, 400 Bad Request, network failure)
      const errorMessage = error.response?.data?.detail 
                         || error.response?.data?.message 
                         || 'Invalid PIN or network error.';
      setMessage(errorMessage);
      setMessageType('error');
      console.error('Login API Error:', error);

    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPin = () => {
      Keyboard.dismiss();
      Alert.alert('PIN Reset', 'Initiating PIN reset process...');
  }

  const getMessageStyle = () => {
    if (messageType === 'error') {
      return [styles.messageBox, styles.errorBox];
    }
    if (messageType === 'success') {
      return [styles.messageBox, styles.successBox];
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Page Title */}
      <Text style={styles.pageTitle}>PIN Login</Text>

      {/* Main Content Card */}
      <View style={styles.card}>
        {/* Cloud Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-upload-outline" size={48} color={CoffeeColors.MEDIUM_BROWN} />
        </View>

        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.instructionText}>
          Enter your PIN to securely access your farm data.
        </Text>

        {/* Enter PIN Label */}
        <Text style={styles.enterPinLabel}>Enter PIN</Text>

        {/* PIN Input Boxes */}
        <View style={styles.pinInputContainer}>
          {pin.map((digit, index) => (
            <TextInput
              key={index}
              ref={el => pinInputRefs.current[index] = el}
              style={styles.pinInputBox}
              value={digit}
              onChangeText={text => handlePinChange(text, index)} 
              onKeyPress={event => handleBackspace(event, index)}
              maxLength={1}
              keyboardType="number-pad"
              secureTextEntry
              caretHidden={true}
              editable={!isLoading} // Disable input while loading
            />
          ))}
        </View>
        
        {/* Validation/Feedback Message Display */}
        {message && (
          <View style={getMessageStyle()}>
            <Text style={messageType === 'error' ? styles.errorMessageText : styles.successMessageText}>
              {message}
            </Text>
          </View>
        )}

        {/* Login Button (Updated Text and Style name) */}
        <TouchableOpacity 
          style={[styles.loginButton, isLoading && styles.disabledButton]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={CoffeeColors.WHITE} />
          ) : (
            <Text style={styles.loginButtonText}>LOGIN</Text> 
          )}
        </TouchableOpacity>

        {/* Reset PIN Link (Updated Text and Style name) */}
        <TouchableOpacity 
          style={styles.resetPinLinkContainer} 
          onPress={handleResetPin} 
          disabled={isLoading}
        >
          <Ionicons name="arrow-back-outline" size={16} color={CoffeeColors.MEDIUM_BROWN} style={{transform: [{ rotateY: '180deg'}]}} />
          <Text style={styles.resetPinLinkText}> Reset PIN</Text> 
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 0,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'normal',
    color: CoffeeColors.GRAY_TEXT,
    alignSelf: 'flex-start',
    marginBottom: 20,
    marginTop: 20,
  },
  card: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: CoffeeColors.CREAM,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 20,
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: CoffeeColors.GRAY_TEXT,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  enterPinLabel: {
    fontSize: 16,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 15,
    fontWeight: '500',
  },
  pinInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10, // Reduced margin to make space for message
  },
  pinInputBox: {
    width: 55,
    height: 55,
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CoffeeColors.LIGHT_BROWN,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: CoffeeColors.DARK_BROWN,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  // --- NEW STYLES FOR MESSAGE BOX ---
  messageBox: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: '#FFE5E5', // Light Red background
    borderColor: CoffeeColors.RED, // Red border
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: '#E6FFE6', // Light Green background
    borderColor: CoffeeColors.GREEN, // Green border
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
  // ----------------------------------
  // Updated style name from loginButton
  loginButton: {
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.6, // Dim button when loading
  },
  // Updated style name from loginButtonText
  loginButtonText: {
    color: CoffeeColors.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Updated style name from resetPinLinkContainer
  resetPinLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Updated style name from resetPinLinkText
  resetPinLinkText: {
    color: CoffeeColors.MEDIUM_BROWN,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Added color definitions for clarity (assuming these exist in theme/colors.js)
  RED: { color: '#D9534F' }, 
  GREEN: { color: '#5CB85C' },
});

export default LoginScreen;
