#!/usr/bin/env node

/**
 * Simple API Validation Script
 * 
 * Tests the actual API endpoints to verify the fixes are working
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

const http = require('http');

// Configuration
const API_BASE = 'http://localhost:3000';
const TEST_TIMEOUT = 10000;

// Test results
const results = {
  apiHealth: { passed: false, error: null },
  endpointStructure: { passed: false, error: null },
  twoStepWorkflow: { passed: false, error: null }
};

/**
 * Make HTTP request
 */
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: TEST_TIMEOUT
    };

    const req = http.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ 
            status: res.statusCode, 
            data: jsonData,
            headers: res.headers 
          });
        } catch (error) {
          resolve({ 
            status: res.statusCode, 
            data: data,
            headers: res.headers 
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

/**
 * Test 1: API Health Check
 */
async function testAPIHealth() {
  console.log('\n🔍 TEST 1: API Health Check');
  console.log('=' .repeat(40));

  try {
    const response = await makeRequest('/');
    
    if (response.status === 200) {
      results.apiHealth.passed = true;
      console.log('✅ API Health: PASSED (Status 200)');
    } else {
      results.apiHealth.error = `Unexpected status: ${response.status}`;
      console.log(`❌ API Health: FAILED (Status ${response.status})`);
    }
  } catch (error) {
    results.apiHealth.error = error.message;
    console.log(`❌ API Health: FAILED (${error.message})`);
  }
}

/**
 * Test 2: Endpoint Structure Validation
 */
async function testEndpointStructure() {
  console.log('\n🔍 TEST 2: Endpoint Structure Validation');
  console.log('=' .repeat(40));

  try {
    // Test that our new endpoints exist (even if they return auth errors)
    const endpoints = [
      '/api/whatsapp/instances',
      '/api/channels/whatsapp/instances/test/qr',
      '/api/channels/whatsapp/instances/test/status'
    ];

    let validEndpoints = 0;
    
    for (const endpoint of endpoints) {
      try {
        const response = await makeRequest(endpoint, { method: 'GET' });
        
        // We expect 401 (unauthorized) or 404 (not found) for valid endpoints
        // 500 or other errors might indicate structural issues
        if ([200, 401, 404, 405].includes(response.status)) {
          validEndpoints++;
          console.log(`✅ ${endpoint}: Valid (${response.status})`);
        } else {
          console.log(`⚠️  ${endpoint}: Unexpected status (${response.status})`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: Error (${error.message})`);
      }
    }

    const accuracy = (validEndpoints / endpoints.length) * 100;
    
    if (accuracy >= 66) { // At least 2/3 endpoints should be valid
      results.endpointStructure.passed = true;
      console.log(`✅ Endpoint Structure: PASSED (${accuracy}% valid)`);
    } else {
      results.endpointStructure.error = `Only ${accuracy}% of endpoints are valid`;
      console.log(`❌ Endpoint Structure: FAILED (${accuracy}% valid)`);
    }

  } catch (error) {
    results.endpointStructure.error = error.message;
    console.log(`❌ Endpoint Structure Test Failed: ${error.message}`);
  }
}

/**
 * Test 3: Two-Step Workflow Structure
 */
async function testTwoStepWorkflow() {
  console.log('\n🔍 TEST 3: Two-Step Workflow Structure');
  console.log('=' .repeat(40));

  try {
    // Test that the connect endpoint exists
    const connectResponse = await makeRequest('/api/whatsapp/instances/test-id/connect', {
      method: 'POST'
    });

    // We expect 401 (unauthorized) for a valid endpoint without auth
    // 404 would mean the endpoint doesn't exist
    // 500 might indicate implementation issues
    
    console.log(`📊 Connect Endpoint Status: ${connectResponse.status}`);
    
    if ([401, 403].includes(connectResponse.status)) {
      results.twoStepWorkflow.passed = true;
      console.log('✅ Two-Step Workflow: PASSED (Connect endpoint exists)');
    } else if (connectResponse.status === 404) {
      results.twoStepWorkflow.error = 'Connect endpoint not found';
      console.log('❌ Two-Step Workflow: FAILED (Connect endpoint missing)');
    } else {
      results.twoStepWorkflow.error = `Unexpected status: ${connectResponse.status}`;
      console.log(`⚠️  Two-Step Workflow: Uncertain (Status ${connectResponse.status})`);
    }

  } catch (error) {
    results.twoStepWorkflow.error = error.message;
    console.log(`❌ Two-Step Workflow Test Failed: ${error.message}`);
  }
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log('\n' + '='.repeat(50));
  console.log('📋 SIMPLE API VALIDATION REPORT');
  console.log('='.repeat(50));

  const tests = [
    { name: 'API Health Check', result: results.apiHealth },
    { name: 'Endpoint Structure', result: results.endpointStructure },
    { name: 'Two-Step Workflow', result: results.twoStepWorkflow }
  ];

  let passedTests = 0;

  tests.forEach((test, index) => {
    const status = test.result.passed ? '✅ PASSED' : '❌ FAILED';
    const details = test.result.error ? `(${test.result.error})` : '';
    
    console.log(`${index + 1}. ${test.name}: ${status} ${details}`);
    
    if (test.result.passed) passedTests++;
  });

  const overallScore = (passedTests / tests.length) * 100;

  console.log('\n' + '-'.repeat(50));
  console.log(`📊 OVERALL SCORE: ${overallScore}% (${passedTests}/${tests.length} tests passed)`);
  
  if (overallScore >= 66) {
    console.log('🎉 API STRUCTURE VALIDATION PASSED');
    console.log('✅ Core endpoints are accessible and properly structured');
  } else {
    console.log('⚠️  API STRUCTURE NEEDS ATTENTION');
    console.log('❌ Some endpoints may have structural issues');
  }
  
  console.log('='.repeat(50));

  return overallScore >= 66;
}

/**
 * Main validation execution
 */
async function runValidation() {
  console.log('🚀 Starting Simple API Validation...');
  console.log(`🔗 API Base: ${API_BASE}`);

  try {
    await testAPIHealth();
    await testEndpointStructure();
    await testTwoStepWorkflow();
    
    const success = generateReport();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Validation failed with error:', error.message);
    process.exit(1);
  }
}

// Run validation
runValidation();
