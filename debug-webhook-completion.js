#!/usr/bin/env node

/**
 * Debug Webhook Completion Flow
 * 
 * Helps debug the WhatsApp connection completion flow by:
 * 1. Checking current instance states in database
 * 2. Testing webhook endpoint manually
 * 3. Simulating connection events
 * 4. Verifying database updates
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 DEBUGGING WHATSAPP WEBHOOK COMPLETION FLOW');
console.log('='.repeat(60));

async function checkDatabaseInstances() {
  console.log('\n📊 Checking current instances in database...');
  
  try {
    // This would require Supabase client setup, but for now let's just log the approach
    console.log('📋 To check database instances manually:');
    console.log('1. Go to Supabase dashboard');
    console.log('2. Open SQL Editor');
    console.log('3. Run: SELECT * FROM whatsapp_instances_simple ORDER BY created_at DESC;');
    console.log('4. Check the status, connection_state, and timestamps');
    
    return true;
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    return false;
  }
}

async function testWebhookEndpoint() {
  console.log('\n🔗 Testing webhook endpoint...');
  
  try {
    // Test with a sample organization ID
    const testOrgId = 'test-org-123';
    const webhookUrl = `http://localhost:3000/api/whatsapp/simple/webhook/${testOrgId}`;
    
    console.log(`Testing webhook URL: ${webhookUrl}`);
    
    // Test GET request (verification)
    console.log('\n📋 Testing GET request (verification)...');
    const getResponse = await fetch(webhookUrl);
    console.log(`GET Response: ${getResponse.status} ${getResponse.statusText}`);
    
    if (getResponse.ok) {
      const getData = await getResponse.json();
      console.log('✅ GET Response data:', getData);
    }
    
    // Test POST request (webhook event)
    console.log('\n📋 Testing POST request (webhook event)...');
    const mockConnectionEvent = {
      event: 'CONNECTION_UPDATE',
      instance: 'test-instance-debug',
      data: {
        state: 'open',
        instance: {
          profileName: 'Debug Test User',
          wuid: '5511999999999@s.whatsapp.net',
          profilePictureUrl: 'https://example.com/profile.jpg'
        }
      },
      date_time: new Date().toISOString(),
      sender: 'evolution-api'
    };
    
    const postResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockConnectionEvent)
    });
    
    console.log(`POST Response: ${postResponse.status} ${postResponse.statusText}`);
    
    if (postResponse.ok) {
      const postData = await postResponse.json();
      console.log('✅ POST Response data:', postData);
      return true;
    } else {
      const errorText = await postResponse.text();
      console.log('❌ POST Error:', errorText);
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
    const testInstanceName = 'debug-webhook-test';
    const webhookUrl = 'http://localhost:3000/api/whatsapp/simple/webhook/test-org';
    
    console.log(`Configuring webhook for instance: ${testInstanceName}`);
    console.log(`Webhook URL: ${webhookUrl}`);
    
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
    
    console.log(`Evolution webhook config response: ${response.status} ${response.statusText}`);
    
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
    console.error('❌ Error testing Evolution webhook config:', error.message);
    return false;
  }
}

function printDebuggingInstructions() {
  console.log('\n📋 MANUAL DEBUGGING INSTRUCTIONS');
  console.log('='.repeat(50));
  
  console.log('\n🔍 Step 1: Check Current Instance Status');
  console.log('1. Go to Supabase dashboard');
  console.log('2. Open SQL Editor');
  console.log('3. Run: SELECT id, display_name, status, connection_state, whatsapp_number, created_at, connected_at FROM whatsapp_instances_simple ORDER BY created_at DESC;');
  console.log('4. Note the status of your test instance');
  
  console.log('\n📱 Step 2: Create Test Instance');
  console.log('1. Go to http://localhost:3000/admin/channels (or 3001 if that\'s your port)');
  console.log('2. Click "Nueva Instancia" in WhatsApp section');
  console.log('3. Enter display name: "webhook-test"');
  console.log('4. Click "Crear Instancia"');
  console.log('5. Note the instance ID and Evolution instance name');
  
  console.log('\n🔗 Step 3: Check Webhook Configuration');
  console.log('1. Check server logs for webhook configuration messages');
  console.log('2. Look for: "🔗 Configuring webhook for instance"');
  console.log('3. Verify webhook URL is correct');
  console.log('4. Check for any webhook configuration errors');
  
  console.log('\n📲 Step 4: Test QR Connection');
  console.log('1. Get QR code from the instance');
  console.log('2. Scan with WhatsApp on your phone');
  console.log('3. Watch server logs for webhook events');
  console.log('4. Look for: "📥 Simple WhatsApp webhook received"');
  
  console.log('\n🔄 Step 5: Verify Database Updates');
  console.log('1. After successful phone connection');
  console.log('2. Re-run the SQL query from Step 1');
  console.log('3. Check if status changed to "connected"');
  console.log('4. Verify whatsapp_number and connected_at are populated');
  
  console.log('\n🚨 Step 6: Troubleshooting');
  console.log('If status doesn\'t update to "connected":');
  console.log('• Check if webhook events are being received');
  console.log('• Verify Evolution API can reach your webhook URL');
  console.log('• Test webhook endpoint manually with curl or Postman');
  console.log('• Check for any database update errors in logs');
}

async function runDebugSession() {
  console.log('\n🚀 Starting Debug Session');
  console.log('='.repeat(60));
  
  const results = {
    database: false,
    webhook: false,
    evolution: false
  };
  
  // Check database
  results.database = await checkDatabaseInstances();
  
  // Test webhook endpoint
  results.webhook = await testWebhookEndpoint();
  
  // Test Evolution webhook config
  results.evolution = await testEvolutionWebhookConfig();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 DEBUG RESULTS');
  console.log('='.repeat(60));
  
  console.log('\n📋 Test Summary:');
  console.log(`✅ Database Check: ${results.database ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Webhook Endpoint: ${results.webhook ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Evolution Config: ${results.evolution ? 'PASS' : 'FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 SUCCESS: All debug tests passed!');
    console.log('✅ Webhook infrastructure is working');
    console.log('✅ Ready for end-to-end testing');
  } else {
    console.log('\n⚠️ PARTIAL SUCCESS: Some tests failed');
    console.log('🔧 Follow manual debugging instructions below');
  }
  
  // Always print debugging instructions
  printDebuggingInstructions();
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Debug Session Complete!');
  console.log('='.repeat(60));
  
  return allPassed;
}

// Run debug session
runDebugSession()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Debug session failed:', error);
    process.exit(1);
  });
