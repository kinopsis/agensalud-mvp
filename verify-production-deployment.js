#!/usr/bin/env node

/**
 * PRODUCTION DEPLOYMENT VERIFICATION
 * 
 * Verifies that the webhook event handler fix has been deployed to production
 * and tests the complete WhatsApp flow functionality.
 * 
 * @author AgentSalud DevOps Team
 * @date 2025-01-28
 */

require('dotenv').config();
const https = require('https');

// =====================================================
// CONFIGURATION
// =====================================================
const CONFIG = {
  productionUrl: 'https://agendia.torrecentral.com',
  testOrgId: '927cecbe-d9e5-43a4-b9d0-25f942ededc4',
  deploymentCheckInterval: 30000, // 30 seconds
  maxDeploymentWaitTime: 300000   // 5 minutes
};

// =====================================================
// LOGGING
// =====================================================
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'DEPLOY': '🚀',
    'TEST': '🧪'
  }[type] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// =====================================================
// HTTP REQUEST HELPER
// =====================================================
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AgentSalud-Deployment-Verification/1.0',
        ...options.headers
      },
      timeout: 15000
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          data: data,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// =====================================================
// DEPLOYMENT VERIFICATION FUNCTIONS
// =====================================================

/**
 * Check if production server is responding
 */
async function checkServerHealth() {
  try {
    log('Checking production server health...', 'DEPLOY');
    
    const response = await makeRequest(CONFIG.productionUrl, {
      method: 'GET'
    });

    if (response.ok) {
      log(`✅ Production server is healthy: ${response.status}`, 'SUCCESS');
      return true;
    } else {
      log(`⚠️ Production server responded with: ${response.status}`, 'WARNING');
      return false;
    }
  } catch (error) {
    log(`❌ Cannot reach production server: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Test webhook event handler fix
 */
async function testWebhookEventFix() {
  try {
    log('Testing webhook event handler fix...', 'TEST');
    
    const webhookUrl = `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${CONFIG.testOrgId}`;
    
    // Test the main fix: connection.update event
    const testPayload = {
      event: 'connection.update',  // Evolution API format
      instance: 'deployment-test-instance',
      data: {
        state: 'open',
        connection: 'open',
        instance: {
          profileName: 'Deployment Test',
          wuid: '5511999999999@s.whatsapp.net'
        }
      },
      date_time: new Date().toISOString()
    };

    log('Sending connection.update test event...', 'TEST');
    
    const response = await makeRequest(webhookUrl, {
      method: 'POST',
      body: JSON.stringify(testPayload)
    });

    let responseData;
    try {
      responseData = JSON.parse(response.data);
    } catch {
      responseData = { raw: response.data };
    }

    if (response.ok && responseData.success) {
      log(`✅ Webhook fix deployed successfully!`, 'SUCCESS');
      log(`✅ Processing time: ${responseData.processingTime}ms`, 'SUCCESS');
      return true;
    } else {
      log(`❌ Webhook fix test failed: ${response.status}`, 'ERROR');
      log(`Response: ${JSON.stringify(responseData, null, 2)}`, 'ERROR');
      return false;
    }
  } catch (error) {
    log(`❌ Webhook test failed: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Wait for deployment to complete
 */
async function waitForDeployment() {
  log('🚀 Waiting for deployment to complete...', 'DEPLOY');
  
  const startTime = Date.now();
  let attempts = 0;
  
  while (Date.now() - startTime < CONFIG.maxDeploymentWaitTime) {
    attempts++;
    log(`Deployment check attempt ${attempts}...`, 'DEPLOY');
    
    // Check server health
    const serverHealthy = await checkServerHealth();
    
    if (serverHealthy) {
      // Test webhook fix
      const webhookFixed = await testWebhookEventFix();
      
      if (webhookFixed) {
        const deploymentTime = Math.round((Date.now() - startTime) / 1000);
        log(`🎉 Deployment completed successfully in ${deploymentTime} seconds!`, 'SUCCESS');
        return true;
      }
    }
    
    log(`Waiting ${CONFIG.deploymentCheckInterval / 1000} seconds before next check...`, 'DEPLOY');
    await new Promise(resolve => setTimeout(resolve, CONFIG.deploymentCheckInterval));
  }
  
  log('❌ Deployment verification timed out', 'ERROR');
  return false;
}

/**
 * Comprehensive deployment verification
 */
async function verifyDeployment() {
  try {
    log('🔍 COMPREHENSIVE DEPLOYMENT VERIFICATION', 'DEPLOY');
    console.log('='.repeat(60));
    
    // 1. Wait for deployment
    const deploymentSuccessful = await waitForDeployment();
    
    if (!deploymentSuccessful) {
      log('❌ Deployment verification failed', 'ERROR');
      return false;
    }
    
    // 2. Run comprehensive tests
    log('\n🧪 Running comprehensive webhook tests...', 'TEST');
    
    const testResults = [];
    
    // Test different event formats
    const testEvents = [
      { name: 'connection.update', event: 'connection.update' },
      { name: 'qrcode.updated', event: 'qrcode.updated' },
      { name: 'CONNECTION_UPDATE (legacy)', event: 'CONNECTION_UPDATE' }
    ];
    
    for (const test of testEvents) {
      try {
        const webhookUrl = `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${CONFIG.testOrgId}`;
        
        const testPayload = {
          event: test.event,
          instance: `test-${test.event.replace('.', '-')}`,
          data: {
            state: 'open',
            connection: 'open'
          },
          date_time: new Date().toISOString()
        };
        
        const response = await makeRequest(webhookUrl, {
          method: 'POST',
          body: JSON.stringify(testPayload)
        });
        
        const responseData = JSON.parse(response.data);
        const success = response.ok && responseData.success;
        
        testResults.push({
          name: test.name,
          success: success,
          processingTime: responseData.processingTime
        });
        
        log(`${success ? '✅' : '❌'} ${test.name}: ${success ? 'PASSED' : 'FAILED'}`, success ? 'SUCCESS' : 'ERROR');
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        testResults.push({
          name: test.name,
          success: false,
          error: error.message
        });
        log(`❌ ${test.name}: FAILED - ${error.message}`, 'ERROR');
      }
    }
    
    // 3. Generate final report
    const successfulTests = testResults.filter(t => t.success).length;
    const totalTests = testResults.length;
    
    log('\n📊 DEPLOYMENT VERIFICATION SUMMARY', 'DEPLOY');
    console.log('='.repeat(60));
    log(`Tests passed: ${successfulTests}/${totalTests}`, 'INFO');
    
    if (successfulTests === totalTests) {
      log('🎉 DEPLOYMENT VERIFICATION SUCCESSFUL!', 'SUCCESS');
      log('🔧 Webhook event handler fix is working in production', 'SUCCESS');
      log('📱 WhatsApp flow should now complete successfully', 'SUCCESS');
      return true;
    } else {
      log('⚠️ Some tests failed - deployment may have issues', 'WARNING');
      return false;
    }
    
  } catch (error) {
    log(`❌ Deployment verification error: ${error.message}`, 'ERROR');
    return false;
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  try {
    log('🚀 STARTING PRODUCTION DEPLOYMENT VERIFICATION', 'DEPLOY');
    log(`Production URL: ${CONFIG.productionUrl}`, 'INFO');
    log(`Max wait time: ${CONFIG.maxDeploymentWaitTime / 1000} seconds`, 'INFO');
    
    const verificationSuccessful = await verifyDeployment();
    
    if (verificationSuccessful) {
      log('\n🏁 DEPLOYMENT VERIFICATION COMPLETED SUCCESSFULLY', 'SUCCESS');
      log('The webhook event handler fix is now live in production!', 'SUCCESS');
      process.exit(0);
    } else {
      log('\n🚨 DEPLOYMENT VERIFICATION FAILED', 'ERROR');
      log('Manual investigation may be required', 'ERROR');
      process.exit(1);
    }
    
  } catch (error) {
    log(`VERIFICATION FAILED: ${error.message}`, 'ERROR');
    console.error(error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    log(`Unhandled error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = { main };
