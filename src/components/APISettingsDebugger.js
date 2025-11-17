/**
 * API Settings Debugger Component
 *
 * Development/Testing utility to:
 * - View current API configuration
 * - Test connectivity to backend
 * - Change API URL at runtime (for testing)
 * - View detailed network error logs
 *
 * Add this component to a hidden settings/debug screen
 * NOT FOR PRODUCTION - Remove before submitting to app store
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL, DEBUG_MODE, ENVIRONMENT_TYPE } from '../utils/apiConfig';
import NetworkDiagnostics from '../utils/networkDiagnostics';

const SAVED_API_URL_KEY = 'DEBUG_CUSTOM_API_URL';
const PRIMARY_BROWN = '#6F4E37';
const DARK_BROWN = '#4A3728';
const SUCCESS_GREEN = '#4CAF50';
const ERROR_RED = '#F44336';
const WARNING_ORANGE = '#FF9800';

const APISettingsDebugger = () => {
  const [customUrl, setCustomUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState(null);
  const [currentUrl, setCurrentUrl] = useState(API_BASE_URL);
  const [testResult, setTestResult] = useState(null);
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  useEffect(() => {
    loadSavedUrl();
  }, []);

  const loadSavedUrl = async () => {
    try {
      const saved = await AsyncStorage.getItem(SAVED_API_URL_KEY);
      if (saved) {
        setSavedUrl(saved);
        setCustomUrl(saved);
      }
    } catch (error) {
      console.error('Error loading saved URL:', error);
    }
  };

  const testServerConnection = async (url) => {
    setIsTestingServer(true);
    setTestResult(null);

    try {
      const testUrl = url.endsWith('/') ? url + 'schema/' : url + '/schema/';
      const response = await axios.get(testUrl, { timeout: 5000 });

      setTestResult({
        success: true,
        status: response.status,
        statusText: response.statusText,
        message: `✅ Successfully connected to ${url}`,
        url: testUrl,
        responseTime: `${Math.round(response.headers['content-length'] || 0) / 1024}KB`,
      });
    } catch (error) {
      setTestResult({
        success: false,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: `❌ Failed to connect: ${error.message}`,
        url: url,
        errorCode: error.code,
        diagnosis: getDiagnosis(error),
      });
    } finally {
      setIsTestingServer(false);
    }
  };

  const getDiagnosis = (error) => {
    if (error.code === 'ECONNREFUSED') {
      return 'Connection refused - backend may be down or not accepting connections';
    } else if (error.code === 'ENOTFOUND') {
      return 'DNS resolution failed - cannot find host/domain';
    } else if (error.code === 'ETIMEDOUT') {
      return 'Request timeout - server not responding within 5 seconds';
    } else if (error.code === 'ECONNABORTED') {
      return 'Connection aborted - possible network interruption';
    } else if (error.message.includes('403') || error.message.includes('401')) {
      return 'Authentication failed - check API credentials';
    } else if (error.message.includes('CORS')) {
      return 'CORS error - backend not configured to accept requests from this origin';
    }
    return error.message;
  };

  const handleSaveUrl = async () => {
    if (!customUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid API URL');
      return;
    }

    try {
      await AsyncStorage.setItem(SAVED_API_URL_KEY, customUrl);
      setSavedUrl(customUrl);
      Alert.alert(
        'Success',
        `API URL saved: ${customUrl}\n\nNote: Restart the app for changes to take full effect.`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save URL: ' + error.message);
    }
  };

  const handleClearUrl = async () => {
    try {
      await AsyncStorage.removeItem(SAVED_API_URL_KEY);
      setSavedUrl(null);
      setCustomUrl('');
      Alert.alert('Success', 'Custom API URL cleared. Using default.');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear URL: ' + error.message);
    }
  };

  const runFullDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const results = await NetworkDiagnostics.runDiagnostics();
      setDiagnosticResults(results);
    } catch (error) {
      setDiagnosticResults({
        error: true,
        message: 'Failed to run diagnostics: ' + error.message,
      });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="settings-outline" size={24} color={PRIMARY_BROWN} />
        <Text style={styles.headerText}>API Settings Debugger</Text>
      </View>

      {/* Current Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Configuration</Text>

        <View style={styles.configItem}>
          <Text style={styles.label}>Environment:</Text>
          <Text style={styles.value}>{ENVIRONMENT_TYPE}</Text>
        </View>

        <View style={styles.configItem}>
          <Text style={styles.label}>Current API URL:</Text>
          <Text style={[styles.value, styles.urlText]}>{currentUrl}</Text>
        </View>

        <View style={styles.configItem}>
          <Text style={styles.label}>Debug Mode:</Text>
          <Text style={[styles.value, { color: DEBUG_MODE ? SUCCESS_GREEN : WARNING_ORANGE }]}>
            {DEBUG_MODE ? 'ENABLED' : 'DISABLED'}
          </Text>
        </View>
      </View>

      {/* Test Server Connection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Server Connection</Text>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => testServerConnection(currentUrl)}
          disabled={isTestingServer}
        >
          {isTestingServer ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="pulse" size={16} color="#fff" />
              <Text style={styles.buttonText}>Test Current URL</Text>
            </>
          )}
        </TouchableOpacity>

        {testResult && (
          <View
            style={[
              styles.resultBox,
              { borderColor: testResult.success ? SUCCESS_GREEN : ERROR_RED },
            ]}
          >
            <Text
              style={[
                styles.resultText,
                { color: testResult.success ? SUCCESS_GREEN : ERROR_RED },
              ]}
            >
              {testResult.message}
            </Text>
            {testResult.status && (
              <Text style={styles.resultDetail}>Status: {testResult.status}</Text>
            )}
            {testResult.errorCode && (
              <Text style={styles.resultDetail}>Error Code: {testResult.errorCode}</Text>
            )}
            {testResult.diagnosis && (
              <Text style={styles.resultDetail}>Diagnosis: {testResult.diagnosis}</Text>
            )}
          </View>
        )}
      </View>

      {/* Custom API URL */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom API URL (For Testing)</Text>

        <TextInput
          style={styles.input}
          placeholder="http://192.168.1.100:8000/api"
          value={customUrl}
          onChangeText={setCustomUrl}
          editable={!isTestingServer}
        />

        <Text style={styles.helpText}>
          Example URLs:
          {'\n'}• Local: http://127.0.0.1:8000/api
          {'\n'}• Network: http://192.168.X.X:8000/api
          {'\n'}• Production: http://142.93.94.236:8000/api
        </Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { flex: 1 }]}
            onPress={handleSaveUrl}
          >
            <Ionicons name="save" size={16} color="#fff" />
            <Text style={styles.buttonText}>Save URL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { flex: 1 }]}
            onPress={handleClearUrl}
          >
            <Ionicons name="trash" size={16} color={DARK_BROWN} />
            <Text style={[styles.buttonText, { color: DARK_BROWN }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        {savedUrl && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color={PRIMARY_BROWN} />
            <Text style={styles.infoText}>Custom URL saved. Restart app to use it.</Text>
          </View>
        )}
      </View>

      {/* Run Diagnostics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Full Network Diagnostics</Text>

        <TouchableOpacity
          style={[styles.button, styles.warningButton]}
          onPress={runFullDiagnostics}
          disabled={isRunningDiagnostics}
        >
          {isRunningDiagnostics ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cog" size={16} color="#fff" />
              <Text style={styles.buttonText}>Run Diagnostics</Text>
            </>
          )}
        </TouchableOpacity>

        {diagnosticResults && (
          <View style={styles.diagnosticsBox}>
            <Text style={styles.diagnosticsTitle}>Diagnostic Results</Text>
            {diagnosticResults.error ? (
              <Text style={[styles.resultText, { color: ERROR_RED }]}>
                {diagnosticResults.message}
              </Text>
            ) : (
              <>
                <Text style={styles.diagnosticsText}>
                  ✅ Tests Passed: {diagnosticResults.summary.passed}/{diagnosticResults.summary.total}
                </Text>
                <Text style={styles.diagnosticsText}>
                  Status: {diagnosticResults.summary.connectionStatus}
                </Text>
                {diagnosticResults.tests.schema?.success && (
                  <Text style={styles.passedTest}>✓ Schema endpoint responding</Text>
                )}
                {diagnosticResults.tests.farmerList?.success && (
                  <Text style={styles.passedTest}>✓ Farmer list endpoint responding</Text>
                )}
                {diagnosticResults.tests.farmerHarvest?.success && (
                  <Text style={styles.passedTest}>✓ Farmer harvest endpoint responding</Text>
                )}
              </>
            )}
          </View>
        )}
      </View>

      {/* Warning */}
      <View style={styles.warningBox}>
        <Ionicons name="warning" size={20} color={WARNING_ORANGE} />
        <Text style={styles.warningText}>
          This debugger is for development only. Remove before production deployment.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY_BROWN,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK_BROWN,
    marginLeft: 12,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK_BROWN,
    marginBottom: 16,
  },
  configItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: DARK_BROWN,
    fontWeight: '500',
  },
  urlText: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: PRIMARY_BROWN,
  },
  secondaryButton: {
    backgroundColor: '#e8d4c8',
  },
  warningButton: {
    backgroundColor: WARNING_ORANGE,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
  },
  resultBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    backgroundColor: '#f5f5f5',
  },
  resultText: {
    fontWeight: '600',
    marginBottom: 8,
  },
  resultDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#1976d2',
    marginLeft: 8,
  },
  diagnosticsBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  diagnosticsTitle: {
    fontWeight: '700',
    color: DARK_BROWN,
    marginBottom: 8,
  },
  diagnosticsText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 6,
  },
  passedTest: {
    fontSize: 13,
    color: SUCCESS_GREEN,
    marginBottom: 4,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 12,
    color: '#e65100',
    marginLeft: 8,
    flex: 1,
  },
});

export default APISettingsDebugger;
