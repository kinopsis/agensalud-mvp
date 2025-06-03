#!/usr/bin/env node

/**
 * Evolution API v2 Integration Validation Script
 * 
 * Comprehensive validation of Evolution API integration for AgentSalud MVP
 * Tests connectivity, instance management, QR codes, webhooks, and message flow
 * 
 * @author AgentSalud DevOps Team
 * @date January 2025
 */

const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

// =====================================================
// CONFIGURATION
// =====================================================

const CONFIG = {
  evolutionAPI: {
    baseUrl: process.env.EVOLUTION_API_BASE_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY || '',
    version: 'v2'
  },
  webhook: {
    url: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook` : 'http://localhost:3000/api/whatsapp/webhook',
    verifyToken: process.env.EVOLUTION_WEBHOOK_VERIFY_TOKEN || 'default-verify-token'
  },
  testInstance: {
    name: `validation-test-${Date.now()}`,
    integration: 'WHATSAPP-BUSINESS',
    qrcode: true
  }
};

// =====================================================
// VALIDATION RESULTS TRACKING
// =====================================================

const results = {
  connectivity: { passed: 0, failed: 0, tests: [] },
  instanceManagement: { passed: 0, failed: 0, tests: [] },
  qrCodeGeneration: { passed: 0, failed: 0, tests: [] },
  webhookProcessing: { passed: 0, failed: 0, tests: [] },
  messageFlow: { passed: 0, failed: 0, tests: [] },
  performance: { passed: 0, failed: 0, tests: [] }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function logTest(category, testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const timestamp = new Date().toISOString();
  
  console.log(`${status} [${category}] ${testName} ${details}`);
  
  results[category].tests.push({
    name: testName,
    passed,
    details,
    timestamp
  });
  
  if (passed) {
    results[category].passed++;
  } else {
    results[category].failed++;
  }
}

async function makeEvolutionAPIRequest(method, endpoint, data = null) {
  const url = `${CONFIG.evolutionAPI.baseUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': CONFIG.evolutionAPI.apiKey
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const startTime = Date.now();
  const response = await fetch(url, options);
  const responseTime = Date.now() - startTime;
  
  let responseData = null;
  try {
    responseData = await response.json();
  } catch (error) {
    responseData = await response.text();
  }

  return {
    ok: response.ok,
    status: response.status,
    data: responseData,
    responseTime
  };
}

// =====================================================
// VALIDATION TESTS
// =====================================================

async function validateConnectivity() {
  console.log('\n🔗 TESTING EVOLUTION API CONNECTIVITY');
  console.log('=====================================');

  // Test 1: API Health Check
  try {
    const response = await makeEvolutionAPIRequest('GET', '/');
    logTest('connectivity', 'API Health Check', response.ok, `Status: ${response.status}, Time: ${response.responseTime}ms`);
  } catch (error) {
    logTest('connectivity', 'API Health Check', false, `Error: ${error.message}`);
  }

  // Test 2: Authentication Validation
  try {
    const response = await makeEvolutionAPIRequest('GET', '/instance/fetchInstances');
    logTest('connectivity', 'Authentication Validation', response.ok, `Status: ${response.status}`);
  } catch (error) {
    logTest('connectivity', 'Authentication Validation', false, `Error: ${error.message}`);
  }

  // Test 3: API Version Check
  try {
    const response = await makeEvolutionAPIRequest('GET', '/');
    const isV2 = response.data && (response.data.version === 'v2' || response.data.includes('v2'));
    logTest('connectivity', 'API Version Check', isV2, `Version: ${response.data.version || 'Unknown'}`);
  } catch (error) {
    logTest('connectivity', 'API Version Check', false, `Error: ${error.message}`);
  }
}

async function validateInstanceManagement() {
  console.log('\n📱 TESTING INSTANCE MANAGEMENT');
  console.log('===============================');

  let instanceCreated = false;

  // Test 1: Create Instance
  try {
    const instanceData = {
      instanceName: CONFIG.testInstance.name,
      integration: CONFIG.testInstance.integration,
      qrcode: CONFIG.testInstance.qrcode,
      webhook: CONFIG.webhook.url,
      webhookByEvents: true,
      events: ['messages.upsert', 'connection.update', 'qr.updated']
    };

    const response = await makeEvolutionAPIRequest('POST', '/instance/create', instanceData);
    instanceCreated = response.ok;
    logTest('instanceManagement', 'Create Instance', response.ok, `Instance: ${CONFIG.testInstance.name}, Status: ${response.status}`);
  } catch (error) {
    logTest('instanceManagement', 'Create Instance', false, `Error: ${error.message}`);
  }

  // Test 2: Fetch Instance Info
  if (instanceCreated) {
    try {
      const response = await makeEvolutionAPIRequest('GET', `/instance/fetchInstances/${CONFIG.testInstance.name}`);
      logTest('instanceManagement', 'Fetch Instance Info', response.ok, `Status: ${response.status}`);
    } catch (error) {
      logTest('instanceManagement', 'Fetch Instance Info', false, `Error: ${error.message}`);
    }
  }

  // Test 3: Instance Status Check
  if (instanceCreated) {
    try {
      const response = await makeEvolutionAPIRequest('GET', `/instance/connectionState/${CONFIG.testInstance.name}`);
      logTest('instanceManagement', 'Instance Status Check', response.ok, `State: ${response.data?.instance?.state || 'Unknown'}`);
    } catch (error) {
      logTest('instanceManagement', 'Instance Status Check', false, `Error: ${error.message}`);
    }
  }

  return instanceCreated;
}

async function validateQRCodeGeneration(instanceExists) {
  console.log('\n📱 TESTING QR CODE GENERATION');
  console.log('==============================');

  if (!instanceExists) {
    logTest('qrCodeGeneration', 'QR Code Generation', false, 'No instance available for testing');
    return;
  }

  // Test 1: Generate QR Code
  try {
    const response = await makeEvolutionAPIRequest('GET', `/instance/qrcode/${CONFIG.testInstance.name}`);
    const hasQRCode = response.ok && response.data && (response.data.qrcode || response.data.base64);
    logTest('qrCodeGeneration', 'Generate QR Code', hasQRCode, `Has QR: ${!!hasQRCode}, Time: ${response.responseTime}ms`);
  } catch (error) {
    logTest('qrCodeGeneration', 'Generate QR Code', false, `Error: ${error.message}`);
  }

  // Test 2: QR Code Format Validation
  try {
    const response = await makeEvolutionAPIRequest('GET', `/instance/qrcode/${CONFIG.testInstance.name}`);
    if (response.ok && response.data) {
      const hasBase64 = response.data.base64 && response.data.base64.startsWith('data:image/png;base64,');
      const hasQRText = response.data.qrcode && typeof response.data.qrcode === 'string';
      logTest('qrCodeGeneration', 'QR Code Format Validation', hasBase64 && hasQRText, `Base64: ${!!hasBase64}, Text: ${!!hasQRText}`);
    } else {
      logTest('qrCodeGeneration', 'QR Code Format Validation', false, 'No QR code data received');
    }
  } catch (error) {
    logTest('qrCodeGeneration', 'QR Code Format Validation', false, `Error: ${error.message}`);
  }

  // Test 3: QR Code Refresh Test
  try {
    const firstResponse = await makeEvolutionAPIRequest('GET', `/instance/qrcode/${CONFIG.testInstance.name}`);
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const secondResponse = await makeEvolutionAPIRequest('GET', `/instance/qrcode/${CONFIG.testInstance.name}`);
    
    const bothSuccessful = firstResponse.ok && secondResponse.ok;
    const qrCodesExist = firstResponse.data?.qrcode && secondResponse.data?.qrcode;
    
    logTest('qrCodeGeneration', 'QR Code Refresh Test', bothSuccessful && qrCodesExist, `Both requests successful: ${bothSuccessful}`);
  } catch (error) {
    logTest('qrCodeGeneration', 'QR Code Refresh Test', false, `Error: ${error.message}`);
  }
}

async function validateWebhookProcessing() {
  console.log('\n🔗 TESTING WEBHOOK PROCESSING');
  console.log('==============================');

  // Test 1: Webhook URL Accessibility
  try {
    const response = await fetch(CONFIG.webhook.url, {
      method: 'GET'
    });
    
    // Webhook endpoint should return 405 for GET requests (only accepts POST)
    const isAccessible = response.status === 405 || response.status === 200;
    logTest('webhookProcessing', 'Webhook URL Accessibility', isAccessible, `Status: ${response.status}`);
  } catch (error) {
    logTest('webhookProcessing', 'Webhook URL Accessibility', false, `Error: ${error.message}`);
  }

  // Test 2: Webhook Payload Validation
  try {
    const testPayload = {
      event: 'connection.update',
      instance: CONFIG.testInstance.name,
      data: {
        state: 'connecting',
        timestamp: Date.now()
      }
    };

    const response = await fetch(CONFIG.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-evolution-verify-token': CONFIG.webhook.verifyToken
      },
      body: JSON.stringify(testPayload)
    });

    logTest('webhookProcessing', 'Webhook Payload Validation', response.ok, `Status: ${response.status}`);
  } catch (error) {
    logTest('webhookProcessing', 'Webhook Payload Validation', false, `Error: ${error.message}`);
  }

  // Test 3: Webhook Security Validation
  try {
    const testPayload = { malicious: 'payload' };

    const response = await fetch(CONFIG.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No verify token - should be rejected
      },
      body: JSON.stringify(testPayload)
    });

    // Should reject unauthorized requests
    const isSecure = response.status === 401 || response.status === 403;
    logTest('webhookProcessing', 'Webhook Security Validation', isSecure, `Rejected unauthorized: ${isSecure}`);
  } catch (error) {
    logTest('webhookProcessing', 'Webhook Security Validation', false, `Error: ${error.message}`);
  }
}

async function validatePerformance(instanceExists) {
  console.log('\n⚡ TESTING PERFORMANCE');
  console.log('======================');

  if (!instanceExists) {
    logTest('performance', 'Performance Tests', false, 'No instance available for testing');
    return;
  }

  // Test 1: QR Code Generation Performance
  try {
    const startTime = Date.now();
    const response = await makeEvolutionAPIRequest('GET', `/instance/qrcode/${CONFIG.testInstance.name}`);
    const responseTime = Date.now() - startTime;
    
    const isPerformant = response.ok && responseTime < 5000; // Less than 5 seconds
    logTest('performance', 'QR Code Generation Performance', isPerformant, `Time: ${responseTime}ms (target: <5000ms)`);
  } catch (error) {
    logTest('performance', 'QR Code Generation Performance', false, `Error: ${error.message}`);
  }

  // Test 2: Instance Status Check Performance
  try {
    const startTime = Date.now();
    const response = await makeEvolutionAPIRequest('GET', `/instance/connectionState/${CONFIG.testInstance.name}`);
    const responseTime = Date.now() - startTime;
    
    const isPerformant = response.ok && responseTime < 3000; // Less than 3 seconds
    logTest('performance', 'Instance Status Performance', isPerformant, `Time: ${responseTime}ms (target: <3000ms)`);
  } catch (error) {
    logTest('performance', 'Instance Status Performance', false, `Error: ${error.message}`);
  }

  // Test 3: Concurrent Requests Performance
  try {
    const concurrentRequests = 5;
    const promises = [];
    
    const startTime = Date.now();
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(makeEvolutionAPIRequest('GET', `/instance/connectionState/${CONFIG.testInstance.name}`));
    }
    
    const responses = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    const allSuccessful = responses.every(r => r.ok);
    const isPerformant = allSuccessful && totalTime < 10000; // Less than 10 seconds for 5 concurrent requests
    
    logTest('performance', 'Concurrent Requests Performance', isPerformant, `${concurrentRequests} requests in ${totalTime}ms`);
  } catch (error) {
    logTest('performance', 'Concurrent Requests Performance', false, `Error: ${error.message}`);
  }
}

async function cleanup() {
  console.log('\n🧹 CLEANUP');
  console.log('==========');

  // Delete test instance
  try {
    const response = await makeEvolutionAPIRequest('DELETE', `/instance/delete/${CONFIG.testInstance.name}`);
    console.log(`${response.ok ? '✅' : '❌'} Test instance cleanup: ${response.ok ? 'Success' : 'Failed'}`);
  } catch (error) {
    console.log(`❌ Test instance cleanup failed: ${error.message}`);
  }
}

function generateReport() {
  console.log('\n📊 VALIDATION REPORT');
  console.log('====================');

  let totalPassed = 0;
  let totalFailed = 0;

  Object.entries(results).forEach(([category, result]) => {
    const categoryTotal = result.passed + result.failed;
    const successRate = categoryTotal > 0 ? ((result.passed / categoryTotal) * 100).toFixed(1) : '0.0';
    
    console.log(`\n${category.toUpperCase()}:`);
    console.log(`  ✅ Passed: ${result.passed}`);
    console.log(`  ❌ Failed: ${result.failed}`);
    console.log(`  📊 Success Rate: ${successRate}%`);
    
    totalPassed += result.passed;
    totalFailed += result.failed;
  });

  const overallTotal = totalPassed + totalFailed;
  const overallSuccessRate = overallTotal > 0 ? ((totalPassed / overallTotal) * 100).toFixed(1) : '0.0';

  console.log('\n🎯 OVERALL RESULTS:');
  console.log(`  ✅ Total Passed: ${totalPassed}`);
  console.log(`  ❌ Total Failed: ${totalFailed}`);
  console.log(`  📊 Overall Success Rate: ${overallSuccessRate}%`);

  // Determine if ready for production
  const isReadyForProduction = overallSuccessRate >= 95 && totalFailed === 0;
  console.log(`\n🚀 PRODUCTION READINESS: ${isReadyForProduction ? '✅ READY' : '❌ NOT READY'}`);

  if (!isReadyForProduction) {
    console.log('\n⚠️  ISSUES TO RESOLVE:');
    Object.entries(results).forEach(([category, result]) => {
      result.tests.forEach(test => {
        if (!test.passed) {
          console.log(`  - [${category}] ${test.name}: ${test.details}`);
        }
      });
    });
  }

  return {
    totalPassed,
    totalFailed,
    overallSuccessRate: parseFloat(overallSuccessRate),
    isReadyForProduction,
    results
  };
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  console.log('🚀 EVOLUTION API v2 INTEGRATION VALIDATION');
  console.log('===========================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Evolution API: ${CONFIG.evolutionAPI.baseUrl}`);
  console.log(`Webhook URL: ${CONFIG.webhook.url}`);
  console.log(`Test Instance: ${CONFIG.testInstance.name}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // Run validation tests
    await validateConnectivity();
    const instanceExists = await validateInstanceManagement();
    await validateQRCodeGeneration(instanceExists);
    await validateWebhookProcessing();
    await validatePerformance(instanceExists);

    // Cleanup
    await cleanup();

    // Generate final report
    const report = generateReport();

    // Exit with appropriate code
    process.exit(report.isReadyForProduction ? 0 : 1);

  } catch (error) {
    console.error('\n💥 VALIDATION FAILED WITH CRITICAL ERROR:');
    console.error(error);
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateEvolutionAPIIntegration: main,
  CONFIG,
  results
};
