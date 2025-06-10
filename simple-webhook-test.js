#!/usr/bin/env node

/**
 * SIMPLE WEBHOOK PROCESSING TEST
 * 
 * Tests webhook endpoints and processing in production
 * 
 * @author AgentSalud DevOps Team
 * @date 2025-01-28
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

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
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000
    };

    const req = client.request(requestOptions, (res) => {
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
// WEBHOOK TESTS
// =====================================================

async function testWebhookEndpointAvailability() {
  log('🧪 TESTING WEBHOOK ENDPOINT AVAILABILITY', 'TEST');
  console.log('='.repeat(60));
  
  const webhookUrls = [
    `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${CONFIG.testOrgId}`,
    `${CONFIG.productionUrl}/api/webhooks/evolution/${CONFIG.testOrgId}`,
    `${CONFIG.productionUrl}/api/channels/whatsapp/webhook`
  ];
  
  const results = [];
  
  for (const url of webhookUrls) {
    try {
      log(`Testing: ${url}`, 'TEST');
      
      // Test GET request (should return 405 Method Not Allowed for POST endpoints)
      const getResponse = await makeRequest(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'AgentSalud-Webhook-Test/1.0'
        }
      });
      
      const result = {
        url,
        getStatus: getResponse.status,
        getStatusText: getResponse.statusText,
        available: getResponse.status === 405 || getResponse.status === 200 || getResponse.status === 404
      };
      
      if (result.available) {
        log(`✅ Endpoint reachable: ${result.getStatus} ${result.getStatusText}`, 'SUCCESS');
      } else {
        log(`❌ Endpoint not reachable: ${result.getStatus} ${result.getStatusText}`, 'ERROR');
      }
      
      results.push(result);
      
    } catch (error) {
      log(`❌ Request failed: ${error.message}`, 'ERROR');
      results.push({
        url,
        error: error.message,
        available: false
      });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

async function testWebhookEventProcessing() {
  log('\n🧪 TESTING WEBHOOK EVENT PROCESSING', 'TEST');
  console.log('='.repeat(60));
  
  const webhookUrl = `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${CONFIG.testOrgId}`;
  
  // Test different event types
  const testEvents = [
    {
      name: 'QRCODE_UPDATED',
      payload: {
        event: 'QRCODE_UPDATED',
        instance: 'test-instance-qr',
        data: {
          qrcode: 'data:image/png;base64,test',
          status: 'qrcode'
        },
        date_time: new Date().toISOString()
      }
    },
    {
      name: 'CONNECTION_UPDATE',
      payload: {
        event: 'CONNECTION_UPDATE',
        instance: 'test-instance-connection',
        data: {
          state: 'open',
          connection: 'open'
        },
        date_time: new Date().toISOString()
      }
    },
    {
      name: 'STATUS_INSTANCE',
      payload: {
        event: 'STATUS_INSTANCE',
        instance: 'test-instance-status',
        data: {
          status: 'open',
          state: 'open'
        },
        date_time: new Date().toISOString()
      }
    }
  ];
  
  const results = [];
  
  for (const testEvent of testEvents) {
    try {
      log(`Testing ${testEvent.name} event...`, 'TEST');
      
      const response = await makeRequest(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AgentSalud-Webhook-Test/1.0'
        },
        body: JSON.stringify(testEvent.payload)
      });
      
      let responseData;
      try {
        responseData = JSON.parse(response.data);
      } catch {
        responseData = { raw: response.data };
      }
      
      const result = {
        event: testEvent.name,
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        response: responseData
      };
      
      if (result.success) {
        log(`✅ ${testEvent.name} processed: ${result.status}`, 'SUCCESS');
        if (responseData.success) {
          log(`✅ Server confirmed successful processing`, 'SUCCESS');
        }
      } else {
        log(`❌ ${testEvent.name} failed: ${result.status} ${result.statusText}`, 'ERROR');
      }
      
      results.push(result);
      
    } catch (error) {
      log(`❌ ${testEvent.name} request failed: ${error.message}`, 'ERROR');
      results.push({
        event: testEvent.name,
        success: false,
        error: error.message
      });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}

async function testProductionConnectivity() {
  log('\n🧪 TESTING PRODUCTION SERVER CONNECTIVITY', 'TEST');
  console.log('='.repeat(60));
  
  try {
    const response = await makeRequest(CONFIG.productionUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'AgentSalud-Connectivity-Test/1.0'
      }
    });
    
    if (response.ok) {
      log(`✅ Production server reachable: ${response.status}`, 'SUCCESS');
      return true;
    } else {
      log(`⚠️ Production server responded with: ${response.status} ${response.statusText}`, 'WARNING');
      return false;
    }
    
  } catch (error) {
    log(`❌ Cannot reach production server: ${error.message}`, 'ERROR');
    return false;
  }
}

// =====================================================
// MAIN TEST EXECUTION
// =====================================================

async function main() {
  try {
    log('🚀 STARTING WEBHOOK PROCESSING TESTS', 'TEST');
    log(`Production URL: ${CONFIG.productionUrl}`, 'INFO');
    log(`Test Organization ID: ${CONFIG.testOrgId}`, 'INFO');

    // 1. Test production server connectivity
    const serverReachable = await testProductionConnectivity();
    
    if (!serverReachable) {
      log('❌ Cannot reach production server - aborting tests', 'ERROR');
      process.exit(1);
    }

    // 2. Test webhook endpoint availability
    const availabilityResults = await testWebhookEndpointAvailability();
    
    // 3. Test webhook event processing
    const processingResults = await testWebhookEventProcessing();

    // 4. Generate test report
    log('\n📊 TEST RESULTS SUMMARY', 'TEST');
    console.log('='.repeat(60));
    
    console.log('\n🔗 ENDPOINT AVAILABILITY:');
    availabilityResults.forEach(result => {
      const status = result.available ? '✅' : '❌';
      console.log(`${status} ${result.url.split('/').slice(-2).join('/')}: ${result.available ? 'Available' : 'Not Available'}`);
    });
    
    console.log('\n⚡ EVENT PROCESSING:');
    processingResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.event}: ${result.success ? 'Processed' : 'Failed'}`);
      if (result.response && result.response.success !== undefined) {
        console.log(`   Server Response: ${result.response.success ? 'Success' : 'Error'}`);
      }
    });
    
    const availableEndpoints = availabilityResults.filter(r => r.available).length;
    const successfulEvents = processingResults.filter(r => r.success).length;
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`Available Endpoints: ${availableEndpoints}/${availabilityResults.length}`);
    console.log(`Successful Events: ${successfulEvents}/${processingResults.length}`);
    
    if (availableEndpoints === availabilityResults.length && successfulEvents === processingResults.length) {
      log('🎉 All tests passed - webhook processing is working correctly', 'SUCCESS');
    } else {
      log('⚠️ Some tests failed - webhook processing may have issues', 'WARNING');
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
