#!/usr/bin/env node

/**
 * @fileoverview Production Deployment Validation Script
 * Comprehensive validation of AgentSalud MVP production deployment
 * Tests all critical functionality and performance metrics
 * 
 * @author AgentSalud DevOps Team
 * @date January 2025
 */

const https = require('https');
const { performance } = require('perf_hooks');

// Configuration
const PRODUCTION_URL = 'https://agentsalud.com';
const TIMEOUT = 10000; // 10 seconds
const PERFORMANCE_THRESHOLD = 3000; // 3 seconds

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[34m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
};

const makeRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    const req = https.request(url, {
      timeout: TIMEOUT,
      ...options
    }, (res) => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          responseTime: responseTime
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
};

const addTestResult = (name, passed, message, responseTime = null) => {
  const result = {
    name,
    passed,
    message,
    responseTime,
    timestamp: new Date().toISOString()
  };
  
  results.tests.push(result);
  
  if (passed) {
    results.passed++;
    log(`✅ ${name}: ${message}`, 'success');
  } else {
    results.failed++;
    log(`❌ ${name}: ${message}`, 'error');
  }
  
  if (responseTime) {
    log(`   Response time: ${responseTime.toFixed(2)}ms`, 'info');
  }
};

const addWarning = (name, message) => {
  results.warnings++;
  results.tests.push({
    name,
    passed: null,
    message,
    timestamp: new Date().toISOString()
  });
  log(`⚠️  ${name}: ${message}`, 'warning');
};

// Test functions
const testHomePage = async () => {
  try {
    const response = await makeRequest(PRODUCTION_URL);
    
    if (response.statusCode === 200) {
      addTestResult(
        'Homepage Accessibility',
        true,
        'Homepage loads successfully',
        response.responseTime
      );
      
      if (response.responseTime > PERFORMANCE_THRESHOLD) {
        addWarning(
          'Homepage Performance',
          `Response time ${response.responseTime.toFixed(2)}ms exceeds threshold ${PERFORMANCE_THRESHOLD}ms`
        );
      }
    } else {
      addTestResult(
        'Homepage Accessibility',
        false,
        `Unexpected status code: ${response.statusCode}`
      );
    }
  } catch (error) {
    addTestResult(
      'Homepage Accessibility',
      false,
      `Request failed: ${error.message}`
    );
  }
};

const testAPIHealth = async () => {
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/health`);
    
    if (response.statusCode === 200) {
      try {
        const data = JSON.parse(response.data);
        if (data.status === 'healthy') {
          addTestResult(
            'API Health Check',
            true,
            'API health endpoint responds correctly',
            response.responseTime
          );
        } else {
          addTestResult(
            'API Health Check',
            false,
            `API reports unhealthy status: ${data.status}`
          );
        }
      } catch (parseError) {
        addTestResult(
          'API Health Check',
          false,
          'Invalid JSON response from health endpoint'
        );
      }
    } else {
      addTestResult(
        'API Health Check',
        false,
        `Health endpoint returned status: ${response.statusCode}`
      );
    }
  } catch (error) {
    addTestResult(
      'API Health Check',
      false,
      `Health check failed: ${error.message}`
    );
  }
};

const testSecurityHeaders = async () => {
  try {
    const response = await makeRequest(PRODUCTION_URL);
    const headers = response.headers;
    
    const requiredHeaders = {
      'strict-transport-security': 'HSTS header',
      'x-content-type-options': 'Content type options header',
      'x-frame-options': 'Frame options header',
      'content-security-policy': 'Content Security Policy header'
    };
    
    let allHeadersPresent = true;
    const missingHeaders = [];
    
    for (const [header, description] of Object.entries(requiredHeaders)) {
      if (!headers[header]) {
        allHeadersPresent = false;
        missingHeaders.push(description);
      }
    }
    
    if (allHeadersPresent) {
      addTestResult(
        'Security Headers',
        true,
        'All required security headers are present'
      );
    } else {
      addTestResult(
        'Security Headers',
        false,
        `Missing headers: ${missingHeaders.join(', ')}`
      );
    }
  } catch (error) {
    addTestResult(
      'Security Headers',
      false,
      `Security headers check failed: ${error.message}`
    );
  }
};

const testSSLCertificate = async () => {
  try {
    const response = await makeRequest(PRODUCTION_URL);
    
    if (response.headers['content-type']) {
      addTestResult(
        'SSL Certificate',
        true,
        'HTTPS connection established successfully'
      );
    } else {
      addTestResult(
        'SSL Certificate',
        false,
        'HTTPS connection failed'
      );
    }
  } catch (error) {
    if (error.code === 'CERT_HAS_EXPIRED') {
      addTestResult(
        'SSL Certificate',
        false,
        'SSL certificate has expired'
      );
    } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      addTestResult(
        'SSL Certificate',
        false,
        'SSL certificate verification failed'
      );
    } else {
      addTestResult(
        'SSL Certificate',
        false,
        `SSL check failed: ${error.message}`
      );
    }
  }
};

const testAPIEndpoints = async () => {
  const endpoints = [
    '/api/appointments',
    '/api/users',
    '/api/organizations',
    '/api/services',
    '/api/channels/whatsapp/instances'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${PRODUCTION_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Most endpoints should return 401 (unauthorized) for unauthenticated requests
      if (response.statusCode === 401 || response.statusCode === 200) {
        addTestResult(
          `API Endpoint ${endpoint}`,
          true,
          `Endpoint responds correctly (${response.statusCode})`,
          response.responseTime
        );
      } else {
        addTestResult(
          `API Endpoint ${endpoint}`,
          false,
          `Unexpected status code: ${response.statusCode}`
        );
      }
    } catch (error) {
      addTestResult(
        `API Endpoint ${endpoint}`,
        false,
        `Endpoint test failed: ${error.message}`
      );
    }
  }
};

const testWebhookEndpoints = async () => {
  const webhookEndpoints = [
    '/api/webhooks/evolution',
    '/api/whatsapp/webhook'
  ];
  
  for (const endpoint of webhookEndpoints) {
    try {
      const response = await makeRequest(`${PRODUCTION_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Webhook endpoints should handle POST requests (may return 400 for invalid data)
      if ([200, 400, 401, 405].includes(response.statusCode)) {
        addTestResult(
          `Webhook ${endpoint}`,
          true,
          `Webhook endpoint accessible (${response.statusCode})`,
          response.responseTime
        );
      } else {
        addTestResult(
          `Webhook ${endpoint}`,
          false,
          `Unexpected status code: ${response.statusCode}`
        );
      }
    } catch (error) {
      addTestResult(
        `Webhook ${endpoint}`,
        false,
        `Webhook test failed: ${error.message}`
      );
    }
  }
};

// Main validation function
const runValidation = async () => {
  log('🚀 Starting AgentSalud MVP Production Deployment Validation', 'info');
  log(`Testing production URL: ${PRODUCTION_URL}`, 'info');
  
  const startTime = performance.now();
  
  // Run all tests
  await testHomePage();
  await testAPIHealth();
  await testSecurityHeaders();
  await testSSLCertificate();
  await testAPIEndpoints();
  await testWebhookEndpoints();
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  // Generate report
  log('\n📊 Validation Results Summary', 'info');
  log(`Total tests: ${results.tests.length}`, 'info');
  log(`Passed: ${results.passed}`, 'success');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'info');
  log(`Warnings: ${results.warnings}`, results.warnings > 0 ? 'warning' : 'info');
  log(`Total validation time: ${totalTime.toFixed(2)}ms`, 'info');
  
  // Success criteria
  const successRate = (results.passed / (results.passed + results.failed)) * 100;
  log(`Success rate: ${successRate.toFixed(1)}%`, 'info');
  
  if (results.failed === 0) {
    log('\n🎉 All critical tests passed! Production deployment is successful.', 'success');
    process.exit(0);
  } else if (successRate >= 80) {
    log('\n⚠️  Some tests failed, but deployment is acceptable. Monitor closely.', 'warning');
    process.exit(0);
  } else {
    log('\n❌ Critical tests failed. Production deployment needs attention.', 'error');
    process.exit(1);
  }
};

// Handle script interruption
process.on('SIGINT', () => {
  log('\n⚠️  Validation interrupted by user', 'warning');
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  log(`Unhandled error: ${error.message}`, 'error');
  process.exit(1);
});

// Run validation
runValidation().catch((error) => {
  log(`Validation failed: ${error.message}`, 'error');
  process.exit(1);
});
