#!/usr/bin/env node

/**
 * Test WhatsApp Connection Flow
 * 
 * Tests the complete WhatsApp connection flow including:
 * 1. Instance creation with webhook configuration
 * 2. QR code generation
 * 3. Webhook handling for connection updates
 * 4. Database status updates
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

require('dotenv').config({ path: '.env.local' });

console.log('🧪 TESTING WHATSAPP CONNECTION FLOW');
console.log('='.repeat(60));

const BASE_URL = 'http://localhost:3001';

async function testWebhookEndpoint() {
  console.log('\n🔗 Testing webhook endpoint...');
  
  try {
    // Test webhook endpoint accessibility
    const webhookUrl = `${BASE_URL}/api/whatsapp/simple/webhook/test-org-id`;
    const response = await fetch(webhookUrl, {
      method: 'GET'
    });
    
    console.log(`Webhook endpoint response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Webhook endpoint is accessible:', data);
      return true;
    } else {
      console.log('❌ Webhook endpoint not accessible');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error.message);
    return false;
  }
}

async function testEvolutionWebhookConfig() {
  console.log('\n📡 Testing Evolution API webhook configuration...');
  
  try {
    // Test webhook configuration endpoint
    const testInstanceName = `test-webhook-${Date.now()}`;
    const webhookUrl = `${BASE_URL}/api/whatsapp/simple/webhook/test-org-id`;
    
    const response = await fetch('https://evo.torrecentral.com/webhook/instance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        instanceName: testInstanceName,
        url: webhookUrl,
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'STATUS_INSTANCE'
        ]
      })
    });
    
    console.log(`Webhook config response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook configuration successful:', result);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Webhook configuration failed:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing webhook configuration:', error.message);
    return false;
  }
}

async function simulateWebhookEvent() {
  console.log('\n🎭 Simulating webhook event...');
  
  try {
    const webhookUrl = `${BASE_URL}/api/whatsapp/simple/webhook/test-org-id`;
    const mockWebhookEvent = {
      event: 'CONNECTION_UPDATE',
      instance: 'test-instance-123',
      data: {
        state: 'open',
        instance: {
          profileName: 'Test User',
          wuid: '5511999999999@s.whatsapp.net',
          profilePictureUrl: 'https://example.com/profile.jpg'
        }
      },
      date_time: new Date().toISOString(),
      sender: 'evolution-api',
      server_url: 'https://evo.torrecentral.com'
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockWebhookEvent)
    });
    
    console.log(`Webhook simulation response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook event processed successfully:', result);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Webhook event processing failed:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error simulating webhook event:', error.message);
    return false;
  }
}

async function testCompleteFlow() {
  console.log('\n🚀 Testing complete WhatsApp connection flow...');
  
  const results = {
    webhookEndpoint: false,
    evolutionWebhookConfig: false,
    webhookSimulation: false
  };
  
  // Test 1: Webhook endpoint accessibility
  results.webhookEndpoint = await testWebhookEndpoint();
  
  // Test 2: Evolution API webhook configuration
  results.evolutionWebhookConfig = await testEvolutionWebhookConfig();
  
  // Test 3: Webhook event simulation
  results.webhookSimulation = await simulateWebhookEvent();
  
  return results;
}

async function runTests() {
  console.log('\n🚀 Starting WhatsApp Connection Flow Tests');
  console.log('='.repeat(60));
  
  const results = await testCompleteFlow();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log('\n📋 Test Summary:');
  console.log(`✅ Webhook Endpoint: ${results.webhookEndpoint ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Evolution Webhook Config: ${results.evolutionWebhookConfig ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Webhook Event Processing: ${results.webhookSimulation ? 'PASS' : 'FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 SUCCESS: All webhook tests passed!');
    console.log('✅ Webhook endpoint is accessible');
    console.log('✅ Evolution API webhook configuration works');
    console.log('✅ Webhook event processing works');
    
    console.log('\n📋 Ready for Complete Flow Testing:');
    console.log('1. Create WhatsApp instance in browser');
    console.log('2. Scan QR code with phone');
    console.log('3. Verify connection status updates in database');
    console.log('4. Check that instance shows as "connected"');
    
    console.log('\n🎯 Expected Results:');
    console.log('• Instance status updates from "connecting" to "connected"');
    console.log('• WhatsApp phone number is captured and stored');
    console.log('• Connection timestamp is recorded');
    console.log('• UI shows instance as active and ready');
    
  } else {
    console.log('\n🚨 FAILURE: Some webhook tests failed');
    console.log('❌ Check server logs for specific errors');
    console.log('❌ Verify webhook endpoint configuration');
    console.log('❌ Confirm Evolution API connectivity');
    
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Ensure development server is running on port 3001');
    console.log('2. Check that webhook endpoint is accessible');
    console.log('3. Verify Evolution API webhook configuration');
    console.log('4. Test webhook event processing manually');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ WhatsApp Connection Flow Test Complete!');
  console.log('='.repeat(60));
  
  return allPassed;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
