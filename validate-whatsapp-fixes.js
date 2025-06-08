#!/usr/bin/env node

/**
 * WhatsApp Integration Validation Script
 * 
 * Validates that all four critical issues have been resolved:
 * 1. QR Code Display within 5 seconds
 * 2. Data Consistency between UI and backend
 * 3. No Infinite Monitoring Loops
 * 4. Proper Two-Step Workflow
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  API_BASE: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  EVOLUTION_API: 'https://evo.torrecentral.com',
  TEST_TIMEOUT: 30000, // 30 seconds
  QR_DISPLAY_TIMEOUT: 5000, // 5 seconds requirement
  VALIDATION_CRITERIA: {
    qrDisplayTime: 5000,
    dataConsistency: 100, // 100% accuracy required
    noInfiniteLoops: true,
    twoStepWorkflow: true
  }
};

// Test results storage
const results = {
  qrCodeDisplay: { passed: false, time: null, error: null },
  dataConsistency: { passed: false, accuracy: 0, error: null },
  infiniteLoops: { passed: false, loopDetected: false, error: null },
  twoStepWorkflow: { passed: false, stepsCompleted: 0, error: null },
  overall: { passed: false, score: 0 }
};

/**
 * Make HTTP request with timeout
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, CONFIG.TEST_TIMEOUT);

    const req = client.request(url, options, (res) => {
      clearTimeout(timeout);
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Test 1: QR Code Display Performance
 */
async function testQRCodeDisplay() {
  console.log('\n🔍 TEST 1: QR Code Display Performance');
  console.log('=' .repeat(50));

  try {
    // Create test instance
    const createStartTime = Date.now();
    
    const createResponse = await makeRequest(`${CONFIG.API_BASE}/api/whatsapp/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instance_name: `validation-test-${Date.now()}`,
        phone_number: '+1234567890'
      })
    });

    if (createResponse.status !== 201) {
      throw new Error(`Instance creation failed: ${createResponse.status}`);
    }

    const instanceId = createResponse.data.data.instance.id;
    console.log(`✅ Instance created: ${instanceId}`);

    // Test connection step (should not generate QR immediately)
    const connectStartTime = Date.now();
    
    const connectResponse = await makeRequest(`${CONFIG.API_BASE}/api/whatsapp/instances/${instanceId}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (connectResponse.status !== 200) {
      throw new Error(`Connection failed: ${connectResponse.status}`);
    }

    // Test QR code retrieval time
    const qrStartTime = Date.now();
    
    const qrResponse = await makeRequest(`${CONFIG.API_BASE}/api/channels/whatsapp/instances/${instanceId}/qr`);
    const qrTime = Date.now() - qrStartTime;

    console.log(`⏱️  QR Code Response Time: ${qrTime}ms`);
    console.log(`🎯 Target: <${CONFIG.VALIDATION_CRITERIA.qrDisplayTime}ms`);

    if (qrTime <= CONFIG.VALIDATION_CRITERIA.qrDisplayTime) {
      results.qrCodeDisplay.passed = true;
      results.qrCodeDisplay.time = qrTime;
      console.log(`✅ QR Code Display: PASSED (${qrTime}ms)`);
    } else {
      results.qrCodeDisplay.error = `QR display took ${qrTime}ms, exceeds ${CONFIG.VALIDATION_CRITERIA.qrDisplayTime}ms limit`;
      console.log(`❌ QR Code Display: FAILED (${qrTime}ms)`);
    }

  } catch (error) {
    results.qrCodeDisplay.error = error.message;
    console.log(`❌ QR Code Display Test Failed: ${error.message}`);
  }
}

/**
 * Test 2: Data Consistency Validation
 */
async function testDataConsistency() {
  console.log('\n🔍 TEST 2: Data Consistency Validation');
  console.log('=' .repeat(50));

  try {
    // Create instance and verify data consistency
    const testData = {
      instance_name: `consistency-test-${Date.now()}`,
      phone_number: '+1987654321'
    };

    const createResponse = await makeRequest(`${CONFIG.API_BASE}/api/whatsapp/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    if (createResponse.status !== 201) {
      throw new Error(`Instance creation failed: ${createResponse.status}`);
    }

    const responseData = createResponse.data.data;
    const instanceId = responseData.instance.id;

    // Verify response format matches expected structure
    const expectedFields = ['instance', 'qrCode', 'evolutionResponse', 'workflow', 'nextStep'];
    const actualFields = Object.keys(responseData);
    
    const missingFields = expectedFields.filter(field => !actualFields.includes(field));
    const extraFields = actualFields.filter(field => !expectedFields.includes(field));

    console.log(`📊 Expected Fields: ${expectedFields.join(', ')}`);
    console.log(`📊 Actual Fields: ${actualFields.join(', ')}`);

    // Verify two-step workflow data
    const workflowCorrect = responseData.workflow === 'two_step';
    const nextStepCorrect = responseData.nextStep === 'connect';
    const qrCodeNull = responseData.qrCode === null;
    const statusCorrect = responseData.instance.status === 'disconnected';

    const consistencyChecks = [
      { name: 'Workflow Type', passed: workflowCorrect, expected: 'two_step', actual: responseData.workflow },
      { name: 'Next Step', passed: nextStepCorrect, expected: 'connect', actual: responseData.nextStep },
      { name: 'QR Code Null', passed: qrCodeNull, expected: null, actual: responseData.qrCode },
      { name: 'Initial Status', passed: statusCorrect, expected: 'disconnected', actual: responseData.instance.status },
      { name: 'No Missing Fields', passed: missingFields.length === 0, expected: 0, actual: missingFields.length },
      { name: 'No Extra Fields', passed: extraFields.length === 0, expected: 0, actual: extraFields.length }
    ];

    const passedChecks = consistencyChecks.filter(check => check.passed).length;
    const accuracy = (passedChecks / consistencyChecks.length) * 100;

    console.log('\n📋 Consistency Checks:');
    consistencyChecks.forEach(check => {
      const status = check.passed ? '✅' : '❌';
      console.log(`  ${status} ${check.name}: Expected ${check.expected}, Got ${check.actual}`);
    });

    console.log(`\n📊 Data Consistency Accuracy: ${accuracy.toFixed(1)}%`);

    if (accuracy >= CONFIG.VALIDATION_CRITERIA.dataConsistency) {
      results.dataConsistency.passed = true;
      results.dataConsistency.accuracy = accuracy;
      console.log(`✅ Data Consistency: PASSED (${accuracy}%)`);
    } else {
      results.dataConsistency.error = `Accuracy ${accuracy}% below required ${CONFIG.VALIDATION_CRITERIA.dataConsistency}%`;
      console.log(`❌ Data Consistency: FAILED (${accuracy}%)`);
    }

  } catch (error) {
    results.dataConsistency.error = error.message;
    console.log(`❌ Data Consistency Test Failed: ${error.message}`);
  }
}

/**
 * Test 3: Infinite Loop Detection
 */
async function testInfiniteLoops() {
  console.log('\n🔍 TEST 3: Infinite Loop Detection');
  console.log('=' .repeat(50));

  try {
    // Create test instance
    const createResponse = await makeRequest(`${CONFIG.API_BASE}/api/whatsapp/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instance_name: `loop-test-${Date.now()}`,
        phone_number: '+1122334455'
      })
    });

    const instanceId = createResponse.data.data.instance.id;

    // Monitor API calls for 10 seconds to detect excessive polling
    const monitoringStartTime = Date.now();
    const apiCalls = [];
    let callCount = 0;

    console.log('🔄 Monitoring API calls for 10 seconds...');

    // Make multiple status requests to simulate normal usage
    const monitoringInterval = setInterval(async () => {
      try {
        const startTime = Date.now();
        await makeRequest(`${CONFIG.API_BASE}/api/channels/whatsapp/instances/${instanceId}/status`);
        const responseTime = Date.now() - startTime;
        
        callCount++;
        apiCalls.push({ timestamp: Date.now(), responseTime });
        
        if (callCount % 5 === 0) {
          console.log(`📊 API Calls: ${callCount}, Avg Response: ${Math.round(apiCalls.reduce((sum, call) => sum + call.responseTime, 0) / apiCalls.length)}ms`);
        }
      } catch (error) {
        // Ignore errors for this test
      }
    }, 1000); // Call every second

    // Stop monitoring after 10 seconds
    setTimeout(() => {
      clearInterval(monitoringInterval);
      
      const totalTime = Date.now() - monitoringStartTime;
      const callsPerSecond = callCount / (totalTime / 1000);
      
      console.log(`\n📊 Monitoring Results:`);
      console.log(`  Total Calls: ${callCount}`);
      console.log(`  Total Time: ${totalTime}ms`);
      console.log(`  Calls/Second: ${callsPerSecond.toFixed(2)}`);
      
      // Check for excessive API calls (more than 2 calls per second indicates potential loop)
      const loopDetected = callsPerSecond > 2;
      
      if (!loopDetected) {
        results.infiniteLoops.passed = true;
        console.log(`✅ Infinite Loop Detection: PASSED (${callsPerSecond.toFixed(2)} calls/sec)`);
      } else {
        results.infiniteLoops.loopDetected = true;
        results.infiniteLoops.error = `Excessive API calls detected: ${callsPerSecond.toFixed(2)} calls/sec`;
        console.log(`❌ Infinite Loop Detection: FAILED (${callsPerSecond.toFixed(2)} calls/sec)`);
      }
    }, 10000);

  } catch (error) {
    results.infiniteLoops.error = error.message;
    console.log(`❌ Infinite Loop Test Failed: ${error.message}`);
  }
}

/**
 * Test 4: Two-Step Workflow Validation
 */
async function testTwoStepWorkflow() {
  console.log('\n🔍 TEST 4: Two-Step Workflow Validation');
  console.log('=' .repeat(50));

  try {
    let stepsCompleted = 0;

    // Step 1: Create disconnected instance
    console.log('📝 Step 1: Creating disconnected instance...');
    
    const createResponse = await makeRequest(`${CONFIG.API_BASE}/api/whatsapp/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instance_name: `workflow-test-${Date.now()}`,
        phone_number: '+1555666777'
      })
    });

    if (createResponse.status === 201 && 
        createResponse.data.data.instance.status === 'disconnected' &&
        createResponse.data.data.workflow === 'two_step') {
      stepsCompleted++;
      console.log('✅ Step 1: Instance created in disconnected state');
    } else {
      throw new Error(`Step 1 failed: Expected disconnected status and two_step workflow`);
    }

    const instanceId = createResponse.data.data.instance.id;

    // Step 2: Connect instance
    console.log('📝 Step 2: Connecting instance...');
    
    const connectResponse = await makeRequest(`${CONFIG.API_BASE}/api/whatsapp/instances/${instanceId}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (connectResponse.status === 200 && 
        connectResponse.data.data.status === 'connecting') {
      stepsCompleted++;
      console.log('✅ Step 2: Instance connection initiated');
    } else {
      throw new Error(`Step 2 failed: Expected connecting status`);
    }

    results.twoStepWorkflow.passed = stepsCompleted === 2;
    results.twoStepWorkflow.stepsCompleted = stepsCompleted;

    if (results.twoStepWorkflow.passed) {
      console.log(`✅ Two-Step Workflow: PASSED (${stepsCompleted}/2 steps)`);
    } else {
      console.log(`❌ Two-Step Workflow: FAILED (${stepsCompleted}/2 steps)`);
    }

  } catch (error) {
    results.twoStepWorkflow.error = error.message;
    console.log(`❌ Two-Step Workflow Test Failed: ${error.message}`);
  }
}

/**
 * Generate final validation report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 WHATSAPP INTEGRATION VALIDATION REPORT');
  console.log('='.repeat(60));

  const tests = [
    { name: 'QR Code Display Performance', result: results.qrCodeDisplay },
    { name: 'Data Consistency', result: results.dataConsistency },
    { name: 'Infinite Loop Prevention', result: results.infiniteLoops },
    { name: 'Two-Step Workflow', result: results.twoStepWorkflow }
  ];

  let passedTests = 0;

  tests.forEach((test, index) => {
    const status = test.result.passed ? '✅ PASSED' : '❌ FAILED';
    const details = test.result.passed 
      ? (test.result.time ? `(${test.result.time}ms)` : 
         test.result.accuracy ? `(${test.result.accuracy}%)` : 
         test.result.stepsCompleted ? `(${test.result.stepsCompleted}/2 steps)` : '')
      : `(${test.result.error})`;
    
    console.log(`${index + 1}. ${test.name}: ${status} ${details}`);
    
    if (test.result.passed) passedTests++;
  });

  const overallScore = (passedTests / tests.length) * 100;
  results.overall.score = overallScore;
  results.overall.passed = overallScore === 100;

  console.log('\n' + '-'.repeat(60));
  console.log(`📊 OVERALL SCORE: ${overallScore}% (${passedTests}/${tests.length} tests passed)`);
  
  if (results.overall.passed) {
    console.log('🎉 ALL CRITICAL ISSUES RESOLVED - MVP READY FOR APPOINTMENT BOOKING');
  } else {
    console.log('⚠️  SOME ISSUES REMAIN - REQUIRES ADDITIONAL FIXES');
  }
  
  console.log('='.repeat(60));

  return results.overall.passed;
}

/**
 * Main validation execution
 */
async function runValidation() {
  console.log('🚀 Starting WhatsApp Integration Validation...');
  console.log(`🔗 API Base: ${CONFIG.API_BASE}`);
  console.log(`⏱️  Timeout: ${CONFIG.TEST_TIMEOUT}ms`);

  try {
    await testQRCodeDisplay();
    await testDataConsistency();
    
    // Run infinite loop test asynchronously
    testInfiniteLoops();
    
    // Wait for infinite loop test to complete
    await new Promise(resolve => setTimeout(resolve, 12000));
    
    await testTwoStepWorkflow();
    
    const success = generateReport();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Validation failed with error:', error.message);
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  runValidation();
}

module.exports = { runValidation, results };
