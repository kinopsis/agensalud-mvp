#!/usr/bin/env node

/**
 * PRODUCTION VALIDATION SUITE
 * WhatsApp Radical Solution Implementation
 * 
 * Comprehensive validation and monitoring for production deployment
 * 
 * @author AgentSalud DevOps Team
 * @date January 28, 2025
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// =====================================================
// CONFIGURATION
// =====================================================
const CONFIG = {
  productionUrl: 'https://agendia.torrecentral.com',
  evolutionApiUrl: 'https://evo.torrecentral.com',
  testTimeout: 30000, // 30 seconds
  performanceThresholds: {
    qrGeneration: 5000,      // 5 seconds
    apiResponse: 1000,       // 1 second
    webhookProcessing: 2000  // 2 seconds
  },
  loadTestConfig: {
    concurrentUsers: 10,
    testDuration: 60000,     // 1 minute
    requestInterval: 1000    // 1 second
  }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

const log = (message, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    WARNING: '\x1b[33m',
    ERROR: '\x1b[31m',
    RESET: '\x1b[0m'
  };
  
  console.log(`${colors[type]}[${timestamp}] [${type}]${colors.RESET} ${message}`);
};

const makeRequest = async (url, options = {}) => {
  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      timeout: CONFIG.testTimeout,
      ...options
    });
    const responseTime = Date.now() - startTime;
    
    return {
      success: response.ok,
      status: response.status,
      responseTime,
      data: response.ok ? await response.json().catch(() => null) : null,
      error: response.ok ? null : response.statusText
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      responseTime: Date.now() - startTime,
      data: null,
      error: error.message
    };
  }
};

// =====================================================
// VALIDATION TESTS
// =====================================================

class ProductionValidator {
  constructor() {
    this.results = {
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  addResult(testName, passed, message, responseTime = null, data = null) {
    const result = {
      testName,
      passed,
      message,
      responseTime,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(result);
    this.results.summary.total++;
    
    if (passed) {
      this.results.summary.passed++;
      log(`✅ ${testName}: ${message}`, 'SUCCESS');
    } else {
      this.results.summary.failed++;
      log(`❌ ${testName}: ${message}`, 'ERROR');
    }
    
    if (responseTime) {
      log(`   Response time: ${responseTime}ms`, 'INFO');
    }
  }

  addWarning(testName, message) {
    this.results.summary.warnings++;
    log(`⚠️ ${testName}: ${message}`, 'WARNING');
  }

  // =====================================================
  // HEALTH CHECK TESTS
  // =====================================================

  async testHealthEndpoints() {
    log('Testing health endpoints...', 'INFO');
    
    const endpoints = [
      '/api/health',
      '/api/health/basic',
      '/api/health/database',
      '/api/health/evolution'
    ];
    
    for (const endpoint of endpoints) {
      const result = await makeRequest(`${CONFIG.productionUrl}${endpoint}`);
      
      this.addResult(
        `Health Check ${endpoint}`,
        result.success && result.status === 200,
        result.success ? 'Health endpoint responding' : `Failed: ${result.error}`,
        result.responseTime,
        result.data
      );
    }
  }

  // =====================================================
  // WEBHOOK VALIDATION TESTS
  // =====================================================

  async testWebhookEndpoints() {
    log('Testing webhook endpoints...', 'INFO');
    
    const webhookEndpoints = [
      '/api/webhooks/evolution/test-org',
      '/api/whatsapp/webhook',
      '/api/whatsapp/simple/webhook/test-org',
      '/api/channels/whatsapp/webhook'
    ];
    
    const testPayload = {
      event: 'CONNECTION_UPDATE',
      instance: 'test-instance',
      data: { state: 'open', status: 'connected' },
      date_time: new Date().toISOString()
    };
    
    for (const endpoint of webhookEndpoints) {
      const result = await makeRequest(`${CONFIG.productionUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });
      
      // Webhook endpoints should handle POST requests (may return 400 for test data)
      const isValid = [200, 400, 401].includes(result.status);
      
      this.addResult(
        `Webhook ${endpoint}`,
        isValid,
        isValid ? `Webhook accessible (HTTP ${result.status})` : `Unexpected status: ${result.status}`,
        result.responseTime
      );
    }
  }

  // =====================================================
  // PERFORMANCE TESTS
  // =====================================================

  async testQRGenerationPerformance() {
    log('Testing QR generation performance...', 'INFO');
    
    const qrEndpoints = [
      '/api/dev/qr-test',
      '/api/channels/whatsapp/instances/test-id/qr'
    ];
    
    for (const endpoint of qrEndpoints) {
      const result = await makeRequest(`${CONFIG.productionUrl}${endpoint}`);
      
      const withinThreshold = result.responseTime < CONFIG.performanceThresholds.qrGeneration;
      
      this.addResult(
        `QR Generation ${endpoint}`,
        result.success && withinThreshold,
        result.success 
          ? `Generated in ${result.responseTime}ms (threshold: ${CONFIG.performanceThresholds.qrGeneration}ms)`
          : `Failed: ${result.error}`,
        result.responseTime
      );
      
      if (result.success && !withinThreshold) {
        this.addWarning(
          `QR Performance ${endpoint}`,
          `Response time ${result.responseTime}ms exceeds threshold ${CONFIG.performanceThresholds.qrGeneration}ms`
        );
      }
    }
  }

  async testAPIPerformance() {
    log('Testing API performance...', 'INFO');
    
    const apiEndpoints = [
      '/api/channels/whatsapp/instances',
      '/api/admin/organizations',
      '/api/appointments'
    ];
    
    for (const endpoint of apiEndpoints) {
      const result = await makeRequest(`${CONFIG.productionUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
        }
      });
      
      const withinThreshold = result.responseTime < CONFIG.performanceThresholds.apiResponse;
      
      this.addResult(
        `API Performance ${endpoint}`,
        withinThreshold,
        `Response time: ${result.responseTime}ms (threshold: ${CONFIG.performanceThresholds.apiResponse}ms)`,
        result.responseTime
      );
    }
  }

  // =====================================================
  // LOAD TESTING
  // =====================================================

  async runLoadTest() {
    log('Running basic load test...', 'INFO');
    
    const { concurrentUsers, testDuration, requestInterval } = CONFIG.loadTestConfig;
    const startTime = Date.now();
    const results = [];
    
    // Create concurrent users
    const userPromises = Array.from({ length: concurrentUsers }, async (_, userId) => {
      const userResults = [];
      
      while (Date.now() - startTime < testDuration) {
        const result = await makeRequest(`${CONFIG.productionUrl}/api/health`);
        userResults.push({
          userId,
          timestamp: Date.now(),
          success: result.success,
          responseTime: result.responseTime
        });
        
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }
      
      return userResults;
    });
    
    const allResults = (await Promise.all(userPromises)).flat();
    
    // Analyze results
    const successfulRequests = allResults.filter(r => r.success).length;
    const totalRequests = allResults.length;
    const averageResponseTime = allResults.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests;
    const successRate = (successfulRequests / totalRequests) * 100;
    
    this.addResult(
      'Load Test',
      successRate > 95,
      `${successfulRequests}/${totalRequests} requests successful (${successRate.toFixed(1)}%), avg response: ${averageResponseTime.toFixed(0)}ms`,
      averageResponseTime,
      {
        concurrentUsers,
        testDuration,
        totalRequests,
        successfulRequests,
        successRate,
        averageResponseTime
      }
    );
  }

  // =====================================================
  // BACKWARD COMPATIBILITY TESTS
  // =====================================================

  async testBackwardCompatibility() {
    log('Testing backward compatibility...', 'INFO');
    
    // Test that old endpoints still work
    const legacyEndpoints = [
      '/api/whatsapp/instances',
      '/api/whatsapp/webhook'
    ];
    
    for (const endpoint of legacyEndpoints) {
      const result = await makeRequest(`${CONFIG.productionUrl}${endpoint}`);
      
      this.addResult(
        `Legacy Compatibility ${endpoint}`,
        result.status !== 404,
        result.status !== 404 ? 'Legacy endpoint accessible' : 'Legacy endpoint not found',
        result.responseTime
      );
    }
  }

  // =====================================================
  // SECURITY TESTS
  // =====================================================

  async testSecurityHeaders() {
    log('Testing security headers...', 'INFO');
    
    const result = await fetch(`${CONFIG.productionUrl}/api/health`);
    const headers = result.headers;
    
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security'
    ];
    
    for (const header of securityHeaders) {
      const hasHeader = headers.has(header);
      this.addResult(
        `Security Header ${header}`,
        hasHeader,
        hasHeader ? 'Security header present' : 'Security header missing'
      );
    }
  }

  // =====================================================
  // MAIN VALIDATION RUNNER
  // =====================================================

  async runAllTests() {
    log('Starting comprehensive production validation...', 'INFO');
    
    try {
      await this.testHealthEndpoints();
      await this.testWebhookEndpoints();
      await this.testQRGenerationPerformance();
      await this.testAPIPerformance();
      await this.testBackwardCompatibility();
      await this.testSecurityHeaders();
      await this.runLoadTest();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      log(`Validation suite failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  generateReport() {
    const { summary } = this.results;
    const successRate = (summary.passed / summary.total) * 100;
    
    log('='.repeat(60), 'INFO');
    log('PRODUCTION VALIDATION REPORT', 'INFO');
    log('='.repeat(60), 'INFO');
    log(`Total Tests: ${summary.total}`, 'INFO');
    log(`Passed: ${summary.passed}`, 'SUCCESS');
    log(`Failed: ${summary.failed}`, summary.failed > 0 ? 'ERROR' : 'INFO');
    log(`Warnings: ${summary.warnings}`, summary.warnings > 0 ? 'WARNING' : 'INFO');
    log(`Success Rate: ${successRate.toFixed(1)}%`, successRate > 90 ? 'SUCCESS' : 'ERROR');
    log('='.repeat(60), 'INFO');
    
    // Save detailed report
    const reportPath = `./reports/validation_${Date.now()}.json`;
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    log(`Detailed report saved to: ${reportPath}`, 'INFO');
    
    // Exit with appropriate code
    process.exit(summary.failed > 0 ? 1 : 0);
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

if (require.main === module) {
  const validator = new ProductionValidator();
  validator.runAllTests().catch(error => {
    log(`Validation failed: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = ProductionValidator;
