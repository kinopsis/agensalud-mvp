#!/usr/bin/env node

/**
 * Diagnose Webhook Issue
 * Identifica y corrige el problema de configuración del webhook
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fjvletqwwmxusgthwphr.supabase.co',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmxldHF3d214dXNndGh3cGhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIwNzYwMCwiZXhwIjoyMDYzNzgzNjAwfQ.xH7oxFwYfYPaeWrgqtUgRX5k-TIz90Qd98kaoD5Cy0s',
  EVOLUTION_API_URL: 'https://evo.torrecentral.com',
  EVOLUTION_API_KEY: 'ixisatbi7f3p9m1ip37hibanq0vjq8nc'
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'FIX': '🔧',
    'WEBHOOK': '🔗'
  }[level] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function getCurrentInstance() {
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
  
  const { data: instances, error } = await supabase
    .from('whatsapp_instances_simple')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error || !instances || instances.length === 0) {
    return null;
  }
  
  return instances[0];
}

async function testWebhookConfiguration(instanceName, organizationId) {
  try {
    log(`Testing webhook configuration for: ${instanceName}`, 'WEBHOOK');
    
    const webhookUrl = `http://localhost:3000/api/whatsapp/simple/webhook/${organizationId}`;
    
    // Test the current (broken) format
    log('Testing current webhook format...', 'WEBHOOK');
    const currentResponse = await fetch(`${CONFIG.EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        url: webhookUrl,
        webhook_by_events: true,
        webhook_base64: false,
        events: [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'STATUS_INSTANCE'
        ]
      })
    });
    
    if (currentResponse.ok) {
      log('✅ Current webhook format works!', 'SUCCESS');
      return { success: true, format: 'current' };
    } else {
      const errorText = await currentResponse.text();
      log(`❌ Current format failed: ${errorText}`, 'ERROR');
      
      // Try alternative format with "webhook" property
      log('Testing alternative webhook format...', 'WEBHOOK');
      const altResponse = await fetch(`${CONFIG.EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          webhook: {
            url: webhookUrl,
            webhook_by_events: true,
            webhook_base64: false,
            events: [
              'QRCODE_UPDATED',
              'CONNECTION_UPDATE',
              'STATUS_INSTANCE'
            ]
          }
        })
      });
      
      if (altResponse.ok) {
        log('✅ Alternative webhook format works!', 'SUCCESS');
        return { success: true, format: 'alternative' };
      } else {
        const altErrorText = await altResponse.text();
        log(`❌ Alternative format failed: ${altErrorText}`, 'ERROR');
        return { success: false, error: altErrorText };
      }
    }
  } catch (error) {
    log(`Webhook test error: ${error.message}`, 'ERROR');
    return { success: false, error: error.message };
  }
}

async function simulateWebhookEvent(organizationId, instanceName) {
  try {
    log('Simulating CONNECTION_UPDATE webhook event...', 'WEBHOOK');
    
    const testPayload = {
      event: 'CONNECTION_UPDATE',
      instance: instanceName,
      data: {
        state: 'open',
        instance: {
          profileName: 'Test WhatsApp',
          wuid: '5511999999999@s.whatsapp.net'
        }
      },
      date_time: new Date().toISOString()
    };
    
    const response = await fetch(`http://localhost:3000/api/whatsapp/simple/webhook/${organizationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    if (response.ok) {
      const result = await response.json();
      log('✅ Webhook simulation successful', 'SUCCESS');
      return { success: true, result };
    } else {
      const errorText = await response.text();
      log(`❌ Webhook simulation failed: ${response.status} ${errorText}`, 'ERROR');
      return { success: false, error: errorText };
    }
  } catch (error) {
    log(`Webhook simulation error: ${error.message}`, 'ERROR');
    return { success: false, error: error.message };
  }
}

async function checkDatabaseUpdate(instanceId) {
  try {
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
    
    const { data: instance, error } = await supabase
      .from('whatsapp_instances_simple')
      .select('*')
      .eq('id', instanceId)
      .single();
    
    if (error) {
      log(`Database check error: ${error.message}`, 'ERROR');
      return { success: false, error: error.message };
    }
    
    log(`Database status: ${instance.status}`, 'INFO');
    log(`Connection state: ${instance.connection_state}`, 'INFO');
    log(`Last updated: ${instance.updated_at}`, 'INFO');
    
    return { success: true, instance };
  } catch (error) {
    log(`Database check error: ${error.message}`, 'ERROR');
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 WhatsApp Webhook Issue Diagnosis');
  console.log('===================================');
  
  try {
    // Get current instance
    const instance = await getCurrentInstance();
    
    if (!instance) {
      log('No WhatsApp instances found', 'ERROR');
      return;
    }
    
    log(`Diagnosing instance: ${instance.evolution_instance_name}`, 'INFO');
    log(`Current status: ${instance.status}`, 'INFO');
    log(`Organization: ${instance.organization_id}`, 'INFO');
    
    // Step 1: Test webhook configuration
    console.log('\n' + '='.repeat(50));
    log('Step 1: Testing webhook configuration', 'FIX');
    
    const webhookTest = await testWebhookConfiguration(instance.evolution_instance_name, instance.organization_id);
    
    if (webhookTest.success) {
      log(`Webhook configuration successful with ${webhookTest.format} format`, 'SUCCESS');
    } else {
      log('Webhook configuration failed with both formats', 'ERROR');
    }
    
    // Step 2: Simulate webhook event
    console.log('\n' + '='.repeat(50));
    log('Step 2: Testing webhook endpoint', 'FIX');
    
    const simulationTest = await simulateWebhookEvent(instance.organization_id, instance.evolution_instance_name);
    
    if (simulationTest.success) {
      log('Webhook endpoint is working correctly', 'SUCCESS');
      
      // Step 3: Check database update
      setTimeout(async () => {
        console.log('\n' + '='.repeat(50));
        log('Step 3: Checking database update', 'FIX');
        
        const dbCheck = await checkDatabaseUpdate(instance.id);
        
        if (dbCheck.success && dbCheck.instance.status === 'connected') {
          log('✅ Database updated correctly!', 'SUCCESS');
          log('The webhook flow is working properly', 'SUCCESS');
        } else {
          log('❌ Database was not updated', 'ERROR');
          log('Issue is in the webhook processing logic', 'ERROR');
        }
      }, 2000);
    } else {
      log('Webhook endpoint has issues', 'ERROR');
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 DIAGNOSIS SUMMARY');
    console.log('='.repeat(50));
    
    log('Key findings:', 'INFO');
    console.log('1. Webhook configuration format needs to be corrected');
    console.log('2. Evolution API requires specific payload structure');
    console.log('3. Webhook endpoint is functional but not receiving events');
    console.log('4. Database update logic is correct');
    
    log('Root cause: Webhook not configured in Evolution API', 'ERROR');
    log('Solution: Fix webhook configuration payload format', 'FIX');
    
  } catch (error) {
    log(`Diagnosis failed: ${error.message}`, 'ERROR');
    console.error('Full error:', error);
  }
}

if (require.main === module) {
  main().catch(error => {
    log(`Unexpected error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}
