#!/usr/bin/env node

/**
 * Quick WhatsApp State Diagnosis
 * Simple script to quickly identify orphaned WhatsApp instances
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  EVOLUTION_API_URL: process.env.EVOLUTION_API_BASE_URL || 'https://evo.torrecentral.com',
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARNING': '⚠️'
  }[level] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function checkEvolutionAPI(instanceName) {
  try {
    const url = `${CONFIG.EVOLUTION_API_URL}/instance/connectionState/${instanceName}`;
    console.log(`Checking Evolution API: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'apikey': CONFIG.EVOLUTION_API_KEY
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return { exists: true, status: data };
    } else if (response.status === 404) {
      return { exists: false, error: 'Instance not found in Evolution API' };
    } else {
      throw new Error(`Evolution API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return { exists: false, error: error.message };
    }
    return { exists: false, error: `Connection error: ${error.message}` };
  }
}

async function main() {
  console.log('🔍 Quick WhatsApp State Diagnosis');
  console.log('='.repeat(50));
  
  try {
    // Initialize Supabase
    if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_SERVICE_KEY) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);
    log('Connected to Supabase', 'SUCCESS');
    
    // Get instances from both tables
    log('Fetching WhatsApp instances from database...', 'INFO');

    // Check channel_instances table
    const { data: channelInstances, error: channelError } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('channel_type', 'whatsapp');

    if (channelError) {
      log(`Warning: Could not fetch channel_instances: ${channelError.message}`, 'WARNING');
    }

    // Check whatsapp_instances table
    const { data: whatsappInstances, error: whatsappError } = await supabase
      .from('whatsapp_instances')
      .select('*');

    if (whatsappError) {
      log(`Warning: Could not fetch whatsapp_instances: ${whatsappError.message}`, 'WARNING');
    }

    // Check whatsapp_instances_simple table
    const { data: simpleInstances, error: simpleError } = await supabase
      .from('whatsapp_instances_simple')
      .select('*');

    if (simpleError) {
      log(`Warning: Could not fetch whatsapp_instances_simple: ${simpleError.message}`, 'WARNING');
    }

    const allInstances = [
      ...(channelInstances || []).map(i => ({ ...i, table: 'channel_instances' })),
      ...(whatsappInstances || []).map(i => ({ ...i, table: 'whatsapp_instances' })),
      ...(simpleInstances || []).map(i => ({ ...i, table: 'whatsapp_instances_simple' }))
    ];

    log(`Found ${channelInstances?.length || 0} in channel_instances`, 'INFO');
    log(`Found ${whatsappInstances?.length || 0} in whatsapp_instances`, 'INFO');
    log(`Found ${simpleInstances?.length || 0} in whatsapp_instances_simple`, 'INFO');
    log(`Total instances: ${allInstances.length}`, 'INFO');

    if (allInstances.length === 0) {
      log('No WhatsApp instances found in any table', 'WARNING');
      return;
    }
    
    // Check each instance
    const problematicInstances = [];

    for (const instance of allInstances) {
      let instanceName;

      // Get instance name based on table type
      if (instance.table === 'channel_instances') {
        instanceName = instance.config?.whatsapp?.evolution_api?.instance_name ||
                      instance.instance_name;
      } else if (instance.table === 'whatsapp_instances_simple') {
        instanceName = instance.evolution_instance_name || instance.instance_name;
      } else {
        instanceName = instance.instance_name;
      }

      console.log(`\n--- Checking Instance (${instance.table}) ---`);
      console.log(`ID: ${instance.id}`);
      console.log(`Name: ${instanceName}`);
      console.log(`Status: ${instance.status}`);
      console.log(`Organization: ${instance.organization_id}`);

      if (instanceName) {
        log(`Checking Evolution API for: ${instanceName}`, 'INFO');
        const evolutionCheck = await checkEvolutionAPI(instanceName);

        if (!evolutionCheck.exists) {
          log(`❌ ORPHANED: ${instanceName} - ${evolutionCheck.error}`, 'ERROR');
          problematicInstances.push({
            table: instance.table,
            id: instance.id,
            instanceName,
            status: instance.status,
            organizationId: instance.organization_id,
            evolutionError: evolutionCheck.error
          });
        } else {
          log(`✅ OK: ${instanceName}`, 'SUCCESS');
        }
      } else {
        log(`⚠️ No instance name found for ID: ${instance.id} in ${instance.table}`, 'WARNING');
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 DIAGNOSIS SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total instances in database: ${allInstances.length}`);
    console.log(`Orphaned instances found: ${problematicInstances.length}`);
    
    if (problematicInstances.length > 0) {
      console.log('\n🚨 ORPHANED INSTANCES:');
      problematicInstances.forEach((instance, index) => {
        console.log(`${index + 1}. ${instance.instanceName} (${instance.table})`);
        console.log(`   ID: ${instance.id}`);
        console.log(`   Status: ${instance.status}`);
        console.log(`   Organization: ${instance.organizationId}`);
        console.log(`   Error: ${instance.evolutionError}`);
        console.log('');
      });
      
      console.log('💡 NEXT STEPS:');
      console.log('1. Run the full resolution script to clean up orphaned instances');
      console.log('2. Or use the web interface at /admin/whatsapp-state-resolver');
      console.log('3. Refresh the frontend after cleanup to see updated state');
    } else {
      log('🎉 No orphaned instances found! All instances are in sync.', 'SUCCESS');
    }
    
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
