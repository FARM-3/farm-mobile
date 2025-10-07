import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; 

// --- Coffee Theme ---
const CoffeeColors = {
  SCREEN_BG: '#FFF8F6',
  LIGHT_BG: '#FEEFEA',
  DARK_BROWN: '#4A3423',
  BUTTON_BROWN: '#8B4513',
  MEDIUM_BROWN: '#795548',
  LIGHT_BROWN: '#BCAAA4',
  GOLD: '#FFD700',
  WHITE: '#FFFFFF',
  GRAY_TEXT: '#8D8D8D',
  ERROR_RED: '#D32F2F',
  SUCCESS_GREEN: '#4CAF50',
};

// --- Mock API Client (FIXED SYNTAX AND DELAY) ---
const ApiClient = {
  post: async (url, data) => {
    console.log('API Called:', url, 'Data:', data);
    // FIX: Delay set to 0 for instant response
    await new Promise((r) => setTimeout(r, 0)); 

    // MOCK LOGIN - Accept ANY 10-digit phone and any 4-digit PIN for testing
    if (url === "login/") {
      console.log('Login attempt - Phone:', data.phone_number, 'PIN:', data.pin);
      
      if (data.phone_number.length === 10 && data.pin.length === 4) {
        console.log('Login SUCCESS');
        return { status: 200, data: { success: true, token: "mock-token" } }; 
      } else {
        console.log('Login FAILED - Invalid format or credentials');
        throw new Error("Invalid credentials");
      }
    } 
     
    // MOCK FOR CHANGE PIN
    if (url === "change-pin/") {
      const { phone_number, old_pin, new_pin } = data;
      // Original mock logic from your code:
      if (phone_number === "0123456789" && old_pin === "1234" && new_pin.length === 4) {
        return { status: 200, data: { success: true, message: "PIN changed successfully" } };
      } else if (old_pin !== "1234") {
        throw new Error("Invalid old PIN");
      } else {
        throw new Error("Phone number or PIN invalid");
      }
    }

    // Default case if no mock logic matches
    return { status: 500, data: { success: false, message: "Internal Server Error" } };
  }
};

// --- Main Component ---
export default function LoginScreen({ onNavigate }) {
  // --- STATE ---
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const pinRefs = useRef([]);

  // CHANGE PIN Mode
  const [isChangePinMode, setIsChangePinMode] = useState(false);
  const [oldPinChange, setOldPinChange] = useState(["", "", "", ""]);
  const [newPinChange, setNewPinChange] = useState(["", "", "", ""]);
  const [confirmPinChange, setConfirmPinChange] = useState(["", "", "", ""]);
  const oldPinChangeRefs = useRef([]);
  const newPinChangeRefs = useRef([]);
  const confirmPinChangeRefs = useRef([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [focusedField, setFocusedField] = useState({ row: null, idx: null });

  // --- LOGIC FUNCTIONS ---

  const getMessageStyle = () => {
    if (messageType === "error") return [styles.messageBox, styles.errorBox];
    if (messageType === "success") return [styles.messageBox, styles.successBox];
    return null;
  };

  const handlePinChange = (value, index, type) => {
    setMessage("");
    setMessageType("");

    const newVal = value.replace(/[^0-9]/g, "").slice(-1);
    let setFn, refList, currentPin;

    switch (type) {
      case 'login': setFn = setPin; refList = pinRefs; currentPin = pin; break;
      case 'old': setFn = setOldPinChange; refList = oldPinChangeRefs; currentPin = oldPinChange; break;
      case 'new': setFn = setNewPinChange; refList = newPinChangeRefs; currentPin = newPinChange; break;
      case 'confirm': setFn = setConfirmPinChange; refList = confirmPinChangeRefs; currentPin = confirmPinChange; break;
      default: return;
    }

    const updated = [...currentPin];
    updated[index] = newVal;
    setFn(updated);

    setFocusedField({ row: type, idx: index });

    // Auto-advance focus
    if (newVal && index < 3) refList.current[index + 1]?.focus();
    if (type === 'old' && index === 3 && newVal) newPinChangeRefs.current[0]?.focus();
    if (type === 'new' && index === 3 && newVal) confirmPinChangeRefs.current[0]?.focus();
  };

  // --- LOGIN LOGIC (FIXED DELAY) ---
  const handleLogin = async () => {
    Keyboard.dismiss();
    setMessage("");
    setMessageType("");
    const fullPin = pin.join("");

    console.log('=== LOGIN ATTEMPT ===');
    console.log('Phone:', phoneNumber);
    console.log('PIN:', fullPin);
    console.log('onNavigate exists?', !!onNavigate);

    if (!/^\d{10}$/.test(phoneNumber)) {
      setMessage("Phone number must be exactly 10 digits.");
      setMessageType("error");
      return;
    }
    if (fullPin.length !== 4) {
      setMessage("PIN must be 4 digits.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      console.log('Calling API...');
      const response = await ApiClient.post("login/", {
        phone_number: phoneNumber,
        pin: fullPin,
      });
      console.log('API Response:', response);

      setMessage("Login successful! Redirecting...");
      setMessageType("success");
      setLoading(false); // FIX: Turn off loading state after API success
      
      // FIX: Navigate IMMEDIATELY (removed the old setTimeout)
      if (onNavigate) {
        onNavigate('Dashboard');
      }

    } catch (err) {
      console.log('Login Error:', err.message);
      // Original logic was to use message from API call, but default to generic
      setMessage(err.message === "Invalid credentials" ? "Invalid credentials. Please check your phone number and PIN." : "An unknown error occurred.");
      setMessageType("error");
      setLoading(false);
      setPin(["", "", "", ""]);
    }
  };

  // --- CHANGE PIN LOGIC ---
  const handleChangePin = async () => {
    Keyboard.dismiss();
    setMessage("");
    setMessageType("");
    const fullOldPin = oldPinChange.join("");
    const fullNewPin = newPinChange.join("");
    const fullConfirmPin = confirmPinChange.join("");

    if (fullOldPin.length !== 4 || fullNewPin.length !== 4 || fullConfirmPin.length !== 4) {
      setMessage("All PIN fields must be 4 digits.");
      setMessageType("error");
      return;
    }

    if (fullNewPin !== fullConfirmPin) {
      setMessage("New PIN and Confirm PIN do not match.");
      setMessageType("error");
      return;
    }
    
    if (fullOldPin === fullNewPin) {
      setMessage("New PIN cannot be the same as the Old PIN.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      await ApiClient.post("change-pin/", {
        phone_number: phoneNumber,
        old_pin: fullOldPin,
        new_pin: fullNewPin,
      });

      setMessage("PIN changed successfully!");
      setMessageType("success");
      
      // Using a short timeout here to allow the user to read the success message
      setTimeout(() => {
        setIsChangePinMode(false);
        setOldPinChange(["", "", "", ""]);
        setNewPinChange(["", "", "", ""]);
        setConfirmPinChange(["", "", "", ""]);
        setMessage("");
        setMessageType("");
      }, 1200);

    } catch (err) {
      setMessage(err.message === "Invalid old PIN" ? "The Old PIN you entered is incorrect." : "An error occurred during PIN change. Try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const getPinBoxBorderColor = (row, idx, currentPin) => {
    const isFocused = focusedField.row === row && focusedField.idx === idx;
    const isError = messageType === 'error' && currentPin.join('').length === 4;

    if (isFocused) return CoffeeColors.BUTTON_BROWN;
    if (isError) return CoffeeColors.ERROR_RED;

    return CoffeeColors.LIGHT_BROWN;
  };

  // --- UI RENDER FUNCTIONS ---

  const renderPinInput = (pinArray, pinRefs, type) => (
    <View style={styles.pinInputContainer}>
      {pinArray.map((digit, index) => (
        <TextInput
          key={index}
          ref={(el) => (pinRefs.current[index] = el)}
          style={[
            styles.pinInputBox,
            { borderColor: getPinBoxBorderColor(type, index, pinArray) }
          ]}
          value={digit}
          onChangeText={(value) => handlePinChange(value, index, type)}
          maxLength={1}
          secureTextEntry={true}
          keyboardType="numeric"
          editable={!loading}
          onFocus={() => setFocusedField({ row: type, idx: index })}
          onBlur={() => setFocusedField({ row: null, idx: null })}
        />
      ))}
     </View> 
  );

  /**
   * Renders the main login screen form
   */
  const renderLoginMode = () => (
    <View style={styles.centeredContent}>
        
        <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={32} color={CoffeeColors.BUTTON_BROWN} />
        </View>

        <Text style={styles.welcomeText}>Welcome Back</Text>

        <View style={styles.contentWrapper}> 
            <Text style={styles.instructionText}>
                Enter your 10-digit phone number and PIN to securely access your data.
            </Text>

            {/* Phone Number Input */}
            <Text style={styles.enterPinLabel}>Phone Number</Text>
            <TextInput
                style={[styles.textInput, focusedField.row === 'phone' && styles.focusedInput]}
                value={phoneNumber}
                onChangeText={text => {
                    const cleanText = text.replace(/[^0-9]/g, '').slice(0, 10);
                    setPhoneNumber(cleanText);
                    setMessage("");
                }}
                placeholder="" 
                maxLength={10}
                keyboardType="numeric"
                editable={!loading}
                onFocus={() => setFocusedField({ row: "phone", idx: -1 })}
                onBlur={() => setFocusedField({ row: null, idx: null })}
            />

            {/* PIN Input */}
            <Text style={styles.enterPinLabel}>Enter PIN</Text>
            {renderPinInput(pin, pinRefs, "login")}

            {/* Message Box */}
            {message ? (
                <View style={getMessageStyle()}>
                    <Text style={messageType === "error" ? styles.errorMessageText : styles.successMessageText}>
                        {message}
                    </Text>
                </View>
            ) : <View style={{ height: 40 }} />} 

            {/* Login Button */}
            <TouchableOpacity
                style={[styles.unlockButton, (loading || pin.join("").length !== 4 || phoneNumber.length !== 10) && styles.disabledButton]}
                onPress={handleLogin}
                disabled={loading || pin.join("").length !== 4 || phoneNumber.length !== 10}
            >
                {loading ? (
                    <ActivityIndicator color={CoffeeColors.WHITE} />
                ) : (
                    <Text style={styles.loginButtonText}>Login</Text>
                )}
            </TouchableOpacity>

            {/* Forgot PIN Link */}
            <TouchableOpacity
                style={styles.resetPinLinkContainer}
                onPress={() => {
                    setIsChangePinMode(true);
                    setMessage("");
                    setMessageType("");
                    setPin(["", "", "", ""]);
                }}
                disabled={loading}
            >
                <Text style={[styles.resetPinLinkText, { color: CoffeeColors.BUTTON_BROWN, fontSize: 13 }]}>Reset PIN</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  /**
   * Renders the Reset/Change PIN screen with Old PIN, New PIN, Confirm PIN
   */
  const renderChangePinMode = () => (
    <View style={styles.centeredContent}>
      <View style={styles.iconCircle}>
        <Ionicons name="key" size={32} color={CoffeeColors.BUTTON_BROWN} />
      </View>

      <Text style={styles.welcomeText}>Reset PIN</Text>

      <View style={styles.contentWrapper}>
        <Text style={styles.instructionText}>
          Enter your old PIN and set a new 4-digit PIN.
        </Text>

        {/* Old PIN Input */}
        <Text style={styles.enterPinLabel}>Old PIN</Text>
        {renderPinInput(oldPinChange, oldPinChangeRefs, "old")}

        {/* New PIN Input */}
        <Text style={styles.enterPinLabel}>New PIN</Text>
        {renderPinInput(newPinChange, newPinChangeRefs, "new")}

        {/* Confirm PIN Input */}
        <Text style={styles.enterPinLabel}>Confirm New PIN</Text>
        {renderPinInput(confirmPinChange, confirmPinChangeRefs, "confirm")}

        {/* Message Box */}
        {message ? (
          <View style={getMessageStyle()}>
            <Text style={messageType === "error" ? styles.errorMessageText : styles.successMessageText}>
              {message}
            </Text>
          </View>
        ) : <View style={{ height: 40 }} />}

        {/* Set Pin Button */}
        <TouchableOpacity
          style={[
            styles.unlockButton,
            (loading || oldPinChange.join("").length !== 4 || newPinChange.join("").length !== 4 || confirmPinChange.join("").length !== 4) && styles.disabledButton
          ]}
          onPress={handleChangePin}
          disabled={loading || oldPinChange.join("").length !== 4 || newPinChange.join("").length !== 4 || confirmPinChange.join("").length !== 4}
        >
          {loading ? (
            <ActivityIndicator color={CoffeeColors.WHITE} />
          ) : (
            <Text style={styles.loginButtonText}>Set New PIN</Text>
          )}
        </TouchableOpacity>

        {/* Back Link */}
        <TouchableOpacity
          style={styles.resetPinLinkContainer}
          onPress={() => {
            setIsChangePinMode(false);
            setOldPinChange(["", "", "", ""]);
            setNewPinChange(["", "", "", ""]);
            setConfirmPinChange(["", "", "", ""]);
            setMessage("");
            setMessageType("");
          }}
          disabled={loading}
        >
          <Text style={[styles.resetPinLinkText, { color: CoffeeColors.DARK_BROWN }]}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- MAIN RENDER LOGIC ---
  if (isChangePinMode) {
    return <View style={styles.container}>{renderChangePinMode()}</View>;
  }

  // Default: Login Mode
  return (
    <View style={styles.container}>
      {renderLoginMode()}
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: CoffeeColors.SCREEN_BG, 
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredContent: {
    width: '95%',
    maxWidth: 400,
    alignItems: 'center',
  },
  contentWrapper: { 
    width: '100%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 20, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  iconCircle: {
    backgroundColor: CoffeeColors.LIGHT_BG, 
    borderRadius: 50,
    width: 65,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: CoffeeColors.LIGHT_BROWN,
    opacity: 0.85,
  },
  welcomeText: {
    fontSize: 26, 
    fontWeight: '900', 
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 6,
    textAlign: 'center',
  },
  instructionText: { 
    fontSize: 14,
    color: CoffeeColors.GRAY_TEXT,
    textAlign: 'center',
    marginBottom: 25, 
    lineHeight: 20,
    paddingHorizontal: 10,
    maxWidth: 300, 
  },
  enterPinLabel: {
    fontSize: 15,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 10,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginTop: 15,
    width: '100%',
  },
  textInput: {
    width: '100%',
    height: 50,
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CoffeeColors.LIGHT_BROWN,
    paddingHorizontal: 15,
    fontSize: 16,
    color: CoffeeColors.DARK_BROWN,
    textAlign: 'left',
    marginBottom: 10,
  },
  focusedInput: {
    borderColor: CoffeeColors.BUTTON_BROWN,
  },
  pinInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10, 
    marginTop: 2,
    width: '100%', 
    paddingHorizontal: 10,
  },
  pinInputBox: { 
    width: 55, 
    height: 65, 
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 12, 
    borderWidth: 2,
    borderColor: CoffeeColors.LIGHT_BROWN,
    fontSize: 26, 
    fontWeight: 'bold',
    color: CoffeeColors.DARK_BROWN,
    textAlign: 'center', 
  },
  unlockButton: { 
    backgroundColor: CoffeeColors.BUTTON_BROWN, 
    width: '100%',
    padding: 18, 
    borderRadius: 15, 
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: CoffeeColors.BUTTON_BROWN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  loginButtonText: {
    color: CoffeeColors.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  resetPinLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    padding: 5,
  },
  resetPinLinkText: {
    color: CoffeeColors.MEDIUM_BROWN,
    fontSize: 15,
    fontWeight: '600',
  },
  messageBox: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderWidth: 1,
  },
  errorBox: {
    backgroundColor: '#FFE5E5',
    borderColor: CoffeeColors.ERROR_RED,
  },
  successBox: {
    backgroundColor: '#E6FFE6',
    borderColor: CoffeeColors.SUCCESS_GREEN,
  },
  errorMessageText: {
    color: CoffeeColors.ERROR_RED,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  successMessageText: {
    color: CoffeeColors.SUCCESS_GREEN,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});