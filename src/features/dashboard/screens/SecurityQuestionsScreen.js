/**
 * SecurityQuestionsScreen.js
 *
 * Displays 3 random security questions for first-time user setup
 * User must answer all 3 questions before they can proceed to the main app
 * Answers are securely stored and used for PIN reset
 */

import React, { useState, useEffect } from "react";
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
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import AuthService from "../../../services/AuthService";
import { setSessionActive } from "../../../services/sessionService";
import Fonts from "../../../theme/fonts";
import CoffeeColors from "../../../theme/colors";

// --- Colors ---
const LoginColors = {
  SCREEN_BG: '#FFF8F6',
  LIGHT_BG: '#FEEFEA',
  BUTTON_BROWN: '#8B4513',
  LIGHT_BROWN: '#BCAAA4',
  GRAY_TEXT: '#6B5B52',
};

export default function SecurityQuestionsScreen({ navigation, route }) {
  // Get phone number and user from route params
  const { phone, user } = route.params || {};

  // --- STATE ---
  const [questions, setQuestions] = useState([]); // Array of {id, text}
  const [answers, setAnswers] = useState(["", "", ""]); // User's answers
  const [loading, setLoading] = useState(true); // Initial loading
  const [submitting, setSubmitting] = useState(false); // Submit button loading
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // --- EFFECTS ---

  // Load questions on component mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoading(true);
        console.log('[SecurityQuestionsScreen] Loading security questions for phone:', phone);
        console.log('[SecurityQuestionsScreen] Route params:', route.params);

        const response = await AuthService.getRandomSecurityQuestions(phone);
        console.log('[SecurityQuestionsScreen] Response:', response);

        if (response && response.success && response.questions && response.questions.length > 0) {
          console.log('[SecurityQuestionsScreen] Questions loaded:', response.questions);
          setQuestions(response.questions);
          setAnswers(new Array(response.questions.length).fill(""));
          console.log('[SecurityQuestionsScreen] Loaded', response.questions.length, 'questions');
        } else if (response && response.questions && response.questions.length > 0) {
          // Questions exist but response.success might be missing
          console.log('[SecurityQuestionsScreen] Questions loaded (no success flag):', response.questions);
          setQuestions(response.questions);
          setAnswers(new Array(response.questions.length).fill(""));
          console.log('[SecurityQuestionsScreen] Loaded', response.questions.length, 'questions');
        } else {
          console.log('[SecurityQuestionsScreen] Response structure:', response);
          throw new Error('Failed to load questions - no questions in response');
        }
      } catch (error) {
        console.error('[SecurityQuestionsScreen] Error loading questions:', error);
        console.error('[SecurityQuestionsScreen] Error details:', error.message);

        // Show error message but do NOT bypass security setup
        setMessage(error.message || 'Failed to load security questions');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    };

    if (phone) {
      loadQuestions();
    } else {
      console.error('[SecurityQuestionsScreen] No phone number provided');
      setMessage('Phone number not provided');
      setMessageType('error');
      setLoading(false);
    }
  }, [phone]);

  // --- HANDLERS ---

  const handleRetryLoad = async () => {
    setMessage('');
    setMessageType('');
    setLoading(true);

    try {
      console.log('[SecurityQuestionsScreen] Retrying to load security questions for phone:', phone);

      const response = await AuthService.getRandomSecurityQuestions(phone);
      console.log('[SecurityQuestionsScreen] Response on retry:', response);

      if (response && response.success && response.questions && response.questions.length > 0) {
        console.log('[SecurityQuestionsScreen] Questions loaded on retry:', response.questions);
        setQuestions(response.questions);
        setAnswers(new Array(response.questions.length).fill(''));
      } else if (response && response.questions && response.questions.length > 0) {
        console.log('[SecurityQuestionsScreen] Questions loaded on retry (no success flag):', response.questions);
        setQuestions(response.questions);
        setAnswers(new Array(response.questions.length).fill(''));
      } else {
        throw new Error('Failed to load questions - no questions in response');
      }
    } catch (error) {
      console.error('[SecurityQuestionsScreen] Error on retry:', error.message);
      setMessage(error.message || 'Failed to load security questions. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (value, index) => {
    // Only allow alphanumeric and spaces
    const cleaned = value.replace(/[^a-zA-Z0-9\s]/g, '');
    const updated = [...answers];
    updated[index] = cleaned;
    setAnswers(updated);
    setMessage("");
    setMessageType("");
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setMessage("");
    setMessageType("");

    // Validate all answers are filled
    const allAnswersFilled = answers.every(answer => answer.trim().length > 0);
    if (!allAnswersFilled) {
      setMessage("Please answer all 3 questions before proceeding.");
      setMessageType("error");
      return;
    }

    // Validate minimum answer length
    const allAnswersValid = answers.every(answer => answer.trim().length >= 2);
    if (!allAnswersValid) {
      setMessage("Each answer must be at least 2 characters long.");
      setMessageType("error");
      return;
    }

    setSubmitting(true);
    try {
      console.log('[SecurityQuestionsScreen] Submitting security answers...');

      // Format answers for API
      const formattedAnswers = questions.map((q, idx) => ({
        question_id: q.id,
        answer: answers[idx].trim().toLowerCase(),
      }));

      const response = await AuthService.setupSecurityAnswers(phone, formattedAnswers);

      if (response.success) {
        console.log('[SecurityQuestionsScreen] Security answers set successfully');
        setMessage(response.message);
        setMessageType("success");

        // Navigate to Dashboard after a short delay
        setTimeout(() => {
          setSubmitting(false);
          setSessionActive(true);
          navigation.replace('Dashboard');
        }, 1000);
      } else {
        throw new Error('Failed to set security answers');
      }
    } catch (error) {
      console.error('[SecurityQuestionsScreen] Error submitting answers:', error.message);
      setMessage(error.message || 'Failed to set security answers');
      setMessageType('error');
      setSubmitting(false);
    }
  };

  // --- RENDER ---

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={CoffeeColors.PRIMARY_BROWN} />
        <Text style={styles.loadingText}>Loading security questions...</Text>
      </View>
    );
  }

  const messageStyle = messageType === 'error' ?
    [styles.messageBox, styles.errorBox] :
    messageType === 'success' ?
    [styles.messageBox, styles.successBox] :
    null;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.headerSection}>
              <Ionicons name="shield-checkmark-outline" size={48} color={CoffeeColors.PRIMARY_BROWN} />
              <Text style={styles.headerTitle}>Security Setup</Text>
              <Text style={styles.headerSubtitle}>
                Answer these 3 questions to secure your account
              </Text>
            </View>

            {/* Message Box */}
            {message && (
              <View style={messageStyle}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons
                    name={messageType === 'error' ? 'alert-circle' : 'checkmark-circle'}
                    size={20}
                    color={messageType === 'error' ? '#D32F2F' : '#388E3C'}
                  />
                  <Text style={[
                    styles.messageText,
                    { color: messageType === 'error' ? '#D32F2F' : '#388E3C' }
                  ]}>
                    {message}
                  </Text>
                </View>
                {messageType === 'error' && (
                  <TouchableOpacity onPress={handleRetryLoad} style={styles.retryButton}>
                    <Ionicons name="refresh" size={16} color="#D32F2F" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Questions */}
            <View style={styles.questionsContainer}>
              {questions.map((question, idx) => (
                <View key={question.id} style={styles.questionCard}>
                  {/* Question Number and Text */}
                  <View style={styles.questionHeader}>
                    <View style={styles.questionNumber}>
                      <Text style={styles.questionNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.questionText} numberOfLines={2}>
                      {question.text}
                    </Text>
                  </View>

                  {/* Answer Input */}
                  <TextInput
                    style={[
                      styles.answerInput,
                      answers[idx].trim().length > 0 && styles.answerInputFilled
                    ]}
                    placeholder={`Your answer...`}
                    placeholderTextColor={LoginColors.GRAY_TEXT}
                    value={answers[idx]}
                    onChangeText={(value) => handleAnswerChange(value, idx)}
                    onSubmitEditing={() => {
                      if (idx < questions.length - 1) {
                        // Focus on next input if available
                      }
                    }}
                    editable={!submitting}
                    returnKeyType={idx === questions.length - 1 ? 'done' : 'next'}
                  />
                </View>
              ))}
            </View>

            {/* Spacing */}
            <View style={{ height: 20 }} />

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <LinearGradient
                colors={[CoffeeColors.PRIMARY_BROWN, LoginColors.BUTTON_BROWN]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.submitButton,
                  submitting && { opacity: 0.6 }
                ]}
              >
                <TouchableOpacity
                  style={styles.buttonContent}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  {submitting ? (
                    <>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.submitButtonText}>Setting up...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Setup Security</Text>
                    </>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={LoginColors.LIGHT_BROWN} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.infoText}>
                  These answers will be used to recover your account if you forget your PIN.
                </Text>
              </View>
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LoginColors.SCREEN_BG,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: LoginColors.GRAY_TEXT,
    fontFamily: Fonts.regular,
  },

  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: Fonts.bold,
    color: CoffeeColors.DARK_BROWN,
    marginTop: 12,
  },

  headerSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: LoginColors.GRAY_TEXT,
    marginTop: 8,
    textAlign: 'center',
  },

  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10,
  },

  errorBox: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },

  successBox: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#388E3C',
  },

  messageText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
  },

  questionsContainer: {
    gap: 16,
  },

  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8D7D1',
    shadowColor: CoffeeColors.DARK_BROWN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },

  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CoffeeColors.PRIMARY_BROWN,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  questionNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Fonts.bold,
  },

  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: CoffeeColors.DARK_BROWN,
    lineHeight: 20,
  },

  answerInput: {
    borderWidth: 1,
    borderColor: LoginColors.LIGHT_BROWN,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: CoffeeColors.DARK_BROWN,
    backgroundColor: '#fafafa',
  },

  answerInputFilled: {
    borderColor: CoffeeColors.PRIMARY_BROWN,
    backgroundColor: '#fff',
  },

  buttonContainer: {
    gap: 12,
  },

  submitButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },

  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },

  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },

  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LoginColors.LIGHT_BROWN,
  },

  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.semiBold,
    color: LoginColors.LIGHT_BROWN,
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: LoginColors.LIGHT_BROWN,
  },

  infoText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: LoginColors.GRAY_TEXT,
    lineHeight: 16,
  },

  retryButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
