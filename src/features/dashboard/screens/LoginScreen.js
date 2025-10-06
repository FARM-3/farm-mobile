import React, { useState, useRef } from "react";
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
import CoffeeColors from "../../../theme/colors";
import ApiClient from '../../../services/ApiClient'; 
import { ping } from '../../../services/ApiClient';

const LoginScreen = ({ onNavigate }) => {
  // --- Login State ---
  const [pin, setPin] = useState(["", "", "", ""]);
  const pinInputRefs = useRef([]);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- Reset PIN State ---
  const [showReset, setShowReset] = useState(false);
  const [oldPin, setOldPin] = useState(["", "", "", ""]);
  const [newPin, setNewPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const oldPinRefs = useRef([]);
  const newPinRefs = useRef([]);
  const confirmPinRefs = useRef([]);

  // --- Focus and Validation State for Reset PIN ---
  const [focusedField, setFocusedField] = useState({ row: null, idx: null });
  const [pinValidation, setPinValidation] = useState({
    newPinMatch: null, // true/false/null
    newPinStrong: null, // true/false/null
  });

  // --- PIN Input Logic (for all PIN fields) ---
  const handlePinArrayChange = (arr, setArr, refs, rowName) => (text, idx) => {
    setMessage(null);
    setMessageType(null);
    const digit = text.replace(/[^0-9]/g, "").slice(-1); // Only allow digits
    const newArr = [...arr];
    newArr[idx] = digit;
    setArr(newArr);
    setFocusedField({ row: rowName, idx });
    // Real-time validation for new/confirm PIN
    if (rowName === "newPin" || rowName === "confirmPin") {
      validatePins(
        oldPin,
        rowName === "newPin" ? newArr : newPin,
        rowName === "confirmPin" ? newArr : confirmPin
      );
    }
    if (digit && idx < 3) refs.current[idx + 1]?.focus();
  };
  const handlePinArrayBackspace = (arr, refs, rowName) => (event, idx) => {
    if (event.nativeEvent.key === "Backspace" && arr[idx] === "" && idx > 0) {
      refs.current[idx - 1]?.focus();
      setFocusedField({ row: rowName, idx: idx - 1 });
    }
  };

  // --- Real-time PIN Validation for Reset PIN ---
  const validatePins = (oldPinArr, newPinArr, confirmPinArr) => {
    const newPinVal = newPinArr.join("");
    const confirmPinVal = confirmPinArr.join("");
    setPinValidation({
      newPinMatch:
        newPinVal.length === 4 && confirmPinVal.length === 4
          ? newPinVal === confirmPinVal
          : null,
      newPinStrong: newPinVal.length === 4,
    });
  };

  // --- Login Logic ---
  const clearPinBoxes = () => {
    setPin(["", "", "", ""]);
    pinInputRefs.current[0]?.focus();
  };
  const handleLogin = async () => {
    Keyboard.dismiss();
    setMessage(null);
    setMessageType(null);
    const fullPin = pin.join("");
    if (fullPin.length !== 4 || !/^\d{4}$/.test(fullPin)) {
      setMessage("Invalid input: PIN must be exactly 4 digits.");
      setMessageType("error");
      clearPinBoxes(); 
      return;
    }
    setIsLoading(true);
    try {
      const response = await ApiClient.post("login/", { pin: fullPin });
      if (response.status === 200 || response.data?.success) {
        setMessage("Login successful!");
        setMessageType("success");
        clearPinBoxes(); 
        setTimeout(() => {
          onNavigate("Dashboard");
        }, 1000); 
      } else {
        setMessage("Invalid PIN.");
        setMessageType("error");
        clearPinBoxes(); 
      }
    } catch (error) {
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
      if (error.response?.status === 404) {
        if (fullPin === '1234') {
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
         `Network/Error: ${error.message} (code: ${error.code || 'N/A'})`
        setMessage(errorMessage);
        setMessageType('error');
        clearPinBoxes();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Reset PIN Logic ---
  const handleSetNewPin = async () => {
    Keyboard.dismiss();
    setMessage(null);
    setMessageType(null);
    const oldPinVal = oldPin.join("");
    const newPinVal = newPin.join("");
    const confirmPinVal = confirmPin.join("");
    if (
      oldPinVal.length !== 4 ||
      newPinVal.length !== 4 ||
      confirmPinVal.length !== 4
    ) {
      setMessage("All PINs must be exactly 4 digits.");
      setMessageType("error");
      return;
    }
    if (newPinVal !== confirmPinVal) {
      setMessage("New PIN and Confirm PIN do not match.");
      setMessageType("error");
      return;
    }
    if (oldPinVal === newPinVal) {
      setMessage("New PIN must be different from old PIN.");
      setMessageType("error");
      return;
    }
    setIsLoading(true);
    try {
      // Replace with your real API call for PIN reset
      setTimeout(() => {
        setMessage("PIN successfully reset!");
        setMessageType("success");
        setIsLoading(false);
        setTimeout(() => {
          setShowReset(false);
          setOldPin(["", "", "", ""]);
          setNewPin(["", "", "", ""]);
          setConfirmPin(["", "", "", ""]);
          setMessage(null);
          setMessageType(null);
          setPinValidation({ newPinMatch: null, newPinStrong: null });
        }, 1200);
      }, 1000);
    } catch (error) {
      setMessage("Failed to reset PIN. Try again.");
      setMessageType("error");
      setIsLoading(false);
    }
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

  // --- Helper for PIN Box Border Color ---
  const getPinBoxBorderColor = (row, idx) => {
    // Focused
    if (focusedField.row === row && focusedField.idx === idx) return CoffeeColors.GOLD;
    // Error for confirm PIN
    if (row === "confirmPin" && pinValidation.newPinMatch === false) return CoffeeColors.ERROR_RED;
    // Success for confirm PIN
    if (row === "confirmPin" && pinValidation.newPinMatch === true) return CoffeeColors.SUCCESS_GREEN;
    // Success for new PIN
    if (row === "newPin" && pinValidation.newPinStrong === true) return CoffeeColors.SUCCESS_GREEN;
    // Default
    return CoffeeColors.LIGHT_BROWN;
  };

  // --- PIN RESET UI ---
  const renderPinReset = () => (
    <View style={styles.card}>
      <Text style={styles.pageTitle}>Reset PIN</Text>
      <Text style={styles.instructionText}>Enter your old Pin to set a new one.</Text>
      {/* Old PIN */}
      <Text style={styles.enterPinLabel}>Old PIN</Text>
      <View style={styles.pinInputContainer}>
        {oldPin.map((digit, idx) => (
          <TextInput
            key={idx}
            ref={el => oldPinRefs.current[idx] = el}
            style={[
              styles.pinInputBox,
              { borderColor: getPinBoxBorderColor("oldPin", idx) }
            ]}
            value={digit}
            onChangeText={text => handlePinArrayChange(oldPin, setOldPin, oldPinRefs, "oldPin")(text, idx)}
            onKeyPress={event => handlePinArrayBackspace(oldPin, oldPinRefs, "oldPin")(event, idx)}
            maxLength={1}
            keyboardType="numeric"
            secureTextEntry
            caretHidden={true}
            editable={!isLoading}
            onFocus={() => setFocusedField({ row: "oldPin", idx })}
            onBlur={() => setFocusedField({ row: null, idx: null })}
          />
        ))}
      </View>
      {/* New PIN */}
      <Text style={styles.enterPinLabel}>New PIN</Text>
      <View style={styles.pinInputContainer}>
        {newPin.map((digit, idx) => (
          <TextInput
            key={idx}
            ref={el => newPinRefs.current[idx] = el}
            style={[
              styles.pinInputBox,
              { borderColor: getPinBoxBorderColor("newPin", idx) }
            ]}
            value={digit}
            onChangeText={text => handlePinArrayChange(newPin, setNewPin, newPinRefs, "newPin")(text, idx)}
            onKeyPress={event => handlePinArrayBackspace(newPin, newPinRefs, "newPin")(event, idx)}
            maxLength={1}
            keyboardType="numeric"
            secureTextEntry
            caretHidden={true}
            editable={!isLoading}
            onFocus={() => setFocusedField({ row: "newPin", idx })}
            onBlur={() => setFocusedField({ row: null, idx: null })}
          />
        ))}
      </View>
      {/* Confirm PIN */}
      <Text style={styles.enterPinLabel}>Confirm PIN</Text>
      <View style={styles.pinInputContainer}>
        {confirmPin.map((digit, idx) => (
          <TextInput
            key={idx}
            ref={el => confirmPinRefs.current[idx] = el}
            style={[
              styles.pinInputBox,
              { borderColor: getPinBoxBorderColor("confirmPin", idx) }
            ]}
            value={digit}
            onChangeText={text => handlePinArrayChange(confirmPin, setConfirmPin, confirmPinRefs, "confirmPin")(text, idx)}
            onKeyPress={event => handlePinArrayBackspace(confirmPin, confirmPinRefs, "confirmPin")(event, idx)}
            maxLength={1}
            keyboardType="numeric"
            secureTextEntry
            caretHidden={true}
            editable={!isLoading}
            onFocus={() => setFocusedField({ row: "confirmPin", idx })}
            onBlur={() => setFocusedField({ row: null, idx: null })}
          />
        ))}
      </View>
      {/* Real-time validation message */}
      {pinValidation.newPinMatch === false && (
        <Text style={{ color: CoffeeColors.ERROR_RED, marginBottom: 8, fontWeight: 'bold' }}>
          New PIN and Confirm PIN do not match.
        </Text>
      )}
      {pinValidation.newPinMatch === true && (
        <Text style={{ color: CoffeeColors.SUCCESS_GREEN, marginBottom: 8, fontWeight: 'bold' }}>
          PINs match!
        </Text>
      )}
      {/* Message */}
      {message && (
        <View style={getMessageStyle()}>
          <Text style={messageType === "error" ? styles.errorMessageText : styles.successMessageText}>
            {message}
          </Text>
        </View>
      )}
      {/* Set New PIN Button */}
      <TouchableOpacity
        style={[styles.loginButton, isLoading && styles.disabledButton]}
        onPress={handleSetNewPin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={CoffeeColors.WHITE} />
        ) : (
          <Text style={styles.loginButtonText}>Set New PIN</Text>
        )}
      </TouchableOpacity>
      {/* Back to Login */}
      <TouchableOpacity
        style={styles.resetPinLinkContainer}
        onPress={() => setShowReset(false)}
        disabled={isLoading}
      >
        <Ionicons
          name="arrow-back-outline"
          size={16}
          color={CoffeeColors.MEDIUM_BROWN}
          style={{ transform: [{ rotateY: "180deg" }] }}
        />
        <Text style={styles.resetPinLinkText}> Back to Login</Text>
      </TouchableOpacity>
    </View>
  );

  // --- MAIN RENDER ---
  return (
    <View style={styles.container}>
      {showReset ? (
        renderPinReset()
      ) : (
        <>
          <Text style={styles.pageTitle}>PIN Login</Text>
          <View style={styles.card}>
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
            <Text style={styles.enterPinLabel}>Enter PIN</Text>
            <View style={styles.pinInputContainer} onStartShouldSetResponder={() => false}>
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
                    onChangeText={(text) => handlePinArrayChange(pin, setPin, pinInputRefs, "loginPin")(text, index)}
                    onKeyPress={handlePinArrayBackspace(pin, pinInputRefs, "loginPin")}
                    maxLength={1}
                    keyboardType="numeric"
                    secureTextEntry
                    showSoftInputOnFocus={true}
                    onFocus={() => setFocusedField({ row: "loginPin", idx: index })}
                    onBlur={() => setFocusedField({ row: null, idx: null })}
                    editable={!isLoading}
                    pointerEvents="auto"
                  />
                </TouchableOpacity>
              ))}
            </View>
            {message && (
              <View style={getMessageStyle()}>
                <Text style={messageType === "error" ? styles.errorMessageText : styles.successMessageText}>
                  {message}
                </Text>
              </View>
            )}
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
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: CoffeeColors.GOLD, marginTop: 0 }]}
              onPress={async () => {
                try {
                  const data = await ping();
                  setMessage('API reachable');
                  setMessageType('success');
                  console.log('API ping success', data);
                } catch (err) {
                  setMessage('API unreachable: ' + (err.message || 'Network Error'));
                  setMessageType('error');
                  console.error('API ping failed', err);
                }
              }}
            >
              <Text style={styles.loginButtonText}>CHECK API</Text>
            </TouchableOpacity>
            {/* Reset PIN Link */}
            <TouchableOpacity
              style={styles.resetPinLinkContainer}
              onPress={() => setShowReset(true)}
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
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CoffeeColors.LIGHT_GRAY,
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '95%',
    maxWidth: 400,
    backgroundColor: CoffeeColors.CREAM,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: CoffeeColors.DARK_BROWN,
    alignSelf: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  iconContainer: {
    marginBottom: 18,
    marginTop: 6,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 6,
  },
  instructionText: {
    fontSize: 14,
    color: CoffeeColors.GRAY_TEXT,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
  },
  enterPinLabel: {
    fontSize: 15,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 6,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginLeft: 8,
    marginTop: 10,
  },
  pinInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 2,
  },
  pinInputBoxTouchable: {
    marginHorizontal: 4,
    borderRadius: 10,
  },
  pinInputBox: {
    width: 48,
    height: 48,
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: CoffeeColors.LIGHT_BROWN,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: CoffeeColors.DARK_BROWN,
    marginHorizontal: 4,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 2,
  },
  loginButton: {
    backgroundColor: CoffeeColors.MEDIUM_BROWN,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: CoffeeColors.WHITE,
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  resetPinLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  resetPinLinkText: {
  resetPinLinkText: {
    color: CoffeeColors.MEDIUM_BROWN,
    fontSize: 15,
    fontWeight: 'bold',
  },
  messageBox: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: '#FFE5E5',
    borderColor: CoffeeColors.ERROR_RED,
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: '#E6FFE6',
    borderColor: CoffeeColors.SUCCESS_GREEN,
    borderWidth: 1,
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

export default LoginScreen;