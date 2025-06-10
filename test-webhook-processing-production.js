#!/usr/bin/env node

/**
 * PRODUCTION WEBHOOK PROCESSING TEST
 * 
 * Tests webhook processing by simulating Evolution API events
 * and verifying they are processed correctly by the production server.
 * 
 * @author AgentSalud DevOps Team
 * @date 2025-01-28
 */

const fetch = require('node-fetch');
require('dotenv').config();

// =====================================================
// CONFIGURATION
// =====================================================
const CONFIG = {
  productionUrl: 'https://agendia.torrecentral.com',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  testTimeout: 30000 // 30 seconds
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
    'WEBHOOK': '🔗'
  }[type] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// =====================================================
// TEST UTILITIES
// =====================================================

/**
 * Get a test instance from database
 */
async function getTestInstance() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    
    const { data: instances, error } = await supabase
      .from('whatsapp_instances_simple')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return instances;
  } catch (error) {
    log(`Failed to get test instance: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Send webhook event to production server
 */
async function sendWebhookEvent(organizationId, eventType, eventData) {
  try {
    const webhookUrl = `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${organizationId}`;
    
    const payload = {
      event: eventType,
      instance: eventData.instanceName || 'test-instance',
      data: eventData.data || {},
      date_time: new Date().toISOString()
    };

    log(`Sending ${eventType} event to: ${webhookUrl}`, 'WEBHOOK');
    log(`Payload: ${JSON.stringify(payload, null, 2)}`, 'TEST');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AgentSalud-Webhook-Test/1.0'
      },
      body: JSON.stringify(payload),
      timeout: CONFIG.testTimeout
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries())
    };

    if (result.success) {
      log(`✅ Webhook sent successfully: ${result.status}`, 'SUCCESS');
      log(`Response: ${JSON.stringify(result.data, null, 2)}`, 'SUCCESS');
    } else {
      log(`❌ Webhook failed: ${result.status} ${result.statusText}`, 'ERROR');
      log(`Response: ${JSON.stringify(result.data, null, 2)}`, 'ERROR');
    }

    return result;
  } catch (error) {
    log(`Webhook send error: ${error.message}`, 'ERROR');
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check instance status in database
 */
async function checkInstanceStatus(instanceId) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    
    const { data: instance, error } = await supabase
      .from('whatsapp_instances_simple')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return instance;
  } catch (error) {
    log(`Failed to check instance status: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Wait for status change
 */
async function waitForStatusChange(instanceId, expectedStatus, timeoutMs = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const instance = await checkInstanceStatus(instanceId);
    
    if (instance && instance.status === expectedStatus) {
      return instance;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return null;
}

// =====================================================
// TEST SCENARIOS
// =====================================================

/**
 * Test QR Code Update event
 */
async function testQRCodeUpdate(instance) {
  log('\n🧪 TESTING QR CODE UPDATE EVENT', 'TEST');
  console.log('='.repeat(50));
  
  const eventData = {
    instanceName: instance.evolution_instance_name,
    data: {
      qrcode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      status: 'qrcode'
    }
  };

  const result = await sendWebhookEvent(instance.organization_id, 'QRCODE_UPDATED', eventData);
  
  if (result.success) {
    log('QR Code Update event processed successfully', 'SUCCESS');
  } else {
    log('QR Code Update event failed', 'ERROR');
  }
  
  return result;
}

/**
 * Test Connection Update event
 */
async function testConnectionUpdate(instance) {
  log('\n🧪 TESTING CONNECTION UPDATE EVENT', 'TEST');
  console.log('='.repeat(50));
  
  const initialStatus = instance.status;
  log(`Initial instance status: ${initialStatus}`, 'INFO');
  
  const eventData = {
    instanceName: instance.evolution_instance_name,
    data: {
      state: 'open',
      connection: 'open',
      instance: {
        profileName: 'Test WhatsApp',
        profilePictureUrl: 'https://example.com/profile.jpg',
        wuid: '5511999999999@s.whatsapp.net'
      }
    }
  };

  const result = await sendWebhookEvent(instance.organization_id, 'CONNECTION_UPDATE', eventData);
  
  if (result.success) {
    log('CONNECTION_UPDATE event sent successfully', 'SUCCESS');
    
    // Wait for database status change
    log('Waiting for database status change...', 'TEST');
    const updatedInstance = await waitForStatusChange(instance.id, 'connected', 15000);
    
    if (updatedInstance) {
      log(`✅ Status updated successfully: ${initialStatus} → ${updatedInstance.status}`, 'SUCCESS');
      log(`Updated at: ${updatedInstance.updated_at}`, 'INFO');
    } else {
      log(`❌ Status did not change from ${initialStatus}`, 'ERROR');
      
      // Check current status
      const currentInstance = await checkInstanceStatus(instance.id);
      if (currentInstance) {
        log(`Current status: ${currentInstance.status}`, 'WARNING');
        log(`Last updated: ${currentInstance.updated_at}`, 'WARNING');
      }
    }
  } else {
    log('CONNECTION_UPDATE event failed', 'ERROR');
  }
  
  return result;
}

/**
 * Test Status Instance event
 */
async function testStatusInstance(instance) {
  log('\n🧪 TESTING STATUS INSTANCE EVENT', 'TEST');
  console.log('='.repeat(50));
  
  const eventData = {
    instanceName: instance.evolution_instance_name,
    data: {
      status: 'open',
      state: 'open'
    }
  };

  const result = await sendWebhookEvent(instance.organization_id, 'STATUS_INSTANCE', eventData);
  
  if (result.success) {
    log('STATUS_INSTANCE event processed successfully', 'SUCCESS');
  } else {
    log('STATUS_INSTANCE event failed', 'ERROR');
  }
  
  return result;
}

/**
 * Test webhook endpoint availability
 */
async function testWebhookEndpointAvailability(organizationId) {
  log('\n🧪 TESTING WEBHOOK ENDPOINT AVAILABILITY', 'TEST');
  console.log('='.repeat(50));
  
  const webhookUrl = `${CONFIG.productionUrl}/api/whatsapp/simple/webhook/${organizationId}`;
  
  try {
    // Test GET request (should return 405 Method Not Allowed)
    const getResponse = await fetch(webhookUrl, {
      method: 'GET',
      timeout: 10000
    });
    
    log(`GET request: ${getResponse.status} ${getResponse.statusText}`, 
        getResponse.status === 405 ? 'SUCCESS' : 'WARNING');
    
    // Test POST with invalid payload
    const invalidPostResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'payload' }),
      timeout: 10000
    });
    
    log(`POST invalid payload: ${invalidPostResponse.status} ${invalidPostResponse.statusText}`, 
        invalidPostResponse.status === 400 ? 'SUCCESS' : 'WARNING');
    
    return {
      getStatus: getResponse.status,
      postInvalidStatus: invalidPostResponse.status,
      available: getResponse.status === 405 && invalidPostResponse.status === 400
    };
    
  } catch (error) {
    log(`Endpoint availability test failed: ${error.message}`, 'ERROR');
    return {
      available: false,
      error: error.message
    };
  }
}

// =====================================================
// MAIN TEST EXECUTION
// =====================================================

async function main() {
  try {
    log('🚀 STARTING WEBHOOK PROCESSING TESTS', 'TEST');
    log(`Production URL: ${CONFIG.productionUrl}`, 'INFO');

    // Get test instance
    const instance = await getTestInstance();
    
    if (!instance) {
      log('No test instance available', 'ERROR');
      process.exit(1);
    }

    log(`Using test instance: ${instance.display_name}`, 'INFO');
    log(`Organization ID: ${instance.organization_id}`, 'INFO');
    log(`Evolution Instance: ${instance.evolution_instance_name || 'N/A'}`, 'INFO');
    log(`Current Status: ${instance.status}`, 'INFO');

    // Test webhook endpoint availability
    const availabilityResult = await testWebhookEndpointAvailability(instance.organization_id);
    
    if (!availabilityResult.available) {
      log('❌ Webhook endpoint not available - aborting tests', 'ERROR');
      process.exit(1);
    }

    // Run webhook processing tests
    const results = {
      qrCodeUpdate: await testQRCodeUpdate(instance),
      connectionUpdate: await testConnectionUpdate(instance),
      statusInstance: await testStatusInstance(instance)
    };

    // Generate test report
    log('\n📊 TEST RESULTS SUMMARY', 'TEST');
    console.log('='.repeat(50));
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalTests = Object.keys(results).length;
    
    log(`Tests passed: ${successCount}/${totalTests}`, successCount === totalTests ? 'SUCCESS' : 'WARNING');
    
    Object.entries(results).forEach(([testName, result]) => {
      const status = result.success ? '✅' : '❌';
      log(`${status} ${testName}: ${result.success ? 'PASSED' : 'FAILED'}`, result.success ? 'SUCCESS' : 'ERROR');
      
      if (!result.success && result.error) {
        log(`   Error: ${result.error}`, 'ERROR');
      }
    });

    if (successCount < totalTests) {
      log('⚠️ Some tests failed - webhook processing may have issues', 'WARNING');
      process.exit(1);
    } else {
      log('🎉 All tests passed - webhook processing is working correctly', 'SUCCESS');
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

module.exports = { main, testConnectionUpdate, testQRCodeUpdate };
