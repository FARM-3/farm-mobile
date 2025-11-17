/**
 * Network Diagnostics Utility
 *
 * Helps diagnose network connectivity issues between mobile app and backend.
 * Used primarily for debugging harvest sync failures with Network Error (status 0)
 */

import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

export const NetworkDiagnostics = {
  /**
   * Run comprehensive network diagnostics
   * Returns detailed information about backend connectivity
   */
  async runDiagnostics() {
    console.log('\n========== NETWORK DIAGNOSTICS START ==========');
    console.log('Timestamp:', new Date().toISOString());
    console.log('API Base URL:', API_BASE_URL);
    console.log('=============================================\n');

    const results = {
      timestamp: new Date().toISOString(),
      baseUrl: API_BASE_URL,
      tests: {},
      summary: {}
    };

    // Test 1: Schema endpoint (simplest, no auth required)
    console.log('[NetworkDiagnostics] Test 1: Testing schema endpoint...');
    results.tests.schema = await this._testEndpoint('/api/schema/', 'GET');

    // Test 2: Farmer list endpoint (aggregation API)
    console.log('[NetworkDiagnostics] Test 2: Testing farmer list endpoint...');
    results.tests.farmerList = await this._testEndpoint('/api/aggregation/farmer/', 'GET');

    // Test 3: Farmer harvest list endpoint
    console.log('[NetworkDiagnostics] Test 3: Testing farmer harvest endpoint...');
    results.tests.farmerHarvest = await this._testEndpoint('/api/aggregation/farmer-harvest/', 'GET');

    // Summarize results
    const passedTests = Object.values(results.tests).filter(t => t.success).length;
    const totalTests = Object.values(results.tests).length;

    results.summary = {
      passed: passedTests,
      total: totalTests,
      allPassed: passedTests === totalTests,
      connectionStatus: passedTests > 0 ? 'PARTIAL' : 'FAILED'
    };

    console.log('\n========== NETWORK DIAGNOSTICS SUMMARY ==========');
    console.log(`Tests passed: ${passedTests}/${totalTests}`);
    console.log(`Connection Status: ${results.summary.connectionStatus}`);

    if (results.summary.allPassed) {
      console.log('✅ DIAGNOSIS: Network connection is working properly!');
    } else if (results.summary.passed > 0) {
      console.log('⚠️  DIAGNOSIS: Partial connectivity - some endpoints reachable');
    } else {
      console.log('❌ DIAGNOSIS: Cannot reach backend server');
      console.log('  Possible causes:');
      console.log('  1. Backend server is offline or crashed');
      console.log('  2. Network connectivity issue on device/simulator');
      console.log('  3. Firewall blocking the connection');
      console.log('  4. IP address or DNS resolution issue');
    }
    console.log('================================================\n');

    return results;
  },

  /**
   * Test a single endpoint
   */
  async _testEndpoint(endpoint, method = 'GET') {
    const fullUrl = API_BASE_URL + endpoint;
    const testResult = {
      endpoint,
      method,
      fullUrl,
      success: false,
      statusCode: null,
      error: null,
      duration: 0
    };

    const startTime = Date.now();

    try {
      const response = await axios({
        method,
        url: fullUrl,
        timeout: 10000, // 10 second timeout
      });

      testResult.success = true;
      testResult.statusCode = response.status;
      testResult.duration = Date.now() - startTime;

      console.log(`  ✅ ${method} ${endpoint} -> ${response.status} (${testResult.duration}ms)`);
    } catch (error) {
      testResult.duration = Date.now() - startTime;
      testResult.error = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
      };

      // Provide specific diagnosis
      if (!error.response) {
        if (error.code === 'ECONNREFUSED') {
          testResult.error.diagnosis = 'Connection refused - server not accepting connections';
        } else if (error.code === 'ENOTFOUND') {
          testResult.error.diagnosis = 'DNS resolution failed - cannot find host';
        } else if (error.code === 'ETIMEDOUT') {
          testResult.error.diagnosis = 'Request timeout - server not responding';
        } else {
          testResult.error.diagnosis = `Network error: ${error.code}`;
        }
      }

      console.log(`  ❌ ${method} ${endpoint} -> Error: ${error.message} (${testResult.duration}ms)`);
      if (testResult.error.diagnosis) {
        console.log(`     Diagnosis: ${testResult.error.diagnosis}`);
      }
    }

    return testResult;
  },

  /**
   * Check if a specific IP:port is reachable
   * (Useful for testing the backend server directly)
   */
  async testConnection(host, port = 8000) {
    console.log(`\n[NetworkDiagnostics] Testing connection to ${host}:${port}...`);

    const testUrl = `http://${host}:${port}/api/schema/`;

    try {
      const response = await axios.get(testUrl, { timeout: 5000 });
      console.log(`✅ Successfully connected to ${host}:${port}`);
      return {
        reachable: true,
        statusCode: response.status,
        message: 'Connection successful'
      };
    } catch (error) {
      console.log(`❌ Failed to connect to ${host}:${port}`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      return {
        reachable: false,
        error: error.message,
        code: error.code,
        message: 'Connection failed'
      };
    }
  }
};

export default NetworkDiagnostics;
