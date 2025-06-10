#!/usr/bin/env node

/**
 * TEST WEBHOOK EVENT FIX
 * 
 * Tests the webhook event handler fix for connection.update events
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
  testOrgId: '927cecbe-d9e5-43a4-b9d0-25f942ededc4'
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
    'TEST': '🧪',
    'FIX': '🔧'
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
        'User-Agent': 'AgentSalud-Webhook-Fix-Test/1.0',
        ...options.headers
      },
      timeout: 30000
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
// TEST FUNCTIONS
// =====================================================

/**
 * Test connection.update event (Evolution API format)
 */
async function testConnectionUpdateEvent() {
  log('🧪 TESTING connection.update EVENT (Evolution API format)', 'TEST');
  
  const webhookUrl = `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${CONFIG.testOrgId}`;
  
  const testPayload = {
    event: 'connection.update',  // Evolution API format (lowercase with dot)
    instance: 'test-instance-connection-fix',
    data: {
      state: 'open',
      connection: 'open',
      instance: {
        profileName: 'Test WhatsApp Fix',
        profilePictureUrl: 'https://example.com/profile.jpg',
        wuid: '5511999999999@s.whatsapp.net'
      }
    },
    date_time: new Date().toISOString()
  };

  try {
    log(`Sending connection.update event to: ${webhookUrl}`, 'TEST');
    log(`Payload: ${JSON.stringify(testPayload, null, 2)}`, 'TEST');
    
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

    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: responseData
    };

    if (result.success) {
      log(`✅ connection.update event processed: ${result.status}`, 'SUCCESS');
      if (responseData.success) {
        log(`✅ Server confirmed successful processing`, 'SUCCESS');
        log(`✅ Processing time: ${responseData.processingTime}ms`, 'SUCCESS');
      }
    } else {
      log(`❌ connection.update event failed: ${result.status} ${result.statusText}`, 'ERROR');
    }

    return result;
  } catch (error) {
    log(`❌ connection.update request failed: ${error.message}`, 'ERROR');
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test qrcode.updated event (Evolution API format)
 */
async function testQRCodeUpdateEvent() {
  log('🧪 TESTING qrcode.updated EVENT (Evolution API format)', 'TEST');
  
  const webhookUrl = `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${CONFIG.testOrgId}`;
  
  const testPayload = {
    event: 'qrcode.updated',  // Evolution API format (lowercase with dot)
    instance: 'test-instance-qr-fix',
    data: {
      qrcode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      status: 'qrcode'
    },
    date_time: new Date().toISOString()
  };

  try {
    log(`Sending qrcode.updated event to: ${webhookUrl}`, 'TEST');
    
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

    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: responseData
    };

    if (result.success) {
      log(`✅ qrcode.updated event processed: ${result.status}`, 'SUCCESS');
    } else {
      log(`❌ qrcode.updated event failed: ${result.status} ${result.statusText}`, 'ERROR');
    }

    return result;
  } catch (error) {
    log(`❌ qrcode.updated request failed: ${error.message}`, 'ERROR');
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test legacy CONNECTION_UPDATE event (uppercase format)
 */
async function testLegacyConnectionUpdateEvent() {
  log('🧪 TESTING CONNECTION_UPDATE EVENT (Legacy uppercase format)', 'TEST');
  
  const webhookUrl = `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${CONFIG.testOrgId}`;
  
  const testPayload = {
    event: 'CONNECTION_UPDATE',  // Legacy format (uppercase with underscore)
    instance: 'test-instance-legacy',
    data: {
      state: 'open',
      connection: 'open'
    },
    date_time: new Date().toISOString()
  };

  try {
    log(`Sending CONNECTION_UPDATE event to: ${webhookUrl}`, 'TEST');
    
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

    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: responseData
    };

    if (result.success) {
      log(`✅ CONNECTION_UPDATE event processed: ${result.status}`, 'SUCCESS');
    } else {
      log(`❌ CONNECTION_UPDATE event failed: ${result.status} ${result.statusText}`, 'ERROR');
    }

    return result;
  } catch (error) {
    log(`❌ CONNECTION_UPDATE request failed: ${error.message}`, 'ERROR');
    return {
      success: false,
      error: error.message
    };
  }
}

// =====================================================
// MAIN TEST EXECUTION
// =====================================================

async function main() {
  try {
    log('🚀 STARTING WEBHOOK EVENT FIX TESTS', 'FIX');
    log(`Production URL: ${CONFIG.productionUrl}`, 'INFO');
    log(`Test Organization ID: ${CONFIG.testOrgId}`, 'INFO');

    console.log('\n' + '='.repeat(60));
    log('🔧 TESTING WEBHOOK EVENT HANDLER FIX', 'FIX');
    console.log('='.repeat(60));

    // Test the main issue: connection.update events
    const connectionUpdateResult = await testConnectionUpdateEvent();
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test QR code events
    const qrCodeResult = await testQRCodeUpdateEvent();
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test legacy format still works
    const legacyResult = await testLegacyConnectionUpdateEvent();

    // Generate test report
    log('\n📊 TEST RESULTS SUMMARY', 'FIX');
    console.log('='.repeat(60));
    
    const results = [
      { name: 'connection.update (Evolution API format)', result: connectionUpdateResult },
      { name: 'qrcode.updated (Evolution API format)', result: qrCodeResult },
      { name: 'CONNECTION_UPDATE (Legacy format)', result: legacyResult }
    ];
    
    let successCount = 0;
    results.forEach(test => {
      const status = test.result.success ? '✅' : '❌';
      console.log(`${status} ${test.name}: ${test.result.success ? 'PASSED' : 'FAILED'}`);
      
      if (test.result.success) {
        successCount++;
        if (test.result.response?.processingTime) {
          console.log(`   Processing time: ${test.result.response.processingTime}ms`);
        }
      } else if (test.result.error) {
        console.log(`   Error: ${test.result.error}`);
      }
    });
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`Tests passed: ${successCount}/${results.length}`);
    
    if (successCount === results.length) {
      log('🎉 ALL TESTS PASSED - Webhook event handler fix is working!', 'SUCCESS');
      log('🔧 The connection.update events should now be processed correctly', 'SUCCESS');
      log('📱 WhatsApp flow should complete successfully after QR code scanning', 'SUCCESS');
    } else {
      log('⚠️ Some tests failed - webhook event handler may still have issues', 'WARNING');
      process.exit(1);
    }

  } catch (error) {
    log(`TEST EXECUTION FAILED: ${error.message}`, 'ERROR');
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
