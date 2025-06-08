#!/usr/bin/env node

/**
 * Check New Instance Status
 * 
 * Verifica el estado de la nueva instancia WhatsApp creada
 * y diagnostica por qué no se está monitoreando
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fjvletqwwmxusgthwphr.supabase.co',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmxldHF3d214dXNndGh3cGhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIwNzYwMCwiZXhwIjoyMDYzNzgzNjAwfQ.xH7oxFwYfYPaeWrgqtUgRX5k-TIz90Qd98kaoD5Cy0s',
  EVOLUTION_API_URL: 'https://evo.torrecentral.com',
  EVOLUTION_API_KEY: 'ixisatbi7f3p9m1ip37hibanq0vjq8nc',
  NEW_INSTANCE_ID: '610a212a-2d00-4aac-88b9-b510b082455a'
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️',
    'DEBUG': '🔍'
  }[level] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function checkDatabaseStatus() {
  try {
    log('Checking database status for new instance...', 'DEBUG');
    
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
    
    // Get the new instance
    const { data: instance, error } = await supabase
      .from('whatsapp_instances_simple')
      .select('*')
      .eq('id', CONFIG.NEW_INSTANCE_ID)
      .single();
    
    if (error) {
      log(`Database error: ${error.message}`, 'ERROR');
      return null;
    }
    
    if (!instance) {
      log('Instance not found in database', 'ERROR');
      return null;
    }
    
    log('Instance found in database', 'SUCCESS');
    console.log('Instance details:');
    console.log('  ID:', instance.id);
    console.log('  Name:', instance.instance_name);
    console.log('  Evolution Name:', instance.evolution_instance_name);
    console.log('  Status:', instance.status);
    console.log('  Organization:', instance.organization_id);
    console.log('  Created:', instance.created_at);
    console.log('  Updated:', instance.updated_at);
    console.log('  WhatsApp Number:', instance.whatsapp_number || 'Not set');
    console.log('  WhatsApp Name:', instance.whatsapp_name || 'Not set');
    console.log('  Connected At:', instance.connected_at || 'Not connected');
    
    return instance;
  } catch (error) {
    log(`Database check failed: ${error.message}`, 'ERROR');
    return null;
  }
}

async function checkEvolutionAPIStatus(evolutionInstanceName) {
  try {
    log(`Checking Evolution API status for: ${evolutionInstanceName}`, 'DEBUG');
    
    const response = await fetch(`${CONFIG.EVOLUTION_API_URL}/instance/connectionState/${evolutionInstanceName}`, {
      headers: {
        'apikey': CONFIG.EVOLUTION_API_KEY
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      log('Evolution API status retrieved', 'SUCCESS');
      console.log('Evolution API details:');
      console.log('  State:', data.instance?.state || 'Unknown');
      console.log('  Status:', data.instance?.status || 'Unknown');
      console.log('  Profile Name:', data.instance?.profileName || 'Not set');
      console.log('  Phone Number:', data.instance?.wuid || 'Not set');
      console.log('  Server State:', data.state || 'Unknown');
      
      return data;
    } else {
      log(`Evolution API error: ${response.status} ${response.statusText}`, 'ERROR');
      return null;
    }
  } catch (error) {
    log(`Evolution API check failed: ${error.message}`, 'ERROR');
    return null;
  }
}

async function testAPIEndpoints() {
  try {
    log('Testing API endpoints...', 'DEBUG');
    
    // Test status endpoint
    const statusUrl = `http://localhost:3000/api/whatsapp/simple/instances/${CONFIG.NEW_INSTANCE_ID}/status`;
    log(`Testing status endpoint: ${statusUrl}`, 'DEBUG');
    
    const statusResponse = await fetch(statusUrl);
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      log('Status endpoint working', 'SUCCESS');
      console.log('Status endpoint response:');
      console.log('  Success:', statusData.success);
      console.log('  Status:', statusData.data?.status);
      console.log('  Message:', statusData.data?.message);
    } else {
      log(`Status endpoint failed: ${statusResponse.status}`, 'ERROR');
    }
    
    // Test QR endpoint
    const qrUrl = `http://localhost:3000/api/whatsapp/simple/instances/${CONFIG.NEW_INSTANCE_ID}/qr`;
    log(`Testing QR endpoint: ${qrUrl}`, 'DEBUG');
    
    const qrResponse = await fetch(qrUrl);
    
    if (qrResponse.ok) {
      const qrData = await qrResponse.json();
      log('QR endpoint working', 'SUCCESS');
      console.log('QR endpoint response:');
      console.log('  Success:', qrData.success);
      console.log('  QR Available:', !!qrData.data?.qrCode);
      console.log('  QR Length:', qrData.data?.qrCode?.length || 0);
    } else {
      log(`QR endpoint failed: ${qrResponse.status}`, 'ERROR');
    }
    
  } catch (error) {
    log(`API endpoint test failed: ${error.message}`, 'ERROR');
  }
}

async function checkAllInstances() {
  try {
    log('Checking all WhatsApp instances...', 'DEBUG');
    
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
    
    const { data: instances, error } = await supabase
      .from('whatsapp_instances_simple')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      log(`Failed to fetch instances: ${error.message}`, 'ERROR');
      return;
    }
    
    log(`Found ${instances.length} total instances`, 'INFO');
    
    console.log('\nAll instances:');
    instances.forEach((instance, index) => {
      const isNew = instance.id === CONFIG.NEW_INSTANCE_ID;
      const marker = isNew ? '🆕' : '  ';
      console.log(`${marker} ${index + 1}. ${instance.instance_name} (${instance.status}) - ${instance.id}`);
      if (isNew) {
        console.log(`     ↳ This is the NEW instance from logs`);
      }
    });
    
  } catch (error) {
    log(`Instance check failed: ${error.message}`, 'ERROR');
  }
}

async function main() {
  console.log('🔍 New WhatsApp Instance Status Check');
  console.log('====================================');
  console.log(`Target Instance ID: ${CONFIG.NEW_INSTANCE_ID}`);
  console.log('');
  
  try {
    // 1. Check all instances first
    await checkAllInstances();
    
    console.log('\n' + '='.repeat(50));
    
    // 2. Check database status
    const instance = await checkDatabaseStatus();
    
    if (!instance) {
      log('Cannot proceed without instance data', 'ERROR');
      return;
    }
    
    console.log('\n' + '='.repeat(50));
    
    // 3. Check Evolution API status
    const evolutionData = await checkEvolutionAPIStatus(instance.evolution_instance_name);
    
    console.log('\n' + '='.repeat(50));
    
    // 4. Test API endpoints
    await testAPIEndpoints();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(50));
    
    // Analysis
    const dbStatus = instance.status;
    const evolutionState = evolutionData?.instance?.state || 'unknown';
    
    log('Database vs Evolution API comparison:', 'INFO');
    console.log(`  Database Status: ${dbStatus}`);
    console.log(`  Evolution State: ${evolutionState}`);
    
    if (dbStatus !== evolutionState) {
      log('⚠️ STATUS MISMATCH detected!', 'WARNING');
      console.log('  This could explain why monitoring is not working');
      console.log('  The frontend might be confused about the actual state');
    } else {
      log('✅ Status is consistent between database and Evolution API', 'SUCCESS');
    }
    
    // Recommendations
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('==================');
    
    if (dbStatus === 'connecting') {
      console.log('1. ✅ Instance is in "connecting" state - ready for QR scan');
      console.log('2. 🔍 Check if ConnectionStatusIndicator is rendering');
      console.log('3. 🔍 Verify that monitoring components are active');
      console.log('4. 📱 Try scanning QR code to test transition');
    } else if (dbStatus === 'connected') {
      console.log('1. ✅ Instance is already connected');
      console.log('2. 🔍 Check why monitoring stopped');
      console.log('3. 🔍 Verify UI shows connected state');
    } else if (dbStatus === 'error') {
      console.log('1. ❌ Instance is in error state');
      console.log('2. 🔧 Need to fix the error first');
      console.log('3. 🔄 Consider recreating the instance');
    } else {
      console.log('1. ❓ Unknown status - investigate further');
      console.log('2. 🔍 Check Evolution API logs');
      console.log('3. 🔧 Consider manual status update');
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('==============');
    console.log('1. Run browser diagnostic script');
    console.log('2. Navigate to /admin/channels');
    console.log('3. Check if instance appears in list');
    console.log('4. Verify ConnectionStatusIndicator is active');
    console.log('5. Test QR scan if status is "connecting"');
    
  } catch (error) {
    log(`Check failed: ${error.message}`, 'ERROR');
    console.error('Full error:', error);
  }
}

if (require.main === module) {
  main().catch(error => {
    log(`Unexpected error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}
