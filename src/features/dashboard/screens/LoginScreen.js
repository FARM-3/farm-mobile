import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Import local utilities and theme
import CoffeeColors from "../../../theme/colors";
import ApiClient from '../../../services/ApiClient';

// --- PIN Login Screen Component (Corrected prop name) ---
const LoginScreen = ({ onNavigate }) => {
  // --- STATE AND REFS (MUST BE INSIDE THE COMPONENT FUNCTION) ---
  const [pin, setPin] = useState(["", "", "", ""]);
  const pinInputRefs = useRef([]);

  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null); // 'error' or 'success'
  const [isLoading, setIsLoading] = useState(false);
  

  // Helper function to clear PIN boxes
  const clearPinBoxes = () => {
    setPin(["", "", "", ""]);
    // Focus the first input box after clearing
    pinInputRefs.current[0] && pinInputRefs.current[0].focus();
  };

  // Function to handle PIN input changes
  const handlePinChange = (text, index) => {
    setMessage(null); // Clear messages on input change
    setMessageType(null);

    const newPin = [...pin];
    const digit = text.slice(-1).replace(/[^0-9]/g, "");
    newPin[index] = digit;
    setPin(newPin);

    // Auto-focus logic
    if (digit.length > 0 && index < 3) {
      pinInputRefs.current[index + 1] && pinInputRefs.current[index + 1].focus();
    }
  };

  // Function to handle backspace on empty field
  const handleBackspace = (event, index) => {
    if (event.nativeEvent.key === "Backspace" && pin[index] === "" && index > 0) {
      pinInputRefs.current[index - 1].focus();
    }
  };

  // *** UPDATED LOGIN FUNCTION WITH VALIDATION AND API CALL ***
  const handleLogin = async () => {
    Keyboard.dismiss();
    setMessage(null);
    setMessageType(null);
    const fullPin = pin.join("");

    // 1. Client-Side Validation
    if (fullPin.length !== 4 || !/^\d{4}$/.test(fullPin)) {
      setMessage("Invalid input: PIN must be exactly 4 numbers.");
      setMessageType("error");
      clearPinBoxes(); 
      return;
    }

    // 2. Server-Side Authentication
    setIsLoading(true);
    try {
      // --- REAL API CALL (Now using imported ApiClient) ---
      const response = await ApiClient.post("login/", { pin: fullPin });

      // Check for success response (adjust based on your actual API structure)
      if (response.status === 200 || response.data?.success) {
        // Successful Login
        setMessage("Login successful!");
        setMessageType("success");
        clearPinBoxes(); 

        // Use the passed onNavigate function (Corrected)
        setTimeout(() => {
          onNavigate("Dashboard");
        }, 1000); 
      } else {
        // Handle server logic rejection (e.g., bad pin)
        setMessage("Invalid PIN.");
        setMessageType("error");
        clearPinBoxes(); 
      }
      
    } catch (error) {
      // Handle server errors (network failure, 401 Unauthorized, etc.)
      const details = {
        message: error.message,
        code: error.code,
        hasRequest: !!error.request,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      };
      console.error("Login API Error details:", details);

      // If server responds 404 for login endpoint, allow a dev fallback
      if (error.response?.status === 404) {
        // Dev fallback: treat PIN '1234' as success so developers can proceed
        if (fullPin === '1234') {
          console.warn('Login endpoint missing; using local dev fallback for PIN 1234');
          setMessage('Login endpoint not found; using local dev login.');
          setMessageType('success');
          clearPinBoxes();
          setTimeout(() => onNavigate('Dashboard'), 800);
        } else {
          setMessage('Login endpoint not found on server (404).');
          setMessageType('error');
          clearPinBoxes();
        }
      } else {
        const errorMessage =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          `Network/Error: ${error.message} (code: ${error.code || 'N/A'})`;

        setMessage(errorMessage);
        setMessageType('error');
        clearPinBoxes();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Update handleResetPin to navigate using onNavigate (Corrected)
  const handleResetPin = () => {
    Keyboard.dismiss();
    onNavigate("ResetPin"); // Assuming 'ResetPin' is the case name in App.js
  };

  const getMessageStyle = () => {
    if (messageType === "error") {
      return [styles.messageBox, styles.errorBox];
    }
    if (messageType === "success") {
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
          <Ionicons
            name="cloud-upload-outline"
            size={48}
            color={CoffeeColors.MEDIUM_BROWN}
          />
        </View>

        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.instructionText}>
          Enter your PIN to securely access your farm data.
        </Text>

        {/* Enter PIN Label */}
        <Text style={styles.enterPinLabel}>Enter PIN</Text>

        {/* PIN Input Boxes */}
        <View
          style={styles.pinInputContainer}
          onStartShouldSetResponder={() => false}
        >
          {pin.map((digit, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={1}
              onPress={() => pinInputRefs.current[index] && pinInputRefs.current[index].focus()}
              style={styles.pinInputBoxTouchable}
            >
              <TextInput
                ref={(el) => (pinInputRefs.current[index] = el)}
                style={styles.pinInputBox}
                value={digit}
                onChangeText={(text) => handlePinChange(text, index)}
                onKeyPress={(event) => handleBackspace(event, index)}
                maxLength={1}
                keyboardType="numeric"
                secureTextEntry
                showSoftInputOnFocus={true}
                onFocus={() => console.log('PIN input focused:', index)}
                editable={!isLoading} // Disable input while loading
                pointerEvents="auto"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Validation/Feedback Message Display */}
        {message && (
          <View style={getMessageStyle()}>
            <Text
              style={
                messageType === "error"
                  ? styles.errorMessageText
                  : styles.successMessageText
              }
            >
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

        {/* removed dev CHECK API button */}

        {/* Reset PIN Link (Updated Text and Style name) */}
        <TouchableOpacity
          style={styles.resetPinLinkContainer}
          onPress={handleResetPin}
          disabled={isLoading}
        >
          <Ionicons
            name="arrow-back-outline"
            size={16}
            color={CoffeeColors.MEDIUM_BROWN}
            style={{ transform: [{ rotateY: "180deg" }] }}
          />
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
    maxWidth: 400, // Added maxWidth for better centering on large screens
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
  pinInputBoxTouchable: {
    marginHorizontal: 8,
    borderRadius: 10,
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
  // Login button
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
    opacity: 0.6,
  },
  loginButtonText: {
    color: CoffeeColors.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Reset PIN link
  resetPinLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetPinLinkText: {
    color: CoffeeColors.MEDIUM_BROWN,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Message box styles
  messageBox: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: '#FFE5E5',
    borderColor: CoffeeColors.RED || '#ff4d4f',
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: '#E6FFE6',
    borderColor: CoffeeColors.GREEN || '#28a745',
    borderWidth: 1,
  },
  errorMessageText: {
    color: CoffeeColors.RED || '#ff4d4f',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  successMessageText: {
    color: CoffeeColors.GREEN || '#28a745',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LoginScreen;
