import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ImageBackground,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import AuthService from "../../../services/AuthService";
import Fonts from "../../../theme/fonts";
import CoffeeColors from "../../../theme/colors";

// --- Additional Login Screen Colors ---
const LoginColors = {
  SCREEN_BG: '#FFF8F6',
  LIGHT_BG: '#FEEFEA',
  BUTTON_BROWN: '#8B4513',
  LIGHT_BROWN: '#BCAAA4',
  GRAY_TEXT: '#6B5B52', // Updated from '#8D8D8D' for better visibility
};


// --- Main Component ---
export default function LoginScreen({ navigation }) {
  // --- STATE ---
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const pinRefs = useRef([]);

  // RESET PIN Mode
  const [isResetPinMode, setIsResetPinMode] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: get question, 2: answer & new PIN
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPinReset, setNewPinReset] = useState(["", "", "", ""]);
  const [confirmPinReset, setConfirmPinReset] = useState(["", "", "", ""]);
  const newPinResetRefs = useRef([]);
  const confirmPinResetRefs = useRef([]);

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
      case 'new': setFn = setNewPinReset; refList = newPinResetRefs; currentPin = newPinReset; break;
      case 'confirm': setFn = setConfirmPinReset; refList = confirmPinResetRefs; currentPin = confirmPinReset; break;
      default: return;
    }

    const updated = [...currentPin];
    updated[index] = newVal;
    setFn(updated);

    setFocusedField({ row: type, idx: index });

    // Auto-advance focus
    if (newVal && index < 3) refList.current[index + 1]?.focus();
    if (type === 'new' && index === 3 && newVal) confirmPinResetRefs.current[0]?.focus();
  };

  // --- LOGIN LOGIC ---
  const handleLogin = async () => {
    Keyboard.dismiss();
    setMessage("");
    setMessageType("");
    const fullPin = pin.join("");

    console.log('=== LOGIN ATTEMPT ===');
    console.log('Phone:', phoneNumber);
    console.log('PIN:', fullPin);

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
      console.log('Calling AuthService...');
      const response = await AuthService.login(phoneNumber, fullPin);

      console.log('Login successful:', response.user);

      setMessage("Login successful! Redirecting...");
      setMessageType("success");

      // Navigate to Dashboard
      setTimeout(() => {
        setLoading(false);
        navigation.replace('Dashboard');
      }, 500);

    } catch (err) {
      console.log('Login Error:', err.message);
      setMessage(err.message || "Login failed. Please try again.");
      setMessageType("error");
      setLoading(false);
      setPin(["", "", "", ""]);
    }
  };

  // --- GET SECURITY QUESTION ---
  const handleGetSecurityQuestion = async () => {
    Keyboard.dismiss();
    setMessage("");
    setMessageType("");

    if (!/^\d{10}$/.test(phoneNumber)) {
      setMessage("Please enter a valid 10-digit phone number.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      const response = await AuthService.getSecurityQuestion(phoneNumber);
      setSecurityQuestion(response.securityQuestion);
      setResetStep(2);
      setMessage("");
      setMessageType("");
    } catch (err) {
      setMessage(err.message || "Failed to get security question");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // --- RESET PIN LOGIC ---
  const handleResetPin = async () => {
    Keyboard.dismiss();
    setMessage("");
    setMessageType("");
    const fullNewPin = newPinReset.join("");
    const fullConfirmPin = confirmPinReset.join("");

    if (!securityAnswer.trim()) {
      setMessage("Please answer the security question.");
      setMessageType("error");
      return;
    }

    if (fullNewPin.length !== 4 || fullConfirmPin.length !== 4) {
      setMessage("All PIN fields must be 4 digits.");
      setMessageType("error");
      return;
    }

    if (fullNewPin !== fullConfirmPin) {
      setMessage("New PIN and Confirm PIN do not match.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      await AuthService.resetPin(phoneNumber, securityAnswer, fullNewPin);

      setMessage("PIN reset successful! You can now login.");
      setMessageType("success");

      // Return to login screen
      setTimeout(() => {
        setIsResetPinMode(false);
        setResetStep(1);
        setSecurityQuestion("");
        setSecurityAnswer("");
        setNewPinReset(["", "", "", ""]);
        setConfirmPinReset(["", "", "", ""]);
        setMessage("");
        setMessageType("");
      }, 1500);

    } catch (err) {
      setMessage(err.message || "Failed to reset PIN");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const getPinBoxBorderColor = (row, idx, currentPin) => {
    const isFocused = focusedField.row === row && focusedField.idx === idx;
    const isError = messageType === 'error' && currentPin.join('').length === 4;

    if (isFocused) return LoginColors.BUTTON_BROWN;
    if (isError) return CoffeeColors.ERROR_RED;

    return LoginColors.LIGHT_BROWN;
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
          keyboardType="number-pad"
          returnKeyType="done"
          editable={!loading}
          onFocus={() => setFocusedField({ row: type, idx: index })}
          onBlur={() => setFocusedField({ row: null, idx: null })}
          onSubmitEditing={() => Keyboard.dismiss()}
        />
      ))}
     </View>
  );

  /**
   * Renders the main login screen form
   */
  const renderLoginMode = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.fullScreenContainer}>

          {/* Coffee Background Image with Gradient */}
          <ImageBackground
            source={require('../../../assets/coffee-background.jpg')}
            style={styles.coffeeHeaderSection}
            imageStyle={styles.coffeeImageStyle}
          >
            <LinearGradient
              colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', 'rgba(255, 248, 246, 0.95)', 'rgba(255, 248, 246, 1)']}
              locations={[0, 0.5, 0.85, 1]}
              style={styles.gradientOverlay}
            >
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeText}>Welcome Back</Text>
              </View>
            </LinearGradient>
          </ImageBackground>

          <View style={styles.contentWrapper}>
              <Text style={styles.instructionText}>
                  Enter your phone number and PIN to securely access your data.
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
                  placeholder="Enter phone number"
                  maxLength={10}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  editable={!loading}
                  onFocus={() => setFocusedField({ row: "phone", idx: -1 })}
                  onBlur={() => setFocusedField({ row: null, idx: null })}
                  onSubmitEditing={() => pinRefs.current[0]?.focus()}
              />

              {/* PIN Input */}
              <Text style={styles.enterPinLabel}>PIN</Text>
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

              {/* Reset PIN Link */}
              <TouchableOpacity
                  style={styles.resetPinLinkContainer}
                  onPress={() => {
                      setIsResetPinMode(true);
                      setResetStep(1);
                      setMessage("");
                      setMessageType("");
                      setPin(["", "", "", ""]);
                  }}
                  disabled={loading}
              >
                  <Text style={[styles.resetPinLinkText, { color: LoginColors.BUTTON_BROWN, fontSize: 13 }]}>Reset PIN</Text>
              </TouchableOpacity>
          </View>

      </View>
    </TouchableWithoutFeedback>
  );

  /**
   * Renders the Reset PIN screen - Step 1: Phone number & get security question
   */
  const renderResetPinStep1 = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.centeredContent}>
        <View style={styles.iconCircle}>
          <Ionicons name="key" size={32} color={LoginColors.BUTTON_BROWN} />
        </View>

        <Text style={styles.welcomeText}>Reset PIN</Text>

        <View style={styles.contentWrapper}>
          <Text style={styles.instructionText}>
            Enter your phone number to retrieve your security question.
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
            keyboardType="number-pad"
            returnKeyType="done"
            editable={!loading}
            onFocus={() => setFocusedField({ row: "phone", idx: -1 })}
            onBlur={() => setFocusedField({ row: null, idx: null })}
            onSubmitEditing={handleGetSecurityQuestion}
          />

          {/* Message Box */}
          {message ? (
            <View style={getMessageStyle()}>
              <Text style={messageType === "error" ? styles.errorMessageText : styles.successMessageText}>
                {message}
              </Text>
            </View>
          ) : <View style={{ height: 40 }} />}

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.unlockButton, (loading || phoneNumber.length !== 10) && styles.disabledButton]}
            onPress={handleGetSecurityQuestion}
            disabled={loading || phoneNumber.length !== 10}
          >
            {loading ? (
              <ActivityIndicator color={CoffeeColors.WHITE} />
            ) : (
              <Text style={styles.loginButtonText}>Continue</Text>
            )}
          </TouchableOpacity>

          {/* Back Link */}
          <TouchableOpacity
            style={styles.resetPinLinkContainer}
            onPress={() => {
              setIsResetPinMode(false);
              setResetStep(1);
              setMessage("");
              setMessageType("");
            }}
            disabled={loading}
          >
            <Text style={[styles.resetPinLinkText, { color: CoffeeColors.DARK_BROWN }]}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );

  /**
   * Renders the Reset PIN screen - Step 2: Answer security question & new PIN
   */
  const renderResetPinStep2 = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.centeredContent}>
        <View style={styles.iconCircle}>
          <Ionicons name="key" size={32} color={LoginColors.BUTTON_BROWN} />
        </View>

        <Text style={styles.welcomeText}>Reset PIN</Text>

        <View style={styles.contentWrapper}>
          <Text style={styles.instructionText}>
            Answer the security question and set a new PIN.
          </Text>

          {/* Security Question */}
          <Text style={styles.enterPinLabel}>Security Question</Text>
          <Text style={styles.securityQuestionText}>{securityQuestion}</Text>

          {/* Security Answer Input */}
          <Text style={styles.enterPinLabel}>Your Answer</Text>
          <TextInput
            style={[styles.textInput, focusedField.row === 'answer' && styles.focusedInput]}
            value={securityAnswer}
            onChangeText={text => {
              setSecurityAnswer(text);
              setMessage("");
            }}
            placeholder="Enter your answer"
            autoCapitalize="none"
            editable={!loading}
            onFocus={() => setFocusedField({ row: "answer", idx: -1 })}
            onBlur={() => setFocusedField({ row: null, idx: null })}
          />

          {/* New PIN Input */}
          <Text style={styles.enterPinLabel}>New PIN</Text>
          {renderPinInput(newPinReset, newPinResetRefs, "new")}

          {/* Confirm PIN Input */}
          <Text style={styles.enterPinLabel}>Confirm New PIN</Text>
          {renderPinInput(confirmPinReset, confirmPinResetRefs, "confirm")}

          {/* Message Box */}
          {message ? (
            <View style={getMessageStyle()}>
              <Text style={messageType === "error" ? styles.errorMessageText : styles.successMessageText}>
                {message}
              </Text>
            </View>
          ) : <View style={{ height: 40 }} />}

          {/* Reset PIN Button */}
          <TouchableOpacity
            style={[
              styles.unlockButton,
              (loading || !securityAnswer.trim() || newPinReset.join("").length !== 4 || confirmPinReset.join("").length !== 4) && styles.disabledButton
            ]}
            onPress={handleResetPin}
            disabled={loading || !securityAnswer.trim() || newPinReset.join("").length !== 4 || confirmPinReset.join("").length !== 4}
          >
            {loading ? (
              <ActivityIndicator color={CoffeeColors.WHITE} />
            ) : (
              <Text style={styles.loginButtonText}>Reset PIN</Text>
            )}
          </TouchableOpacity>

          {/* Back Link */}
          <TouchableOpacity
            style={styles.resetPinLinkContainer}
            onPress={() => {
              setResetStep(1);
              setSecurityQuestion("");
              setSecurityAnswer("");
              setNewPinReset(["", "", "", ""]);
              setConfirmPinReset(["", "", "", ""]);
              setMessage("");
              setMessageType("");
            }}
            disabled={loading}
          >
            <Text style={[styles.resetPinLinkText, { color: CoffeeColors.DARK_BROWN }]}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );

  // --- MAIN RENDER LOGIC ---
  if (isResetPinMode) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {resetStep === 1 ? renderResetPinStep1() : renderResetPinStep2()}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Default: Login Mode
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderLoginMode()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LoginColors.SCREEN_BG,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  fullScreenContainer: {
    flex: 1,
    width: '100%',
  },
  coffeeHeaderSection: {
    width: '100%',
    height: 280,
  },
  coffeeImageStyle: {
    resizeMode: 'cover',
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  welcomeTextContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    fontWeight: '900',
    color: CoffeeColors.DARK_BROWN,
    textAlign: 'center',
  },
  contentWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: LoginColors.SCREEN_BG,
  },
  iconCircle: {
    backgroundColor: LoginColors.LIGHT_BG,
    borderRadius: 50,
    width: 65,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: LoginColors.LIGHT_BROWN,
    opacity: 0.85,
  },
  instructionText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: LoginColors.GRAY_TEXT,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
    paddingHorizontal: 10,
    maxWidth: 300,
  },
  enterPinLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: CoffeeColors.DARK_BROWN,
    marginBottom: 10,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginTop: 15,
    width: '100%',
  },
  textInput: {
    fontFamily: Fonts.regular,
    width: '100%',
    height: 50,
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LoginColors.LIGHT_BROWN,
    paddingHorizontal: 15,
    fontSize: 16,
    color: CoffeeColors.DARK_BROWN,
    textAlign: 'left',
    marginBottom: 10,
  },
  focusedInput: {
    borderColor: LoginColors.BUTTON_BROWN,
  },
  pinInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
    width: '100%',
    paddingHorizontal: 15,
  },
  pinInputBox: {
    fontFamily: Fonts.semiBold,
    width: 55,
    height: 65,
    backgroundColor: CoffeeColors.WHITE,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: LoginColors.LIGHT_BROWN,
    fontSize: 26,
    fontWeight: 'bold',
    color: CoffeeColors.DARK_BROWN,
    textAlign: 'center',
  },
  unlockButton: {
    backgroundColor: '#6d350f', // Darker brown when enabled (darker version of #8b4513)
    width: '100%',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#6d350f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  loginButtonText: {
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  disabledButton: {
    backgroundColor: '#8b4513', // Lighter brown when disabled
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
    fontFamily: Fonts.semiBold,
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
  securityQuestionText: {
    width: '100%',
    fontSize: 16,
    color: CoffeeColors.DARK_BROWN,
    backgroundColor: LoginColors.LIGHT_BG,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    fontWeight: '600',
    textAlign: 'left',
  },
});