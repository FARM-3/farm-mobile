import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 

// --- 1. Corrected Import of Named Colors ---
// Adjusting the path to ensure it correctly finds the colors file 
// (Assuming PinLoginScreen is two levels deep and colors is one level up from src)
import { CoffeeColors } from '../../../theme/colors'; 

// --- PIN Login Screen Component ---
const PinLoginScreen = () => {
  const [pin, setPin] = useState(['', '', '', '']); 
  const pinInputRefs = useRef([]); 

  // Function to handle PIN input changes
  const handlePinChange = (text, index) => {
    const newPin = [...pin];
    newPin[index] = text.slice(-1); 
    setPin(newPin);

    // Auto-focus logic
    if (text.length > 0 && index < 3) {
      pinInputRefs.current[index + 1].focus();
    }
  };

  // Function to handle backspace on empty field
  const handleBackspace = (event, index) => {
    if (event.nativeEvent.key === 'Backspace' && pin[index] === '' && index > 0) {
      pinInputRefs.current[index - 1].focus();
    }
  };

  const handleUnlock = () => {
    Keyboard.dismiss(); 
    const fullPin = pin.join('');
    if (fullPin.length === 4) {
      // NOTE: In a real app, you would use navigation.navigate('Dashboard') here
      Alert.alert('Unlock Attempt', `PIN entered: ${fullPin}`);
    } else {
      Alert.alert('Invalid PIN', 'Please enter your 4-digit PIN.');
    }
  };

  const handleLogout = () => {
    Keyboard.dismiss(); 
    Alert.alert('Logout', 'Logging out...');
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

        {/* Welcome Back Text */}
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
            />
          ))}
        </View>

        {/* Unlock Button */}
        <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock}>
          <Text style={styles.unlockButtonText}>Unlock</Text>
        </TouchableOpacity>

        {/* Logout Link */}
        <TouchableOpacity style={styles.logoutLinkContainer} onPress={handleLogout}>
          <Ionicons name="arrow-back-outline" size={16} color={CoffeeColors.MEDIUM_BROWN} style={{transform: [{ rotateY: '180deg'}]}} />
          <Text style={styles.logoutLinkText}> Logout</Text>
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
    marginBottom: 30,
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
  unlockButton: {
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
  unlockButtonText: {
    color: CoffeeColors.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutLinkText: {
    color: CoffeeColors.MEDIUM_BROWN,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PinLoginScreen;
